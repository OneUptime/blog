# Validation Summary: How to Create Istio Runbooks for On-Call Teams

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Kubernetes
- Envoy sidecar proxies
- Istio mTLS and PeerAuthentication
- Istio Gateway and VirtualService routing
- Istio sidecar injection
- Argo CD / GitOps workflows
- Prometheus-style alerting

## Sources Consulted
- Istio command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio diagnostic tool reference for `istioctl x describe`: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio standard metrics documentation: https://istio.io/latest/docs/reference/config/metrics/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The high error rate alert used a non-standard metric name, `istio_requests_5xx_rate`. Changed it to a Prometheus expression based on Istio's standard `istio_requests_total` metric and `response_code` label.
- The mTLS alert referenced `envoy_cluster_ssl_handshake_error`, which is not an Istio standard metric name. Changed the wording to describe increasing mTLS-related Envoy SSL errors without implying a specific non-standard metric.
- The mTLS diagnostic command used the obsolete `istioctl authn tls-check` workflow. Replaced it with current `istioctl x describe pod`, which Istio documents for pod-level traffic and mTLS diagnostics.
- The certificate remediation said to restart istiod to trigger certificate rotation. Updated it to restart affected workload pods for workload certificate renewal and to check istiod/CA first if many workloads are affected.
- The sidecar injection section checked pod annotations for `sidecar.istio.io/inject`, but Istio documents the label form as the current override mechanism. Updated the command and text to check labels.
- The init container log command omitted the namespace. Added `-n <namespace>` so the command works outside the current namespace.
- The sidecar resource example described limits but only showed request annotations. Added `sidecar.istio.io/proxyCPULimit` and `sidecar.istio.io/proxyMemoryLimit`.

## Review Notes
The runbook examples are intentionally generic and assume conventional labels such as `app=<service>` and common install names such as `istio-system` and `istio-ingressgateway`. Teams using revision-based Istio installs, ambient mode, non-default gateway names, or custom GitOps labels should adapt those placeholders in their local runbooks.
