# Validation Summary: How to Use CRI-O as the Container Runtime for Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubeadm
- kubelet
- CRI-O
- crictl
- OCI runtimes
- containers registries configuration
- Prometheus metrics scraping

## Sources Consulted
- CRI-O packaging documentation: https://github.com/cri-o/packaging
- CRI-O project documentation and configuration references: https://github.com/cri-o/cri-o
- CRI-O crio.conf reference: https://raw.githubusercontent.com/cri-o/cri-o/main/docs/crio.conf.5.md
- Kubernetes container runtimes documentation: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes kubeadm installation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes kubeadm v1beta4 configuration reference: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes kubelet configuration reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- containers registries.conf reference: https://raw.githubusercontent.com/containers/image/main/docs/containers-registries.conf.5.md
- containers auth.json reference: https://raw.githubusercontent.com/containers/image/main/docs/containers-auth.json.5.md
- crictl documentation: https://raw.githubusercontent.com/kubernetes-sigs/cri-tools/master/docs/crictl.md
- CRI-O metrics documentation: https://gitea.cncfstack.com/cri-o/cri-o/src/commit/38f41c16a355e34ee2866e4b922a4e3ba8092f39/tutorials/metrics.md

## Issues Found
- The Ubuntu installation commands used the old Kubic `devel:/kubic:/libcontainers` repository layout and `apt-key`, which is deprecated. Updated the commands to use the current CRI-O `isv:/cri-o:/stable` repository, signed-by keyrings, and matching Kubernetes package repository variables.
- The examples targeted Kubernetes/CRI-O 1.28, which is end-of-life by the current CRI-O packaging stream list. Updated the examples to use v1.36.
- The CRI-O storage driver was shown as `overlay2`, which is Docker terminology. CRI-O's documented default storage driver is `overlay`, so the driver name and option prefix were corrected.
- The CRI-O configuration described `runc` as the default runtime. Current CRI-O defaults to `crun`, so the default runtime example and architecture description were updated while keeping `runc` as an alternate runtime handler later in the post.
- The pause image was pinned to `registry.k8s.io/pause:3.9`, which matched older Kubernetes releases. Updated it to the CRI-O v1.36 default pause image version.
- The post used `crictl` without configuring its runtime endpoint. Since default endpoint probing is deprecated, added `/etc/crictl.yaml` pointing to the CRI-O socket.
- The kubeadm configuration used deprecated `kubeadm.k8s.io/v1beta3` and did not configure the kubelet cgroup driver through `KubeletConfiguration`. Updated the kubeadm example to `v1beta4` and added a `KubeletConfiguration` document.
- The kubelet systemd drop-in used deprecated kubelet flags for the runtime endpoint and cgroup driver. Replaced it with direct kubelet configuration fields for non-kubeadm bootstraps.
- Registry mirror configuration was written under `/etc/crio/crio.conf.d`, but `[[registry]]` entries belong in containers registries configuration. Moved the example to `/etc/containers/registries.conf.d/`.
- The registry auth example created an auth file but did not point CRI-O at it. Added a CRI-O drop-in setting `global_auth_file` for node-level pulls.
- The Prometheus Service example selected `app: crio`, but CRI-O runs as a host service, not a Kubernetes Pod with that label. Replaced it with a selectorless Service plus Endpoints example.

## Review Notes
The post is now technically valid as a current CRI-O and kubeadm guide. In a future revision, it could mention that CRI-O packages include a disabled bridge CNI configuration suitable only for test or single-node setups, and that production clusters should install a full CNI plugin.
