# Validation Summary: How to implement OpenTelemetry auto-instrumentation operator for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Operator for Kubernetes
- OpenTelemetry auto-instrumentation
- Kubernetes admission webhooks and pod annotations
- Helm
- cert-manager
- OpenTelemetry Collector
- Java, Python, Node.js, and .NET auto-instrumentation

## Sources Consulted
- OpenTelemetry Operator Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Operator auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Operator documentation and examples: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator GitHub README: https://github.com/open-telemetry/opentelemetry-operator
- OpenTelemetry Operator CRD schemas: https://github.com/open-telemetry/opentelemetry-operator/tree/main/config/crd/bases
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- cert-manager release and support documentation: https://cert-manager.io/docs/releases/

## Issues Found
- The post claimed auto-instrumentation avoided deployment manifest changes entirely. I narrowed this to container image changes and manual instrumentation configuration because the examples still require pod or namespace annotations.
- The application annotations used `"true"` while the post's Instrumentation resource was named `my-instrumentation`. I changed the Java, Python, Node.js, and multi-language examples to reference `my-instrumentation` explicitly.
- The Python and .NET instrumentation examples used a global OTLP/gRPC endpoint on port 4317 without overriding the language defaults. I added language-specific `OTEL_EXPORTER_OTLP_ENDPOINT` values using port 4318 because Python and .NET auto-instrumentation use OTLP/HTTP by default.
- The Python explanation said the operator modifies the container command. I changed this to say it injects environment variables and instrumentation files.
- The Node.js Instrumentation example used `OTEL_NODEJS_DEBUG`, which is not the documented Node.js OpenTelemetry diagnostics setting. I changed it to `OTEL_LOG_LEVEL`.
- The Node.js verification path used `/otel-auto-instrumentation/autoinstrumentation.js`. I corrected it to `/otel-auto-instrumentation-nodejs/autoinstrumentation.js`.
- The multi-language pod example put container names directly in the injection annotation values. I changed it to use `instrumentation.opentelemetry.io/java-container-names` and `instrumentation.opentelemetry.io/python-container-names`, and noted that multi-instrumentation must be enabled.
- The OpenTelemetryCollector example used deprecated `opentelemetry.io/v1alpha1` with string `spec.config`. I updated it to `opentelemetry.io/v1beta1` and structured `spec.config`.
- The Collector example used the deprecated `logging` exporter and `loglevel`. I replaced it with the current `debug` exporter and `verbosity`.
- Resource attribute examples used non-current environment naming keys. I changed them to `deployment.environment.name`.

## Review Notes
The cert-manager install command is pinned to an older release. It is still a plausible installation URL, but future revisions should consider linking to the current cert-manager installation docs or using a maintained version appropriate for the target Kubernetes version.
