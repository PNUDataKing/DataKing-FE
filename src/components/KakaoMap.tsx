import { useEffect, useMemo, useRef, useState } from "react";

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
    removeListener?: (target: unknown, type: string, handler: () => void) => void; // 있어도 되고 없어도 됨
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
  onMarkerClick?: (poi: Poi) => void; // ★ 추가: 특정 마커 클릭을 부모(App)로 전달
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

/** ---- 메인 컴포넌트 ---- */
export default function KakaoMap({
  center = { lat: 35.2313, lng: 129.0845 },
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
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const mapRef = useRef<KakaoMap | null>(null);

  // 내부 오버레이 레퍼런스
  const currentMarkerRef = useRef<KakaoMarker | null>(null);
  const poiMarkerRefs = useRef<KakaoMarker[]>([]);
  const accuracyCircleRef = useRef<KakaoCircle | null>(null);
  const hasCenteredRef = useRef(false);

  /** 빨간 점 아이콘(현재 위치 마커) */
  function createRedDotImage(kakao: KakaoNamespace) {
    const svg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
         <circle cx="6" cy="6" r="5" fill="#ff3b30" />
         <circle cx="6" cy="6" r="5" fill="none" stroke="#ffffff" stroke-width="1" />
       </svg>`
    );
    const size = new kakao.maps.Size(12, 12);
    const offset = new kakao.maps.Point(6, 6);
    return new kakao.maps.MarkerImage(`data:image/svg+xml;charset=UTF-8,${svg}`, size, { offset });
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

  /** 4) 외부에서 내려온 POI 마커 렌더링 + 클릭 전달 */
  useEffect(() => {
    if (!isReady || !window.kakao?.maps || !mapRef.current) return;
    const kakao = window.kakao;

    // 기존 마커 제거
    poiMarkerRefs.current.forEach((m) => m.setMap(null));
    poiMarkerRefs.current = [];

    // 새 마커 생성
    for (const poi of poiMarkers) {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(poi.lat, poi.lng),
        title: poi.title,
      });
      marker.setMap(mapRef.current);
      poiMarkerRefs.current.push(marker);

      // 마커 클릭 → 상위로 POI 정보 전달
      kakao.maps.event.addListener(marker, "click", () => {
        onMarkerClick?.(poi);
      });
    }

    return () => {
      poiMarkerRefs.current.forEach((m) => m.setMap(null));
      poiMarkerRefs.current = [];
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
}
