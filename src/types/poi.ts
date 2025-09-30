export type PoiCategory = "toilet" | "nursery";

export type Poi = {
  id?: string | number;
  lat: number;
  lng: number;
  title?: string;
};
