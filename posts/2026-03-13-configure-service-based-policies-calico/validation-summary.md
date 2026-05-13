# Validation Summary: How to Configure Service-Based Policies in Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico NetworkPolicy (`projectcalico.org/v3`)
- Kubernetes Services and Service endpoints
- Kubernetes pods and labels
- `kubectl`

## Sources Consulted
- Calico Open Source documentation: Use service rules in policy, https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico Open Source documentation: NetworkPolicy resource reference, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes documentation: `kubectl label`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes documentation: `kubectl exec`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: JSONPath support, https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The prerequisites omitted Calico's datastore limitation for service matches. Calico documents that ServiceMatch is supported only with the Kubernetes datastore driver, so the prerequisite now states that requirement.
- The introduction said Calico service-aware policies track the pods behind a Service. Calico's service policy documentation describes automatically detecting endpoint addresses and ports from the Service, so the wording was updated to match that behavior more precisely.
- Step 1 labeled Kubernetes Service objects, but the sample policy selectors match workload endpoints/pods, and Calico ServiceMatch references Services by `name` and `namespace`, not by Service labels. The commands now label the pods used by the sample selectors.

## Review Notes
The egress ServiceMatch example uses the documented `destination.services.name` and `destination.services.namespace` fields. The ingress example correctly protects service-backing pods by selecting the destination pods, but it is not itself an ingress ServiceMatch rule; Calico also supports ServiceMatch on ingress `source.services` when that pattern is needed.
