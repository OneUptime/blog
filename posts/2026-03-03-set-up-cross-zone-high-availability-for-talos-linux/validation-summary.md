# Validation Summary: How to Set Up Cross-Zone High Availability for Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- etcd
- Longhorn
- AWS Network Load Balancer
- Kubernetes NetworkPolicy
- Prometheus Operator / PrometheusRule
- kube-state-metrics

## Sources Consulted
- Talos Linux machine configuration reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux multihoming guide: https://docs.siderolabs.com/talos/v1.11/networking/multihoming
- Talos Linux production cluster notes: https://docs.siderolabs.com/talos/v1.13/getting-started/prodnotes
- etcd tuning documentation: https://etcd.io/docs/v3.4/tuning/
- etcd configuration flags: https://etcd.io/docs/v3.4/op-guide/configuration/
- Kubernetes topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes well-known labels, annotations, and taints: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes kubectl cordon reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Longhorn StorageClass parameters: https://longhorn.io/docs/1.11.2/references/storage-class-parameters/
- Longhorn topology-aware provisioning: https://longhorn.io/docs/1.11.2/nodes-and-volumes/nodes/topology-aware-provisioning/
- Longhorn storage tags: https://longhorn.io/docs/1.10.1/nodes-and-volumes/nodes/storage-tags/
- kube-state-metrics node metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- Prometheus Operator API overview: https://github.com/prometheus-operator/prometheus-operator
- AWS CLI elbv2 create-load-balancer command reference: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-load-balancer.html

## Issues Found
- Removed the deprecated `failure-domain.beta.kubernetes.io/zone` node label from the Talos node label example. Kubernetes documents the `failure-domain.beta.*` labels as deprecated and recommends `topology.kubernetes.io/zone`.
- Corrected the etcd section from "topology" awareness to network address selection. Talos `cluster.etcd.advertisedSubnets` controls the advertised IP address, not etcd leader election by zone or data distribution by zone.
- Removed `initial-cluster-state` from Talos `cluster.etcd.extraArgs`. Talos explicitly lists `initial-cluster-state` as a disallowed etcd extra argument.
- Changed the DNS record example fence from `bash` to `text` because the example uses explanatory DNS mapping notation, not shell syntax.
- Fixed the Longhorn StorageClass manifest from the invalid `storage.longhorn.io/v1beta2` API version to the Kubernetes `storage.k8s.io/v1` StorageClass API.
- Added `volumeBindingMode: WaitForFirstConsumer`, `allowedTopologies`, and Longhorn `csi-allowed-topology-keys` configuration for topology-aware Longhorn provisioning. Longhorn requires the CSI allowed topology key to pass zone topology into PV node affinity.
- Reworded the Longhorn node tag commands so they are described as storage pool restriction tags, not as the primary mechanism for zone-aware provisioning.
- Corrected the failover test commands. `kubectl cordon` only marks nodes unschedulable and does not evict existing pods, so the post now uses `kubectl drain` for worker nodes and notes that control plane failover should be tested by stopping/powering off a node in a lab.
- Corrected the NetworkPolicy example. The original CIDR-based rule could imply that NetworkPolicy handles inter-zone node routing; the post now clarifies that routing/firewalls must allow node and pod CIDRs and uses namespace selectors for pod-to-pod policy allowance.
- Fixed the Prometheus zone alert expressions. `kube_node_status_condition` and `kube_node_info` do not expose a direct `zone` label; the expressions now join with `kube_node_labels` and use `label_topology_kubernetes_io_zone`.
- Added the kube-state-metrics node label export assumption for the Prometheus examples, because node labels are controlled by kube-state-metrics label allowlist configuration.
- Removed the cross-zone "VIP" wording from the architecture diagram because a Talos/Kubernetes API VIP is usually a layer-2/local-network pattern and is not generally valid across routed zones.

## Review Notes
The guide is technically valid after edits. The specific etcd timeout values are examples, not universal recommendations; production values should be based on measured RTT and disk latency as described by the etcd tuning documentation.
