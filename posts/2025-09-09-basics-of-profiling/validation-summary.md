# Validation Summary: Basics of profiling: Turning CPU & Memory Hotspots into Action

## Status
validated

## Post Type
Conceptual guide / educational explainer (no runnable code examples; covers profiling concepts and the emerging OpenTelemetry Profiles signal)

## Technologies Covered
- Continuous profiling (CPU, wall time, allocations, heap, lock/contention, threads/goroutines, event loop lag)
- OpenTelemetry (Profiles signal, OTLP)
- pprof format
- Node.js / V8 runtime profiling concepts
- Flame graphs / icicle charts
- General observability (logs, metrics, traces)

## Sources Consulted
- OpenTelemetry Profiles concept docs — https://opentelemetry.io/docs/concepts/signals/profiles/
- OpenTelemetry Profiles data model OTEP 0239 — https://github.com/open-telemetry/oteps/blob/main/text/profiles/0239-profiles-data-model.md
- OpenTelemetry pprof spec — https://opentelemetry.io/docs/specs/otel/profiles/pprof/
- OTLP Specification — https://opentelemetry.io/docs/specs/otlp/
- "The State of Profiling" (OpenTelemetry blog, 2024) — https://opentelemetry.io/blog/2024/state-profiling/
- OpenTelemetry Profiles Public Alpha announcement (2026) — https://opentelemetry.io/blog/2026/profiles-alpha/

## Issues Found
No technical issues found.

The core technical claims were verified and are accurate:
- Definition of continuous profiling (periodic sampling of runtime internals under production traffic) is correct.
- The distinction between CPU time and wall time, and the interpretation of a wall-vs-CPU gap as I/O or lock contention, is correct.
- Descriptions of allocation, heap, lock/contention, threads/goroutines, and Node.js event loop lag profiles are accurate.
- The "traces tell you where, profiles tell you why" framing and the request-scoped vs process-scoped mental model are sound.
- OpenTelemetry Profiles signal status is correctly described for the post's September 2025 timeframe — it was an emerging signal still in draft/development at the time (it later entered public Alpha in March 2026). The post appropriately hedges with "emerging", "drafts and early implementations", and "likely".
- The profile data model fields referenced (period, sample type, sample unit, stack frames, locations, functions, mapping) align with the pprof-derived OpenTelemetry profile data model.
- The note that pprof originated with Go and is now widely reused, and that runtimes still emit native formats (pprof, JFR, async-profiler) that collectors transform, is accurate.

## Review Notes
- The post hedges the OTLP path as "likely `otlp/v1/profiles`". This was appropriately tentative at the time of writing. As the signal matured, the development OTLP path settled on `/v1development/profiles`. Since the post explicitly marks this as a guess and is framed around the Sept 2025 draft state, no change was made; a future refresh could update this once the path stabilizes.
- The "Sept 2025" timestamp in section 5 anchors the OpenTelemetry maturity claims to a point in time, which keeps the (now somewhat dated) status statements accurate in context. A future update could note that Profiles reached public Alpha in March 2026.
- No code, CLI commands, or configuration snippets are present, so there was nothing to test for syntax or deprecation.
- Internal "Related Reading" links use the standard oneuptime.com/blog/post/.../view format and are plausible.
