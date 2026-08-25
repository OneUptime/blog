# Validation Summary: Why VPA Cannot Manage Static or Bare Pods: Fixing an Unsupported targetRef

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Kubernetes
- Vertical Pod Autoscaler (VPA)
- Static Pods and mirror Pods
- Deployments, ReplicaSets, StatefulSets, and DaemonSets
- Kubernetes custom resources and the `/scale` subresource
- `kubectl`, JSONPath, `jq`, and YAML manifests

## Sources Consulted

- [VPA API reference: `targetRef`, update policies, and conditions](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md)
- [VPA known limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md)
- [VPA FAQ: custom resources, direct ownership, and single-replica updates](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/faq.md)
- [VPA target selector fetcher](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/target/fetcher.go)
- [VPA topmost-controller fetcher](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/target/controller_fetcher/controller_fetcher.go)
- [VPA recommender condition handling](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/recommender/input/cluster_feeder.go) and [condition definitions](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1/types.go)
- [VPA updater flags](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/flags.md) and [updater defaults](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/config/config.go)
- [VPA v1 CRD schema](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/deploy/vpa-v1-crd-gen.yaml)
- [Kubernetes static Pods concept](https://kubernetes.io/docs/concepts/workloads/pods/static-pods/), [static Pod task](https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/), and [kubelet configuration API](https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/)
- [Kubelet mirror-Pod client source](https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/pod/mirror_client.go) and [`kubernetes.io/config.mirror` reference](https://kubernetes.io/docs/reference/labels-annotations-taints/#kubernetes-io-config-mirror)
- [Kubernetes Deployment selector behavior](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#selector)
- [Kubernetes CRD `/scale` subresource](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#scale-subresource)
- [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [`kubectl` JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/), and [`jq` manual](https://jqlang.org/manual/)

## Issues Found

- The introduction described all static Pods as node-local and implied that a mirror Pod always exists. It now covers filesystem- and URL-hosted sources and makes mirror-Pod creation conditional on kubelet API access and authorization.
- The troubleshooting symptoms implied that the API server rejects a VPA whose target is a Pod. The API generally accepts the reference; VPA later fails the selector lookup and reports `ConfigUnsupported`. The condition and log-message descriptions now reflect that behavior, while `NoPodsMatched` is described in terms of the selector matching no Pods.
- The bare-Pod migration left the original Pod matching the new Deployment and VPA selector. The post now requires a planned cutover: delete or relabel the bare Pod first, or add a new selector/template label that it lacks.
- The VPA manifest used unquoted `updateMode: Off`. Kubernetes' YAML conversion resolves bare `Off` as a boolean, but the VPA CRD requires a string enum. It is now `updateMode: "Off"`.
- The static-Pod source description omitted that `staticPodPath` can name a single file and tied reconciliation only to a local manifest. It now names `staticPodPath` and `staticPodURL` and refers to the configured source.
- “Control-plane quorum” was imprecise because quorum applies specifically to etcd. The safety note now distinguishes control-plane availability from etcd quorum.
- The custom-resource advice did not cover a scalable CR that owns the targeted Deployment. VPA would consider that CR the topmost scalable owner and reject the child Deployment target. The post now limits Deployment targeting to cases where it is the topmost supported controller and states that scalable-parent ownership requires a different operator integration.

## Review Notes

- All referenced URLs resolved successfully during review.
- The shell commands and flags are current. The JSONPath template and `jq` filter are syntactically valid.
- All YAML blocks parse successfully, `updateMode` now remains the string `Off`, and the Deployment passes a `kubectl` client-side dry run.
- The updater's global `--min-replicas` default is still `2`; current VPA also permits a per-object `spec.updatePolicy.minReplicas` override. Lowering it for a singleton permits disruption, so the post's availability warning is correct.
- `registry.example.com/app:2026-08-25` is an illustrative image reference and must be replaced with the workload's real image.
