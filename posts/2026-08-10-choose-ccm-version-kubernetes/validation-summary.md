# Validation Summary: Choosing a cloud-controller-manager Version for Your Kubernetes Cluster

## Status

validated

## Post Type

Technical guide and release-management reference

## Technologies Covered

- Kubernetes v1.36 control-plane components and version-skew policy
- External cloud-controller-manager providers
- High-availability Kubernetes upgrades
- Controller Manager Leader Migration
- `kubectl`, JSONPath, custom-column output, logs, and Lease inspection
- Helm charts and local template rendering
- `jq` and command-line manifest inspection
- Container Storage Interface (CSI) drivers
- vSphere Cloud Provider

## Sources Consulted

- [Kubernetes Version Skew Policy](https://kubernetes.io/releases/version-skew-policy/)
- [Kubernetes releases and maintained branches](https://kubernetes.io/releases/)
- [Kubernetes patch releases and support periods](https://kubernetes.io/releases/patch-releases/)
- [Kubernetes Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Migrate a Replicated Control Plane to Use Cloud Controller Manager](https://kubernetes.io/docs/tasks/administer-cluster/controller-manager-leader-migration/)
- [Completing the Largest Migration in Kubernetes History](https://kubernetes.io/blog/2024/05/20/completing-cloud-provider-migration/)
- [Kubernetes v1.31 release announcement](https://kubernetes.io/blog/2024/08/13/kubernetes-v1-31-release/)
- [kubeadm implementation details](https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/)
- [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [`kubectl version` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/)
- [`kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes Lease API reference](https://kubernetes.io/docs/reference/kubernetes-api/coordination/lease-v1/)
- [`helm show chart` reference](https://helm.sh/docs/helm/helm_show_chart/)
- [`helm template` reference](https://helm.sh/docs/helm/helm_template/)
- [Helm chart format and `appVersion`](https://helm.sh/docs/topics/charts/)
- [Official vSphere Cloud Provider compatibility matrix](https://github.com/kubernetes/cloud-provider-vsphere/blob/master/README.md#compatibility-with-kubernetes)
- [jq manual](https://jqlang.org/manual/)

## Issues Found

- The API-server inventory commands were presented without stating their deployment assumptions. The Pod label is a kubeadm-style convention, indexing `containers[0]` assumes the API server is the first container, and `kubectl version` reports only the server that handled that request. The post now scopes the Pod command to kubeadm-style self-managed control planes, selects the container named `kube-apiserver`, explains the limitation of `kubectl version`, and directs readers of managed or differently deployed clusters to their distribution's inventory mechanism.
- The upgrade sequence allowed all kubelet and kube-proxy upgrades to wait until after the API-server upgrade. A node component already three minors behind the current API server would become four minors behind after an N-to-N+1 control-plane upgrade, which is outside supported skew. The first step now requires those instances to be brought forward before upgrading the API servers.
- Two upgrade statements treated N+1 as though it were necessarily the external CCM's release number. Because provider release numbering does not always mirror Kubernetes, the wording now refers to a provider-supported CCM release built for Kubernetes N+1.
- The Leader Migration guidance was too broad for current clusters. It now applies specifically to HA migrations that begin on a Kubernetes release still containing the in-tree provider and accurately identifies the version-N component as `kube-controller-manager` running the in-tree controllers.
- The leadership check searched every Lease name for the word `cloud`, which can miss providers whose Lease has another name, and the logs command omitted a container selection. The example now inspects the provider-documented Lease directly, displays its holder and renewal time, and requires the CCM container name for reliable use with multi-container Pods.
- The original text described an unavailable CCM as an unconditional upgrade blocker. Kubernetes can operate without CCM-managed features in clusters that do not depend on a cloud-provider integration, so the blocker is now correctly limited to clusters that depend on that integration.

## Review Notes

- The central skew rule, the mixed v1.35/v1.36 HA example, the no-skip API-server rule, and the lack of a required relative order among `kube-controller-manager`, `kube-scheduler`, and CCM after the API servers are upgraded all match the upstream v1.36 policy.
- The maintained-branch statement is correct for 2026-08-10: v1.36, v1.35, and v1.34 are the three maintained upstream release branches.
- The vSphere provider's official matrix currently maps Kubernetes v1.36.x to provider v1.36.x and states that compatibility is guaranteed only for corresponding releases.
- All remaining commands are syntactically valid. The `jq` expression was also exercised against a multi-container fixture. If a Helm chart branches on target-cluster capabilities, operators should additionally pass the target `--kube-version` and any required `--api-versions` when rendering.
- All external links in the post resolved to their intended official or authoritative pages during review.
