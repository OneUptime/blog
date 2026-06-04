# Validation Summary: How to Deploy gVisor Sandboxed Containers for Untrusted Workloads on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- RuntimeClass
- containerd
- gVisor
- runsc
- NetworkPolicy
- Prometheus metrics
- Kubernetes admission webhooks
- Go

## Sources Consulted
- gVisor installation guide: https://gvisor.dev/docs/user_guide/install/
- gVisor containerd quick start: https://gvisor.dev/docs/user_guide/containerd/quick_start/
- gVisor containerd advanced configuration: https://gvisor.dev/docs/user_guide/containerd/configuration/
- gVisor Kubernetes quick start: https://gvisor.dev/docs/user_guide/quick_start/kubernetes/
- gVisor platforms guide: https://gvisor.dev/docs/user_guide/platforms/
- gVisor filesystem guide: https://gvisor.dev/docs/user_guide/filesystem/
- gVisor networking guide: https://gvisor.dev/docs/user_guide/networking/
- gVisor observability guide: https://gvisor.dev/docs/user_guide/observability/
- gVisor compatibility guide: https://gvisor.dev/docs/user_guide/compatibility/
- Kubernetes RuntimeClass documentation: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Kubernetes RuntimeClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/node/runtime-class-v1/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes seccomp documentation: https://kubernetes.io/docs/reference/node/seccomp/
- GKE Sandbox compatibility notes: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/sandbox-pods

## Issues Found
- The install commands downloaded only `runsc`, but containerd integration also requires `containerd-shim-runsc-v1`. Updated the command to download, verify, chmod, and install both binaries.
- The runsc configuration snippets were written as flat files under `/etc/runsc`, but the containerd shim expects a shim config file with runsc flags under `[runsc_config]` and referenced through `ConfigPath`. Updated the config paths to `/etc/containerd/runsc*.toml` and added `[runsc_config]`.
- The post used `ptrace` as the default compatible platform. Current gVisor docs describe `systrap` as the default and `ptrace` as deprecated, so the default configuration now uses `systrap` while leaving KVM as the performance option.
- The Kubernetes Job placed `backoffLimit` under `template.spec`, which is invalid. Moved it to `spec.backoffLimit`.
- The NetworkPolicy claimed to allow only DNS and external HTTPS, but one egress rule allowed all ports to all IPs except the metadata IP. Replaced it with an HTTPS `ipBlock` rule that excludes `169.254.169.254/32`.
- The NetworkPolicy selected the `kube-system` namespace using a non-standard `name` label. Updated it to the standard `kubernetes.io/metadata.name` namespace label.
- The Prometheus rules referenced non-standard or unsupported metric names and labels such as `runsc_syscall_duration_seconds_bucket` and `runtime_class="gvisor"`. Replaced them with metrics described by gVisor observability docs, including `runsc_fs_reads`, `runsc_fs_read_wait`, and `runsc_fs_opens`.
- The metrics command used `runsc metric list`, which is not the documented workflow. Updated it to start `runsc metric-server` and query `/metrics`.
- The optimized config used the old `overlay = true` style and described `file-access = "shared"` as direct I/O. Updated it to `overlay2 = "root:self"` and corrected the filesystem comment.
- The sample runtime-selection Go function referenced an undefined `ns` variable. Updated the function signature to accept a namespace object and check it safely.
- The troubleshooting debug config used a flat runsc config and deprecated `ptrace`. Updated it to the containerd shim config format and `systrap`.
- The host networking validation message claimed gVisor does not support host networking. gVisor has host network passthrough, so the message now rejects it because it bypasses gVisor's network sandbox isolation.

## Review Notes
The post is technically relevant and salvageable. Some examples remain intentionally illustrative, such as admission webhook wiring and Prometheus rule deployment, but the corrected snippets now align with current gVisor and Kubernetes documentation.
