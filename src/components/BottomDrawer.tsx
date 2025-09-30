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

export default function BottomDrawer({
  pois,
  selectedPoi,
  onPoiClick,
  onBack,
}: BottomDrawerProps) {
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
              <DrawerTitle className="text-blue-600 font-bold">
                {selectedPoi.title || "상세 정보"}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-4">
              {"details" in selectedPoi && (
                <>
                  {selectedPoi.details.address && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">주소</p>
                      <p className="text-gray-900">{selectedPoi.details.address}</p>
                    </div>
                  )}

                  {selectedPoi.details.location && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">상세 위치</p>
                      <p className="text-gray-900">{selectedPoi.details.location}</p>
                    </div>
                  )}

                  {selectedPoi.details.tel && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">연락처</p>
                      <p className="text-gray-900">{selectedPoi.details.tel}</p>
                    </div>
                  )}

                  {selectedPoi.details.fatherAvailable !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">아빠 이용 가능</p>
                      <p className="text-gray-900">
                        {selectedPoi.details.fatherAvailable ? "가능" : "불가능"}
                      </p>
                    </div>
                  )}

                  {selectedPoi.category === "toilet" && (
                    <>
                      {(selectedPoi.details.maleChildrenToiletCount !== undefined ||
                        selectedPoi.details.femaleChildrenToiletCount !== undefined) && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">어린이 변기</p>
                          <p className="text-gray-900">
                            남아용: {selectedPoi.details.maleChildrenToiletCount ?? 0}개 /
                            여아용: {selectedPoi.details.femaleChildrenToiletCount ?? 0}개
                          </p>
                        </div>
                      )}

                      {selectedPoi.details.diaperTableLocationList &&
                        selectedPoi.details.diaperTableLocationList.length > 0 && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">기저귀 교환대 위치</p>
                            <div className="flex gap-2 flex-wrap">
                              {selectedPoi.details.diaperTableLocationList.map((loc, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                                >
                                  {loc === "FEMALE"
                                    ? "여자 화장실"
                                    : loc === "MALE"
                                    ? "남자 화장실"
                                    : loc === "ACCESSIBLE"
                                    ? "장애인 화장실"
                                    : loc}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </>
                  )}

                  {selectedPoi.category === "nursery" && selectedPoi.details.referenceDate && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">데이터 기준일</p>
                      <p className="text-gray-900">{selectedPoi.details.referenceDate}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          // 목록 뷰
          <>
            <div className="pt-4 pb-6 overflow-y-auto max-h-80">
              {pois.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  이 지역에 표시할 시설이 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {pois.map((poi, index) => {
                    const address =
                      "details" in poi ? poi.details?.address : undefined;

                    return (
                      <button
                        key={poi.id || index}
                        onClick={() => onPoiClick(poi)}
                        className="w-full px-4 py-3 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors text-left"
                      >
                        <h3 className="font-bold text-blue-600 mb-1">
                          {poi.title || `시설 ${index + 1}`}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {address || "주소 정보 없음"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
