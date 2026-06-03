# Validation Summary: How to implement seccomp profiles with fine-grained syscall control

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes securityContext and seccompProfile
- Linux seccomp / seccomp-bpf
- OCI runtime seccomp profile JSON
- Docker/container runtime default seccomp behavior
- strace, grep, jq, auditd, journalctl
- Kubernetes ConfigMaps, DaemonSets, and hostPath volumes

## Sources Consulted
- Kubernetes documentation: Seccomp and Kubernetes - https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes tutorial: Restrict a Container's Syscalls with seccomp - https://kubernetes.io/docs/tutorials/security/seccomp/
- Docker documentation: Seccomp security profiles for Docker - https://docs.docker.com/engine/security/seccomp/
- OCI Runtime Specification v1.1.0: Seccomp - https://oci-playground.github.io/specs-latest/specs/runtime/v1.1.0/oci-runtime-spec.html
- Local tool help/output: `strace -h`, `jq --version`

## Issues Found
- The post said containers usually can access all syscalls by default. Updated this to clarify that containers without a seccomp profile run unconfined, matching Kubernetes seccomp defaulting behavior.
- The post described kernel-level seccomp enforcement as impossible to bypass. Reworded this to avoid an absolute security claim and note that bypassing would require compromising the kernel or runtime.
- The ConfigMap deployment example mounted profiles inside the application container at `/var/lib/kubelet/seccomp/profiles`, which does not make them available to kubelet or the container runtime. Replaced it with a DaemonSet that copies the ConfigMap data to the node's kubelet seccomp directory via `hostPath`, and left the workload Pod referencing the resulting `Localhost` profile.
- The `strace -c -f -o syscalls.log` command produced summary output, but the following `grep` expected normal syscall trace lines with parentheses. Removed `-c` so the extraction command matches the generated log format.
- The RuntimeDefault violation example used `reboot` as a blocked syscall test, but that operation is also commonly blocked by Linux capabilities. Updated the comment to avoid attributing the result only to seccomp.
- The progressive profile section used the deprecated alpha seccomp annotation with an invalid `"audit"` value and referred to "complain mode", which is AppArmor terminology rather than Kubernetes seccomp behavior. Replaced this with a `Localhost` log-only profile using `SCMP_ACT_LOG`, followed by RuntimeDefault baseline mode and custom enforcement mode.

## Review Notes
The remaining examples are illustrative profiles and may need additional syscalls for real workloads, especially dynamically linked applications and language runtimes. `kubectl` was not installed in the review environment, so Kubernetes field validation was checked against official Kubernetes documentation rather than local `kubectl explain` output.
