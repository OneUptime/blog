# Validation Summary: How to Use the Calico StagedKubernetesNetworkPolicy Resource in Real Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Enterprise
- Calico StagedKubernetesNetworkPolicy
- Kubernetes NetworkPolicy
- Kubernetes kubectl
- Calico FelixConfiguration flow logs
- Calico Enterprise Manager policy impact preview

## Sources Consulted
- Calico StagedKubernetesNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico Enterprise staged policy workflow: https://docs.tigera.io/calico-enterprise/latest/network-policy/staged-network-policies
- Calico Enterprise policy impact preview documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/policy-impact-preview
- Calico Cloud FelixConfiguration flow log reference: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API source: https://raw.githubusercontent.com/kubernetes/api/master/networking/v1/types.go
- Kubernetes kubectl command references: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The per-namespace isolation example claimed to allow intra-namespace ingress but specified only `protocol: TCP`, which would not allow UDP or SCTP intra-namespace ingress. Removed the `ports` block so the rule matches all ports/protocols from pods in the same namespace, consistent with Kubernetes NetworkPolicy rule semantics.
- The production connectivity verification command used `wget` with an HTTP URL against port 5432, which is normally a database port and not an HTTP endpoint. Replaced it with `nc -zvw5 database-svc.data 5432` to perform a TCP connectivity check.

## Review Notes
The StagedKubernetesNetworkPolicy CRD examples use the documented `projectcalico.org/v3` API group and Kubernetes NetworkPolicy-style spec. The `stagedkubernetesnetworkpolicies` kubectl resource name is a documented alias. Flow-log troubleshooting is valid for Calico Enterprise/Cloud style FelixConfiguration flow-log fields, but exact observability behavior can vary by Calico product/version and installed UI components.
