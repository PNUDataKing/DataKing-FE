import "./App.css";
import TopBar from "./components/TopBar";
import KakaoMap, { type Poi } from "./components/KakaoMap";
import { useToilets } from "./hooks/useToilets";
import { useNurseries } from "./hooks/useNurseries";
import type { Bounds } from "./types/geo";
import { useCallback, useMemo, useState } from "react";
import BottomDrawer from "./components/BottomDrawer";

function App() {
  const {
    pois: toilets,
    loading: toiletsLoading,
    requestByBounds: reqToilets,
  } = useToilets({
    debounceMs: 250,
    onError: (e) => console.warn("화장실 목록 로드 실패", e),
  });

  const {
    pois: nurseries,
    loading: nurseriesLoading,
    requestByBounds: reqNurseries,
  } = useNurseries({
    debounceMs: 250,
    onError: (e) => console.warn("수유실 목록 로드 실패", e),
  });

  const loading = toiletsLoading || nurseriesLoading;

  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);

  const handleBoundsChange = useCallback(
    (b: Bounds) => {
      reqToilets(b);
      reqNurseries(b);
    },
    [reqToilets, reqNurseries]
  );

  const handleMarkerClick = useCallback((poi: Poi) => {
    console.log("[App] marker clicked:", poi);
    setSelectedPoi(poi);
    // setDrawerOpen(true) 등으로 드로어 열기
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <TopBar />
      <KakaoMap
        useCurrentLocation
        center={{ lat: 35.2313, lng: 129.0845 }}
        fallbackCenter={{ lat: 35.2313, lng: 129.0845 }}
        poiMarkers={toilets}
        onBoundsChange={handleBoundsChange}
        onMarkerClick={handleMarkerClick}
        onGeolocationError={(e: GeolocationPositionError | Error) => {
          const err = "code" in e ? (e as GeolocationPositionError) : undefined;
          const code = err ? err.code : undefined;
          const message = "message" in e ? (e as Error).message : String(e);
          console.warn("geo error", code, message);
        }}
      />

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
          주변 장소(화장실/수유실) 불러오는 중…
        </div>
      )}

      {/* selectedPoi를 Drawer 컴포넌트로 넘겨 상세 표시하면 끝 */}
    </div>
  );
}

export default App;
