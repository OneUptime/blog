# Validation Summary: How to Use CoreDNS Kubernetes Plugin for Custom Service Discovery Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DNS for Services and Pods
- CoreDNS kubernetes plugin
- CoreDNS template plugin
- Kubernetes Services, headless Services, EndpointSlices, and StatefulSets
- Multi-Cluster Services API discovery
- `kubectl`, `dig`, and `nslookup`

## Sources Consulted
- CoreDNS official kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS official template plugin documentation: https://coredns.io/plugins/template/
- Kubernetes official DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes official StatefulSet documentation, Stable Network ID: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id
- Kubernetes official Service documentation, ExternalName Services: https://kubernetes.io/docs/concepts/services-networking/service/#externalname

## Issues Found
1. **Outdated endpoint wording**: The post stated that the kubernetes plugin watches Services and Endpoints. Current CoreDNS documentation says it watches EndpointSlices for endpoint data. Updated the wording to "services and EndpointSlices."
2. **Overstated configuration example**: The "Full plugin configuration with all options" example did not include all documented options and included an in-cluster API `endpoint` value without remote authentication details. Changed it to "commonly used options" and clarified that `endpoint` should be omitted for normal in-cluster access, or used with `tls` or `kubeconfig` for remote API access.
3. **Incorrect `pods verified` explanation**: The post said `pods verified` verifies that the pod IP matches the DNS query source. CoreDNS verifies that a Pod exists in the queried namespace with the requested IP. Updated the comment.
4. **Namespace scoping overstated as authorization**: The post implied namespace filtering prevents unauthorized discovery by pods. The CoreDNS `namespaces` directive controls what records CoreDNS exposes, but it is not a substitute for RBAC or NetworkPolicy. Updated the sentence to make that distinction.
5. **Multi-cluster example used non-standard federation wording**: The original example used a custom `cluster-b.fed.local` zone and remote API endpoints. Current CoreDNS documentation describes Multi-Cluster Services with the `multicluster` directive and an MCS zone such as `clusterset.local`. Replaced the example with the documented `multicluster` pattern.
6. **TTL behavior overstated**: The post said TTLs could be set for different query patterns and implied per-pattern overrides. The kubernetes plugin has a single `ttl` directive per plugin instance. Updated the wording to describe per-plugin and per-zone server block TTLs.
7. **Unsupported service alias annotation**: The post used a `coredns.io/hostname` Service annotation and said CoreDNS could honor it. The CoreDNS kubernetes plugin does not document such an annotation. Replaced the example with a Kubernetes `ExternalName` Service and kept the CoreDNS template example for explicit custom names.

## Review Notes
- The remaining Kubernetes manifests use current stable API versions (`v1`, `apps/v1`, and `batch/v1`) and valid field names.
- The SRV record examples match Kubernetes DNS naming for named Service ports.
- The StatefulSet DNS examples are accurate when the governing headless Service exists and the cluster domain is `cluster.local`.
- The monitoring scripts are illustrative and use standard `sh`, `nslookup`, `dig`, `grep`, `awk`, and `sed` usage available in the referenced netshoot image.
