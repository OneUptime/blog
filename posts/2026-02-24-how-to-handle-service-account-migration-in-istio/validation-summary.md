# Validation Summary: How to Handle Service Account Migration in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mTLS
- Kubernetes ServiceAccount
- Kubernetes RBAC
- Kubernetes Deployment rolling updates
- kubectl
- istioctl
- Prometheus and PrometheusRule
- jq

## Sources Consulted
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Security concepts: https://istio.io/latest/docs/concepts/security/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes kubectl patch documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes Deployment rolling update documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/

## Issues Found
- The post described service account changes as changing a "PeerAuthentication trust relationship." PeerAuthentication configures mTLS policy for workloads, not service-account-specific trust relationships. I changed this to say policies or client-side checks that depend on peer identity can be affected.
- The first `jq` command used non-optional traversal through `.spec.rules[].from[]`, which can fail on valid AuthorizationPolicies that omit rules or `from`. I changed it to use optional traversal and to print namespace/name, matching the safer later example.
- The canary identity check used `kubectl exec` into the `istio-proxy` container and ran `curl localhost:15000/certs`. Modern proxy images may not include `curl`, and Istio documents `istioctl proxy-config secret` for inspecting Envoy secrets. I replaced it with `istioctl proxy-config secret -n production deploy/order-service-canary`.
- The denial log check only searched for `RBAC: access denied`. Istio/Envoy access logs commonly expose RBAC denials with strings such as `rbac_access_denied`. I broadened the grep pattern.

## Review Notes
The AuthorizationPolicy examples use the documented peer principal format `cluster.local/ns/<namespace>/sa/<service-account>`, while the prose correctly describes the SPIFFE URI form used in workload certificates. The post assumes sidecar-mode Istio and HTTP traffic for method/path matching; future updates could call out ambient-mode and TCP-policy caveats explicitly.
