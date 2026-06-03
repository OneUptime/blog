# Validation Summary: How to Use shareProcessNamespace for Cross-Container Process Visibility

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods and `shareProcessNamespace`
- Kubernetes `securityContext` capabilities
- `kubectl exec`
- Linux process inspection tools (`ps`, `pgrep`, `strace`, `gcore`, `lsof`, `tcpdump`, `perf`)
- Java diagnostic tools (`jstack`, `jmap`)

## Sources Consulted
- Kubernetes documentation: Share Process Namespace between Containers in a Pod, https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/
- Kubernetes API reference: Pod v1, https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes kubectl reference: `kubectl exec`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl reference: `kubectl debug`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debug Running Pods, https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Linux man-pages: `strace(1)`, https://man7.org/linux/man-pages/man1/strace.1.html
- Linux man-pages: `gcore(1)`, https://man7.org/linux/man-pages/man1/gcore.1.html
- Linux man-pages: `tcpdump(8)`, https://man7.org/linux/man-pages/man8/tcpdump.8.html
- Oracle Java SE 11 tools: `jstack`, https://docs.oracle.com/en/java/javase/11/tools/jstack.html
- Oracle Java SE troubleshooting guide: diagnostic tools and `jmap`, https://docs.oracle.com/en/java/javase/11/troubleshoot/diagnostic-tools.html

## Issues Found
- The debug example described `gcore` as generating a thread dump. `gcore` generates a core dump, so the comment was corrected.
- The initial verification command executed `ps aux` inside the `nginx` container. The official Kubernetes example runs process inspection from the helper shell container, because application images may not include `ps`; the command now execs into the BusyBox debugger container and uses `ps ax`.
- The post said the pattern lets you debug without restarting pods. A preconfigured sidecar can avoid changing the application image, but adding a normal sidecar requires recreating the Pod; only ephemeral containers can be added to a running Pod. The sentence was narrowed to avoid the incorrect restart claim.
- A BusyBox command used `sleep infinity`, which is not portable across BusyBox builds. It was changed to `sleep 3600`.
- The supervisor sidecar attempted to run `dmesg` without the permissions usually required to read the kernel log in containers. The diagnostic collection example now reads `/proc/meminfo`, which is available without that privilege.
- The BusyBox supervisor example used `ps aux`, which is not portable across BusyBox variants. It now uses `ps`.
- The audit Pod manifest omitted `metadata.name`, making it incomplete for direct application. A Pod name was added.
- The audit script used basic `grep` alternation syntax that is not portable. It now uses `grep -E`.
- The PID 1 section overstated Kubernetes and pause-container signal handling. It now explains that PID 1 is the pod sandbox in the shared process namespace and that commands such as `kill -HUP 1` target the sandbox rather than the application.
- The init-system guidance implied an init wrapper would make the application PID 1 or solve all PID 1 dependencies. It was corrected to describe `dumb-init` as a wrapper for child reaping and signal forwarding, not as a way to restore PID 1 semantics.
- The network debugging example used `tcpdump -i any -p $JAVA_PID`, but `tcpdump -p` disables promiscuous mode and does not accept a process ID. The command was changed to capture traffic for the application port, and the system tools container was given network capture capabilities.

## Review Notes
- The core Kubernetes field, `spec.shareProcessNamespace: true`, is current and documented in the Pod API.
- `jstack` and `jmap` examples are valid for JDK 11, but Oracle documents these tools as unsupported/diagnostic utilities and recommends newer tooling such as `jcmd` for some diagnostics.
- The `perf` example can require node/kernel-specific permissions, seccomp allowances, and a `perf` binary compatible with the node kernel. The command pattern is valid, but production clusters may need additional policy configuration.
