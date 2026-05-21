# Validation Summary: How to Gradually Roll Out Strict mTLS with PeerAuthentication

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio
- Kubernetes
- PeerAuthentication
- DestinationRule
- mTLS
- kubectl
- istioctl
- jq
- Prometheus / Kiali observability

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Mutual TLS Migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio Security concepts: https://istio.io/latest/docs/concepts/security/
- Istio app health check configuration: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio `istioctl x describe` documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio Kiali task documentation: https://istio.io/latest/docs/tasks/observability/kiali/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes `kubectl rollout restart` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The post implied Kubernetes health checks generally break under strict mTLS. Istio rewrites HTTP, TCP, and gRPC probes by default, so I narrowed the statement to health checks from outside the mesh or Kubernetes probes when probe rewrite is disabled.
- The DestinationRule audit command only checked top-level `spec.trafficPolicy.tls` and missed explicit TLS settings under `spec.trafficPolicy.portLevelSettings[].tls`. I updated the jq command to report both top-level and port-level TLS settings.
- The mesh-wide PeerAuthentication examples used `istio-system` without noting that mesh-wide policies must be created in Istio's configured root namespace. I added a short clarification for installations that use a different root namespace.
- The port-level mTLS exception did not specify that `portLevelMtls` keys are workload/container ports, not Kubernetes Service ports. I added that clarification and adjusted the comment in the YAML example.

## Review Notes
The core rollout strategy, `security.istio.io/v1` PeerAuthentication examples, STRICT/PERMISSIVE semantics, namespace-first migration approach, rollback guidance, and `istioctl x describe` / Kiali validation commands are consistent with current Istio documentation. The post intentionally stays version-neutral; future updates could mention ambient-mode caveats because PeerAuthentication `DISABLE` is unsupported in ambient mode, although this post does not use `DISABLE`.
