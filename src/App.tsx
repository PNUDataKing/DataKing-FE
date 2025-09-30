import "./App.css";
import TopBar, { type FacilityType } from "./components/TopBar";
import KakaoMap, { type KakaoMapHandle, type Poi } from "./components/KakaoMap";
import { useToilets } from "./hooks/useToilets";
import { useNurseries } from "./hooks/useNurseries";
import type { Bounds } from "./types/geo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BottomDrawer from "./components/BottomDrawer";

function App() {
  const [facilityType, setFacilityType] = useState<FacilityType>("nursing");
  const [fatherFilterEnabled, setFatherFilterEnabled] = useState(false);
  const mapRef = useRef<KakaoMapHandle>(null);

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

  // 현재 선택된 분류에 따라 표시할 POI 결정 + 아빠 필터 적용
  const displayPois = useMemo(() => {
    const basePois = facilityType === "diaper" ? toilets : nurseries;

    if (fatherFilterEnabled) {
      return basePois.filter((poi) => {
        if ("details" in poi && poi.details) {
          return poi.details.fatherAvailable === true;
        }
        return false;
      });
    }

    return basePois;
  }, [facilityType, toilets, nurseries, fatherFilterEnabled]);

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
    mapRef.current?.panTo(poi.lat, poi.lng);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedPoi(null);
  }, []);

  // facilityType이 변경되면 상세보기를 닫고 목록으로 돌아감
  useEffect(() => {
    setSelectedPoi(null);
  }, [facilityType]);

  return (
    <div className="h-screen w-screen relative">
      <TopBar selectedType={facilityType} onTypeChange={setFacilityType} />
      <KakaoMap
        ref={mapRef}
        useCurrentLocation
        level={5}
        center={{ lat: 35.205597, lng: 129.078478 }}
        fallbackCenter={{ lat: 35.205597, lng: 129.078478 }}
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
        fatherFilterEnabled={fatherFilterEnabled}
        onFatherFilterToggle={() => setFatherFilterEnabled(!fatherFilterEnabled)}
      />
    </div>
  );
}

export default App;
