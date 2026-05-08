# Validation Summary: How to Zero Trust with Service-Based Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy (`projectcalico.org/v3`)
- Kubernetes Services
- Kubernetes EndpointSlices
- Kubernetes network policy behavior
- `kubectl`
- `calicoctl`
- Mermaid flowcharts

## Sources Consulted
- Calico Open Source documentation: Use service rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico Open Source documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Get started with Calico network policy - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Kubernetes documentation: Services, EndpointSlices, and deprecated Endpoints API - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes blog: Kubernetes v1.33 transition from Endpoints to EndpointSlices - https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Mermaid documentation: Flowchart syntax and cross edges - https://mermaid.js.org/syntax/flowchart.html

## Issues Found
- The prerequisites did not mention that Calico service matches are only supported with the Kubernetes API datastore driver. Added that prerequisite because Calico documents `services` matches as ignored with the etcd datastore driver.
- The verification and troubleshooting commands used the deprecated Kubernetes `Endpoints` API. Updated them to query `EndpointSlice` resources with the `kubernetes.io/service-name=backend-api` label, which is the current Kubernetes-recommended API.
- The troubleshooting comment said `calicoctl get networkpolicies -n production -o wide` lists all policies affecting frontend pods. That command lists namespace policies, not only the policies affecting a specific pod. Updated the comment to say to inspect policies and their selectors.
- The Mermaid diagram used `-.-x|Denied|`, which is not the documented flowchart cross-edge syntax. Updated it to `--x|Denied|`.
- The diagram implied a policy update happens when the Service scales. Updated the node label to clarify that no policy update is required when backing pods change.

## Review Notes
The Calico `destination.services.name` and `destination.services.namespace` example is consistent with the official `projectcalico.org/v3` NetworkPolicy documentation. Calico also documents that endpoint addresses and ports are automatically detected from the referenced Service, so the article's scaling and pod replacement claims are valid when the Service and EndpointSlices are healthy and Calico is using the Kubernetes datastore.
