# Validation Summary: How to Fix OpenTelemetry Operator Webhook Timeout Errors in Large Clusters

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes admission webhooks
- Kubernetes MutatingWebhookConfiguration
- Kubernetes kubectl
- Kubernetes API server metrics
- OpenTelemetry Operator
- OpenTelemetry auto-instrumentation
- Prometheus alerting

## Sources Consulted
- Kubernetes MutatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- OpenTelemetry Operator automatic instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Operator upstream manifest: https://github.com/open-telemetry/opentelemetry-operator/releases/latest/download/opentelemetry-operator.yaml
- OpenTelemetry Operator Helm chart values and templates: https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-operator

## Issues Found
- The timeout patch used `/webhooks/0/timeoutSeconds`, but the `mpod.kb.io` webhook is not guaranteed to be at index 0. In the current upstream manifest it is index 3, while the Helm chart can render a different order. Changed the command to select the webhook by name with `jq` before replacing the configuration.
- The leader election example used older controller-runtime-style flag names and implied leader election is what lets multiple replicas serve webhooks. Updated the text to clarify leader election prevents conflicting controller reconciliation loops, and changed the example flags to the OpenTelemetry Operator Helm chart's current `--enable-leader-election`, `--health-probe-addr`, and `--metrics-addr` flags.
- The post suggested changing the pod webhook `failurePolicy` to `Ignore`, but current OpenTelemetry Operator defaults already set `mpod.kb.io` to `Ignore`. Changed the section to verification guidance instead of presenting it as a required change.
- The `objectSelector` example used an OpenTelemetry annotation key even though Kubernetes object selectors match labels, not annotations. Changed the example to use a label key.
- The Operator metrics example used `8080` and unauthenticated HTTP, while current Operator packaging serves secure metrics on `8443` by default. Updated the command to port-forward the metrics service on `8443`, create a service account token, and query with HTTPS and a bearer token.
- The Prometheus alert filtered `apiserver_admission_webhook_admission_duration_seconds_bucket` by the MutatingWebhookConfiguration name, but Kubernetes labels this metric by webhook name. Changed the label matcher to `name="mpod.kb.io"`.
- The final summary still referred to changing `failurePolicy` to `Ignore` as a workaround. Updated it to describe keeping the default fail-open pod webhook policy as blast-radius reduction rather than a permanent performance fix.

## Review Notes
The Kubernetes webhook timeout limit of 1-30 seconds and default of 10 seconds are accurate. The `namespaceSelector`, `objectSelector`, `timeoutSeconds`, and `failurePolicy` fields are current Kubernetes `admissionregistration.k8s.io/v1` fields. The OpenTelemetry Operator's exact rendered deployment and webhook names can differ between raw manifest and Helm installations, so future revisions should avoid index-based webhook patches and note install-method differences where commands depend on generated resource names.
