# Validation Summary: How to Set Up K3s with Rootless Mode

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- K3s
- Kubernetes
- Linux user namespaces
- cgroup v2
- systemd user services
- rootlesskit
- slirp4netns
- AppArmor
- NGINX unprivileged container image

## Sources Consulted
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s CLI Tools reference: https://docs.k3s.io/cli
- K3s installation configuration docs: https://docs.k3s.io/installation/configuration
- K3s install script: https://get.k3s.io
- `k3s-rootless.service` in the K3s repository: https://github.com/k3s-io/k3s/blob/main/k3s-rootless.service
- Rootless Containers login guidance: https://rootlesscontaine.rs/getting-started/common/login/
- Rootless Containers cgroup v2 guidance: https://rootlesscontaine.rs/getting-started/common/cgroup2/
- Rootless Containers subuid/subgid guidance: https://rootlesscontaine.rs/getting-started/common/subuid/
- Rootless Containers sysctl guidance: https://rootlesscontaine.rs/getting-started/common/sysctl/
- NGINX unprivileged image documentation: https://github.com/nginx/docker-nginx-unprivileged

## Issues Found
- The original install flow used `curl ... | sh -s - --rootless` as a non-root user. Current K3s rootless guidance uses a user systemd service with `k3s-rootless.service`, so the install flow was corrected to install the binary first and then configure the supported rootless user service.
- The original guide used `su - k3s-user` and the service name `k3s`. Rootless user services need a real login session with `XDG_RUNTIME_DIR` set, and the correct service name is `k3s-rootless`, so the login/session and systemd commands were fixed.
- The original prerequisites and verification steps treated cgroup v2 as only recommended. Rootless K3s requires pure cgroup v2 and cgroup delegation, so the post was updated to reflect that requirement and to add the delegation configuration.
- The original networking section suggested NodePort usage and host-level privileged-port tweaks. Official K3s rootless behavior is automatic binding of port `6443` and LoadBalancer service ports below `1024` with a `+10000` offset, so that section was rewritten.
- The original kubeconfig section assumed a standard `kubectl` setup and referenced `$XDG_RUNTIME_DIR/k3s/`. Rootless K3s writes the kubeconfig to `~/.kube/k3s.yaml`, so the path and commands were corrected and switched to `k3s kubectl`.
- The original storage section used the wrong rootless data directory and made unsupported assumptions about the local-path provisioner path. The data directory was corrected to `~/.rancher/k3s/`, and the storage guidance now points readers to the effective `local-path-config` ConfigMap and `--default-local-storage-path`.
- The original test manifest forced `runAsUser: 1000`, `fsGroup: 1000`, and `readOnlyRootFilesystem: true` for `nginxinc/nginx-unprivileged`. Those settings can break the image, so they were removed while preserving the non-root and dropped-capabilities constraints.
- The original limitations section omitted major documented limits and included claims not reflected in the current rootless K3s docs. It was replaced with the documented experimental status, pure cgroup v2 requirement, single-node limitation, and multi-process limitation.

## Review Notes
- Rootless K3s is still documented as experimental as of the K3s docs last updated in April 2026.
- Current K3s documentation states that multi-node rootless clusters and multiple rootless K3s processes on the same node are not supported.
- Commands and configuration were checked against current documentation and upstream service files; the cluster itself was not started in this workspace.
