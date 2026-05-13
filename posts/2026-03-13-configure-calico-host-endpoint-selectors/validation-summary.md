# Validation Summary: Configure Calico Host Endpoint Selectors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- Calico label selectors
- Kubernetes node labels
- Kubernetes NodePort services
- calicoctl
- kubectl

## Sources Consulted
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Kubernetes host endpoint documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico calicoctl get command documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes Service documentation for NodePort range: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The worker policy used `ports: [10250, 30000, 32767]` while describing NodePorts. Calico treats this as three individual ports, not a range. Changed it to `ports: [10250, '30000:32767']`, matching Calico's documented port range syntax and Kubernetes' default NodePort range.
- The selector description implied that `GlobalNetworkPolicy.spec.selector` only matches HostEndpoint resources. Calico documents that a top-level GlobalNetworkPolicy selector matches all endpoints, including WorkloadEndpoints and HostEndpoints. Updated the wording to clarify the selector scope.
- The introduction and conclusion implied that node labels directly drive policy selection for all HostEndpoints. For manually created HostEndpoints, labels must be present on the HostEndpoint itself; automatic host endpoints sync node labels. Updated the wording to distinguish those cases.
- The selector table described `role != 'control-plane'` as only "not equal"; Calico documents that `!=` also matches resources without the label. Updated the description.
- The verification command used `calicoctl get hostendpoints -o wide`. Updated it to the documented `calicoctl get hostEndpoint --output=wide` form.

## Review Notes
The YAML examples use current Calico `projectcalico.org/v3` resources and valid fields. The policy snippets are illustrative and should still be adapted before production use, especially for source restrictions and environment-specific control-plane, kubelet, and NodePort exposure requirements.
