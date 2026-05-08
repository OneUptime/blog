# Validation Summary: Zero Trust Microsegmentation with Calico Label-Based Network Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy and GlobalNetworkPolicy
- Kubernetes network policies
- Kubernetes labels and selectors
- kubectl
- calicoctl
- Istio mTLS integration with Calico

## Sources Consulted
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico network policy getting started guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico default deny policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico zero trust network model guide: https://docs.tigera.io/calico/latest/network-policy/adopt-zero-trust
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The introduction described pod labels as essentially cryptographic identity. This is not accurate for label-based Calico policy alone; labels provide policy identity, while cryptographic identity requires an integration such as Istio mTLS. Updated the wording to make that distinction explicit.
- The policy examples only allowed ingress. With the prerequisite of an already-applied default deny `GlobalNetworkPolicy`, egress may also be denied, so the intended frontend-to-API, API-to-database, and monitoring scrape paths could fail. Added matching egress `NetworkPolicy` resources for the source tiers.
- Added explicit `protocol: TCP` to port-based Calico rules, matching Calico documentation examples for TCP application ports.

## Review Notes
The verification command syntax for `kubectl get ... -o jsonpath` and `kubectl exec ... -- nc ...` is valid. The runtime result depends on the selected pod having `nc` installed and on the cluster's default-deny policy including appropriate DNS or other infrastructure exceptions where needed.
