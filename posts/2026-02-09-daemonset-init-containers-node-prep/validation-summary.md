# Validation Summary: How to configure DaemonSet with init containers for node preparation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DaemonSets
- Kubernetes init containers
- Kubernetes hostPath volumes and security contexts
- Linux namespaces and nsenter
- Linux kernel modules and modprobe
- Linux sysctl parameters
- NVIDIA GPU workloads on Kubernetes
- Istio CNI and iptables setup

## Sources Consulted
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes DaemonSet apps/v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/
- Kubernetes sysctl documentation: https://kubernetes.io/docs/tasks/administer-cluster/sysctl-cluster/
- nsenter(1) Linux manual page: https://man7.org/linux/man-pages/man1/nsenter.1.html
- modprobe(8) Linux manual page: https://www.man7.org/linux/man-pages/man8/modprobe.8.html
- Amazon EKS NVIDIA GPU device management documentation: https://docs.aws.amazon.com/eks/latest/userguide/device-management-nvidia.html
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio pilot-agent command help verified from the `istio/proxyv2:1.20.0` container image.
- Container tool availability verified from `busybox:1.36`, `curlimages/curl:8.5.0`, `debian:12-slim`, and NVIDIA CUDA 12.3 images.

## Issues Found
- The node dependency example used `nsenter -t 1` without `hostPID: true`, which would target PID 1 inside the container rather than the host. Added `hostPID: true` and changed `apt-get update` to run through `nsenter` so it updates the host package lists. Also clarified that the example applies to Debian-based nodes.
- The sysctl example claimed node persistence while running in the pod network namespace. Added `hostNetwork: true` and changed the wording to describe current node runtime configuration instead of persistence.
- The GPU example verified GPU availability before loading drivers and used CUDA images for `modprobe`, but the checked CUDA images do not include `modprobe` by default. Reordered the setup to load drivers first from an Ubuntu image with `kmod` installed, then verify and configure the GPU. Added `nvidia.com/gpu: 1` limits to the init containers that call `nvidia-smi`.
- The node validation example checked disk usage inside the container and attempted to contact `127.0.0.1:10250` without host networking. Added `hostNetwork: true`, mounted the host root read-only, and changed the disk check to inspect `/host`.

## Review Notes
The YAML snippets parse successfully after the fixes. Several examples require privileged containers, host access, package repositories, matching host operating systems, or cluster-specific security policies, so they should be treated as operational patterns rather than drop-in manifests for every cluster.
