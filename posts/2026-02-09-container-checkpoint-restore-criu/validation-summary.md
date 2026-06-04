# Validation Summary: How to Implement Container Checkpoint and Restore with CRIU on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes kubelet Checkpoint API
- CRIU
- containerd
- runc
- Docker checkpoint/restore
- Linux kernel checkpoint/restore support

## Sources Consulted
- Kubernetes Kubelet Checkpoint API: https://kubernetes.io/docs/reference/node/kubelet-checkpoint-api/
- Kubernetes Feature Gates: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes forensic container checkpointing blog: https://kubernetes.io/blog/2022/12/05/forensic-container-checkpointing-alpha/
- CRIU Check the kernel: https://criu.org/Check_the_kernel
- CRIU Checkpoint/Restore internals: https://criu.org/Checkpoint/Restore
- CRIU containerd integration: https://criu.org/Containerd
- CRIU CLI options: https://criu.org/CLI
- CRIU cgroups documentation: https://www.criu.org/CGroups
- runc checkpoint/restore documentation: https://github.com/opencontainers/runc/blob/main/docs/checkpoint-restore.md
- Local `runc checkpoint --help` and `runc restore --help` output
- Docker checkpoint CLI reference: https://docs.docker.com/reference/cli/docker/checkpoint/

## Issues Found
- Replaced `criu check --all` with `criu check --extra`, matching CRIU's documented extended kernel check option.
- Corrected the containerd section. The original post implied a containerd checkpoint configuration switch and used unrelated CDI/runtime settings as checkpoint configuration. The update explains that CRIU and a checkpoint-capable OCI runtime are required.
- Replaced invalid `crictl` plus raw `runc` checkpoint/restore examples with containerd `ctr` checkpoint and restore examples. The original restore flow removed the Kubernetes-managed container and then tried to restore from a bundle path that would no longer be valid.
- Corrected Kubernetes forensic checkpointing. Upstream Kubernetes exposes a kubelet HTTP checkpoint API, not `kubectl checkpoint create`. The post now reflects the v1.25 alpha and v1.30 beta/default feature-gate status.
- Changed checkpoint archive handling to use kubelet's default `/var/lib/kubelet/checkpoints` path and tar archive naming pattern.
- Corrected the pre-initialized image section. Copying CRIU checkpoint files into a Docker image does not make the image start from checkpoint state; restore must be performed by checkpoint-aware runtime support.
- Removed the zero-downtime live migration claim. Checkpoint-based migration introduces at least a pause and also requires scheduling, network, service, and storage orchestration.
- Replaced invalid `criu check --pid` guidance with documented host capability checks.
- Softened overbroad claims about open database/TCP connections and file handles. Restoring these depends on CRIU/runtime options and availability of the same external resources.
- Fixed the runc restore benchmark command to include an OCI bundle path, which `runc restore` requires for a new restore.
- Removed the fixed 1GB checkpoint timing claim and replaced it with workload-dependent benchmarking guidance.

## Review Notes
The post is now technically accurate as a high-level tutorial, but production Kubernetes checkpoint/restore remains specialized. Future improvements could point readers to a specific operator or runtime project once they choose a supported restore workflow for Kubernetes-managed Pods.
