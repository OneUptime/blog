# Validation Summary: Using the Calico GlobalNetworkPolicy Resource in Production Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico FelixConfiguration and Felix health endpoints
- Calico Typha
- Calico IPPool and IPAM
- Kubernetes RBAC and kubectl
- calicoctl

## Sources Consulted
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico network policy getting started documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Felix configuration documentation: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl IPAM documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- GlobalNetworkPolicy was described as using node selectors for environment-specific workload policy. Calico GlobalNetworkPolicy applies to endpoints using `selector`, `namespaceSelector`, and `serviceAccountSelector`, not Kubernetes node selectors for workload targeting. I changed the example to label namespaces and reference `namespaceSelector` or endpoint `selector`.
- The small-cluster verification command inspected a Kubernetes node for `projectcalico` metadata, which does not verify GlobalNetworkPolicy behavior. I changed it to inspect pod labels that policy selectors will match.
- The scale guidance recommended increasing reconciliation intervals without tying that to a current documented GlobalNetworkPolicy setting. I changed it to focus on avoiding unnecessary policy churn and overly broad selectors, while keeping the documented Typha recommendation.
- The Felix health endpoint note incorrectly tied `/liveness` and `/readiness` to Prometheus metrics. Felix health endpoints are controlled by the Felix health port settings, while Prometheus metrics use a separate metrics endpoint. I updated the wording accordingly.
- The RBAC command combined `kubectl auth can-i --list` with a specific verb/resource check and used a less appropriate resource spelling. I replaced it with separate `create` and `update` checks for `globalnetworkpolicies.projectcalico.org`, plus a separate `--list` command filtered for the resource.
- The example for reviewing recent Calico resource changes used Kubernetes events, which are not a reliable audit trail for CRD modifications. I removed that command from the security-hardening snippet.

## Review Notes
`kubectl` and `calicoctl` are not installed in the review workspace, so command validation was performed against official documentation rather than local CLI help. The post still uses broad operational guidance rather than complete production manifests; future improvements could add concrete GlobalNetworkPolicy examples with `order`, `types`, `selector`, and `namespaceSelector` fields.
