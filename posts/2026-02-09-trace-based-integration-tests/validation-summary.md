# Validation Summary: How to Build Trace-Based Integration Tests for Kubernetes Microservice Chains

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- OpenTelemetry Collector
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python SDK
- OTLP
- Jaeger
- pytest
- GitHub Actions
- kind

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry JavaScript Node.js getting started guide: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript resources API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry semantic conventions for deployment attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Jaeger APIs documentation: https://www.jaegertracing.io/docs/1.76/architecture/apis/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- GitHub Actions checkout Marketplace page: https://github.com/marketplace/actions/checkout
- GitHub Actions artifact documentation: https://docs.github.com/actions/using-workflows/storing-workflow-data-as-artifacts
- GitHub upload-artifact deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/

## Issues Found
- The OpenTelemetry Collector deployment mounted the ConfigMap at `/etc/otel/config.yaml` but did not tell the collector to load that path. Added `args: ["--config=/etc/otel/config.yaml"]`.
- The Collector image version was old and the example used the deprecated `logging` exporter. Updated the image to `otel/opentelemetry-collector-contrib:0.153.0` and replaced `logging` with the supported `debug` exporter and `verbosity: detailed`.
- The Node.js example used deprecated/removed resource APIs and semantic convention constants. Replaced `new Resource(...)` and `SemanticResourceAttributes.*` with `resourceFromAttributes(...)` and current `ATTR_*` constants.
- The Express service read `req.body` without registering JSON body parsing middleware. Added `app.use(express.json())`.
- The payment failure test sent `paymentMethod`, but the order service did not forward it to the payment service. Added `paymentMethod` to the payment request body.
- The Python test description referenced the Jaeger client package, but the code uses the Jaeger Query HTTP API directly. Updated the text and removed unused `jaeger_client` and `json` imports.
- The Python tests created and set a new global OpenTelemetry tracer provider in each test. Since the global provider can only be set once in normal SDK usage, this could cause later tests to use the wrong provider and fail to flush. Added session-scoped tracer provider and tracer fixtures.
- The Python test client created a root span but did not inject trace context into outbound HTTP requests, so service spans would not appear under the captured trace ID. Added `opentelemetry.propagate.inject` and passed the injected headers to `requests.post`.
- The Jaeger JSON parsing assumed each span had `span['process']['serviceName']`. Jaeger trace JSON stores `processID` on spans and service names in the top-level `processes` map. Updated span lookup and retry assertions accordingly.
- The GitHub Actions workflow used `actions/upload-artifact@v3`, which is deprecated and no longer usable on GitHub.com. Updated it to `actions/upload-artifact@v4`.
- The workflow used an older checkout action. Updated `actions/checkout@v3` to `actions/checkout@v6`.

## Review Notes
The examples assume the referenced Jaeger, order-service, payment-service, and inventory-service Kubernetes manifests exist and expose the service names used in the snippets. The post does not include those manifests, but the assumptions are consistent with the tutorial's stated scope.
