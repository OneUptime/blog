# Validation Summary: How to Fix Traces Not Appearing in Jaeger When Spans Are Marked with

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry SDK sampling
- OpenTelemetry Collector
- Jaeger
- W3C Trace Context
- OTLP
- Go, .NET, and Python OpenTelemetry SDK snippets
- otel-cli

## Sources Consulted
- Jaeger sampling documentation: https://www.jaegertracing.io/docs/sampling/
- Jaeger v1 sampling documentation: https://www.jaegertracing.io/docs/1.38/architecture/sampling/
- Jaeger deployment and OTLP ports documentation: https://www.jaegertracing.io/docs/1.75/deployment/
- Jaeger CLI flags documentation for OTLP collector settings: https://www.jaegertracing.io/docs/1.22/deployment/cli/
- OpenTelemetry Go sampling documentation: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry .NET sampling documentation: https://opentelemetry.io/docs/languages/dotnet/sampling/
- OpenTelemetry Python sampling documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- otel-cli README and command documentation: https://github.com/equinix-labs/otel-cli
- Jaeger adaptive sampling source behavior for legacy sampler tags: https://github.com/jaegertracing/jaeger

## Issues Found
- The post claimed Jaeger maps OTLP sampling flags to `sampler.type` and may drop or de-index traces when that tag is `unknown`. Updated the explanation to distinguish OpenTelemetry's W3C sampled trace flag from legacy Jaeger `sampler.type` and `sampler.param` tags, and clarified that unknown legacy tags are not a general Jaeger search/drop condition.
- The diagnosis said `sampler.type: unknown` confirms the missing-trace issue. Changed it to say this only confirms missing or unrecognized legacy Jaeger sampler metadata, and that the W3C sampled flag must be checked separately.
- The direct trace-ID search step overstated the cause as incorrect indexing. Reworded it to include service name, operation name, time range, tenant headers, and storage index as possible causes.
- The Jaeger sampling configuration used invalid `SAMPLING_CONFIG_TYPE: const` and `SAMPLING_CONFIG_PARAM: 1` settings for Jaeger remote sampling. Replaced it with a valid remote sampling strategy file using `probabilistic` sampling with `param: 1.0` and environment variables pointing Jaeger to that file.
- The Collector attributes processor section implied that setting `sampler.type` and `sampler.param` fixes OpenTelemetry sampling. Clarified that it only adds legacy Jaeger sampler tags and does not change the W3C sampled flag.
- The Jaeger OTLP configuration snippet used an inaccurate nested YAML shape for Jaeger v1-style configuration. Replaced it with documented Jaeger environment variables for enabling OTLP and binding the gRPC and HTTP OTLP ports.
- The verification step required legacy sampler tags as the expected success condition. Changed it so those tags are only checked when the deployment still relies on legacy Jaeger sampling metadata.

## Review Notes
The Go, .NET, and Python sampler examples use current APIs. The otel-cli command flags are valid. OpenTelemetry SDK defaults are often parent-based with an always-on root sampler, so production deployments may prefer parent-based ratio sampling or Collector tail sampling instead of always-on sampling.
