# Validation Summary: Copy Matching Resource Attributes into a Nested Map with OTTL

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide.

## Technologies Covered

- OpenTelemetry Collector Contrib 0.160.0
- OTTL cache and map editors
- Resource attributes and structured log bodies

## Sources Consulted

- [OTTL function contracts](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md)
- [keep_matching_keys implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_keep_matching_keys.go)
- [Cache path implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/internal/ctxcache/cache.go)
- [Map copying and indexing implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/internal/ctxutil/map.go)
- [Value copying and nested indexing implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/internal/ctxutil/value.go)
- [Log context, cache, and time paths](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottllog/README.md)
- [Collector validate command implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/otelcol/command_validate.go)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed both complete processor fragments and the regular-expression escape layers. The anchored pattern matches literal k8s. and cloud. prefixes and excludes k8sXnamespace.
- Traced cache assignment through SetMapValue/SetValue: pcommon.Map values are copied, so destructive filtering of the cache does not mutate resource attributes. The destination body is guarded as a map.
- Checked overwrite versus absence-only behavior, merge conflict strategies, string-body handling, and empty-selection semantics. Also inspected retained authoring fixture output showing the original resource intact and selected keys in each map body.
- Also inspected the retained authoring-run configuration result for this post: 2 fragments met their expected validity result. These earlier results were not rerun here; intentionally broken examples remain identified as such.
- Reviewed on 2026-09-10 against official documentation and tagged source. No new Collector runtime execution or backend integration test was performed during this review.
