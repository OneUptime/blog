# Validation Summary: How to Set Up Rancher for Retail - Setup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Fleet
- K3s
- RKE2
- Kubernetes
- Prometheus Operator / Rancher Monitoring
- PrometheusRule
- ServiceMonitor
- NetworkPolicy
- PCI DSS

## Sources Consulted
- K3s installation and configuration: https://docs.k3s.io/installation/configuration
- K3s HA with embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- Rancher cluster registration: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- Fleet GitRepo targeting: https://fleet.rancher.io/0.13/how-tos-for-users/gitrepo-targets
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet rollout strategy: https://fleet.rancher.io/0.14/how-tos-for-users/rollout
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Downward API: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes NetworkPolicies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Rancher ServiceMonitor and PodMonitor configuration: https://ranchermanager.docs.rancher.com/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors
- Rancher PrometheusRule configuration: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheusrules
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- K3s secrets encryption: https://docs.k3s.io/cli/secrets-encrypt
- K3s hardening guide: https://docs.k3s.io/security/hardening-guide

## Issues Found
- The K3s install command used `sh -` with trailing flags. The install script documentation requires `sh -s -` when passing flags, so the command was corrected.
- The post described “2-node HA” for K3s store clusters. Embedded-etcd HA requires an odd number of server nodes, so the wording was corrected to a single-node example with a note that embedded-etcd HA uses 3 server nodes.
- The Rancher registration example used a generic import URL. Rancher provides a cluster-specific registration command from the UI, so the example was corrected to a tokenized placeholder and the text now makes that dependency explicit.
- The post implied that K3s node labels would drive Fleet `clusterSelector` targeting. Fleet targets labels on the registered cluster resource, not node labels, so the post was corrected to call out Rancher/Fleet cluster labels.
- The Fleet `GitRepo` example used multiple targets as if they provided region-specific configuration. GitRepo targets control placement, while per-target customization belongs in each bundle’s `fleet.yaml`, so the example was corrected accordingly.
- The POS workload was deployed in `retail-apps` while the PCI isolation `NetworkPolicy` targeted `retail-pos`. The POS deployment was moved to `retail-pos` so the policy applies to the intended pods.
- The POS deployment read `metadata.labels['store-id']` through the Downward API, but that label was not present on the Pod template. The label was added to the template so the field reference is valid.
- The POS deployment used two replicas while mounting a shared local PVC. That is not a sound HA example for a simple `Deployment` using a shared local claim, so the example was reduced to a single replica to match the storage model shown.
- The POS `NetworkPolicy` selected `store-backend` only by `podSelector`, which would limit matches to the same namespace. An explicit `namespaceSelector` for `retail-apps` was added so the backend rule matches the intended namespace.
- The digital signage and inventory manifests were invalid `apps/v1` Deployments because they omitted the required `.spec.selector` and matching pod template labels. Those fields were added.
- The `ServiceMonitor` would only discover Services in its own namespace by default, even though the workloads are in store namespaces. A `namespaceSelector` was added so monitoring targets the intended application namespaces.
- The Rancher monitoring examples did not include labels commonly used by Rancher-managed Prometheus selectors. `release: rancher-monitoring` was added to the `ServiceMonitor` and `PrometheusRule` so the examples are consistent with common Rancher monitoring configurations.
- The alert rule queried `up{job="pos-terminal"}` without a corresponding job configuration and referenced `$labels.store_id`, which was not being attached by the monitoring example. The rule was updated to align with the `ServiceMonitor` job label and to use a safe summary based on `$labels.instance`.
- The OTA update example said to update `fleet.yaml` but then showed an incomplete `GitRepo` resource that would not implement staged rollout. It was replaced with a valid `fleet.yaml` `rolloutStrategy.partitions` example, which is the documented Fleet mechanism for phased rollouts.
- The conclusion stated that PCI DSS requirements were “addressed” by the architecture and referred to “etcd encryption.” K3s documents secrets encryption at rest rather than “etcd encryption,” and infrastructure configuration alone does not establish PCI compliance, so the wording was softened and corrected.

## Review Notes
- The Fleet rollout example now assumes that the canary and remaining cluster groups are mutually exclusive and together cover every targeted store cluster.
- The monitoring example still assumes the store application Services expose a named `metrics` port and are labeled consistently, which is reasonable for a guide but should be implemented explicitly in the accompanying app manifests.
- The revised compliance wording is intentionally narrower: PCI DSS requires operational controls beyond Kubernetes configuration alone.
