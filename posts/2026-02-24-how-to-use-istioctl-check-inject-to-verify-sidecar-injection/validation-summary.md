# Validation Summary: How to Use istioctl check-inject to Verify Sidecar Injection

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio
- istioctl
- Kubernetes mutating admission webhooks
- Kubernetes namespace and pod labels
- Istio sidecar injection
- Envoy sidecars

## Sources Consulted
- Istio documentation: Verifying Istio Sidecar Injection with Istioctl Check-Inject, https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio command reference: istioctl experimental check-inject, https://istio.io/latest/docs/reference/commands/istioctl/
- Istio documentation: Installing the Sidecar, https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio reference: Resource Labels, https://istio.io/latest/docs/reference/config/labels/
- Istio reference: Resource Annotations, https://istio.io/latest/docs/reference/config/annotations/
- Istio documentation: Sidecar Injection Problems, https://istio.io/latest/docs/ops/common-problems/injection/

## Issues Found
- The post used `istioctl check-inject` as a top-level command. Current official Istio documentation lists this as `istioctl experimental check-inject`, with `istioctl x check-inject` as the shorthand. I updated the command examples and summary wording.
- Several examples used `istioctl check-inject -n <namespace>` as a namespace-only check. Official examples require a pod/deployment target or `-l` label pairs in a namespace. I updated namespace-oriented examples to use `-l`.
- The sample output used older-looking `NAMESPACE`/`POD` tables. Current official output is webhook-based with `WEBHOOK`, `REVISION`, `INJECTED`, and `REASON`. I updated sample outputs to match the documented shape.
- The post described `sidecar.istio.io/inject` as a pod annotation. Istio now documents the annotation form as deprecated in favor of the `sidecar.istio.io/inject` label. I changed the injection override examples and explanation to use labels, while keeping sidecar resource tuning as annotations.
- The post implied `IstioOperator` matching as part of the webhook's per-pod injection decision. I changed this to refer to injector default configuration, which matches Istio's documented injection policy logic.
- The namespace exclusion note listed `istio-system` as excluded by default. Istio documents `kube-system` and `kube-public` as ignored by automatic injection, while `istio-system` is commonly disabled by operators. I adjusted the wording.

## Review Notes
The post remains version-neutral. The command is still marked experimental in the Istio 1.30 documentation available on 2026-05-21, so future Istio releases may move or rename it.
