import "./App.css";
import TopBar, { type FacilityType } from "./components/TopBar";
import KakaoMap, { type Poi } from "./components/KakaoMap";
import { useToilets } from "./hooks/useToilets";
import { useNurseries } from "./hooks/useNurseries";
import type { Bounds } from "./types/geo";
import { useCallback, useMemo, useState } from "react";
import BottomDrawer from "./components/BottomDrawer";

function App() {
  const [facilityType, setFacilityType] = useState<FacilityType>("diaper");

  const {
    pois: toilets,
    loading: toiletsLoading,
    requestByBounds: reqToilets,
  } = useToilets({
    debounceMs: 1000,
    onError: (e) => console.warn("화장실 목록 로드 실패", e),
  });

  const {
    pois: nurseries,
    loading: nurseriesLoading,
    requestByBounds: reqNurseries,
  } = useNurseries({
    debounceMs: 1000,
    onError: (e) => console.warn("수유실 목록 로드 실패", e),
  });

  const loading = toiletsLoading || nurseriesLoading;

  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);

  // 현재 선택된 분류에 따라 표시할 POI 결정
  const displayPois = useMemo(() => {
    return facilityType === "diaper" ? toilets : nurseries;
  }, [facilityType, toilets, nurseries]);

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
  }, []);

  const handleDrawerPoiClick = useCallback((poi: Poi) => {
    console.log("[App] drawer poi clicked:", poi);
    setSelectedPoi(poi);
    // TODO: 지도 중심을 해당 POI로 이동하는 로직 추가
  }, []);

  const handleBack = useCallback(() => {
    setSelectedPoi(null);
  }, []);

  return (
    <div className="h-screen w-screen relative">
      <TopBar selectedType={facilityType} onTypeChange={setFacilityType} />
      <KakaoMap
        useCurrentLocation
        center={{ lat: 35.2313, lng: 129.0845 }}
        fallbackCenter={{ lat: 35.2313, lng: 129.0845 }}
        poiMarkers={displayPois}
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
          주변 {facilityType === "diaper" ? "기저귀교환대" : "수유실"} 불러오는 중…
        </div>
      )}
      <BottomDrawer
        pois={displayPois}
        selectedPoi={selectedPoi}
        onPoiClick={handleDrawerPoiClick}
        onBack={handleBack}
      />
    </div>
  );
}

export default App;
