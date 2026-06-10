# Validation Summary: How to Create Threshold Alerting

## Status
validated

## Post Type
Tutorial / Conceptual guide with code examples

## Technologies Covered
- Python (numpy, statistics, collections, dataclasses, enum, typing)
- YAML alert configuration (vendor-neutral format)
- Mermaid diagrams
- Statistical methods (mean/std deviation, percentiles, EWMA, seasonal decomposition)
- General SRE/observability concepts (hysteresis, severity tiers, deadband, baseline derivation)

## Sources Consulted
- NumPy documentation: https://numpy.org/doc/stable/reference/generated/numpy.std.html (default ddof=0, population standard deviation)
- NumPy documentation: https://numpy.org/doc/stable/reference/generated/numpy.percentile.html (default method="linear" interpolation)
- Python statistics module: https://docs.python.org/3/library/statistics.html
- Python typing/dataclasses: https://docs.python.org/3/library/dataclasses.html and PEP 585 (generic builtins like `list[T]`, `tuple[T, ...]`)
- General control-systems/SRE references on hysteresis and anti-flapping (e.g., Prometheus alerting docs, Google SRE workbook concepts)
- Verified all numeric outputs by executing the math against Python/NumPy.

## Issues Found

1. **`DynamicThreshold` example: incorrect printed output.**
   - Original claim: `# Output: Normal range: 40.2ms - 59.8ms`
   - Actual: with `data=[45,52,48,55,47,51,49,53,46,50]`, `np.mean()` = 49.6, `np.std()` (population, ddof=0) ≈ 3.0397, and `num_std=2.5` yields lower = 42.0, upper = 57.2.
   - Fix: updated comment to `# Output: Normal range: 42.0ms - 57.2ms`.

2. **`percentile_threshold` example: incorrect printed output.**
   - Original claim: `# Output: Alert threshold: 103.2ms`
   - Actual: `np.percentile([12,15,18,22,25,28,35,42,55,120], 95)` with default linear interpolation = 90.75; multiplied by `1.2` headroom = 108.9.
   - Fix: updated comment to `# Output: Alert threshold: 108.9ms`.

3. **`MovingAverageThreshold` docstring: misleading parameter description.**
   - Original docstring said `band_multiplier` is "How many MADs (median absolute deviations) for bounds", but the implementation computes `std = self.emv ** 0.5` (square root of exponential variance), i.e., a standard deviation, not a median absolute deviation.
   - Fix: changed the docstring to "How many standard deviations for bounds" to match the code.

4. **`HysteresisThreshold` test inputs and expected output are self-contradictory.**
   - The example sets `exit_threshold=70`, but the test readings included `(75, 30)` and `(72, 150)` with comments labeling them as "below exit". Both values are above 70, so the code never clears the alert; the printed expected output `Time 150s: CPU=72%, State=OK (changed)` is therefore unreachable with the given configuration.
   - Fix: changed the two readings to `(65, 30)` and `(68, 150)` so they are genuinely below the 70 exit threshold, and updated the expected output block to show `CPU=65%` at 30s and `CPU=68%` at 150s. The logic and narrative are preserved; only the numbers were corrected so the trace actually matches what the code produces.

## Review Notes
- The YAML alert snippets are vendor-neutral pseudo-config (not Prometheus, Datadog, or OneUptime syntax). That is fine for a conceptual guide, but readers should be aware the YAML is illustrative, not directly runnable in any specific alerting system.
- The `BaselineBuilder` uses `self.history[hour].pop(0)` (O(n)); for production code a `collections.deque(maxlen=...)` would be more efficient. Not a correctness issue.
- `SeverityBasedAlert` uses `list[ThresholdTier]` and `tuple[Optional[Severity], str]` PEP 585 generics, which require Python 3.9+. Reasonable for a 2026 post.
- The `ThresholdAlertEngine` example loop reuses `datetime.now()` for every iteration, so the `min_duration` hysteresis path is essentially never exercised within the demo. The code itself is correct; the demo is just illustrative.
- The "Severity Matrix" table provides reasonable starting-point values for common metrics; these are subjective and workload-dependent, which the surrounding prose acknowledges.
- The hysteresis state machine in `ThresholdAlertEngine._apply_hysteresis` introduces a `RECOVERING` state that the `AlertState` enum defines but the simpler `HysteresisThreshold` class earlier in the post does not — the two implementations are consistent within themselves; no fix needed.
