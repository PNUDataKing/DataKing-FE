import "./App.css";
import TopBar from "./components/TopBar";
import KakaoMap from "./components/KakaoMap";
import { useToilets } from "./hooks/useToilets";
import type { Bounds } from "./types/geo";

function App() {
  const { pois, loading, requestByBounds } = useToilets({
    debounceMs: 250,
    onError: (e) => {
      console.warn("화장실 목록 로드 실패", e);
    },
  });

  const handleBoundsChange = (b: Bounds) => requestByBounds(b);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <TopBar />
      <KakaoMap
        useCurrentLocation
        center={{ lat: 35.2313, lng: 129.0845 }}
        fallbackCenter={{ lat: 35.2313, lng: 129.0845 }}
        poiMarkers={pois}
        onBoundsChange={handleBoundsChange}
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
