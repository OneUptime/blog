# Validation Summary: How to Avoid Mistakes with Service-Based Policies in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source NetworkPolicy
- Kubernetes Services
- Kubernetes EndpointSlices
- kubectl
- calicoctl
- Mermaid flowcharts

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
- The post used `kubectl get endpoints` to verify service backends. The Kubernetes Endpoints API is deprecated as of Kubernetes v1.33, so I changed the examples to use `kubectl get endpointslice -l kubernetes.io/service-name=backend-api`.
- The troubleshooting command inspected `subsets`, which is an Endpoints field. I changed it to inspect `endpoints` in EndpointSlice YAML.
- The comment "List all policies affecting the frontend pods" overstated what `calicoctl get networkpolicies -n production -o wide` does. I changed it to "List all Calico network policies in the namespace."
- The Mermaid diagram used `-.-x`, which is not valid flowchart edge syntax. I changed it to a valid dotted arrow.

## Review Notes
Calico service matches are supported in EntityRule `services` fields when Calico uses the Kubernetes datastore driver, and Calico documents that egress destination service matches cannot be combined with other destination selection criteria. The example follows that constraint.
