import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { Poi } from "@/types/poi";

interface BottomDrawerProps {
  pois: Poi[];
  selectedPoi: Poi | null;
  onPoiClick: (poi: Poi) => void;
  onBack: () => void;
}

export default function BottomDrawer({ pois, selectedPoi, onPoiClick, onBack }: BottomDrawerProps) {
  return (
    <Drawer open={true} modal={false}>
      <DrawerContent>
        {selectedPoi ? (
          // 상세 뷰
          <>
            <DrawerHeader>
              <button
                onClick={onBack}
                className="text-blue-500 text-sm mb-2 text-left"
              >
                ← 목록으로
              </button>
              <DrawerTitle>{selectedPoi.title || "상세 정보"}</DrawerTitle>
              <p className="text-sm text-gray-500">
                위도: {selectedPoi.lat.toFixed(4)}, 경도: {selectedPoi.lng.toFixed(4)}
              </p>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <p className="text-gray-600">상세 정보는 추가 API 연동 후 표시됩니다.</p>
            </div>
          </>
        ) : (
          // 목록 뷰
          <>
            <DrawerHeader>
              <DrawerTitle>주변 시설 ({pois.length})</DrawerTitle>
              <p className="text-sm text-gray-500">지도에 표시된 목록입니다</p>
            </DrawerHeader>

            <div className="px-4 pb-6 overflow-y-auto max-h-80">
              {pois.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  이 지역에 표시할 시설이 없습니다
                </p>
              ) : (
                <div className="space-y-3">
                  {pois.map((poi, index) => (
                    <button
                      key={poi.id || index}
                      onClick={() => onPoiClick(poi)}
                      className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <h3 className="font-semibold mb-1">
                        {poi.title || `시설 ${index + 1}`}
                      </h3>
                      <p className="text-sm text-gray-500">
                        위도: {poi.lat.toFixed(4)}, 경도: {poi.lng.toFixed(4)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
