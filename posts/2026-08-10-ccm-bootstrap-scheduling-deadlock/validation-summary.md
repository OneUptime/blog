# Validation Summary: How to Break the Cloud Controller Manager Bootstrap Deadlock When Its Own Pods Cannot Schedule

## Status

validated

## Post Type

Kubernetes troubleshooting guide and operational recovery runbook

## Technologies Covered

- Kubernetes external cloud-controller-manager
- kubelet external cloud-provider bootstrap
- Kubernetes scheduling, taints, tolerations, affinity, and Pod priority
- Deployments, DaemonSets, and static Pods
- Kubernetes leader election and `coordination.k8s.io` Leases
- Kubernetes RBAC, ServiceAccounts, Secrets, ConfigMaps, and persistent volumes
- CNI and bootstrap networking
- Helm and kubectl

## Sources Consulted

- [Kubernetes: The Cloud Controller Manager Chicken and Egg Problem](https://kubernetes.io/blog/2025/02/14/cloud-controller-manager-chicken-egg-problem/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Well-Known Labels, Annotations and Taints](https://kubernetes.io/docs/reference/labels-annotations-taints/)
- [Kubernetes: kubelet command-line reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/)
- [Kubernetes: Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes: DaemonSet scheduling and automatic tolerations](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes: Static Pods](https://kubernetes.io/docs/concepts/workloads/pods/static-pods/)
- [Kubernetes: Scheduling Framework](https://kubernetes.io/docs/concepts/scheduling-eviction/scheduling-framework/)
- [Kubernetes: Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: ServiceAccount admission controller](https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/#serviceaccount-admission-controller)
- [Kubernetes: Pod Priority and Preemption](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/)
- [Kubernetes: Guaranteed Scheduling for Critical Add-On Pods](https://kubernetes.io/docs/tasks/administer-cluster/guaranteed-scheduling-critical-addon-pods/)
- [Kubernetes: Leases](https://kubernetes.io/docs/concepts/architecture/leases/)
- [Kubernetes: Images and image pull policy](https://kubernetes.io/docs/concepts/containers/images/)
- [Kubernetes: StorageClass volume binding modes](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode)
- [Kubernetes: kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: kubectl describe reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [Helm: helm template reference](https://helm.sh/docs/helm/helm_template/)
- [Kubernetes kubelet source: external-provider bootstrap taint](https://github.com/kubernetes/kubernetes/blob/94c136764292cc5fac976c0de6587daaea56410f/pkg/kubelet/kubelet_node_status.go#L328-L335)
- [Kubernetes cloud-provider source: Node initialization and taint removal](https://github.com/kubernetes/cloud-provider/blob/10d50e32778ec8e5c08f25083388f5cb3405433d/controllers/node/node_controller.go#L414-L475)
- [Kubernetes scheduler source: `FailedScheduling` handling in the v1.36 release branch](https://github.com/kubernetes/kubernetes/blob/release-1.36/pkg/scheduler/schedule_one.go#L1288-L1296)

## Issues Found

- The troubleshooting list incorrectly implied that a missing ServiceAccount or an admission denial leaves a Pod Pending. Pod creation is rejected in those cases. The text now directs readers to `FailedCreate` events on the owning ReplicaSet or DaemonSet.
- The post said that only scheduling predicates appear under `FailedScheduling`. The scheduler also uses that reason for scheduling- and binding-cycle failures. The wording now reflects the broader behavior and separates those failures from post-assignment image, configuration, volume, and runtime failures.
- The private-image example treated any missing image pull Secret as fatal. Kubernetes can still attempt an anonymous pull, so the text now describes unavailable credentials for an image that actually requires them.
- The Helm example claimed to render an exact chart version but did not select one. Added `--version PROVIDER_CHART_VERSION`.
- The PriorityClass guidance claimed that user workloads could not displace the CCM. Priority controls scheduling order and preemption but does not prevent every eviction or equal-priority competition. The text now states that the system priority class ranks the CCM ahead of ordinary lower-priority workloads.
- Pre-pulling an image was presented as an unconditional alternative to registry reachability. Added the requirement for a compatible effective image pull policy.
- The workload-kind comparison mentioned the Deployment's scheduler dependency without clarifying that modern DaemonSet Pods also normally rely on the scheduler for binding. The comparison now states that both workload kinds normally require an operational scheduler.
- The leader-election discussion conflated a replica's unique holder identity with the shared election lock. It now warns specifically about old and new workloads using different lock types, namespaces, or resource names, which can allow concurrent reconciliation.
- An empty Lease holder was described as always requiring investigation, even though it can occur transiently during a handoff. The text now limits that warning to a missing holder while replicas are expected to be active.
- The recovery commands claimed to observe topology and addresses but did not display those fields. The watched custom-column output now includes region, zone, addresses, ProviderID, and taints.

## Review Notes

- The post is provider-neutral; exact arguments, credentials, placement rules, and leader-election settings remain provider-specific and should come from the provider's supported manifest.
- `node-role.kubernetes.io/master` is deprecated and kubeadm no longer sets it, but retaining the legacy toleration can still be necessary for older or distribution-specific clusters.
- The generic CCM DaemonSet on the Kubernetes administration page is intentionally only a guideline and still contains provider placeholders and a historical image version; the post correctly warns readers not to treat it as a production manifest.
- Commands and YAML were checked against current Kubernetes documentation and local kubectl v1.34.1 and Helm v3.12.3 help output. Placeholders such as `CCM_POD`, `CCM_LEASE`, and `PROVIDER_CHART_VERSION` must be replaced with installation-specific values.
