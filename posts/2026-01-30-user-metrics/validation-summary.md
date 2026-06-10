# Validation Summary: How to Implement User Metrics

## Status
validated

## Post Type
Tutorial / Implementation guide covering client-side and server-side user experience metrics (RUM, Core Web Vitals, Apdex, user journeys).

## Technologies Covered
- JavaScript Browser APIs: `PerformanceObserver`, `PerformanceTiming` / Navigation Timing, `PerformancePaintTiming`, `navigator.sendBeacon`, `navigator.connection`
- Core Web Vitals: LCP, INP, CLS
- Apdex (Application Performance Index)
- Python / FastAPI / Pydantic v2
- `prometheus_client` (Python Prometheus instrumentation)
- PromQL (Prometheus queries and alerting rules)
- Mermaid (diagrams)

## Sources Consulted
- [Largest Contentful Paint (LCP) — web.dev](https://web.dev/articles/lcp)
- [Interaction to Next Paint (INP) — web.dev](https://web.dev/articles/inp)
- [Cumulative Layout Shift (CLS) — web.dev](https://web.dev/articles/cls)
- [Evolving the CLS metric (session windows) — web.dev](https://web.dev/blog/evolving-cls)
- [PerformanceObserver.observe() — MDN](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe)
- [PerformanceEventTiming — MDN](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming)
- [LargestContentfulPaint — MDN](https://developer.mozilla.org/en-US/docs/Web/API/LargestContentfulPaint)
- [GoogleChrome/web-vitals issue #75 — scroll prematurely ending LCP](https://github.com/GoogleChrome/web-vitals/issues/75)
- [PerformanceNavigationTiming — MDN](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming)
- [Apdex specification — apdex.org / Dynatrace knowledge base](https://www.dynatrace.com/knowledge-base/apdex/)
- [Pydantic v2 Models docs (extra='ignore' default)](https://docs.pydantic.dev/latest/concepts/models/)
- [Python docs — `datetime.utcnow()` deprecation in 3.12](https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow)

## Issues Found

1. **`JourneyEvent` Pydantic model missing fields** (Python backend, `track_journey_event` handler). The handler accessed `event.elapsedFromPrevious`, but the field was not declared on the `JourneyEvent` model. Pydantic v2 defaults to `extra='ignore'`, so the field would be silently dropped from the payload and accessing it would raise `AttributeError` at runtime — a real, reproducible bug. **Fix:** added `elapsedFromStart: Optional[int] = None` and `elapsedFromPrevious: Optional[int] = None` to the model.

2. **Incorrect INP calculation in `calculateINP()`.** The code sorted interactions descending and then used `Math.floor(interactions.length * 0.98)` as the index — which actually returns one of the *smallest* interactions, not the worst. Per the web.dev spec, INP is the worst interaction for pages with fewer than 50 interactions, and for pages with 50+ interactions it drops the top `floor(N/50)` outliers and reports the next-worst. **Fix:** replaced with the spec-correct formula `interactions[Math.floor(N/50)]`, plus guarded against entries with no `interactionId`. Updated the explanatory comment.

3. **LCP observer disconnected on `scroll`.** The web-vitals reference implementation only listens for `keydown`, `click`, and `pointerdown` to disconnect the LCP observer. `scroll` can fire before the browser dispatches the final LCP entry (see web-vitals issue #75), prematurely cutting LCP short. **Fix:** replaced `scroll` with `pointerdown` in the listener list and added a clarifying comment.

4. **CLS calculation was a simple cumulative sum.** The current CLS specification (since 2021) uses *session windows*: at most 5 seconds of activity with no gaps > 1 second, reporting the largest window's sum. The simple-sum approach over-penalizes long-lived/SPA pages and disagrees with what CrUX and Lighthouse report. **Fix:** rewrote `initCLSObserver` to track session windows correctly — starting a new window when the gap exceeds 1s or the window exceeds 5s, and reporting the maximum window value as CLS.

5. **`datetime.utcnow()` deprecated.** Deprecated in Python 3.12, scheduled for removal in 3.14. **Fix:** replaced `from datetime import datetime, timedelta` with `from datetime import datetime, timezone` (`timedelta` was also unused), and changed the health-check call to `datetime.now(timezone.utc).isoformat()`.

## Review Notes

- The post uses the legacy `window.performance.timing` (`PerformanceTiming`) interface in the RUM collector. This is deprecated in Navigation Timing Level 2 but is still supported by current browsers, and the code does feature-detect before using it. Migrating to `performance.getEntriesByType('navigation')[0]` (`PerformanceNavigationTiming`) would be more future-proof, but the current code is not broken — left as-is to avoid restructuring beyond fixing technical errors.
- `PerformanceObserver` for `event` type with `durationThreshold: 16` is correct — 16ms is the minimum allowed value (default is 104ms). Setting it low captures more interactions for INP calculation.
- The Apdex rating bands (Excellent ≥ 0.94, Good ≥ 0.85, Fair ≥ 0.70, Poor ≥ 0.50, Unacceptable < 0.50) match the standard apdex.org ratings.
- Core Web Vitals thresholds (LCP 2.5s/4s, INP 200ms/500ms, CLS 0.1/0.25) match the current authoritative web.dev thresholds.
- The Mermaid Apdex-classification diagram uses strict inequalities (`Response < T`) while the Python code uses `<=`. This is a cosmetic inconsistency that doesn't affect the standard Apdex semantics; left as-is.
- The `time` import in `apdex_calculator.py` is unused; minor and left alone to avoid superficial diff churn.
- The `MultiEndpointApdexTracker.get_overall_score()` method mutates a fresh calculator's counters directly. It works because `calculate()` only divides by `len(response_times)` and the counters are kept in sync — but it's a somewhat fragile pattern that future readers may want to refactor.
