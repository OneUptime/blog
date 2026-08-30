# Validation Summary: How to Fix Beyla's "Operation Not Permitted" eBPF Error in Kubernetes

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Grafana Beyla
- Grafana Alloy `beyla.ebpf`
- eBPF and Linux `perf_events`
- Kubernetes Pod and container security contexts
- Linux capabilities and process namespaces
- AppArmor, seccomp, and SELinux
- Kubernetes Pod Security Admission and admission policy

## Sources Consulted

- [Beyla security, permissions, and capabilities](https://grafana.com/docs/beyla/latest/security/)
- [Beyla Kubernetes deployment](https://grafana.com/docs/beyla/latest/setup/kubernetes/)
- [Beyla configuration options](https://grafana.com/docs/beyla/latest/configure/options/)
- [Grafana Alloy `beyla.ebpf` component](https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/)
- [Grafana Alloy access and permissions on Kubernetes](https://grafana.com/docs/alloy/latest/access_permissions/kubernetes/)
- [Kubernetes Pod API](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes shared process namespaces](https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/)
- [Kubernetes security contexts](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [Kubernetes AppArmor profiles](https://kubernetes.io/docs/tutorials/security/apparmor/)
- [Kubernetes Linux kernel security constraints](https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes Pod Security Admission](https://kubernetes.io/docs/concepts/security/pod-security-admission/)
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes `kubectl events` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [Kubernetes `kubectl` quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
- [Kubernetes deprecated API migration guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)
- [Linux capabilities manual](https://man7.org/linux/man-pages/man7/capabilities.7.html)
- [Linux `/proc/<pid>/map_files` manual](https://man7.org/linux/man-pages/man5/proc_pid_map_files.5.html)
- [Linux `/proc/<pid>/status` manual](https://man7.org/linux/man-pages/man5/proc_pid_status.5.html)
- [Linux perf-event security documentation](https://docs.kernel.org/admin-guide/perf-security.html)
- [Linux `perf_event_paranoid` sysctl documentation](https://docs.kernel.org/admin-guide/sysctl/kernel.html#perf-event-paranoid)

## Issues Found

- The startup-log command used only `kubectl logs --previous`, which reads a previous terminated container instance and fails when none exists. Added the current-instance command and clarified when `--previous` applies.
- `CHECKPOINT_RESTORE` was described as generic `/proc` symlink access without its kernel boundary. Narrowed it to other processes' `/proc/<pid>/map_files` targets, documented that the capability was added in Linux 5.9, and explained the Linux 5.8 `SYS_ADMIN` fallback.
- The `perf_event_paranoid` explanation implied that the sysctl always restricts a process with `CAP_PERFMON`. Clarified that effective `CAP_PERFMON` bypasses upstream perf-event scope checks and that extra levels on some downstream kernels can behave differently.
- The post attributed rejection directly to Pod Security Standards. Clarified that Pod Security Admission or another policy-enforcement mechanism performs the rejection.
- The admission troubleshooting text implied that `describe` and Events return a direct admission response. Clarified that direct rejection is returned to the creating client, while accepted workload objects and controller-side failures can be investigated through Pods and Events.
- Event sorting used the deprecated `lastTimestamp` field. Replaced it with `metadata.creationTimestamp`.
- `/proc/1/status` was presented as the Beyla or Alloy capability source even though the recommended DaemonSet uses `hostPID: true`, where PID 1 is the host init process. Changed the guidance to inspect `/proc/<pid>/status` for the actual Beyla or Alloy process and covered shared process namespaces.
- The policy guidance implied that built-in Pod Security Admission could scope an exemption using the Pod's `serviceAccountName`. Replaced it with the actual exemption dimensions: requester usernames, RuntimeClass names, or namespaces.

## Review Notes

The Grafana-specific settings, capability names, security-context structure, mount requirements, AppArmor API guidance, process-namespace settings, and verification workflow otherwise match the current official documentation. Capability requirements remain version- and feature-dependent; the post correctly recommends pinning the Beyla image and testing every kernel and node pool.
