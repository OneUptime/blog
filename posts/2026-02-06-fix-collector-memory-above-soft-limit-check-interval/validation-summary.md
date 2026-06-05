# Validation Summary: How to Fix the Collector Refusing Data with 'Memory Usage Above Soft Limit' by

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector memory_limiter processor
- Collector internal telemetry metrics
- Go runtime memory management and GOMEMLIMIT
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector memorylimiterprocessor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector memory limiter source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/main/internal/memorylimiter/memorylimiter.go
- OpenTelemetry Collector memory limiter config source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/main/internal/memorylimiter/config.go
- OpenTelemetry Collector memory limiter obsreport source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/main/processor/memorylimiterprocessor/obsreport.go

## Issues Found
- The post stated that data is being lost whenever applications see transient export errors. The memory limiter returns non-permanent errors and receivers are expected to retry, so I changed this to say data may be retried and can be lost if clients or upstream components do not retry long enough.
- The example said a 400 MiB hard limit with a 100 MiB spike limit could start refusing after a 410 MiB spike. Since the soft limit is 300 MiB and 410 MiB is already above the hard limit, I changed the example spike to 310 MiB.
- The spike limit explanation said increasing `spike_limit_mib` gives more headroom before refusing data. Increasing it lowers the soft limit and makes refusal start earlier, while leaving more room before the hard limit, so I corrected that wording.
- The `GOMEMLIMIT` example placed `GOMEMLIMIT` above the memory limiter hard limit. Official memory limiter documentation recommends setting `GOMEMLIMIT` to about 80% of the Collector hard memory limit, so I changed the example to put `GOMEMLIMIT` at 640 MiB for an 800 MiB memory limiter hard limit.
- The diagnosis section said the memory limiter uses all Go-managed memory and compared refusals only with RSS. Current source checks `runtime.MemStats.Alloc`, so I changed the text to compare RSS with heap allocation and added `otelcol_process_runtime_heap_alloc_bytes`.
- The internal telemetry configuration used the older `service.telemetry.metrics.address` form. Current Collector docs configure the Prometheus endpoint under `service.telemetry.metrics.readers`, so I updated the YAML.

## Review Notes
- The memory limiter configuration field names (`check_interval`, `limit_mib`, `spike_limit_mib`, `limit_percentage`, and `spike_limit_percentage`) are current and valid.
- The processor refusal metric names are emitted by the memory limiter processor, but Prometheus deployments may expose counter suffixes depending on exporter configuration.
