# Validation Summary: How to Create Always-Off Sampling

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry tracing and sampling
- OpenTelemetry JavaScript SDK and HTTP auto-instrumentation
- OpenTelemetry Python FastAPI instrumentation
- OpenTelemetry Go `otelhttp`
- OpenTelemetry Collector filter and probabilistic sampler processors
- Kubernetes ConfigMaps and `kubectl patch`
- TypeScript, Python, Go, YAML, and shell commands

## Sources Consulted
- OpenTelemetry JavaScript Node SDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript HTTP instrumentation documentation: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-instrumentation-http/README.md
- OpenTelemetry JavaScript sampling documentation: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry JavaScript SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript API and SDK package type definitions from current npm packages
- OpenTelemetry Python FastAPI instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- OpenTelemetry Go `otelhttp` package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- Kubernetes `kubectl patch` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- The FastAPI example used `FastAPIInstrumentor.instrument(...)` without an application object and included unused hook functions that did not disable tracing. Changed it to create a `FastAPI` app and call `FastAPIInstrumentor.instrument_app(app, excluded_urls=...)`, matching the documented API.
- The TypeScript custom sampler examples imported `Sampler`, `SamplingDecision`, and `SamplingResult` from `@opentelemetry/api`. Those sampler SDK types should come from `@opentelemetry/sdk-trace-base` in current OpenTelemetry JS SDK usage. Updated the imports in all custom sampler examples.
- The feature flag sampler used untyped `shouldSample` parameters while the surrounding examples were TypeScript. Added the current sampler method parameter types.
- The Collector filter processor examples used the older `traces.span` shape and `matches` expressions. Updated them to current `trace_conditions` OTTL examples using `span.attributes`, `span.name`, and `IsMatch(...)`.
- The sampling processor section implied probabilistic sampling with `sampling_percentage: 0` could be used for specific spans. Corrected it to describe this as a global always-off pipeline behavior and directed selective rules to the filter processor.
- The monitoring example imported an unused `Counter` type and referenced `meter` without defining it. Updated it to use `metrics.getMeter(...)`.
- The recommendation claimed SDK-level filtering eliminates overhead entirely. Refined it to distinguish instrumentation-level filters, which can avoid span creation, from sampler-based rules, which still run at span creation time.

## Review Notes
- The Go `otelhttp.WithFilter` example is consistent with the current package documentation: if a filter excludes a request, no span is created for that request.
- The Kubernetes ConfigMap and `kubectl patch` snippets are syntactically valid. In a real cluster, ConfigMap volume updates are not literally instantaneous in every pod; applications should poll or watch mounted files if they rely on runtime toggles.
- The Collector filter processor documentation reviewed applies to OpenTelemetry Collector Contrib 0.146.0 and later. Older collector versions may still support older configuration forms.
