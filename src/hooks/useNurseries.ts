import { useCallback, useEffect, useRef, useState } from "react";

import { fetchNurseriesByBounds } from "../api/nurseries";
import type { Bounds } from "../types/geo";
import type { Poi } from "../components/KakaoMap";

type Options = {
  debounceMs?: number;
  onError?: (e: unknown) => void;
  onSuccess?: (pois: Poi[]) => void;
};

export function useNurseries({ debounceMs = 250, onError, onSuccess }: Options = {}) {
  const [pois, setPois] = useState<Poi[]>([]);
  const [loading, setLoading] = useState(false);

  const pendingBoundsRef = useRef<Bounds | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const requestByBounds = useCallback(
    (bounds: Bounds) => {
      pendingBoundsRef.current = bounds;

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      debounceTimerRef.current = window.setTimeout(async () => {
        if (!pendingBoundsRef.current) return;

        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        try {
          setLoading(true);
          const data = await fetchNurseriesByBounds(pendingBoundsRef.current, abortRef.current.signal);
          setPois(data);
          onSuccess?.(data);
        } catch (e: any) {
          if (e?.name !== "AbortError") onError?.(e);
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    },
    [debounceMs, onError, onSuccess]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { pois, loading, requestByBounds };
}
