import { useEffect, useMemo, useRef, useState } from "react";

// Minimal Kakao Maps SDK typings (subset)
type KakaoLatLngInstance = object;
interface KakaoMap {
  setCenter?: (latlng: KakaoLatLngInstance) => void;
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
}
interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void;
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
}
interface KakaoNamespace {
  maps: KakaoMapsNS;
}
declare global {
  interface Window {
    kakao?: KakaoNamespace;
  }
}

type KakaoMapProps = {
  center?: { lat: number; lng: number };
  level?: number;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (map: KakaoMap) => void;
  useCurrentLocation?: boolean;
  fallbackCenter?: { lat: number; lng: number };
  showCurrentMarker?: boolean;
  poiMarkers?: Array<{ lat: number; lng: number; title?: string }>;
  onGeolocationError?: (error: GeolocationPositionError | Error) => void;
  showAccuracyCircle?: boolean;
};

const KAKAO_JS_SDK_URL = "https://dapi.kakao.com/v2/maps/sdk.js";
const KAKAO_APP_KEY = "9294a77093fbe1abb79bfe8edff1466b"; // JavaScript 키

let kakaoSdkLoadingPromise: Promise<void> | null = null;

function loadKakaoSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.kakao && window.kakao.maps) return Promise.resolve();
  if (kakaoSdkLoadingPromise) return kakaoSdkLoadingPromise;

  kakaoSdkLoadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${KAKAO_JS_SDK_URL}"]`);

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Kakao SDK")));
      if (existing.dataset.loaded === "true") resolve();
      return;
    }

    const script = document.createElement("script");
    const params = new URLSearchParams({ appkey: KAKAO_APP_KEY, autoload: "false" });
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

export default function KakaoMap({
  center = { lat: 37.5665, lng: 126.978 },
  level = 3,
  className,
  style,
  onLoad,
  useCurrentLocation = true,
  fallbackCenter,
  showCurrentMarker = true,
  poiMarkers = [],
  onGeolocationError,
  showAccuracyCircle = true,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const mapRef = useRef<KakaoMap | null>(null);
  const currentMarkerRef = useRef<KakaoMarker | null>(null);
  const poiMarkerRefs = useRef<KakaoMarker[]>([]);
  const accuracyCircleRef = useRef<KakaoCircle | null>(null);

  const containerStyle = useMemo<React.CSSProperties>(
    () => ({
      width: "100%",
      height: "100%",
      ...style,
    }),
    [style]
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await loadKakaoSdk();
        if (!window.kakao) return;
        if (!window.kakao.maps || !window.kakao.maps.load) return;

        // Ensure kakao internal modules are loaded
        window.kakao.maps.load(() => {
          if (cancelled) return;
          setIsReady(true);
        });
      } catch (e) {
        console.error(e);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!containerRef.current) return;
    if (!window.kakao || !window.kakao.maps) return;

    const kakao = window.kakao!;
    const options = {
      center: new kakao.maps.LatLng(center.lat, center.lng),
      level,
    };
    const map = new kakao.maps.Map(containerRef.current, options);
    mapRef.current = map;

    if (onLoad) onLoad(map);

    return () => {
      // Allow GC by releasing references; no explicit destroy API available
      mapRef.current = null;
    };
  }, [isReady, center.lat, center.lng, level, onLoad]);

  // Geolocation centering
  useEffect(() => {
    if (!isReady) return;
    if (!useCurrentLocation) return;
    if (!navigator.geolocation) {
      if (onGeolocationError) onGeolocationError(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!window.kakao || !window.kakao.maps || !mapRef.current) return;
        const kakao = window.kakao;
        const latlng = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        console.log("Geolocation success:", {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        // Center map
        if (typeof mapRef.current.setCenter === "function") {
          mapRef.current.setCenter(latlng);
          console.log("Map centered to current position");
        } else {
          // Fallback: recreate map center by re-instantiating is unnecessary; skip
        }
        // Current marker
        if (showCurrentMarker) {
          if (currentMarkerRef.current) currentMarkerRef.current.setMap(null);
          currentMarkerRef.current = new kakao.maps.Marker({ position: latlng, title: "현재 위치" });
          currentMarkerRef.current.setMap(mapRef.current);
        }
        // Accuracy circle
        if (showAccuracyCircle) {
          if (accuracyCircleRef.current) accuracyCircleRef.current.setMap(null);
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
        if (onGeolocationError) onGeolocationError(err);
        // Optional: fallback center if provided
        if (fallbackCenter && window.kakao && window.kakao.maps && mapRef.current) {
          const kakao = window.kakao;
          const latlng = new kakao.maps.LatLng(fallbackCenter.lat, fallbackCenter.lng);
          if (typeof mapRef.current.setCenter === "function") {
            mapRef.current.setCenter(latlng);
          }
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  }, [isReady, useCurrentLocation, showCurrentMarker, fallbackCenter, onGeolocationError, showAccuracyCircle]);

  // External POI markers
  useEffect(() => {
    if (!isReady) return;
    if (!window.kakao || !window.kakao.maps || !mapRef.current) return;
    const kakao = window.kakao;
    // Clear previous markers
    poiMarkerRefs.current.forEach((m) => m.setMap(null));
    poiMarkerRefs.current = [];
    // Add new markers
    for (const m of poiMarkers) {
      const marker = new kakao.maps.Marker({ position: new kakao.maps.LatLng(m.lat, m.lng), title: m.title });
      marker.setMap(mapRef.current);
      poiMarkerRefs.current.push(marker);
    }
    return () => {
      poiMarkerRefs.current.forEach((m) => m.setMap(null));
      poiMarkerRefs.current = [];
    };
  }, [isReady, poiMarkers]);

  return <div ref={containerRef} className={className} style={containerStyle} />;
}
