import type { Bounds } from "@/types/geo";
import type { NurseryPoi } from "@/types/poi";

export async function fetchNurseriesByBounds(bounds: Bounds, signal?: AbortSignal): Promise<NurseryPoi[]> {
  const url = new URL("/api/nurseries", window.location.origin);
  // 스펙 swLat, swng, neLat, neLng (swng 특이값도 반영)
  url.searchParams.set("swLat", String(bounds.swLat));
  url.searchParams.set("swng", String(bounds.swLng)); // 서버 스펙
  url.searchParams.set("swLng", String(bounds.swLng)); // 혹시 대비
  url.searchParams.set("neLat", String(bounds.neLat));
  url.searchParams.set("neLng", String(bounds.neLng));

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`Nurseries API non-ok: ${res.status}`);

  const data = (await res.json()) as any[];
  return data
    .map((r) => {
      if (typeof r.lat !== "number" || typeof r.lng !== "number") return null;
      const poi: NurseryPoi = {
        id: r.id,
        lat: r.lat,
        lng: r.lng,
        title: r.name ?? "수유실",
        category: "nursery",
        details: {
          address: r.address,
          location: r.location,
          tel: r.tel,
          fatherAvailable: r.fatherAvailable,
          referenceDate: r.referenceDate,
        },
      };
      return poi;
    })
    .filter((v): v is NurseryPoi => !!v);
}
