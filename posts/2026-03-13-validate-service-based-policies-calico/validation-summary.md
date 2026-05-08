# Validation Summary: How to Validate Service-Based Policies in Calico

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
- Calico service rules in policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico `calicoctl get` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Endpoints deprecation announcement: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Mermaid flowchart syntax documentation: https://mermaid.ai/open-source/syntax/flowchart.html

## Issues Found
- The post used `kubectl get endpoints` to validate service backends. Kubernetes deprecated the Endpoints API in v1.33 and recommends EndpointSlice. Changed the validation and troubleshooting commands to use `kubectl get endpointslice -l kubernetes.io/service-name=backend-api`.
- The post did not mention that Calico service matches are only supported with the Kubernetes datastore driver and are not supported with the etcd datastore driver. Added this requirement to the introductory explanation and prerequisites.
- The Mermaid diagram used a nonstandard dotted cross-edge form. Changed it to a standard dotted arrow so the diagram remains valid Mermaid flowchart syntax.

## Review Notes
The Calico `services` field shape with `name` and `namespace` is correct for Calico `projectcalico.org/v3` policies. The `calicoctl get networkpolicy ... -n ... -o yaml` and pluralized `networkpolicies` usage are consistent with the official `calicoctl get` reference, which allows pluralized resource types.
