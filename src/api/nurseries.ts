import type { Poi } from "../components/KakaoMap";
import type { Bounds } from "../types/geo";

export async function fetchNurseriesByBounds(bounds: Bounds, signal?: AbortSignal): Promise<Poi[]> {
  const url = new URL("/api/nurseries", window.location.origin);
  url.searchParams.set("swLat", String(bounds.swLat));
  url.searchParams.set("swLng", String(bounds.swLng));
  url.searchParams.set("neLat", String(bounds.neLat));
  url.searchParams.set("neLng", String(bounds.neLng));

  const res = await fetch(url.toString(), {
    headers: { "ngrok-skip-browser-warning": "true", Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`Nurseries API non-ok: ${res.status}`);

  const data: unknown = await res.json();
  const items = Array.isArray(data) ? (data as unknown[]) : [];
  const mapped: Poi[] = items
    .map((it) => {
      const r = it as Record<string, unknown>;
      const lat = (r.lat as number) ?? (r.latitude as number) ?? (r.y as number);
      const lng = (r.lng as number) ?? (r.longitude as number) ?? (r.x as number);
      if (typeof lat !== "number" || typeof lng !== "number") return null;
      return {
        id: (r.id as string | number) ?? (r._id as string | number),
        lat,
        lng,
        title: (r.name as string) ?? (r.title as string) ?? (r.place_name as string),
        category: "nursery",
      } as Poi;
    })
    .filter((v): v is Poi => v !== null);

  return mapped;
}
