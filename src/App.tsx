import "./App.css";
import TopBar from "./components/TopBar";
import KakaoMap, { type Poi } from "./components/KakaoMap";
import { useToilets } from "./hooks/useToilets";
import type { Bounds } from "./types/geo";
import { useCallback, useState } from "react";

function App() {
  const { pois, loading, requestByBounds } = useToilets({
    debounceMs: 250,
    onError: (e) => {
      console.warn("화장실 목록 로드 실패", e);
    },
  });
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);

  const handleBoundsChange = (b: Bounds) => requestByBounds(b);

  const handleMarkerClick = useCallback((poi: Poi) => {
    console.log("[App] marker clicked:", poi);
    setSelectedPoi(poi);
    // TODO: 여기서 Drawer 열기 setDrawerOpen(true) 같은 로직을 붙이면 됨
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <TopBar />
      <KakaoMap
        useCurrentLocation
        center={{ lat: 35.2313, lng: 129.0845 }}
        fallbackCenter={{ lat: 35.2313, lng: 129.0845 }}
        poiMarkers={pois}
        onBoundsChange={handleBoundsChange}
        onMarkerClick={handleMarkerClick} // ★ 마커 클릭 콜백 연결
        onGeolocationError={(e: GeolocationPositionError | Error) => {
          const err = "code" in e ? (e as GeolocationPositionError) : undefined;
          const code = err ? err.code : undefined;
          const message = "message" in e ? (e as Error).message : String(e);
          console.warn("geo error", code, message);
        }}
      />
      {/* 로딩 인디케이터 예시 */}
      {loading && (
        <div
          style={{
            position: "fixed",
            right: 12,
            top: 12,
            background: "rgba(255,255,255,0.95)",
            padding: "6px 10px",
            border: "1px solid #eee",
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          주변 화장실 불러오는 중…
        </div>
      )}
    </div>
  );
}

export default App;
