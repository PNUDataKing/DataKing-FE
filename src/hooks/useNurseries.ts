import { useCallback, useEffect, useRef, useState } from "react";

import { fetchNurseriesByBounds } from "../api/nurseries";
import type { Bounds } from "@/types/geo";
import type { NurseryPoi } from "@/types/poi";

export function useNurseries({ debounceMs = 250, onError }: { debounceMs?: number; onError?: (e: unknown) => void } = {}) {
  const [pois, setPois] = useState<NurseryPoi[]>([]);
  const [loading, setLoading] = useState(false);
  const pendRef = useRef<Bounds | null>(null);
  const tRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const requestByBounds = useCallback(
    (b: Bounds) => {
      pendRef.current = b;
      if (tRef.current) {
        clearTimeout(tRef.current);
        tRef.current = null;
      }
      tRef.current = window.setTimeout(async () => {
        if (!pendRef.current) return;
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        try {
          setLoading(true);
          const data = await fetchNurseriesByBounds(pendRef.current, abortRef.current.signal);
          setPois(data);
        } catch (e: any) {
          if (e?.name !== "AbortError") onError?.(e);
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    },
    [debounceMs, onError]
  );

  useEffect(
    () => () => {
      if (tRef.current) clearTimeout(tRef.current);
      if (abortRef.current) abortRef.current.abort();
    },
    []
  );

  return { pois, loading, requestByBounds };
}
