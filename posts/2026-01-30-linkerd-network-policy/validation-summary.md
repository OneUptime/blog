# Validation Summary: How to Implement Linkerd Network Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd
- Kubernetes
- Kubernetes NetworkPolicy
- Linkerd authorization policy CRDs
- Prometheus alerting rules
- kubectl and Linkerd CLI

## Sources Consulted
- Linkerd Authorization Policy reference: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd per-route authorization policy guide: https://linkerd.io/2-edge/tasks/configuring-per-route-policy/
- Linkerd install CLI reference: https://linkerd.io/2-edge/reference/cli/install/
- Linkerd Network Policy common error reference: https://linkerd.io/2-edge/common-errors/network-policy/
- Linkerd architecture reference: https://linkerd.io/2-edge/reference/architecture/
- Linkerd supported Kubernetes versions: https://linkerd.io/2-edge/reference/k8s-versions/
- Linkerd diagnostics CLI reference: https://linkerd.io/2-edge/reference/cli/diagnostics/
- Linkerd authz CLI reference: https://linkerd.io/2-edge/reference/cli/authz/
- Linkerd viz CLI reference: https://linkerd.io/2-edge/reference/cli/viz/
- Linkerd proxy metrics reference: https://linkerd.io/2-edge/reference/proxy-metrics/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/

## Issues Found
- The prerequisites stated Kubernetes v1.21+ without tying support to the Linkerd version. Updated the wording to say the cluster must be supported by the installed Linkerd version, with Linkerd 2.19's v1.22+ minimum as the example.
- The policy controller section showed a non-standard ConfigMap and Helm-style values that do not match the current Linkerd CLI install flow. Replaced it with `linkerd install --crds`, `linkerd install --default-inbound-policy=all-authenticated`, and a verification command for `deploy/linkerd-destination`.
- NetworkPolicy egress examples used Linkerd outbound port `4140` as the destination port. Linkerd's Network Policy documentation says meshed pod-to-pod traffic targets the inbound proxy port `4143`, so the egress examples now allow `4143`.
- Namespace selectors used ad hoc labels such as `name: ingress-nginx` and `linkerd.io/control-plane-ns: linkerd`. Replaced these with the standard `kubernetes.io/metadata.name` namespace label.
- Linkerd policy CRD API versions were inconsistent with current Linkerd examples. Updated `Server`, `ServerAuthorization`, and `HTTPRoute` to the documented versions and changed `AuthorizationPolicy` and `MeshTLSAuthentication` to `policy.linkerd.io/v1alpha1`.
- The post implied `ServerAuthorization` was the main current authorization resource. Added that `AuthorizationPolicy` is preferred for new policy because it can target Servers and HTTPRoutes, while leaving the ServerAuthorization example in place.
- The traffic sequence diagram showed the policy controller participating in each request. Adjusted it to describe authorization as an inbound proxy check against cached policy.
- Debug commands included `linkerd policy list` and a likely invalid policy-controller pod selector. Replaced them with `linkerd viz authz`, `linkerd diagnostics policy`, and logs from the `policy` container in `deploy/linkerd-destination`.

## Review Notes
The examples are now technically aligned with current Linkerd and Kubernetes documentation, but real clusters may need environment-specific NetworkPolicy allowances for DNS labels, ingress controller meshing mode, cloud metadata services, or other control-plane traffic. The PrometheusRule example assumes the Prometheus Operator CRD is installed.
