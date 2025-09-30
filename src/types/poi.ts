export type PoiCategory = "toilet" | "nursery";

// 공통(지도/마커에 필요한 최소)
export type BasePoi = {
  id: string | number;
  lat: number;
  lng: number;
  title: string;
  category: PoiCategory;
};

// 화장실 상세
export type ToiletPoi = BasePoi & {
  category: "toilet";
  details: {
    address?: string;
    location?: string; // 상세 위치
    tel?: string;
    fatherAvailable?: boolean;
    maleChildrenToiletCount?: number;
    femaleChildrenToiletCount?: number;
    diaperTableLocationList?: Array<"FEMALE" | "MALE" | "ACCESSIBLE" | string>;
  };
};

// 수유실 상세
export type NurseryPoi = BasePoi & {
  category: "nursery";
  details: {
    address?: string;
    location?: string; // 상세 위치
    tel?: string;
    fatherAvailable?: boolean;
    referenceDate?: string; // YYYY-MM-DD
  };
};

export type Poi = ToiletPoi | NurseryPoi;
