import type { Bounds } from "../types/geo";
import type { Poi } from "../types/poi";

export async function fetchToiletsByBounds(bounds: Bounds, signal?: AbortSignal): Promise<Poi[]> {
  const url = new URL("/api/toilets", window.location.origin);
  url.searchParams.set("swLat", String(bounds.swLat));
  url.searchParams.set("swLng", String(bounds.swLng));
  url.searchParams.set("neLat", String(bounds.neLat));
  url.searchParams.set("neLng", String(bounds.neLng));

  const res = await fetch(url.toString(), {
    headers: { "ngrok-skip-browser-warning": "true", Accept: "application/json" },
    signal,
  });

  if (!res.ok) {
    throw new Error(`Toilets API non-ok: ${res.status}`);
  }

  const data: unknown = await res.json();
  const items = Array.isArray(data) ? (data as unknown[]) : [];

  // 유연한 필드 매핑
  const mapped: Poi[] = items
    .map((it) => {
      const rec = it as Record<string, unknown>;
      const lat = (rec.lat as number) ?? (rec.latitude as number) ?? (rec.y as number);
      const lng = (rec.lng as number) ?? (rec.longitude as number) ?? (rec.x as number);
      if (typeof lat !== "number" || typeof lng !== "number") return null;

      return {
        id: (rec.id as string | number) ?? (rec._id as string | number),
        lat,
        lng,
        title: (rec.name as string) ?? (rec.title as string) ?? (rec.place_name as string),
      } as Poi;
    })
    .filter((v): v is Poi => v !== null);

  return mapped;
}
