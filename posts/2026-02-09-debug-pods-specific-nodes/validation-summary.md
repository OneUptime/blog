# Validation Summary: How to Configure Debug Pods on Specific Nodes for Node-Level Troubleshooting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes DaemonSets
- Kubernetes node scheduling with `nodeName`, `nodeSelector`, and node affinity
- `kubectl debug`
- Linux node troubleshooting commands
- Docker debug images

## Sources Consulted
- Kubernetes documentation: Debugging Kubernetes Nodes With Kubectl - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug
- Kubernetes documentation: `kubectl debug` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/configuration/assign-pod-node/
- Kubernetes API reference: Pod v1 - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: About cgroup v2 - https://kubernetes.io/docs/concepts/architecture/cgroups/
- Kubernetes documentation: Kubelet authentication/authorization - https://v1-34.docs.kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/

## Issues Found
- The post stated that `kubectl debug node/...` automatically creates a privileged pod. Current Kubernetes documentation says node debug pods run in host namespaces and mount the host filesystem at `/host`, but the default pod is not privileged. I changed the relevant `kubectl debug` commands to use `--profile=sysadmin` where the post immediately runs `chroot /host` or expects privileged node access, and updated the explanation accordingly.
- The post described node debugging as "Kubernetes 1.20+" behavior while using current `kubectl debug` profile functionality. I changed that wording to "Modern Kubernetes versions" to avoid tying current-profile behavior to older version details.
- The kubelet metrics example used `curl http://localhost:10250/metrics`. The kubelet secure port is normally HTTPS and subject to kubelet authentication and authorization. I changed it to `curl -k https://localhost:10250/metrics`.
- The CPU throttling example only used the cgroup v1 path `/sys/fs/cgroup/cpu/cpu.stat`. Kubernetes supports and recommends cgroup v2 on modern Linux distributions, where the root CPU stats path is `/sys/fs/cgroup/cpu.stat`. I added both cgroup v2 and cgroup v1 paths.
- The network troubleshooting example used `chroot /host` immediately after starting a `netshoot` debug pod. Because `chroot` switches command lookup to the host filesystem, that would prevent readers from using tools supplied by the `netshoot` image unless those tools also exist on the host. I changed the comment to keep the network checks in the debug container's host network namespace.
- Disk and CPU troubleshooting examples list tools that may not exist on every host after `chroot /host`. I added comments clarifying that those commands use tools available on the host OS.

## Review Notes
Some diagnostic commands still depend on the host operating system, node image, container runtime, and cluster RBAC/kubelet authorization settings. For example, `systemctl`, `journalctl`, `smartctl`, `fio`, `htop`, and `mpstat` may not be installed or usable on every node image, especially after `chroot /host`. The Kubernetes YAML API fields and scheduling examples reviewed here are current and valid for Linux nodes.
