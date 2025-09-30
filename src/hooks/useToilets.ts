import { useCallback, useEffect, useRef, useState } from "react";

import { fetchToiletsByBounds } from "../api/toilets";
import type { Bounds } from "../types/geo";
import type { Poi } from "../types/poi";

type Options = {
  /** bounds 변경 디바운스 ms (기본 250) */
  debounceMs?: number;
  /** 요청 실패 시 콜백 */
  onError?: (e: unknown) => void;
  /** 요청 성공 시 콜백 */
  onSuccess?: (pois: Poi[]) => void;
};

export function useToilets({ debounceMs = 250, onError, onSuccess }: Options = {}) {
  const [pois, setPois] = useState<Poi[]>([]);
  const [loading, setLoading] = useState(false);

  const pendingBoundsRef = useRef<Bounds | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 외부에서 호출할 핸들러: KakaoMap의 onBoundsChange에 그대로 연결
  const requestByBounds = useCallback(
    (bounds: Bounds) => {
      pendingBoundsRef.current = bounds;

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      debounceTimerRef.current = window.setTimeout(async () => {
        if (!pendingBoundsRef.current) return;
        const current = pendingBoundsRef.current;

        // 이전 요청 취소
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        try {
          setLoading(true);
          const data = await fetchToiletsByBounds(current, abortRef.current.signal);
          setPois(data);
          onSuccess?.(data);
        } catch (e) {
          // Abort는 조용히 무시

          if (e?.name !== "AbortError") {
            onError?.(e);
            console.warn("toilets fetch failed", e);
          }
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    },
    [debounceMs, onError, onSuccess]
  );

  // 언마운트/옵션 변경 시 정리
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { pois, loading, requestByBounds };
}
