# Validation Summary: How to Configure K3s for Autonomous Vehicle Edge Computing - Edge

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- NVIDIA Jetson / Orin
- ROS 2
- Eclipse Cyclone DDS
- GPU scheduling
- Pod priority and preemption
- Liveness probes

## Sources Consulted
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Managing Packaged Components: https://docs.k3s.io/installation/packaged-components
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Schedule GPUs: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes Control CPU Management Policies on the Node: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Kubernetes kubelet CLI Reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes DNS for Services and Pods: https://v1-32.docs.kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes API Reference (`hostNetwork` in PodSpec): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/
- ROS 2 `rmw_implementation`: https://docs.ros.org/en/rolling/p/rmw_implementation/README.html
- Eclipse Cyclone DDS Installation: https://cyclonedds.io/docs/cyclonedds/latest/installation/installation.html
- NVIDIA JetPack SDK Documentation: https://docs.nvidia.com/jetson/jetpack/index.html

## Issues Found
- The `apps/v1` Deployment manifests in Steps 2 and 4 were incomplete because they omitted the required `.spec.selector` and matching pod-template labels. I added `selector.matchLabels` and `template.metadata.labels` so the YAML is valid for current Kubernetes APIs.
- The Step 4 example placed `hostNetwork: true` under the container instead of the pod spec. I moved `hostNetwork` to `spec.template.spec`, which is where the Kubernetes API defines it.
- The Step 4 example used `DDS_CONFIG=CYCLONE`, which is not an official ROS 2 middleware-selection environment variable. I replaced it with `RMW_IMPLEMENTATION=rmw_cyclonedds_cpp`, which ROS 2 documents for selecting Cyclone DDS via the ROS middleware layer.
- The Step 4 host-networked pod did not set `dnsPolicy: ClusterFirstWithHostNet`. I added it because Kubernetes documents that pods using `hostNetwork` should set that DNS policy explicitly to retain cluster DNS behavior.
- The CPU quota comment in Step 1 overstated the effect of `cpu-cfs-quota=false` by implying it only affected real-time pods. I corrected the comment to reflect the kubelet behavior documented upstream: it disables CFS quota enforcement for containers that specify CPU limits.
- The Step 2 wording implied `requests == limits` alone enables CPU pinning. I corrected the comment to reflect the documented requirement: exclusive CPU assignment needs a `Guaranteed` pod with integer CPU requests under the static CPU Manager policy.
- The Step 3 explanation overstated PriorityClass behavior by saying it would "ensure" preemption. I revised it to say the scheduler can preempt lower-priority pods when capacity is needed, which matches Kubernetes behavior more closely.

## Review Notes
- The post's use of `kubelet-arg` is still valid in K3s, but upstream Kubernetes marks many equivalent kubelet CLI flags as deprecated in favor of kubelet config files. K3s continues to document `--kubelet-arg` as a supported customization path.
- `topology-manager-policy=single-numa-node` is a valid kubelet setting, but it is most beneficial on hardware that exposes meaningful NUMA topology. On Jetson-class systems, the practical benefit may be limited depending on the platform topology.
