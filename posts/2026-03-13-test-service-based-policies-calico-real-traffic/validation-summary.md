# Validation Summary: How to Test Service-Based Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy (`projectcalico.org/v3`)
- Kubernetes Services
- Kubernetes EndpointSlices
- `kubectl`
- `calicoctl`
- Mermaid flowcharts

## Sources Consulted
- Calico documentation: Use service rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: `calicoctl get` reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes documentation: Service concepts and deprecated Endpoints API - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes blog: Kubernetes v1.33 transition from Endpoints to EndpointSlices - https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes documentation: `kubectl exec` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: JSONPath support - https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Mermaid documentation: Flowchart syntax - https://mermaid.js.org/syntax/flowchart.html

## Issues Found
- The post used `kubectl get endpoints` to inspect service backends. The Kubernetes Endpoints API is deprecated as of Kubernetes 1.33, and current documentation recommends EndpointSlices. I changed those commands to use `kubectl get endpointslice -l kubernetes.io/service-name=backend-api`.
- The prerequisites did not mention Calico's Kubernetes datastore requirement for `services` matching. Calico documents that service matches are only supported with the Kubernetes datastore driver and ignored with the etcd datastore driver. I added that prerequisite.
- The introduction stated that users "need" to test through the service ClusterIP rather than pod IPs. I softened this to recommend ClusterIP testing for validating service-based access, which is more precise and avoids overstating behavior not guaranteed by the service-match documentation.
- The Mermaid diagram used `-.-x|Denied|`, which is not the documented flowchart cross-edge syntax. I changed it to `--x|Denied|`.

## Review Notes
The Calico policy snippet is valid for a namespaced Calico `NetworkPolicy` using `destination.services` in an egress rule. Current Calico documentation notes that when `services` is specified on an egress destination, no other destination selection criteria can be set; the post's example follows that rule.
