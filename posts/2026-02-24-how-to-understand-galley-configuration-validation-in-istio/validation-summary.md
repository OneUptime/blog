# Validation Summary: How to Understand Galley (Configuration Validation) in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istiod
- Galley
- Kubernetes ValidatingAdmissionWebhook
- Istio custom resources
- istioctl
- kubectl
- Prometheus metrics

## Sources Consulted
- Istio 1.5 upgrade notes: https://istio.io/latest/news/releases/1.5.x/announcing-1.5/upgrade-notes/
- Istio configuration validation problems: https://istio.io/latest/docs/ops/common-problems/validation/
- Istio dynamic admission webhooks overview: https://istio.io/latest/docs/ops/configuration/mesh/webhook/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio configuration analysis messages: https://istio.io/latest/docs/reference/config/analysis/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio pilot-discovery command and metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes API concepts, dry run and admission behavior: https://kubernetes.io/docs/reference/using-api/api-concepts/

## Issues Found
- The post described Galley as the current validation component. Updated the wording to clarify that Galley was the pre-Istio 1.5 component and that validation is now handled by istiod.
- The VirtualService example claimed route weights must sum to 100. Current Istio documents weights as relative proportions and the validator rejects the all-zero multi-destination case instead. Updated the example and error.
- The DestinationRule error text for an unsupported load balancer enum was too specific and not reliably current. Updated it to describe a schema validation error for the unsupported `FASTEST` enum value.
- The Gateway example claimed a port conflict for two distinct server port names. Updated it to use duplicate server port names, which Istio validation checks.
- The `istioctl analyze -f ... --use-kube=false` examples used the wrong syntax. Updated them to `istioctl analyze --use-kube=false <path>`.
- The analyzer examples and table included stale or mismatched codes, including `IST0104` and an incorrect `IST0127` description. Updated the examples and table to current analysis message meanings.
- The bypass section implied `--validate=false` could bypass the webhook before later contradicting itself. Updated the wording to clarify that it only skips kubectl schema or field validation and does not bypass admission webhooks.
- The metrics example used `kubectl exec` with `curl` inside the istiod container, which is not a reliable assumption. Updated it to port-forward `deploy/istiod` and curl the local metrics endpoint.

## Review Notes
The post remains centered on Galley for historical context, but current Istio users should think of configuration validation as an istiod validation webhook. The metric names still use the legacy `galley_validation_*` prefix in Istio's exported metrics.
