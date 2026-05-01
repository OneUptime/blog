# Validation Summary: How to Use Ephemeral Containers in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Kubernetes ephemeral containers
- `kubectl`
- Distroless images
- Netshoot

## Sources Consulted
- Kubernetes: Ephemeral Containers, https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes: Debug Running Pods, https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes: Share Process Namespace between Containers in a Pod, https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/
- Kubernetes: Pods, https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes: `kubectl debug` reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes: `kubectl cp` reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes: `kubectl logs` reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes API Reference: PodStatus `ephemeralContainerStatuses`, https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/
- Distroless repository README, https://github.com/GoogleContainerTools/distroless
- Netshoot repository README, https://github.com/nicolaka/netshoot

## Issues Found
- The introduction said ephemeral containers do not appear in pod specs after the session ends. Kubernetes documents that ephemeral containers cannot be removed after being added, so the text was corrected to explain that they remain listed on the pod until the pod is deleted.
- The prerequisites said ephemeral containers were GA in Kubernetes 1.23. Current Kubernetes documentation marks ephemeral containers as stable in v1.25, so the version guidance was corrected to `Kubernetes 1.25+`.
- The basic usage section used `/proc/1/root/...` to access the target container filesystem. Kubernetes documents filesystem access through `/proc/<pid>/root`, and PID 1 is not a reliable target process in a shared pod namespace, so the example was corrected to use a PID discovered via `ps`.
- The distroless example had a malformed shell continuation with an inline comment after `\`, which would break the command. It was rewritten as valid shell syntax, and the debug image reference was made explicit with `gcr.io/distroless/base-debian12:debug`.
- The memory example summed `Size`, `Rss`, and `Pss` together from `smaps`, which produces a meaningless total, and it assumed PID 1 was the target process. It was corrected to sum only `Pss` for a selected PID and to use `/proc/<PID>/status` for a per-process memory summary.
- The Java `jcmd` example was paired with the `nicolaka/netshoot` image, which is a networking toolbox and does not include JDK tooling. It was replaced with memory-inspection commands that match the chosen debug image.
- The network example omitted the extra privileges typically required for packet capture and used fragile shell job control with `kill %1`. It was corrected to use `--profile=sysadmin`, a named debug container, and a portable background-process pattern using `$!`.
- The `kubectl cp` example did not specify the ephemeral container name. It was corrected to copy from the named debug container using `-c net-debugger`.
- The automation script guessed the target container name by stripping the pod name suffix, which is not a valid way to derive a container name. It was corrected to read the first container name from the pod spec with `kubectl get ... -o jsonpath=...`.
- The conclusion overstated what `--target` does by claiming it provides full access to process, filesystem, and network. It was corrected to reflect Kubernetes behavior: `--target` is for the target container's process namespace when the runtime supports it, pod networking is already shared, and filesystem inspection is done through `/proc/<PID>/root`.

## Review Notes
- The post title is Rancher-specific, but the procedure is standard Kubernetes `kubectl` usage against a Rancher-managed cluster.
- Several image references still use floating tags such as `busybox:latest` and `nicolaka/netshoot:latest`. They are valid, but pinning exact versions would make the examples more reproducible over time.
