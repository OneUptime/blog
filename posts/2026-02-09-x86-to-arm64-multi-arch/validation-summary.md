# Validation Summary: Migrate Kubernetes Workloads from x86 to ARM64 Nodes with Multi-Arch Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments, Pods, DaemonSets, node labels, node selectors, and topology spread constraints
- Docker Buildx and multi-platform container images
- Amazon EKS managed node groups and eksctl ARM node groups
- AWS Graviton / ARM64 nodes
- Prometheus PromQL and kube-state-metrics

## Sources Consulted
- Kubernetes documentation: Images, including multi-architecture images with image indexes: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes documentation: Node labels populated by the kubelet and well-known labels: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes documentation: Pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Docker documentation: Multi-platform builds with Buildx: https://docs.docker.com/build/building/multi-platform/
- Docker CLI help for `docker buildx build`
- AWS CLI documentation: `aws eks create-nodegroup`: https://docs.aws.amazon.com/cli/latest/reference/eks/create-nodegroup.html
- AWS CLI documentation: `aws eks update-nodegroup-config`: https://docs.aws.amazon.com/cli/latest/reference/eks/update-nodegroup-config.html
- eksctl documentation: ARM support for EKS node groups: https://docs.aws.amazon.com/eks/latest/eksctl/arm-support.html
- Prometheus documentation: Vector matching and `group_left`: https://prometheus.io/docs/prometheus/latest/querying/operators/
- kube-state-metrics metric documentation for Pods and Nodes: https://github.com/kubernetes/kube-state-metrics/tree/main/docs/metrics

## Issues Found
- The manifest inspection example could include non-runtime `unknown/unknown` entries from registry metadata on some images. Added a `select(.platform.os == "linux")` filter so it lists Linux runtime platforms.
- The image tag `myapp:v1.0` was used with `docker buildx build --push`, which is not a complete push target for most real registries. Updated examples to use `registry.example.com/myapp:v1.0`.
- The ARM64 test pod and `kubectl exec` command referenced `/app/run-tests.sh`, but the Dockerfile only copied the compiled binary to `/usr/local/bin/myapp`. Replaced the test command with a simple binary invocation that matches the image layout.
- The topology spread Deployment snippet omitted the required `spec.selector` and matching pod template labels. Added them so the manifest is valid for `apps/v1`.
- The migration examples used `kubectl scale nodegroup`, but Kubernetes has no built-in `nodegroup` resource for EKS managed node groups. Replaced these with `aws eks update-nodegroup-config --scaling-config` commands.
- The DaemonSet snippet omitted template labels required to match its selector. Added `template.metadata.labels`.
- The DaemonSet init container mounted an `emptyDir` at `/agent` and then attempted to write a file to `/agent`, which would be a directory. Updated the mount path to `/agent-bin` and wrote the downloaded binary to `/agent-bin/agent`.
- The PromQL examples attempted to group by an `arch` label from `kube_pod_info`, but `kube_pod_info` includes the node name, not node architecture. Updated the queries to join pod metrics to `kube_pod_info`, then to `kube_node_labels`, using `label_kubernetes_io_arch`.
- The x86 decommissioning check used `kubectl get pods -o wide | grep -v arm64`, which does not reliably identify pods running on x86 nodes. Replaced it with a loop over nodes labeled `kubernetes.io/arch=amd64` and `--field-selector spec.nodeName=...`.

## Review Notes
The PromQL examples assume kube-state-metrics exposes node labels, including `label_kubernetes_io_arch`; installations using a restrictive `--metric-labels-allowlist` must allow that node label. The cost savings claim for Graviton is directionally plausible but workload- and instance-family-specific, so it should be treated as an estimate rather than a guarantee.
