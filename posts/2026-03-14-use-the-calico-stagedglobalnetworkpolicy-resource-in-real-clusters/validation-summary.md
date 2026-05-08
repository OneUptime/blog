# Validation Summary: Using the Calico StagedGlobalNetworkPolicy Resource in Production Clusters

## Status
validated

## Post Type
Production guide

## Technologies Covered
- Calico StagedGlobalNetworkPolicy
- Calico FelixConfiguration
- Calico IPPool and IPAM
- Calico Typha
- Kubernetes RBAC
- kubectl
- calicoctl

## Sources Consulted
- Calico StagedGlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico staged network policy overview: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix component configuration reference: https://docs.tigera.io/calico-cloud/reference/component-resources/node/felix/configuration
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post described applying environment-specific settings with node selectors. StagedGlobalNetworkPolicy does not have a node selector field; it scopes policies with endpoint selectors, namespace selectors, and service account selectors. I changed the example to label namespaces and reference `namespaceSelector` and policy `selector`.
- The small-cluster section used `calicoctl get stagedglobalnetworkpolicy` and suggested inspecting node YAML for effective Calico configuration. I changed this to `kubectl get stagedglobalnetworkpolicy.projectcalico.org` and a tier field-selector query, matching Calico's documented kubectl aliases.
- The scale section recommended increasing reconciliation intervals, which is not a StagedGlobalNetworkPolicy field or documented tuning pattern. I replaced it with documented selector-performance guidance and the `AssumeNeededOnEveryNode` performance hint caveat.
- The troubleshooting section implied staged policies enforce traffic. I added a note that staged policies preview policy behavior and that GlobalNetworkPolicy should be used when ready to enforce rules.
- The Felix health endpoint note tied health checks to Prometheus metrics. I changed it to state that the Felix health port must be enabled and reachable.
- The upgrade command claimed to review CRD versions with `kubectl get crds | awk '{print $1, $2}'`, but that output does not show resource versions. I changed it to inspect served Calico API resources with `kubectl api-resources`.
- The RBAC check used invalid `kubectl auth can-i` syntax by combining a specific verb/resource check with `--list`, and it targeted the wrong resource. I changed it to `kubectl auth can-i create stagedglobalnetworkpolicies.projectcalico.org --all-namespaces`.

## Review Notes
The post remains a high-level production guide rather than a complete staged-policy implementation tutorial. Future improvements could include a concrete StagedGlobalNetworkPolicy manifest and explicit guidance for promoting a staged policy to an enforcing GlobalNetworkPolicy.
