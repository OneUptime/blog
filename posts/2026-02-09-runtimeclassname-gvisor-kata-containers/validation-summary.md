# Validation Summary: How to Use RuntimeClassName to Select Container Runtimes Like gVisor or Kata

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RuntimeClass and `runtimeClassName`
- containerd runtime handlers
- gVisor / `runsc`
- Kata Containers
- Kubernetes admission webhooks
- kubectl
- kube-state-metrics and Prometheus alert rules

## Sources Consulted
- Kubernetes RuntimeClass concept documentation: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Kubernetes RuntimeClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/node/runtime-class-v1/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging with `kubectl debug`: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- gVisor installation documentation: https://gvisor.dev/docs/user_guide/install/
- gVisor containerd quick start: https://gvisor.dev/docs/user_guide/containerd/quick_start/
- Kata Containers installation documentation: https://github.com/kata-containers/kata-containers/blob/main/docs/installation.md
- Kata Containers containerd installation documentation: https://github.com/kata-containers/kata-containers/blob/main/docs/install/container-manager/containerd/containerd-install.md
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The gVisor apt repository example omitted the required apt HTTPS/GPG prerequisites and architecture selector used by the official installation docs. Added the prerequisite package install command and `arch=$(dpkg --print-architecture)`.
- The gVisor containerd configuration overwrote the runtime config without including the default `runc` handler shown in the official gVisor containerd quick start. Added the `runc` runtime entry.
- The Kata section used an outdated openSUSE `stable-2.0` apt repository. Replaced it with the current official Kata Deploy Helm chart flow and noted Kubernetes, CRI, and virtualization requirements.
- The Kata explanation said each container runs in a VM. Adjusted this to pod sandbox isolation, which is the Kubernetes-oriented behavior.
- The Prometheus examples used non-standard `runtime` labels and compared a Unix timestamp metric as if it were startup latency. Replaced them with kube-state-metrics-based examples using `kube_pod_runtimeclass_name_info`, pod readiness, and declared pod overhead.
- The benchmark script waited for `condition=completed` on a Pod, but Pods do not have a `Completed` condition. Changed it to wait for `.status.phase` to become `Succeeded`.
- The node debugging snippet used a non-privileged `kubectl debug` session and ran `crictl` directly in the debug image. Updated it to use `--profile=sysadmin` and run `crictl` through `chroot /host`.

## Review Notes
The RuntimeClass manifests and Pod/Deployment examples use current `node.k8s.io/v1` and `runtimeClassName` fields. The monitoring examples depend on kube-state-metrics metrics, including `kube_pod_runtimeclass_name_info` and pod overhead metrics, which are marked experimental in kube-state-metrics documentation.
