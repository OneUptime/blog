# Validation Summary: How Should You Sample Browser Sessions Without Losing Rare Errors and Slow Outliers?

## Status
validated

## Post Type
Technical guide / observability design guide

## Technologies Covered
- Browser Real User Monitoring (RUM)
- Browser session sampling and inverse-probability weighting
- Session Replay
- JavaScript Web Crypto API (`crypto.subtle.digest`)
- Sentry JavaScript Session Replay
- Datadog Browser RUM and Session Replay
- Elastic APM RUM JavaScript agent
- OpenTelemetry head and tail sampling
- W3C Trace Context
- Core Web Vitals (INP and LCP)

## Sources Consulted
- [Sentry JavaScript Session Replay](https://docs.sentry.io/platforms/javascript/session-replay/) - replay sampling order, the 60-second error buffer, post-error recording, and privacy defaults.
- [Datadog Browser RUM and Session Replay sampling](https://docs.datadoghq.com/real_user_monitoring/guide/sampling-browser-plans/) - nested `sessionSampleRate` and `sessionReplaySampleRate` semantics and version notes.
- [Elastic RUM JavaScript agent configuration](https://www.elastic.co/docs/reference/apm/agents/rum-js/configuration) - `transactionSampleRate` type, range, and default.
- [Elastic RUM JavaScript performance tuning](https://www.elastic.co/docs/reference/apm/agents/rum-js/performance-tuning) - treatment of unsampled transaction duration, result, spans, context, and labels.
- [OpenTelemetry sampling concepts](https://opentelemetry.io/docs/concepts/sampling/) - head- and tail-sampling definitions, latency/error policies, and operational trade-offs.
- [OpenTelemetry Collector tail-sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md) - same-collector trace routing, in-memory state, decision timing, and late-span behavior.
- [OpenTelemetry TraceState probability sampling](https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/) - adjusted counts, inverse inclusion probability, and the absence of a defined adjusted count for non-probabilistic samples.
- [W3C Trace Context sampled flag](https://www.w3.org/TR/trace-context/#sampled-flag) - probability, delayed-decision, and deferred sampling, plus the non-guaranteed nature of the sampled flag.
- [W3C Web Cryptography](https://www.w3.org/TR/webcrypto/) - `SubtleCrypto`, secure-context exposure, `digest()`, and SHA-256.
- [ECMAScript `Number.isFinite`](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.isfinite) and [`DataView.prototype.getUint32`](https://tc39.es/ecma262/multipage/structured-data.html#sec-dataview.prototype.getuint32) - input validation and digest-bucket conversion behavior.
- [Google `web-vitals`](https://github.com/GoogleChrome/web-vitals) - current INP/LCP metric APIs and browser measurement behavior.

## Issues Found
1. **The JavaScript rate guard accepted invalid values.** Comparisons alone allow `NaN` and coercible strings such as `"0.5"` through the stated numeric `0..1` contract. The guard now uses `Number.isFinite(rate)` before checking the range, and its error message reflects the actual requirement.
2. **The Web Crypto execution requirement was unstated.** `crypto.subtle` is exposed only in a secure context. Added the HTTPS/secure-context requirement next to the example so readers do not expect it to work on an ordinary insecure origin.
3. **The sampling metadata could record only a conditional rate.** With nested sampling, a conditional replay/detail rate is not sufficient for population weighting. Replaced `detail_sample_rate` with an end-to-end `inclusion_probability`, explicitly using `null` when selection is non-probabilistic or unknown, and clarified the surrounding weighting guidance.
4. **The Sentry error-replay description omitted a second sampling decision.** Current Sentry behavior keeps the latest 60 seconds in memory, checks `replaysOnErrorSampleRate` when an error occurs, then uploads the buffer and records the remainder only when selected. Updated the sentence to state that sequence precisely.
5. **The baseline-quota guidance could introduce selection bias.** A first-N or arrival-order cap applied after baseline selection invalidates the nominal inverse-probability weight. Added a requirement to use random/reservoir thinning with a calculable final inclusion probability, or to exclude the affected interval from population estimates.
6. **The prevalence-estimation statement was too absolute.** A representative baseline is not the only valid denominator path when broadly retained aggregate affected-session counts and eligible-session counts are available. Updated the text to describe both valid approaches.
7. **Triggered-session weighting was underspecified.** Changed the statement that a deliberately retained error session has no weight to the more precise rule that it must not receive the baseline weight; any valid weight depends on the complete inclusion policy.

## Review Notes
- Both probability examples were recalculated: 1,000 independent sessions at `p = 0.0001` give a 9.5167% observation probability, and 29,956 sessions are the minimum integer count reaching at least 95%.
- The deterministic sampler is otherwise syntactically correct: SHA-256 plus the first unsigned 32-bit word divided by `2 ** 32` yields a stable bucket in `[0, 1)` for a stable session identifier.
- Datadog's 20% overall-session rate combined with a 10% replay-among-admitted rate correctly yields replay for 2% of all sessions.
- Elastic currently sends the overall duration and result for unsampled transactions while discarding associated spans, context information, and labels, matching the post's explanation.
- INP requires an interaction before it can be reported, and LCP has page-lifecycle/visibility limitations. These do not invalidate using available locally measured values as triggers.
- All documentation links in the post, including the W3C fragment link, returned HTTP 200 after redirects during validation.
