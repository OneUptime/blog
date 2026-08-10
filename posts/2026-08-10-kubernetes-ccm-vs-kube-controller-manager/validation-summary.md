# Validation Summary: What Does Kubernetes cloud-controller-manager Actually Do—and What Still Belongs to kube-controller-manager?

## Status
validated

## Post Type
Technical guide / reference and troubleshooting guide

## Technologies Covered
- Kubernetes control-plane architecture
- `cloud-controller-manager` node, cloud-node-lifecycle, route, and Service controllers
- `kube-controller-manager` workload, node-lifecycle, taint-eviction, node IPAM, EndpointSlice, and storage controllers
- kubelet Node registration, Node status, Lease heartbeats, labels, taints, and provider IDs
- Kubernetes Services, ClusterIP, NodePort, LoadBalancer, and EndpointSlices
- kube-proxy, CNI networking, Ingress, and Gateway controllers
- Container Storage Interface (CSI), CSI migration, and VolumeAttachment resources
- `kubectl` JSONPath, custom-column, describe, get, and logs commands

## Sources Consulted
- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/) — standard CCM controllers and provider-dependent behavior.
- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/) — external-provider initialization, tainting, controller responsibilities, and the upstream CCM manifest example.
- [Kubernetes: kube-controller-manager reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/) — current core controller list, node IPAM, EndpointSlice, node-lifecycle, taint-eviction, and persistent-volume controllers.
- [Kubernetes: Nodes](https://kubernetes.io/docs/concepts/architecture/nodes/) and [Node Status](https://kubernetes.io/docs/reference/node/node-status/) — Node status, Lease heartbeats, `Ready` transitions, and node-controller behavior.
- [Kubernetes: Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/#taint-based-evictions) and [Kubernetes v1.34: Decoupled Taint Manager Is Now Stable](https://kubernetes.io/blog/2025/09/15/kubernetes-v1-34-decoupled-taint-manager-is-now-stable/) — mapping of `Ready=False`/`Unknown` to health taints and current taint-eviction ownership.
- [Kubernetes: kubelet reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/) — `--cloud-provider=external`, `--provider-id`, and bootstrap `--node-ip` behavior.
- [Kubernetes cloud-provider Node controller source](https://github.com/kubernetes/kubernetes/blob/release-1.36/staging/src/k8s.io/cloud-provider/controllers/node/node_controller.go) and [cloud-node-lifecycle controller source](https://github.com/kubernetes/kubernetes/blob/release-1.36/staging/src/k8s.io/cloud-provider/controllers/nodelifecycle/node_lifecycle_controller.go) — provider ID, labels, addresses, taint removal, instance existence, and shutdown checks.
- [Kubernetes: Cluster Networking](https://kubernetes.io/docs/concepts/cluster-administration/networking/), [Node API](https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/), and [cloud-provider Route controller source](https://github.com/kubernetes/kubernetes/blob/release-1.36/staging/src/k8s.io/cloud-provider/controllers/route/route_controller.go) — optional Pod CIDRs, CNI IPAM, and provider-route reconciliation.
- [Kubernetes: Service](https://kubernetes.io/docs/concepts/services-networking/service/) and [Service ClusterIP allocation](https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/) — LoadBalancer behavior, optional NodePort allocation, `loadBalancerClass`, status, and ClusterIP allocation.
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/), [Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/), and [Gateway API](https://kubernetes.io/docs/concepts/services-networking/gateway/) — backend discovery and controller ownership.
- [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/), [kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), and [JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/) — syntax and current option behavior for every command in the post.
- [Kubernetes: Volumes and CSI migration](https://kubernetes.io/docs/concepts/storage/volumes/), [Deploying a CSI Driver](https://kubernetes-csi.github.io/docs/deploying.html), and [CSI external-attacher](https://kubernetes-csi.github.io/docs/external-attacher.html) — CSI controller/node responsibilities, migration, attachment, and mount behavior.
- [Kubernetes: VolumeAttachment API](https://kubernetes.io/docs/reference/kubernetes-api/storage/volume-attachment-v1/) and [CSIDriver API](https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-driver-v1/) — cluster scope and the optional attach requirement.

## Issues Found
1. **Node health and Pod eviction were conflated.** Heartbeats do not become `Unknown`; the Node's `Ready` condition does. Also, current Kubernetes runs taint-based Pod eviction in the separate `taint-eviction-controller`, although that controller remains inside `kube-controller-manager`. The ownership row and Node-health paragraph now distinguish Node/Lease monitoring and health-taint management from taint-based eviction.
2. **External-provider kubelet behavior was stated too absolutely.** A kubelet using `--cloud-provider=external` does not perform cloud-provider initialization, but it can still receive an explicit provider ID or bootstrap node IP. The Node-initialization description now preserves that distinction and explains that the CCM initializes or reconciles cloud-derived values.
3. **The missing-PodCIDR diagnostic assumed every network model uses per-Node Pod CIDRs.** Some CNIs perform their own IPAM and do not require `.spec.podCIDR` or `.spec.podCIDRs`. The diagnostic now applies only when the cluster is configured for per-Node Pod CIDR allocation, and the missing-route diagnostic only when provider routes are expected.
4. **The CCM log command used a non-portable label and could return only ten lines per Pod.** CCM labels are provider-manifest-specific, and the upstream example uses `k8s-app=cloud-controller-manager` rather than `component=cloud-controller-manager`. More importantly, `kubectl logs` defaults to a ten-line tail when `-l` is used unless `--tail` is explicitly set. The example now uses the upstream sample label, adds `--tail=-1`, and tells readers to adjust the namespace and selector for their provider.
5. **EndpointSlices were described as proving backend-path usability.** EndpointSlices show the backends selected by the control plane; they do not test network reachability. The text now distinguishes EndpointSlice inspection from testing NodePort reachability and notes that a LoadBalancer Service may have no NodePort.
6. **Two storage statements were overly broad.** Snapshot components are only relevant when snapshots are used, and CSI does not own Kubernetes' generic persistent-volume controllers. The migration sentence now makes snapshot components conditional, and the conclusion now assigns provider-specific storage operations to CSI drivers.

## Review Notes
- The post has no explicit Kubernetes version. It was validated against the current Kubernetes v1.36 documentation and release-1.36 upstream source available on 2026-08-10.
- All code blocks use current `kubectl` syntax. The JSONPath expressions, custom columns, EndpointSlice selector, resource names, `-n`, `-o`, `--since`, and `--tail` options are valid.
- `VolumeAttachment` is cluster-scoped, so omitting `-n` is correct. A CSI driver with `CSIDriver.spec.attachRequired: false` can legitimately have no VolumeAttachment objects.
- Provider implementations may omit, split, or extend standard CCM controllers. The post correctly directs readers to the provider's documentation and manifests for the exact controller set, labels, permissions, and networking model.
- The route controller can be disabled or unsupported, and some providers can combine route handling with Pod-network address allocation. The post's provider-specific qualifications are accurate after the conditional diagnostic fix.
- EndpointSlice is the current API to inspect Service backends; the legacy Endpoints API is deprecated as of Kubernetes v1.33, and the post correctly avoids it.
- All six official documentation links in the post returned HTTP 200 and pointed to the intended Kubernetes pages on 2026-08-10.
