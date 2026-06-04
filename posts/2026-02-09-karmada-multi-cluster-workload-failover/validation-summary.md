# Validation Summary: How to Use Karmada for Multi-Cluster Workload Propagation and Failover

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Karmada
- karmadactl
- Karmada PropagationPolicy and OverridePolicy
- Karmada application failover
- Karmada MultiClusterService
- Karmada FederatedResourceQuota

## Sources Consulted
- Karmada installation documentation: https://karmada.io/docs/installation/
- Karmada command reference for karmadactl init and join: https://karmada.io/docs/reference/karmadactl/karmadactl-commands/
- Karmada PropagationPolicy API reference: https://karmada.io/docs/reference/karmada-api/policy-resources/propagation-policy-v1alpha1/
- Karmada OverridePolicy API reference: https://karmada.io/docs/reference/karmada-api/policy-resources/override-policy-v1alpha1/
- Karmada failover documentation: https://karmada.io/docs/userguide/failover/application-failover/
- Karmada MultiClusterService API reference: https://karmada.io/docs/reference/karmada-api/networking-resources/multi-cluster-service-v1alpha1/
- Karmada FederatedResourceQuota API reference: https://karmada.io/docs/reference/karmada-api/policy-resources/federated-resource-quota-v1alpha1/

## Issues Found
- Karmada Agent was described as running in all member clusters. Updated the architecture description to clarify that the agent is used for pull-mode member clusters.
- The example control plane pod list omitted `karmada-apiserver` and `karmada-kube-controller-manager`. Added them to make the installation output more accurate.
- Several commands queried Karmada API resources with the default kubeconfig. Updated cluster, binding, work, label, and apply commands to use `/etc/karmada/karmada-apiserver.config`.
- The Aggregated replica scheduling explanation claimed Karmada fills `cluster-1` before `cluster-2`. Reworded it to describe the documented behavior: scheduling replicas into as few clusters as possible while respecting availability.
- The failover section described application failover as cluster-health failover and used an invalid status patch command to mark a cluster unhealthy. Rewrote it as application-level failover, added `propagateDeps: true`, and replaced the test with a node cordon and pod deletion simulation.
- The MultiClusterService example used a mismatched service name and described global load balancing too strongly. Updated it to match the existing Service name, use `CrossCluster`, and describe cross-cluster service discovery behavior.
- The quota example used `kind: ResourceQuota`, the wrong namespace context, and missed the required `overall` field. Changed it to `FederatedResourceQuota`, added `overall`, and corrected the explanation to say Karmada creates member ResourceQuotas and reports aggregate usage.
- The HA control plane example set multiple etcd replicas without persistent storage flags. Added PVC storage mode and storage class flags required for an HA etcd setup.

## Review Notes
The post remains version-general. Future updates could pin a tested Karmada version because API defaults, feature gates, and command output can vary by release.
