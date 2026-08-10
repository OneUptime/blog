# Validation Summary: Migrating to an External Kubernetes cloud-controller-manager

## Status
validated

## Post Type
Migration guide / operational runbook

## Technologies Covered
- Kubernetes control-plane upgrades
- In-tree and external cloud providers
- `cloud-controller-manager`, `kube-controller-manager`, and kubelet
- Controller Manager Leader Migration and coordination Leases
- Kubernetes RBAC and leader election
- Nodes, ProviderIDs, topology labels, taints, and cloud routes
- `LoadBalancer` Services and `loadBalancerClass`
- CSI storage migration and volume snapshots
- Kubelet image credential-provider plugins
- Konnectivity / API server network proxy
- Cluster Autoscaler, etcd, cloud IAM, `kubectl`, and `jq`

## Sources Consulted
- [Kubernetes: Completing the largest migration in Kubernetes history](https://kubernetes.io/blog/2024/05/20/completing-cloud-provider-migration/) - verified the v1.31 removal, the functionality extracted from kubelet and kube-controller-manager, and the separate CCM, network proxy, credential-provider, and CSI subsystems.
- [Kubernetes 1.29: Cloud Provider Integrations Are Now Separate Components](https://kubernetes.io/blog/2023/12/14/cloud-provider-integration-changes/) - verified the v1.29 opt-back behavior and the affected legacy providers.
- [Kubernetes: Removed feature gates](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/) - verified the `DisableCloudProviders` and `DisableKubeletCloudCredentialProviders` lifecycle and the valid v1.31+ `--cloud-provider` values.
- [Kubernetes 1.31 release lifecycle](https://kubernetes.io/releases/1.31/) - verified that v1.31 is end-of-life and is used in the post only as the historical removal boundary.
- [Kubernetes: Migrate Replicated Control Plane To Use Cloud Controller Manager](https://kubernetes.io/docs/tasks/administer-cluster/controller-manager-leader-migration/) - verified the source/target rollout, migration Lease RBAC, flag placement, rollback, and post-migration behavior.
- [Controller Manager Leader Migration KEP](https://github.com/kubernetes/enhancements/tree/master/keps/sig-cloud-provider/2436-controller-manager-leader-migration) - cross-checked the ownership and locking model.
- [Kubernetes v1.30 Leader Migration defaults](https://github.com/kubernetes/kubernetes/blob/release-1.30/staging/src/k8s.io/controller-manager/pkg/leadermigration/config/default.go) and [v1.27 defaults](https://github.com/kubernetes/kubernetes/blob/release-1.27/staging/src/k8s.io/controller-manager/pkg/leadermigration/config/default.go) - verified that controller identifiers are version-specific.
- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/) and [Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/) - verified Node, route, Service, lifecycle, scheduling-taint, toleration, and bootstrap behavior.
- [Kubernetes: Version Skew Policy](https://kubernetes.io/releases/version-skew-policy/) - verified CCM-to-API-server skew and live-upgrade constraints.
- [Kubernetes: kubelet reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/) and [well-known labels, annotations, and taints](https://kubernetes.io/docs/reference/labels-annotations-taints/) - verified `--cloud-provider=external` and `node.cloudprovider.kubernetes.io/uninitialized` behavior.
- [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [kubectl version](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/), [kubectl events](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/), [kubectl quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/), and the [deprecated API migration guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/) - verified command syntax, output modes, sorting, namespace flags, and the Event timestamp-field transition.
- [Kubernetes: PersistentVolume API](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-v1/), [CSI volumes](https://kubernetes.io/docs/concepts/storage/volumes/#csi), and [Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/) - verified the legacy PV field used for inventory and the separate CSI migration responsibilities.
- [Kubernetes: Service](https://kubernetes.io/docs/concepts/services-networking/service/) - verified `LoadBalancer` reconciliation, status, and `spec.loadBalancerClass` ownership.
- [Kubernetes: Configure a kubelet image credential provider](https://kubernetes.io/docs/tasks/administer-cluster/kubelet-credential-provider/) and [Set up Konnectivity service](https://kubernetes.io/docs/tasks/extend-kubernetes/setup-konnectivity/) - verified the two non-CCM extraction paths.

## Issues Found
1. **Node initialization was attributed only to `kube-controller-manager`.** The external CCM replaced cloud-facing functionality from both `kube-controller-manager` and kubelet. The ownership explanation now names both source components.
2. **Leader Migration flag ownership was ambiguous.** The target-version `kube-controller-manager` running with `--cloud-provider=external` must not enable Leader Migration because it no longer runs the migrated controllers. The post now says to enable migration on every source-version `kube-controller-manager`, enable it only on the target external CCM, use the shared `leaderName`, and grant both participants RBAC access to the migration Lease.
3. **The controller examples looked like universal configuration identifiers.** Identifiers changed across Kubernetes versions, and custom migration configuration matches them exactly. The post now calls them provider- and version-specific IDs rather than suggesting that `route`, `service`, and `cloud-node-lifecycle` are always correct.
4. **The kubelet was described as waiting for CCM.** The kubelet continues operating; it registers a Node with the uninitialized `NoSchedule` taint, and that Node remains unschedulable until CCM initializes it and removes the taint. The description was corrected.
5. **The event command sorted on legacy Event field `.lastTimestamp`.** It now sorts on `.metadata.creationTimestamp` and uses the portable `tail -n 100` syntax.
6. **The Lease command filtered names for `cloud` or `migration`.** A valid provider-configured `leaderName` need not contain either string, so the filter could hide the actual migration Lease. The command now lists all Leases, and the surrounding text directs the reader to the configured `leaderName`.
7. **The v1.31 startup-failure statement was broader than the effective configuration.** A stale or unused file can contain an old name without affecting startup. The post now refers specifically to an effective core-component `--cloud-provider` setting and distinguishes that failure from a running distribution-specific fork.

## Review Notes
- Kubernetes v1.29 and v1.30 allowed the temporary opt-back for the remaining Azure, GCE, and vSphere in-tree integrations; AWS and OpenStack had already been removed in v1.27 and v1.26. The post's shorter v1.29 statement remains accurate.
- Kubernetes v1.31 is now end-of-life, but the post uses it as the historical removal boundary rather than recommending it as a target release.
- During an N-to-N+1 HA rollout, an N+1 CCM must not communicate with an N API server. If its kubeconfig points to a load balancer serving mixed API-server versions, the provider or lifecycle tool must supply an ordering that preserves the documented skew policy.
- Modern stable Leader Migration configuration uses a Lease. Older configuration API versions could use a different resource lock, so migrations from older source releases must follow their version-specific documentation.
- The shell and `jq` snippets are syntactically valid. The `jq` filter was also executed against representative Service JSON and produced the intended output.
- All seven links in the post's Official Documentation section resolved to the intended Kubernetes pages.
