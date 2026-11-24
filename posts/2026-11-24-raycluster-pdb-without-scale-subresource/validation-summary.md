# Technical validation

Pinned CRD discovery, exact API previews and selector boundaries were tested locally; Ray and disruption-controller behavior was reviewed in official source.

## Checks performed

- Reviewed KubeRay1.4.2 CRD subresources, generated Pod labels, RayCluster owner references and direct worker deletion paths against Kubernetes1.34.0 PDB calculation source
- Installed the unmodified pinned RayCluster CRD into a disposable Kubernetes1.34.0 API server; discovery showed status but no scale and a RayCluster scale request returned404
- Executed all four article shell blocks using kubectl1.34.0 and jq1.6 against API fixtures; server dry-run left zero stored PDBs
- Created the exact two PDB manifests after preview and checked selectors with Kubernetes label helpers against six Pod fixtures: one head and three CPU workers selected; GPU and other-cluster labels excluded
- Four shell blocks passed bash syntax; seven-node/six-edge Mermaid diagram checked structurally; normalized title duplicate scan passed
- Generated1280x720 social image and visually inspected two-line title and branding without clipping

## Sources checked

- https://github.com/ray-project/kuberay/blob/v1.4.2/ray-operator/config/crd/bases/ray.io_rayclusters.yaml
- https://github.com/ray-project/kuberay/blob/v1.4.2/ray-operator/controllers/ray/raycluster_controller.go
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/controller/disruption/disruption.go
- https://github.com/ray-project/kuberay/issues/2662
- https://kubernetes.io/docs/tasks/run-application/configure-pdb/#arbitrary-workloads-and-arbitrary-selectors
- https://github.com/ray-project/kuberay/blob/v1.4.2/ray-operator/controllers/ray/common/pod.go
- https://docs.ray.io/en/latest/cluster/kubernetes/user-guides/kuberay-gcs-ft.html
- https://docs.ray.io/en/latest/cluster/kubernetes/user-guides/config.html
- https://docs.ray.io/en/latest/cluster/kubernetes/user-guides/k8s-autoscaler.html
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Limitations

- No KubeRay operator, disruption controller, kubelet or Ray application ran; Pod and ownership objects were fixtures, not functioning Ray workloads
- Expected allowance examples, controller-scale failure behavior and scale-down limitations derive from official source review; no drain, eviction, autoscaler, GCS recovery or multi-host scheduling test was performed
- Server dry-run verifies API admission, not reconciliation or application availability; Mermaid syntax was structurally checked but not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
