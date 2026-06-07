# Validation Summary: How to Implement Tekton Event Listeners

## Status
validated

## Post Type
Tutorial / hands-on implementation guide

## Technologies Covered
- Tekton Triggers (EventListener, TriggerBinding, TriggerTemplate, Interceptors)
- Tekton Pipelines (PipelineRun)
- Kubernetes (RBAC, NetworkPolicy, Ingress, Service, HPA, PodDisruptionBudget)
- CEL (Common Expression Language) for interceptor filtering and overlays
- GitHub / GitLab webhooks (signature validation, IP ranges)
- Prometheus / ServiceMonitor / PrometheusRule (kube-prometheus stack)
- cert-manager and nginx-ingress (annotations)
- AWS NLB annotations on Service

## Sources Consulted
- Tekton Triggers EventListeners docs: https://tekton.dev/docs/triggers/eventlisteners/
- Tekton Triggers metrics docs: https://tekton.dev/docs/triggers/metrics/
- Tekton Triggers eventlisteners.md (GitHub): https://github.com/tektoncd/triggers/blob/main/docs/eventlisteners.md
- Tekton Triggers TriggerBindings docs: https://tekton.dev/docs/triggers/triggerbindings/
- Tekton Triggers TriggerTemplates docs: https://tekton.dev/docs/triggers/triggertemplates/
- Tekton ClusterInterceptors docs: https://tekton.dev/docs/triggers/clusterinterceptors/
- Tekton Namespaced Interceptors docs: https://tekton.dev/docs/triggers/namespacedinterceptors/
- Tekton Pipelines v1beta1 → v1 migration guide: https://tekton.dev/docs/pipelines/migrating-v1beta1-to-v1/
- GitHub meta API for webhook hook IP ranges: https://api.github.com/meta
- Kubernetes API reference for NetworkPolicy, Ingress, HPA (autoscaling/v2), PDB (policy/v1)

## Issues Found

1. **Multi-tenant inline binding name mismatched the TriggerTemplate parameter name.** In the `Multi-Tenant Event Listeners` section, the inline bindings used `name: namespace-binding`, but the corresponding TriggerTemplate declared the parameter as `target-namespace`. Per Tekton docs, the binding param name must match the template param name exactly, or the substitution will fail. Renamed both team-a and team-b inline bindings to `name: target-namespace` so the value actually flows into `$(tt.params.target-namespace)` in the PipelineRun's `metadata.namespace`.

2. **Prometheus metric names were fabricated.** The post referenced `http_requests_total{job="tekton-triggers"}`, `interceptor_validation_failures_total`, and `trigger_resource_creation_duration_seconds_bucket` — none of which exist in Tekton Triggers. Replaced with the actual EventListener metrics documented in https://tekton.dev/docs/triggers/metrics/: `eventlistener_event_received_count` (counter, with a `status` label of `success`/`error`), `eventlistener_http_duration_seconds_bucket` (histogram), and `eventlistener_triggered_resources` (counter, with a `kind` label). Updated both the "Key Metrics to Monitor" PromQL examples and the `HighWebhookFailureRate` alert expression to use these real metric names. Also clarified that EventListeners expose metrics on the dedicated metrics port 9000 (distinct from the event sink port 8080).

3. **Readiness probe pointed at a non-existent `/ready` endpoint.** The EventListener sink only exposes `/live` on port 8080; there is no separate `/ready` path. Changed the readiness probe path in the production config from `/ready` to `/live` so the probe will actually succeed.

## Review Notes
- The post uses `apiVersion: tekton.dev/v1beta1` for PipelineRun in TriggerTemplate `resourcetemplates`. This is deprecated since Tekton Pipelines v0.50.0 — `tekton.dev/v1` is the stable version — but v1beta1 is still served for backward compatibility and works correctly, so I did not modify it. A future revision should migrate the embedded PipelineRun manifests to `tekton.dev/v1`.
- The post uses the deprecated `kubernetes.io/ingress.class: nginx` annotation on the Ingress object rather than the modern `spec.ingressClassName: nginx` field. The annotation still works on current ingress-nginx versions, so this is a stylistic recommendation rather than a correctness issue.
- The GitHub webhook CIDR list (140.82.112.0/20, 185.199.108.0/22, 192.30.252.0/22) is correct as of this review, but the post wisely already references https://api.github.com/meta for current ranges. GitHub also publishes 143.55.64.0/20 in the `hooks` array, which could optionally be added.
- The "Rate Limiting Configuration" subsection actually only sets pod resource requests/limits — it does not configure true rate limiting (such as via the ingress controller or a sidecar). This is a minor naming/scope mismatch in the post but not a technical inaccuracy in the code itself, so I left it intact per the "do not restructure" guidance.
- The signature test command (`echo -n "$(cat /tmp/payload.json)"`) relies on shell command substitution stripping the trailing newline; this works but is fragile compared to feeding the file directly via stdin. Functional as written.
- The GitLab interceptor `secretKey: token` is a convention, not a Tekton requirement — the key name is whatever the user puts in the secret, so this is fine as written.
