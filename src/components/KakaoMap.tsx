import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

/** ---- Kakao Maps 최소 타입 (읽기 좋게 정리) ---- */
type KakaoLatLngInstance = { getLat?: () => number; getLng?: () => number };
interface KakaoBounds {
  getSouthWest: () => KakaoLatLngInstance;
  getNorthEast: () => KakaoLatLngInstance;
}
interface KakaoMap {
  setCenter?: (latlng: KakaoLatLngInstance) => void;
  getBounds?: () => KakaoBounds;
  panTo?: (latlng: KakaoLatLngInstance) => void;
}
interface KakaoMapConstructor {
  new (container: HTMLElement, options: { center: KakaoLatLngInstance; level: number }): KakaoMap;
}
interface KakaoLatLngConstructor {
  new (lat: number, lng: number): KakaoLatLngInstance;
}
interface KakaoMarkerOptions {
  position: KakaoLatLngInstance;
  title?: string;
  image?: unknown;
  zIndex?: number;
}
interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void;
  setImage?: (image: unknown) => void;
}
interface KakaoMarkerConstructor {
  new (options: KakaoMarkerOptions): KakaoMarker;
}
interface KakaoCircleOptions {
  center: KakaoLatLngInstance;
  radius: number;
  strokeWeight?: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeStyle?: "solid" | "shortdash" | "shortdot" | "dash" | "dot" | "longdash" | "dashdot" | "longdashdot";
  fillColor?: string;
  fillOpacity?: number;
}
interface KakaoCircle {
  setMap: (map: KakaoMap | null) => void;
}
interface KakaoCircleConstructor {
  new (options: KakaoCircleOptions): KakaoCircle;
}
interface KakaoMapsNS {
  load: (callback: () => void) => void;
  Map: KakaoMapConstructor;
  LatLng: KakaoLatLngConstructor;
  Marker: KakaoMarkerConstructor;
  Circle: KakaoCircleConstructor;
  MarkerImage: new (src: string, size: unknown, options?: { offset?: unknown }) => unknown;
  Size: new (w: number, h: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  event: {
    addListener: (target: unknown, type: string, handler: () => void) => void;
    removeListener?: (target: unknown, type: string, handler: () => void) => void;
  };
}
interface KakaoNamespace {
  maps: KakaoMapsNS;
}

declare global {
  interface Window {
    kakao?: KakaoNamespace;
  }
}

/** ---- 컴포넌트 Prop 타입 ---- */
export type Poi = { id?: string | number; lat: number; lng: number; title?: string };

export interface KakaoMapHandle {
  panTo: (lat: number, lng: number) => void;
}

type KakaoMapProps = {
  center?: { lat: number; lng: number };
  level?: number;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (map: KakaoMap) => void;

  // 위치/마커
  useCurrentLocation?: boolean;
  fallbackCenter?: { lat: number; lng: number };
  showCurrentMarker?: boolean;
  showAccuracyCircle?: boolean;

  // 외부에서 내려주는 POI 마커
  poiMarkers?: Poi[];

  // 이벤트 콜백
  onGeolocationError?: (error: GeolocationPositionError | Error) => void;
  onBoundsChange?: (bounds: { swLat: number; swLng: number; neLat: number; neLng: number }) => void;
  onMarkerClick?: (poi: Poi) => void;
};

/** ---- Kakao SDK 로더 ---- */
const KAKAO_JS_SDK_URL = "https://dapi.kakao.com/v2/maps/sdk.js";
const KAKAO_APP_KEY = "9294a77093fbe1abb79bfe8edff1466b";

let kakaoSdkLoadingPromise: Promise<void> | null = null;
function loadKakaoSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.kakao?.maps) return Promise.resolve();
  if (kakaoSdkLoadingPromise) return kakaoSdkLoadingPromise;

  kakaoSdkLoadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${KAKAO_JS_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Kakao SDK")));
      if (existing.dataset.loaded === "true") resolve();
      return;
    }

    const params = new URLSearchParams({ appkey: KAKAO_APP_KEY, autoload: "false" });
    const script = document.createElement("script");
    script.src = `${KAKAO_JS_SDK_URL}?${params.toString()}`;
    script.async = true;
    script.dataset.loaded = "false";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Kakao SDK"));
    document.head.appendChild(script);
  });

  return kakaoSdkLoadingPromise;
}

