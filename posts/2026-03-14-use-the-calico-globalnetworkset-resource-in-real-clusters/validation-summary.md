# Validation Summary: Using the Calico GlobalNetworkSet Resource in Production Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkSet
- Calico GlobalNetworkPolicy and NetworkPolicy selectors
- Calico Felix
- Calico Typha
- Kubernetes custom resources and RBAC
- `calicoctl`
- `kubectl`

## Sources Consulted
- Calico GlobalNetworkSet resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico `calicoctl get` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl` resource aliases documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i

## Issues Found
- The post described GlobalNetworkSet as if it had node-specific configuration and node selectors. GlobalNetworkSet represents labeled CIDR sets that are matched by Calico policy selectors, so the affected text and commands were changed to discuss GlobalNetworkSet labels and policy selectors instead.
- The small-cluster section suggested checking node YAML for effective GlobalNetworkSet configuration. GlobalNetworkSet is not applied as node configuration, so that command was replaced with a CRD existence check.
- The scale guidance recommended increasing reconciliation intervals for GlobalNetworkSet resources. The documented GlobalNetworkSet spec does not expose such a setting, so the guidance was replaced with selector and Felix metrics guidance.
- The monitoring section tied Felix liveness/readiness endpoints to Prometheus metrics. Felix Prometheus metrics are served on the metrics endpoint, so the example now checks `:9091/metrics`.
- The troubleshooting section referred to configuration reloads, node selectors, and node-specific FelixConfiguration overrides in the context of GlobalNetworkSet behavior. These were corrected to focus on policy and selector matching.
- The RBAC command combined `kubectl auth can-i` modes incorrectly and checked only GlobalNetworkPolicy. It now checks create permissions for GlobalNetworkSet and GlobalNetworkPolicy resources separately.
- The watch command now uses the Kubernetes CRD resource name `globalnetworksets.crd.projectcalico.org`.
- The capacity planning section implied IPAM utilization comes from the Felix metrics endpoint. It now references `calicoctl ipam show` and kube-controllers IPAM metrics.

## Review Notes
The post remains high level and does not include a complete GlobalNetworkSet plus policy manifest. A future update could add a small, tested manifest pair showing `spec.nets` and a policy rule selector that matches the GlobalNetworkSet labels.
