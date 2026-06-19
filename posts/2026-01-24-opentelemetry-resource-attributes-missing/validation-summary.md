# Validation Summary: How to Fix 'Resource Attributes Missing' in OpenTelemetry

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry JavaScript/Node.js SDK (`@opentelemetry/sdk-node`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, `@opentelemetry/api`)
- OpenTelemetry Python SDK (`opentelemetry-sdk` resources and trace APIs)
- OpenTelemetry resource semantic conventions (`service.*`, `deployment.*`, `host.*`, `process.*`, `k8s.*`)
- OpenTelemetry Collector configuration (OTLP receiver, debug exporter)
- Kubernetes Downward API and container/pod metadata
- Environment-variable configuration (`OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES`)

## Sources Consulted
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry SDK environment variables (`OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES`): https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry JS resources package (`Resource`, `detectResourcesSync`, `*DetectorSync`): https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-resources
- OpenTelemetry JS semantic-conventions (`SEMRESATTRS_*` constants): https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/semantic-conventions
- OpenTelemetry JS API `ProxyTracerProvider` / `getDelegate()`: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_api.ProxyTracerProvider.html
- OpenTelemetry Python resources docs (`Resource.create`, `SERVICE_NAME`, detectors): https://opentelemetry-python.readthedocs.io/en/latest/sdk/resources.html
- OpenTelemetry Collector debug exporter: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- Kubernetes Downward API: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/

## Issues Found
- **Runtime resource inspection snippet never executed (Step 2, JavaScript).** The example called `const provider = trace.getTracerProvider()` and then checked `if (provider instanceof NodeTracerProvider)`. `trace.getTracerProvider()` returns a `ProxyTracerProvider`, never a `NodeTracerProvider` directly, so the `instanceof` check is always false and the entire debug block would silently do nothing. Fixed by unwrapping the proxy with `provider.getDelegate()` (a public method on `ProxyTracerProvider`) before the `instanceof` check, so the snippet actually reaches the SDK-registered provider.

## Review Notes
- The post is written against the OpenTelemetry JS **1.x** API surface. The `new Resource(...)` constructor, the `SEMRESATTRS_*` semantic-convention constants, and the synchronous detection exports (`detectResourcesSync`, `envDetectorSync`, `hostDetectorSync`, `osDetectorSync`, `processDetectorSync`) are all valid for that line. In OpenTelemetry JS **2.0+** these were removed/replaced: resources are now built with `resourceFromAttributes(...)`, the constants moved to the `ATTR_*` naming (e.g. `ATTR_SERVICE_NAME`), and detection moved to `detectResources(...)` with `ResourceDetector` types. The examples remain correct for 1.x but would need updating for 2.x.
- The Python example uses `pkg_resources.get_distribution(...)`, which still works but is deprecated by setuptools; `importlib.metadata.version(...)` is the modern replacement. Left as-is since it is functional and not incorrect.
- The Python debug example imports `get_aggregated_resources`, `OTELResourceDetector`, and `ProcessResourceDetector` without using them. Harmless unused imports, not a correctness error, so left unchanged.
- The Collector `debug` exporter config (`verbosity`, `sampling_initial`, `sampling_thereafter`) is correct for the current debug exporter (the successor to the deprecated `logging` exporter).
- The cgroup container-ID regex `[a-f0-9]{64}` matches the typical cgroup v1 layout; on some cgroup v2 / containerd hosts the path format differs, so detection is best-effort. The example already wraps it in a try/catch and treats failure as non-critical, which is appropriate.
- Hostnames, image tags (`my-service:latest`), and paths are intentionally illustrative placeholders; image tags should be pinned in production.