/** 동그라미 마커 이미지 (색/크기/테두리 두께 조절) */
function createDotImage(
  kakao: KakaoNamespace,
  color = "#1E90FF",
  diameter = 16, // 기본 크기: 18px
  strokeWidth = 1 // 기본 테두리: 1px
) {
  const r = Math.floor(diameter / 2);
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}" viewBox="0 0 ${diameter} ${diameter}">
      <circle cx="${r}" cy="${r}" r="${r - strokeWidth}" fill="${color}" />
      <circle cx="${r}" cy="${r}" r="${r - strokeWidth}" fill="none" stroke="#ffffff" stroke-width="${strokeWidth}" />
    </svg>`
  );
  const size = new kakao.maps.Size(diameter, diameter);
  const offset = new kakao.maps.Point(r, r); // 중앙이 좌표와 맞닿도록
  return new kakao.maps.MarkerImage(`data:image/svg+xml;charset=UTF-8,${svg}`, size, { offset });
}

/** 360도 그림자(halo) 포함 동그라미 마커 */
function createHaloDotImage(
  kakao: KakaoNamespace,
  options?: {
    color?: string; // 점 색상
    diameter?: number; // 점 지름(px) - 실제 점
    strokeWidth?: number; // 흰 테두리 두께
    haloSize?: number; // 그림자 반경(px) - 점 바깥으로 퍼지는 양
    haloOpacity?: number; // 그림자 투명도(0~1)
  }
) {
  const color = options?.color ?? "#1E90FF";
  const diameter = options?.diameter ?? 16;
  const strokeWidth = options?.strokeWidth ?? 1;
  const haloSize = options?.haloSize ?? 6; // 그림자 권장: 6~8
  const haloOpacity = options?.haloOpacity ?? 0.35;

  // 총 캔버스 사이즈(클리핑 방지 위해 halo 포함)
  const total = diameter + haloSize * 2;
  const rTotal = Math.floor(total / 2);
  const rDot = Math.floor(diameter / 2);

  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}">
      <!-- 그림자(halo): 점보다 큰 반경, 반투명 -->
      <circle cx="${rTotal}" cy="${rTotal}" r="${rDot + haloSize - 1}" fill="${color}" opacity="${haloOpacity}" />
      <!-- 실제 점 -->
      <circle cx="${rTotal}" cy="${rTotal}" r="${rDot - strokeWidth}" fill="${color}" />
      <!-- 흰색 테두리 -->
      <circle cx="${rTotal}" cy="${rTotal}" r="${rDot - strokeWidth}" fill="none" stroke="#ffffff" stroke-width="${strokeWidth}" />
    </svg>`
  );

  const size = new kakao.maps.Size(total, total);
  const offset = new kakao.maps.Point(rTotal, rTotal); // 중앙이 좌표에 딱 오도록
  return new kakao.maps.MarkerImage(`data:image/svg+xml;charset=UTF-8,${svg}`, size, { offset });
}

