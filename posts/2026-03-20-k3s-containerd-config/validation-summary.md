# Validation Summary: How to Configure K3s to Use containerd - Config

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- containerd
- Kubernetes RuntimeClass
- OCI image registries and mirrors
- NVIDIA container runtime

## Sources Consulted
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s Private Registry Configuration: https://docs.k3s.io/installation/private-registry
- K3s CLI Tools: https://docs.k3s.io/cli
- K3s Embedded Registry Mirror: https://docs.k3s.io/installation/registry-mirror
- K3s FAQ: https://docs.k3s.io/faq
- K3s v1.32 release notes: https://docs.k3s.io/release-notes/v1.32.X
- containerd 2.0 CRI configuration reference: https://github.com/containerd/containerd/blob/release/2.0/docs/cri/config.md
- containerd `ctr` command source for `images`, `containers`, `tasks`, and `snapshots`: https://github.com/containerd/containerd/tree/main/cmd/ctr/commands

## Issues Found
- The post treated `config.toml.tmpl` as the current template file. I updated it to document `config-v3.toml.tmpl` for current K3s releases that ship containerd 2.0, while retaining `config.toml.tmpl` as the legacy path for containerd 1.7 and earlier.
- The custom containerd template example used legacy version 2 schema and copied a rendered config pattern that K3s explicitly warns against. I replaced it with the documented base-template extension pattern and current version 3 plugin paths.
- The mirror example used explicit fallback endpoints for `docker.io` and `ghcr.io`. I removed those fallback entries and added the correct note that containerd still tries each registry's default endpoint unless `--disable-default-registry-endpoint` is set.
- The section title said `nerdctl`, but the commands shown were `k3s ctr`. I corrected the section to `ctr`.
- The `ctr` examples were incomplete for kubelet-visible image management. I updated them to use the `k8s.io` namespace where appropriate and corrected misleading command comments.
- The restart and log commands only referenced the `k3s` systemd service. I updated them to include `k3s-agent` for agent nodes as well.
- The debugging section implied containerd logs only come from `journalctl -u k3s`. I added the official K3s containerd log path at `/var/lib/rancher/k3s/agent/containerd/containerd.log`.
- The GPU section used an older manual runtime-template example. I updated it to reflect current K3s behavior, where the NVIDIA runtime is auto-detected after installation and K3s restart, and kept the `runtimeClassName: nvidia` usage.

## Review Notes
- This post now reflects current K3s guidance as of April 29, 2026. The main version-specific caveat is that older K3s releases using containerd 1.7 still rely on `config.toml.tmpl` and the version 2 containerd config schema.
- `SystemdCgroup` should remain aligned with the node's cgroup driver when defining custom runc-based runtimes.
