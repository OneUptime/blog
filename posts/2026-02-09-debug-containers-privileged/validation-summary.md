# Validation Summary: How to Configure Debug Containers with Privileged Security Context

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes securityContext
- Linux capabilities
- Privileged containers
- hostNetwork, hostPID, hostIPC, and hostPath
- kubectl debug
- Ephemeral containers
- Pod Security Admission
- Kubernetes RBAC
- Kubernetes Jobs and TTL-after-finished cleanup
- containerd / CRI tooling

## Sources Consulted
- Kubernetes: Linux kernel security constraints for Pods and containers - https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/
- Kubernetes: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes: kubectl debug reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes: Debug Running Pods - https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes: Debugging Kubernetes Nodes With Kubectl - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes: Pod Security Policies - https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes: Enforce Pod Security Standards with Namespace Labels - https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes: Automatic Cleanup for Finished Jobs - https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/

## Issues Found
- Privileged container scope was overstated. The post implied privileged mode alone grants host network namespace and host filesystem mounts. Updated the wording to clarify that host network access requires `hostNetwork: true` and host filesystem access requires `hostPath` volumes.
- Some pod-level fields were incorrectly nested under containers. Moved `hostNetwork` and `hostPID` to `spec` level in the network, tracing, and network troubleshooting examples.
- The node log command read the container's journal context rather than the mounted host root. Updated it to use `journalctl --root=/host`.
- The runtime debugging section claimed Docker access but only configured containerd paths. Narrowed the wording to containerd.
- The `kubectl debug` examples claimed privileged access without setting a privileged debug profile. Added `--profile=sysadmin` to the pod and node debug examples and adjusted the surrounding text.
- The security control example used `policy/v1beta1` PodSecurityPolicy, which was deprecated in Kubernetes v1.21 and removed in Kubernetes v1.25. Replaced it with Pod Security Admission namespace labels and current `rbac.authorization.k8s.io/v1` RBAC.
- The cleanup TTL example used `ttlSecondsAfterFinished` on a Pod, but Kubernetes supports that field for Jobs. Replaced the Pod manifest with a `batch/v1` Job manifest and separated the YAML from the shell command block.

## Review Notes
The post is technically relevant and salvageable. The examples are now aligned with current Kubernetes documentation. Local `kubectl` was not installed in the review environment, so CLI behavior was checked against official Kubernetes documentation rather than local `kubectl --help` output.
