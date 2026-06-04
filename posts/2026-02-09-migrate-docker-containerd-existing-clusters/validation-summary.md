# Validation Summary: How to Migrate Container Runtime from Docker to containerd on Existing Clusters

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes
- kubelet
- Docker Engine / dockershim
- containerd
- runc
- CRI / crictl
- CNI
- systemd
- Ubuntu/Debian package management

## Sources Consulted
- Kubernetes Dockershim Removal FAQ: https://kubernetes.io/blog/2022/02/17/dockershim-faq/
- Kubernetes Migrating from dockershim: https://kubernetes.io/docs/tasks/administer-cluster/migrating-from-dockershim/
- Kubernetes Container Runtimes: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes Container Runtime Interface: https://kubernetes.io/docs/concepts/containers/cri/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes KubeletConfiguration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes crictl debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- containerd CRI configuration guide: https://containerd.io/docs/1.7/cri/config/
- containerd registry configuration guide: https://containerd.org/docs/1.7/cri/registry/
- containerd operations and metrics documentation: https://containerd.org/docs/main/ops

## Issues Found
- The introduction and pre-migration checklist implied a Docker-to-containerd dockershim migration requires Kubernetes 1.24 or later. Kubernetes 1.24 removed dockershim, so clusters using Docker through dockershim need to migrate before upgrading to 1.24 or later. Updated the wording and removed the "must be 1.24+" checklist note.
- The checklist used `kubectl version --short`, which is not listed in current official `kubectl version` documentation. Changed it to `kubectl version`.
- The kubelet configuration examples and automation script used `--container-runtime=remote`, which is no longer part of current kubelet documentation, and used `--container-runtime-endpoint`, which current docs mark as deprecated in favor of the kubelet config file. Updated the examples to set `containerRuntimeEndpoint` in `/var/lib/kubelet/config.yaml`.
- The control plane migration snippet continued with `kubectl uncordon` while still shown inside the SSH session. Added an explicit `exit` before running control plane `kubectl` commands.
- The containerd monitoring section assumed metrics are always available at `localhost:1338`. containerd metrics require a configured `[metrics] address` and are exposed under `/v1/metrics` on that configured address. Updated the example to configure `127.0.0.1:1338`, restart containerd, and then curl the endpoint.
- The post-migration cleanup command removed `containerd.io`, which could remove the active runtime after migration on hosts using Docker's containerd package. Updated the cleanup command to remove Docker packages while keeping the containerd package used by kubelet.

## Review Notes
The containerd registry mirror example uses a configuration form that containerd 1.7 documents as deprecated in favor of `config_path` / `hosts.toml`, but still supported when `config_path` is not specified. A future update could modernize the registry section without changing the core migration flow.
