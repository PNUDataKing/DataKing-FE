import type { Bounds } from "@/types/geo";
import type { ToiletPoi } from "@/types/poi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function fetchToiletsByBounds(bounds: Bounds, signal?: AbortSignal): Promise<ToiletPoi[]> {
  const url = new URL("/api/toilets", API_BASE_URL || window.location.origin);
  url.searchParams.set("swLat", String(bounds.swLat));
  url.searchParams.set("swLng", String(bounds.swLng));
  url.searchParams.set("neLat", String(bounds.neLat));
  url.searchParams.set("neLng", String(bounds.neLng));

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`Toilets API non-ok: ${res.status}`);

  const data = (await res.json()) as any[];
  return data
    .map((r) => {
      const lat = r.lat ?? r.latitude ?? r.y;
      const lng = r.lng ?? r.longitude ?? r.x;
      if (typeof lat !== "number" || typeof lng !== "number") return null;

      const poi: ToiletPoi = {
        id: r.id,
        lat,
        lng,
        title: r.name ?? r.title ?? r.place_name ?? "화장실",
        category: "toilet",
        details: {
          address: r.address,
          location: r.location,
          tel: r.tel,
          fatherAvailable: r.fatherAvailable,
          maleChildrenToiletCount: r.maleChildrenToiletCount,
          femaleChildrenToiletCount: r.femaleChildrenToiletCount,
          diaperTableLocationList: r.diaperTableLocationList,
        },
      };
      return poi;
    })
    .filter((v): v is ToiletPoi => !!v);
}

export async function fetchToiletDetail(id: string | number, signal?: AbortSignal): Promise<ToiletPoi> {
  const url = new URL(`/api/toilets/${id}`, API_BASE_URL || window.location.origin);

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`Toilet detail API non-ok: ${res.status}`);

  const r = await res.json();

  const poi: ToiletPoi = {
    id: r.id,
    lat: r.lat,
    lng: r.lng,
    title: r.name ?? "화장실",
    category: "toilet",
    details: {
      address: r.address,
      location: r.location,
      tel: r.tel,
      fatherAvailable: r.fatherAvailable,
      maleChildrenToiletCount: r.maleChildrenToiletCount,
      femaleChildrenToiletCount: r.femaleChildrenToiletCount,
      diaperTableLocationList: r.diaperTableLocationList,
    },
  };

  return poi;
}
