# Validation Summary: `--cloud-provider=external` vs a Provider Name: What Kubernetes Accepts Now

## Status
validated

## Post Type
Technical migration and troubleshooting guide

## Technologies Covered

- Kubernetes v1.29 and later, with emphasis on v1.31+
- kubelet, kube-controller-manager, and kube-apiserver
- External cloud-controller-manager (CCM) integrations
- Controller-manager Leader Migration
- Kubernetes Node initialization, provider IDs, topology labels, addresses, and taints
- Container Storage Interface (CSI) migration
- Kubelet image credential-provider plugins
- kubectl, JSONPath, custom columns, and jq
- Helm chart rendering
- systemd, ps, and grep

## Sources Consulted

- [Kubernetes: Removed feature gates](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/)
- [Kubernetes 1.29: Cloud Provider Integrations Are Now Separate Components](https://kubernetes.io/blog/2023/12/14/cloud-provider-integration-changes/)
- [Kubernetes: Completing the largest migration in Kubernetes history](https://kubernetes.io/blog/2024/05/20/completing-cloud-provider-migration/)
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Cloud Controller Manager functions](https://kubernetes.io/docs/concepts/architecture/cloud-controller/#cloud-controller-manager-functions)
- [Kubernetes: Migrate Replicated Control Plane To Use Cloud Controller Manager](https://kubernetes.io/docs/tasks/administer-cluster/controller-manager-leader-migration/)
- [Kubernetes: kubelet command-line reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/)
- [Kubernetes: kube-controller-manager command-line reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/)
- [Kubernetes v1.31 feature-gate definitions](https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/features/kube_features.go#L1056-L1058)
- [Kubernetes v1.33 changelog](https://github.com/kubernetes/kubernetes/blob/v1.33.0/CHANGELOG/CHANGELOG-1.33.md)
- [Kubernetes v1.31 kubelet Node-taint implementation](https://github.com/kubernetes/kubernetes/blob/v1.31.0/pkg/kubelet/kubelet_node_status.go#L327-L332)
- [Kubernetes: Well-Known Labels, Annotations and Taints](https://kubernetes.io/docs/reference/labels-annotations-taints/#node-cloudprovider-kubernetes-io-uninitialized)
- [Kubernetes: Migrating to CSI drivers from in-tree plugins](https://kubernetes.io/docs/concepts/storage/volumes/#migrating-to-csi-drivers-from-in-tree-plugins)
- [Kubernetes: Configure a kubelet image credential provider](https://kubernetes.io/docs/tasks/administer-cluster/kubelet-credential-provider/)
- [Kubernetes: Version Skew Policy](https://kubernetes.io/releases/version-skew-policy/)
- [Kubernetes: kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes: kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: kubeadm implementation details](https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/)
- [Helm: helm template](https://helm.sh/docs/helm/helm_template/)
- [jq manual](https://jqlang.org/manual/v1.8/)
- [systemd: systemctl](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html)
- [POSIX: ps](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/ps.html)
- [GNU grep: Basic vs Extended Regular Expressions](https://www.gnu.org/software/grep/manual/html_node/Basic-vs-Extended.html)

## Issues Found

- The opening and conclusion referred broadly to all Kubernetes core components. In Kubernetes v1.31 and v1.32, kube-apiserver still had deprecated cloud-provider flags, but v1.33 removed them entirely. The post now scopes the two accepted values to the upstream kubelet and kube-controller-manager and explicitly warns not to pass the removed flags to a v1.33+ kube-apiserver.
- The displayed uninitialized taint omitted the value that the kubelet actually sets. It was corrected from `node.cloudprovider.kubernetes.io/uninitialized:NoSchedule` to `node.cloudprovider.kubernetes.io/uninitialized=true:NoSchedule`.
- The kubectl JSONPath expression ranged over each `command` array but attempted to print a child field with `{.}`, producing blank output. It now ranges over `command[*]` and prints each current scalar with `{@}`, so the kube-controller-manager command and flags appear one per line.
- The statement “Storage requires CSI” was too broad because Kubernetes supports storage that is unrelated to migrated cloud volume plugins. It now states specifically that migrated in-tree cloud volume integrations require their corresponding CSI drivers.
- The migration sequence started the external CCM before preparing Leader Migration. The sequence now prepares the CCM without starting its controllers, configures Leader Migration first where applicable, and then activates the CCM and changes core-component settings in the provider-documented order. This avoids a window of duplicate controller ownership.
- The grep example used `\|`, a common GNU/BSD basic-regular-expression extension that is not POSIX-portable. It now uses the POSIX `-E` mode and an unescaped alternation operator.

## Review Notes

- All remaining technical claims and shell commands were consistent with the consulted documentation and current CLI behavior.
- The kube-controller-manager JSONPath command is appropriate for default kubeadm static Pod manifests, which place the executable and flags in `command`; other distributions may place additional values in `args`, consistent with the post's warning to inspect the tool-owned source of truth.
- The post correctly distinguishes the `external` value used by Kubernetes core components from provider-specific arguments accepted by an external CCM.
- The Kubernetes CCM administration page's example DaemonSet is explicitly a guideline and still contains an old example image and placeholders; the post correctly warns against copying it literally.
- Every external URL in the post resolved successfully and pointed to the intended Kubernetes resource on the validation date.
