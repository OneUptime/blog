# Validation Summary: How to Debug Service-Based Policies in Calico

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico Open Source NetworkPolicy
- Kubernetes Services
- Kubernetes EndpointSlices
- kubectl
- calicoctl

## Sources Consulted
- Calico Open Source NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source service rules in policy: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico troubleshooting commands reference: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes Endpoints deprecation announcement: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The troubleshooting commands used the legacy Kubernetes `Endpoints` resource. Kubernetes v1.33 officially deprecated the Endpoints API in favor of EndpointSlices, and current Kubernetes Service documentation recommends clients use EndpointSlice rather than Endpoints. Updated the commands to query `endpointslice` resources using the `kubernetes.io/service-name=backend-api` label.

## Review Notes
- The Calico `projectcalico.org/v3` `NetworkPolicy` example is syntactically valid for service-based egress rules. Official Calico documentation confirms that `destination.services.name` and `destination.services.namespace` are supported for egress destinations when using the Kubernetes datastore driver.
- The `calicoctl get networkpolicy ... -o yaml` and `calicoctl get networkpolicies ... -o wide` commands match the official `calicoctl get` output formats and resource naming behavior.
- The `kubectl exec ... -- curl ...` syntax is valid; the command assumes the selected pod image includes `curl`.
