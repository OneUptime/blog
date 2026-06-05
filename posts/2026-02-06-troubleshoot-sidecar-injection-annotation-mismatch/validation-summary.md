# Validation Summary: How to Troubleshoot Operator Sidecar Injection Not Working Due to Wrong

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Operator
- OpenTelemetry auto-instrumentation
- Kubernetes annotations
- Kubernetes Deployments and Pods
- kubectl

## Sources Consulted
- OpenTelemetry Operator automatic instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Operator GitHub documentation: https://github.com/open-telemetry/opentelemetry-operator
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The Go annotation example implied that `instrumentation.opentelemetry.io/inject-go: "true"` was sufficient. Updated the comment and example to note the Go instrumentation feature gate and required target executable annotation, because the Operator requires `OTEL_GO_AUTO_TARGET_EXE` through either the annotation or Instrumentation resource.
- The `inject-sdk` description incorrectly described a collector sidecar. Updated it to say SDK-only injection adds OpenTelemetry SDK environment variables and does not inject an SDK or collector sidecar.
- The valid annotation values section omitted the documented cross-namespace Instrumentation reference form. Added `observability/my-instrumentation` as an example.
- The successful injection example used `opentelemetry-auto-instrumentation-python` as the init container name. Updated it to the documented `opentelemetry-auto-instrumentation` name.

## Review Notes
The remaining annotation keys, pod-template placement guidance, namespace-level opt-in behavior, multi-container `container-names` guidance, and kubectl command syntax are consistent with the official documentation. Go, NGINX, and multi-instrumentation support depend on Operator feature gates, so future revisions could mention those version and configuration caveats in more detail.
