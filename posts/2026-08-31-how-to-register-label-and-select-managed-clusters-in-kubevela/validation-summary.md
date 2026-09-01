# Validation Summary: How to Register, Label, and Select Managed Clusters in KubeVela

## Status
validated

## Post Type
Technical Guide / Tutorial

## Technologies Covered
- KubeVela v1.11 and the `vela` CLI
- Kubernetes, `kubectl`, kubeconfig, Secrets, and RBAC
- KubeVela Cluster Gateway
- Open Cluster Management (OCM)
- Open Application Model (OAM) Applications
- KubeVela `topology` and `override` policies
- Multi-cluster deployment workflows and ResourceTrackers

## Sources Consulted
- [KubeVela `vela cluster join` CLI reference](https://kubevela.io/docs/cli/vela_cluster_join/)
- [KubeVela cluster command group](https://kubevela.io/docs/cli/vela_cluster/), including the linked list, probe, label, rename, and detach command references
- [KubeVela `vela show` CLI reference](https://kubevela.io/docs/cli/vela_show/)
- [KubeVela `vela dry-run` CLI reference](https://kubevela.io/docs/cli/vela_dry-run/)
- [KubeVela `vela up` CLI reference](https://kubevela.io/docs/cli/vela_up/)
- [KubeVela `vela status` CLI reference](https://kubevela.io/docs/cli/vela_status/)
- [KubeVela built-in policy reference](https://kubevela.io/docs/end-user/policies/references/#topology)
- [KubeVela multi-cluster Application guide](https://kubevela.io/docs/case-studies/multi-cluster/)
- [KubeVela managed-cluster lifecycle guide](https://kubevela.io/docs/platform-engineers/system-operation/managing-clusters/)
- [KubeVela working with OCM](https://kubevela.io/docs/platform-engineers/system-operation/working-with-ocm/)
- [KubeVela v1.11 cluster CLI implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/references/cli/cluster.go)
- [KubeVela v1.11 cluster registration, credential, rename, detach, and ResourceTracker implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/multicluster/cluster_management.go)
- [KubeVela topology placement implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/policy/topology.go)
- [KubeVela resource-tree implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/resourcetracker/tree.go)
- [Cluster Gateway architecture](https://github.com/oam-dev/cluster-gateway#overall)
- [Kubernetes `kubectl config current-context` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_current-context/)
- [Open Container Initiative digest specification](https://github.com/opencontainers/image-spec/blob/main/descriptor.md#digests)

## Issues Found
1. **Credential-storage ownership was imprecise.** The post said that Cluster Gateway stores managed-cluster credentials. In the default direct-connect mode, KubeVela writes endpoint and credential material to a Kubernetes Secret on the hub, and Cluster Gateway consumes that Secret. The opening explanation now states this accurately.
2. **The context-check command was described as selecting a context.** `kubectl config current-context` only displays the active context. The instruction now tells the reader to confirm that the active context is the hub context.
3. **The join example could admit a cluster to production before validation.** In KubeVela v1.11, `vela cluster join` republishes Applications with an explicit `clusterLabelSelector`. A cluster whose join-time labels match can therefore receive existing workloads during the join. Production labels were removed from the join command, and the post now requires an inventory of existing selectors, including catch-all selectors, before registration and placement labeling.
4. **The resource-tree interpretation was too absolute.** `vela status --tree --detail` can include `updated` resources, `not-deployed` resolved placements, and `outdated` resources from historical ResourceTrackers. The verification guidance now distinguishes these statuses instead of requiring every displayed row to equal the active destination set.

## Review Notes
- The Application YAML uses the current `core.oam.dev/v1beta1` API and current `topology` fields. `clusters` is a string list, `clusterLabelSelector` is a string map with exact-match AND semantics, and `namespace` is the destination namespace.
- All shown `vela` commands and flags are valid in KubeVela v1.11. The post's six official-documentation links resolve to the intended current pages.
- Adding or deleting cluster labels does not itself restart a completed Application workflow. The post correctly says that the new label set is used when the matching deploy workflow is next evaluated or rerun.
- Cross-namespace topology placement is allowed by default but can be disabled with the controller's `--allow-cross-namespace-resource=false` setting; destination namespace policy therefore remains installation-specific.
- In KubeVela v1.11, detach removes that cluster's references from ResourceTrackers before deleting the registration and does not first delete remote workloads. Rename recreates the credential Secret under the new name without rewriting topology policies or tracker references. The post's strong lifecycle warning is justified.
- `ghcr.io/example/payments@sha256:<verified-digest>` is intentionally illustrative and must be replaced with a real repository and valid SHA-256 digest before deployment.
