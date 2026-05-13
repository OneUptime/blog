# Validation Summary: How to Migrate to Calico ClusterIP Service Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes ClusterIP Services
- Kubernetes service networking
- calicoctl
- kubectl

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico policy for services exposed externally as ClusterIPs: https://docs.tigera.io/calico/latest/network-policy/services/services-cluster-ips
- Calico service rules in policy: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#exec

## Issues Found
- The introduction stated that ClusterIP policy was essential for clusters exposing services externally and grouped NodePort and ClusterIP exposure together. Calico's external ClusterIP guidance specifically applies when ClusterIPs are advertised outside the cluster, typically over BGP, and may require HostEndpoints plus GlobalNetworkPolicy with `preDNAT` and `applyOnForward`. Updated the wording so the post accurately describes internal service-to-service ClusterIP protection.
- The main YAML example contained two `destination` keys in one egress rule. YAML parsers treat duplicate keys ambiguously or overwrite the earlier value, so the database selector could be lost. Merged the selector and port into a single `destination` block.
- The port-based TCP rules did not specify `protocol`. Calico examples include protocol for port-specific TCP rules, and specifying it avoids ambiguous policy intent. Added `protocol: TCP` to the frontend, monitoring, and database rules.
- Fixed minor grammar in the migration description without changing the structure of the post.

## Review Notes
- The policy protects selected backend pods, including traffic that reaches them through a ClusterIP Service. It is not a complete pattern for externally advertised ClusterIPs; that scenario requires host endpoint and pre-DNAT policy as described in the Calico documentation.
