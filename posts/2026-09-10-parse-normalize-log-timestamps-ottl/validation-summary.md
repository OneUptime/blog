# Validation Summary: Parse and Normalize Nonstandard Log Timestamps with OTTL

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide.

## Technologies Covered

- OpenTelemetry Collector Contrib 0.160.0
- OTTL Time, UnixNano, FormatTime, and cache
- OTLP event/observed timestamps and IANA zones

## Sources Consulted

- [OTTL function contracts](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md)
- [Time parser implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_time.go)
- [Log context, cache, and time paths](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottllog/README.md)
- [Value copying and nested indexing implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/internal/ctxutil/value.go)
- [Collector validate command implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/otelcol/command_validate.go)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed both timestamp processors, supported parser substitutions, location/locale arguments, success guards, and the sample timezone conversion. UnixNano(Time(...)) returns an int64 suitable for cache; a time.Time object is not a supported cache scalar.
- Confirmed separate event and observed-time paths, preservation on malformed/nonstring input, and the distinction between display precision and actual event timestamps. The %s warning correctly follows this parser's nanosecond substitution.
- Also inspected retained authoring output: the two explicit offsets produce 1789028130000000000 nanoseconds; malformed inputs preserve original event and observed times. FormatTime with %z produces Z for UTC in this implementation, consistent with the article not hard-coding a timezone suffix.
- Also inspected the retained authoring-run configuration result for this post: 2 fragments met their expected validity result. These earlier results were not rerun here; intentionally broken examples remain identified as such.
- Reviewed on 2026-09-10 against official documentation and tagged source. No new Collector runtime execution or backend integration test was performed during this review.
