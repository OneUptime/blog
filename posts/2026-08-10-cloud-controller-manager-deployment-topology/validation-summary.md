# Validation Summary: Cloud Controller Manager as a Deployment, DaemonSet, or Static Pod: Which Topology Fits?

## Status
validated

## Post Type
Technical guide / architecture decision guide

## Technologies Covered
- Kubernetes cloud-controller-manager (CCM)
- Kubernetes Deployments and ReplicaSets (`apps/v1`)
- Kubernetes DaemonSets (`apps/v1`)
- Kubernetes static Pods, kubelet supervision, and mirror Pods
- Kubernetes leader election and `coordination.k8s.io/v1` Lease objects
- Node selectors, node affinity, taints, tolerations, priority, and `hostNetwork`
- Kubernetes API authentication, authorization, and RBAC
- `kubectl get` diagnostics

## Sources Consulted
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes: ReplicaSet](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/)
- [Kubernetes: DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes: Static Pods](https://kubernetes.io/docs/concepts/workloads/pods/static-pods/)
- [Kubernetes: Leases](https://kubernetes.io/docs/concepts/architecture/leases/)
- [Kubernetes: Nodes](https://kubernetes.io/docs/concepts/architecture/nodes/)
- [Kubernetes: kubeadm implementation details](https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/)
- [Kubernetes: The Cloud Controller Manager Chicken and Egg Problem](https://kubernetes.io/blog/2025/02/14/cloud-controller-manager-chicken-egg-problem/)
- [Kubernetes: Migrate a replicated control plane to use cloud-controller-manager](https://kubernetes.io/docs/tasks/administer-cluster/controller-manager-leader-migration/)
- [Kubernetes: `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes v1.36 source: cloud-controller-manager startup and leader election](https://github.com/kubernetes/kubernetes/blob/v1.36.0/staging/src/k8s.io/cloud-provider/app/controllermanager.go)
- [Kubernetes v1.36 source: cloud-controller-manager leader-election resource defaults](https://github.com/kubernetes/kubernetes/blob/v1.36.0/staging/src/k8s.io/cloud-provider/options/options.go)
- [Kubernetes v1.36 source: generic leader-election defaults](https://github.com/kubernetes/kubernetes/blob/v1.36.0/staging/src/k8s.io/component-base/config/v1alpha1/defaults.go)

## Issues Found
1. **Provider permissions and RBAC were presented as universal requirements.** Route and load-balancer permissions are only needed when the corresponding provider controllers are enabled, cloud authentication mechanisms vary, and Kubernetes authorization does not have to use RBAC. Changed the shared requirements to describe provider-specific cloud authentication/authorization and Kubernetes API authentication/authorization, with RBAC identified as the common case.
2. **The observability requirement implied that readiness identifies the active leader.** A healthy standby can also be ready. Separated readiness and alerting from the requirement for a reliable way to identify the elected leader, such as inspecting the configured Lease.
3. **The Deployment dependency explanation conflated Pod creation with Pod networking and omitted the ReplicaSet layer.** ReplicaSet controllers create replacement Pods for a Deployment, while CNI is needed to run an ordinary pod-networked Pod rather than to create its API object. Updated the text to distinguish creation, scheduling, and execution, and made the CNI dependency conditional because `hostNetwork: true` removes it.
4. **The DaemonSet section used “selector” ambiguously and understated scheduling dependencies.** A DaemonSet's `.spec.selector` selects its Pods; `.spec.template.spec.nodeSelector` or node affinity limits eligible Nodes. Updated the terminology and documented that the DaemonSet controller creates candidate Pods and a scheduler normally binds them.
5. **Static Pod API independence was too broad, and the mirror-Pod actor was incorrect.** The kubelet can create and restart a static Pod without the API server or scheduler, but CCM operation still needs the API server to acquire its Lease and reconcile objects. Clarified that scope, changed the bootstrap wording, and corrected the mirror-Pod explanation to state that the kubelet creates the mirror Pod on the API server.
6. **Scheduling and taint checks were written as though they applied equally to static Pods.** Static Pods bypass the scheduler, so the placement question and bootstrap test were split between workload-managed Pods and kubelet-managed static Pods. The static-Pod check now focuses on delivery of node-local manifests, networking, and credentials to a fresh control-plane Node.
7. **The Lease diagnostic assumed one fixed lock name and namespace.** `cloud-controller-manager` in `kube-system` is the upstream default, but providers can override both values, and Leader Migration can use an additional migration Lease. Added both caveats after the commands.
8. **The claim that one CCM candidate per worker is not an HA strategy was too absolute.** With leader election, worker-hosted replicas can provide redundancy, but this topology is usually excessive, broadens credential exposure, and does not increase active-controller throughput. Reworded the selection rule accordingly.

## Review Notes
- The Deployment and DaemonSet YAML fragments use current `apps/v1` fields and valid toleration syntax. The Deployment example is explicitly a topology sketch and correctly tells readers to add provider-specific image, credentials, probes, security settings, networking, API authorization rules, and flags.
- `node-role.kubernetes.io/control-plane: ""` matches kubeadm's default empty-valued control-plane label. Other distributions can use different labels or values, so the post's instruction to verify actual Node labels and provider manifests remains important.
- DaemonSet Pods do automatically receive tolerations for `node.kubernetes.io/not-ready`, `node.kubernetes.io/unreachable`, and `node.kubernetes.io/unschedulable`; the external-cloud-provider `node.cloudprovider.kubernetes.io/uninitialized` taint still needs an explicit matching toleration.
- Upstream leader election defaults to enabled, uses Lease locking, and defaults the resource to `cloud-controller-manager` in `kube-system`. Provider implementations and manifests can override those defaults.
- All three `kubectl get` commands use current syntax. All external links in the post resolved successfully and pointed to the intended resources on 2026-08-10.
- The CCM administration page's embedded DaemonSet manifest is explicitly only a guideline and still shows a legacy image and `master` label. The post does not copy those stale values and correctly directs readers to provider-supported manifests.
