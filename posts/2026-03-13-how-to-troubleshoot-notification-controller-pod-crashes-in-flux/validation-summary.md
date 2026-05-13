# Validation Summary: How to Troubleshoot Notification Controller Pod Crashes in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Flux Notification Controller
- Kubernetes
- kubectl
- Flux CLI
- Prometheus metrics
- Webhooks, Ingress, and TLS

## Sources Consulted
- Flux Notification Controller documentation: https://fluxcd.io/flux/components/notification/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux Events documentation: https://fluxcd.io/flux/components/notification/events/
- Flux CLI reference for alerts and alert-providers: https://fluxcd.io/flux/cmd/flux_get_alerts/ and https://fluxcd.io/flux/cmd/flux_get_alert-providers/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The Alert YAML used `notification.toolkit.fluxcd.io/v1`, but current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3` for Alert and Provider resources. Changed the Alert example to `v1beta3`.
- The Alert example used `name: production-*`, but Flux Alert docs document exact names or `'*'` as the wildcard, with `matchLabels` for label-based selection. Changed the example to `name: '*'` with a production label selector.
- The unreachable endpoint section implied that ordinary Provider endpoint timeouts can make the controller crash. Adjusted the wording to describe logged delivery errors and outbound request waits, which matches the Provider timeout behavior documented by Flux.
- The OOMKilled section claimed events may contain full resource manifests. Flux event documentation describes event payloads in terms of involved object, message, severity, and metadata, not full manifests. Changed the section to focus on high event volume and low memory limits.
- The invalid configuration section claimed misconfigured Alert or Provider resources can cause controller panics. Flux documents these resources through Kubernetes API validation and readiness/reconciliation status. Changed the wording to validation and reconciliation errors.
- The webhook receiver TLS section described TLS certificate issues as controller crashes. Flux exposes the webhook receiver over a service, with TLS commonly handled by Ingress, Gateway, or load balancer. Changed the wording to webhook delivery failures.
- The service section described a single webhook receiver endpoint. Flux installs services for the event API and webhook receiver; changed the text to reflect both services.
- The prevention tips referenced event queue depth metrics. Flux documents controller runtime, HTTP request, and rate-limited event metrics; changed the recommendation accordingly.

## Review Notes
The kubectl and Flux CLI commands are syntactically plausible, but local `kubectl` and `flux` binaries were not installed in this workspace, so command behavior was verified against official documentation rather than local help output.