/** ---- 메인 컴포넌트 ---- */
const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>(
  (
    {
      center = { lat: 35.2309931, lng: 129.0823062 },
      level = 3,
      className,
      style,
      onLoad,

      useCurrentLocation = true,
      fallbackCenter,
      showCurrentMarker = true,
      showAccuracyCircle = true,

      poiMarkers = [],
      onGeolocationError,
      onBoundsChange,
      onMarkerClick,
    },
    ref
  ) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const mapRef = useRef<KakaoMap | null>(null);

  // Expose panTo method via ref
  useImperativeHandle(ref, () => ({
    panTo: (lat: number, lng: number) => {
      if (!window.kakao?.maps || !mapRef.current) return;
      const kakao = window.kakao;
      const latlng = new kakao.maps.LatLng(lat, lng);
      if (typeof mapRef.current.panTo === "function") {
        mapRef.current.panTo(latlng);
      } else if (typeof mapRef.current.setCenter === "function") {
        mapRef.current.setCenter(latlng);
      }
    },
  }));

  // 내부 오버레이 레퍼런스
  const currentMarkerRef = useRef<KakaoMarker | null>(null);
  const poiMarkerRefs = useRef<KakaoMarker[]>([]);
  const selectedMarkerRef = useRef<KakaoMarker | null>(null); // ★ 선택 마커
  const accuracyCircleRef = useRef<KakaoCircle | null>(null);
  const hasCenteredRef = useRef(false);

  /** 빨간 점 아이콘(현재 위치 마커) */
  /** 현재 위치(빨간 점) 마커 - 레티나 고려 + 더 큼 */
  /** 현재 위치(빨간 점) + 빨간 halo */
  function createRedDotImage(
    kakao: KakaoNamespace,
    baseDiameter = 12, // 점 크기
    strokeWidth = 2, // 흰 테두리
    haloSize = 4, // 빨간 그림자 범위
    haloOpacity = 0.35 // 빨간 그림자 투명도
  ) {
    // 레티나 선명도(과도 확대 방지)
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    return createHaloDotImage(kakao, {
      color: "#ff3b30",
      diameter: Math.round(baseDiameter * scale),
      strokeWidth,
      haloSize: Math.round(haloSize * scale),
      haloOpacity,
    });
  }
  // 컨테이너 스타일(읽기 좋게 한곳에서 병합)
  const containerStyle = useMemo<React.CSSProperties>(() => ({ width: "100%", height: "100%", ...style }), [style]);

  /** 1) Kakao SDK 로드 */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadKakaoSdk();
        window.kakao?.maps?.load?.(() => {
          if (!cancelled) setIsReady(true);
        });
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** 2) 지도 생성 & 초기 현재위치 마커 배치(지오로케이션 성공 전에도 보이도록) */
  useEffect(() => {
    if (!isReady || !containerRef.current || !window.kakao?.maps) return;

    const kakao = window.kakao;
    const opts = { center: new kakao.maps.LatLng(center.lat, center.lng), level };
    const map = new kakao.maps.Map(containerRef.current, opts);
    mapRef.current = map;

    onLoad?.(map);

    if (showCurrentMarker) {
      if (currentMarkerRef.current) currentMarkerRef.current.setMap(null);
      currentMarkerRef.current = new kakao.maps.Marker({
        position: opts.center,
        title: "현재 위치",
        image: createRedDotImage(kakao),
        zIndex: 10000,
      });
      currentMarkerRef.current.setMap(map);
    }

    return () => {
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  /** 3) 현재 위치 한 번 가져와서 센터/마커/정확도 원 설정 */
  useEffect(() => {
    if (!isReady || !useCurrentLocation) return;
    if (!navigator.geolocation) {
      onGeolocationError?.(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!window.kakao?.maps || !mapRef.current) return;
        const kakao = window.kakao;
        const latlng = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);

        if (!hasCenteredRef.current && typeof mapRef.current.setCenter === "function") {
          mapRef.current.setCenter(latlng);
          hasCenteredRef.current = true;
        }

        if (showCurrentMarker) {
          currentMarkerRef.current?.setMap(null);
          currentMarkerRef.current = new kakao.maps.Marker({
            position: latlng,
            title: "현재 위치",
            image: createRedDotImage(kakao),
            zIndex: 10000,
          });
          currentMarkerRef.current.setMap(mapRef.current);
        }

        if (showAccuracyCircle) {
          accuracyCircleRef.current?.setMap(null);
          accuracyCircleRef.current = new kakao.maps.Circle({
            center: latlng,
            radius: Math.max(30, Math.min(500, pos.coords.accuracy || 100)),
            strokeWeight: 2,
            strokeColor: "#4a90e2",
            strokeOpacity: 0.7,
            strokeStyle: "solid",
            fillColor: "#4a90e2",
            fillOpacity: 0.2,
          });
          accuracyCircleRef.current.setMap(mapRef.current);
        }
      },
      (err) => {
        onGeolocationError?.(err);
        if (fallbackCenter && window.kakao?.maps && mapRef.current) {
          const kakao = window.kakao;
          const latlng = new kakao.maps.LatLng(fallbackCenter.lat, fallbackCenter.lng);
          if (!hasCenteredRef.current && typeof mapRef.current.setCenter === "function") {
            mapRef.current.setCenter(latlng);
            hasCenteredRef.current = true;
          }
          if (showCurrentMarker) {
            currentMarkerRef.current?.setMap(null);
            currentMarkerRef.current = new kakao.maps.Marker({
              position: latlng,
              title: "현재 위치",
              image: createRedDotImage(kakao),
              zIndex: 10000,
            });
            currentMarkerRef.current.setMap(mapRef.current);
          }
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, useCurrentLocation, showCurrentMarker, fallbackCenter, showAccuracyCircle]);

  /** 4) 외부에서 내려온 POI 마커 렌더링 + 클릭 시 강조(크기/테두리 증가) */
  useEffect(() => {
    if (!isReady || !window.kakao?.maps || !mapRef.current) return;
    const kakao = window.kakao;

    // 기존 마커 제거
    poiMarkerRefs.current.forEach((m) => m.setMap(null));
    poiMarkerRefs.current = [];
    selectedMarkerRef.current = null; // 선택 상태 초기화

    // 공통(기본/선택) 이미지 준비
    const normalImg = createDotImage(kakao, "#1E90FF", 18, 1);
    const selectedImg = createHaloDotImage(kakao, { color: "#1E90FF", diameter: 24, strokeWidth: 2, haloSize: 6, haloOpacity: 0.4 });

    for (const poi of poiMarkers) {
      const position = new kakao.maps.LatLng(poi.lat, poi.lng);

      const marker = new kakao.maps.Marker({
        position,
        title: poi.title,
        image: normalImg, // 기본 상태
        zIndex: 100,
      });

      marker.setMap(mapRef.current);
      poiMarkerRefs.current.push(marker);

      kakao.maps.event.addListener(marker, "click", () => {
        // 1) 이전 선택 마커 원복
        if (selectedMarkerRef.current && selectedMarkerRef.current !== marker && selectedMarkerRef.current.setImage) {
          selectedMarkerRef.current.setImage(normalImg);
        }

        // 2) 현재 마커 강조(크게 + 두꺼운 테두리)
        if (marker.setImage) marker.setImage(selectedImg);
        selectedMarkerRef.current = marker;

        // 3) 지도 가운데로 이동 (panTo 지원 시 부드럽게, 아니면 setCenter)
        if (mapRef.current) {
          const pos = position; // new kakao.maps.LatLng(poi.lat, poi.lng);
          if (typeof mapRef.current.panTo === "function") {
            mapRef.current.panTo(pos);
          } else if (typeof mapRef.current.setCenter === "function") {
            mapRef.current.setCenter(pos);
          }
        }

        // 4) 부모로 콜백
        onMarkerClick?.(poi);
      });
    }

    return () => {
      poiMarkerRefs.current.forEach((m) => m.setMap(null));
      poiMarkerRefs.current = [];
      selectedMarkerRef.current = null;
    };
  }, [isReady, poiMarkers, onMarkerClick]);

  /** 5) idle 이벤트에서 현재 bounds를 상위로 전달 (초기 1회 즉시 발생도 포함) */
  useEffect(() => {
    if (!isReady || !window.kakao?.maps || !mapRef.current) return;
    const kakao = window.kakao;

    const emitBounds = () => {
      if (!mapRef.current?.getBounds) return;
      const b = mapRef.current.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      const swLat = sw.getLat?.();
      const swLng = sw.getLng?.();
      const neLat = ne.getLat?.();
      const neLng = ne.getLng?.();
      if ([swLat, swLng, neLat, neLng].some((v) => typeof v !== "number")) return;
      onBoundsChange?.({ swLat: swLat as number, swLng: swLng as number, neLat: neLat as number, neLng: neLng as number });
    };

    // 초기 1회
    emitBounds();
    // idle 리스너
    kakao.maps.event.addListener(mapRef.current, "idle", emitBounds);
  }, [isReady, onBoundsChange]);

  return <div ref={containerRef} className={className} style={containerStyle} />;
});

KakaoMap.displayName = "KakaoMap";

export default KakaoMap;
