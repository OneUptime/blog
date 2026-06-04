# Validation Summary: How to Fix Kubernetes Cgroup v2 Compatibility Issues After Node OS Upgrade

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes
- Linux cgroup v1 and cgroup v2
- kubelet cgroup driver configuration
- containerd
- Docker Engine / cri-dockerd
- crictl
- Prometheus / kubelet cAdvisor metrics
- GRUB kernel command-line configuration

## Sources Consulted
- Kubernetes: About cgroup v2: https://kubernetes.io/docs/concepts/architecture/cgroups/
- Kubernetes: Container Runtimes: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes: Configuring a cgroup driver: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/configure-cgroup-driver/
- Kubernetes: KubeletConfiguration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes: Feature Gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes: kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes: kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes: Debugging Kubernetes nodes with crictl: https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- Kubernetes: Dockershim Removal FAQ: https://kubernetes.io/blog/2022/02/17/dockershim-faq/
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Docker dockerd reference: https://docs.docker.com/reference/cli/dockerd/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
- The post said Kubernetes has supported cgroup v2 since 1.25. Kubernetes documents cgroup v2 as stable in 1.25, so the wording was changed to avoid implying there was no earlier support.
- The kubelet example used a nonexistent `CgroupsV2` feature gate and set `cgroupRoot: /`. Kubernetes documents that the kubelet automatically detects cgroup v2, so the example now only sets `cgroupDriver: systemd`.
- The containerd configuration showed only the containerd 1.x CRI plugin path. Kubernetes now documents different plugin paths for containerd 1.x and 2.x, so separate examples were added.
- The Docker runtime section implied Docker could still be used directly as a Kubernetes runtime. Kubernetes removed built-in dockershim in 1.24, so the text now refers to Docker Engine through cri-dockerd.
- The verification section claimed two nodeInfo jsonpath commands checked the cgroup driver, but they only show kubelet and runtime versions. The comments were corrected, and a node-local kubelet config check was added.
- The migration steps said to remove `cgroup_no_v1` when enabling cgroup v2. Kubernetes documents adding `systemd.unified_cgroup_hierarchy=1` for GRUB-based systems, so the instruction was corrected.
- The monitoring section attributed container metrics to node-exporter. The referenced metrics are kubelet/cAdvisor-style container metrics, so the text was corrected.
- The stress-test command used unsupported current `kubectl run --requests` and `--limits` flags. It was replaced with a valid Pod manifest applied via `kubectl apply -f -`.
- The gradual rollout example represented creating a node pool as a raw `Node` YAML manifest. That is misleading for Kubernetes nodes, so it was replaced with a `kubectl label node` command and kept the Deployment nodeSelector example.
- The cgroup v2 subtree-control example wrote directly to `/sys/fs/cgroup/cgroup.subtree_control`. The Linux kernel docs describe subtree controls and constraints, so the example now frames this as a managed subtree and warns not to edit Kubernetes or systemd-managed cgroups directly.
- The crictl runtime debugging example used `crictl run container-config.json pod-config.json`, which is not the documented flow for creating a pod sandbox. It now uses `crictl runp pod-config.json`.

## Review Notes
The post is technically relevant and salvageable. Some examples remain intentionally illustrative, especially node migration and Prometheus rules, because exact paths and metrics vary by distro, runtime packaging, and Kubernetes distribution.
