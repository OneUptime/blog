# Validation Summary: How to Use Admiralty for Multi-Cluster Pod Scheduling Across Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Admiralty multicluster-scheduler
- Helm
- Kubernetes RBAC
- Kubernetes scheduling constraints
- Kubernetes Services
- StatefulSets
- Prometheus alerting

## Sources Consulted
- Admiralty Installation documentation: https://admiralty.io/docs/operator_guide/installation/
- Admiralty Configuring Scheduling documentation: https://admiralty.io/docs/operator_guide/scheduling/
- Admiralty Multi-Cluster Scheduling concepts: https://admiralty.io/docs/concepts/scheduling/
- Admiralty Quick Start: https://admiralty.io/docs/quick_start/
- Admiralty v1alpha1 API reference: https://pkg.go.dev/admiralty.io/multicluster-scheduler/pkg/apis/multicluster/v1alpha1
- Admiralty AWS Fargate tutorial, for documented use of node selectors with multi-cluster scheduling: https://admiralty.io/docs/tutorials/fargate/
- Kubernetes ServiceAccount token command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes node affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

## Issues Found
- The Helm installation command used the old `https://charts.admiralty.io` repository, the old `admiralty/multicluster-scheduler` chart name, and version `0.15.0`. Updated it to the documented OCI chart `oci://public.ecr.aws/admiralty/admiralty`, version `0.17.0`, with `--wait`.
- The post omitted Admiralty's cert-manager prerequisite for the mutating admission webhook certificate. Added a note to install cert-manager before the Admiralty agent if needed.
- The Target resources were placed in the `admiralty` namespace while the example workloads run in `production`. Updated the Target resources and kubeconfig secrets to the `production` namespace, and added a `self: true` Target for the local cluster to match the later claim that workloads can run in cluster-1.
- The kubeconfig secret commands copied the user's current kubeconfig, which would not necessarily authenticate as the identity authorized by the target cluster Source. Updated the example to create a remote ServiceAccount token and build kubeconfig secrets from that token.
- The Source example used `userName` for a ServiceAccount-style identity. Updated it to `serviceAccountName`, which is the documented field for namespaced Sources using ServiceAccounts.
- The manual RBAC example created a custom broad ClusterRole for pods and nodes. Replaced it with the documented pattern: a RoleBinding to the `admiralty-source` ClusterRole and a ClusterRoleBinding to `admiralty-cluster-summary-viewer`.
- The scheduling example only annotated pods, but Admiralty also requires the source namespace label `multicluster-scheduler=enabled`. Added the namespace labeling command.
- The cluster affinity example used an unsupported `multicluster.admiralty.io/cluster-affinity` annotation. Replaced it with standard Kubernetes `nodeAffinity`.
- The Service example used an unsupported `multicluster.admiralty.io/export` annotation. Removed the annotation and kept the guidance that cross-cluster service discovery requires a service mesh or another multi-cluster service discovery tool.
- The StatefulSet example used an unsupported `multicluster.admiralty.io/pod-index-cluster-map` annotation and claimed it pinned individual StatefulSet pods to clusters. Replaced it with standard `nodeSelector` guidance and clarified the storage-domain constraint.
- The burst scheduling example used an unsupported `multicluster.admiralty.io/scheduling-policy` annotation. Replaced it with standard preferred node affinity plus the documented self-target pattern.
- The Prometheus alert rule had no severity label. Added a basic `severity: warning` label so the rule is structurally more complete.

## Review Notes
- The corrected examples use Admiralty's namespaced Target/Source model for the `production` namespace. A cluster-wide setup could instead use `ClusterTarget` and `ClusterSource`, but that would be a different topology.
- The ServiceAccount token approach follows Kubernetes' current `kubectl create token` behavior; these tokens are typically short-lived, so production deployments should use a durable and secure cross-cluster authentication method.
- Cross-cluster Services remain outside Admiralty's core scheduling feature and require an additional service discovery or service mesh layer.
