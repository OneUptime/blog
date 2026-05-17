# Validation Summary: How to Configure Image Garbage Collection in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.9)
- Kubernetes kubelet
- `talosctl` CLI
- `kubectl` CLI
- containerd (CRI runtime)

## Sources Consulted
- Kubernetes kubelet configuration types (v1beta1) source: https://raw.githubusercontent.com/kubernetes/kubernetes/v1.32.0/staging/src/k8s.io/kubelet/config/v1beta1/types.go
- Kubernetes kubelet CLI options: https://raw.githubusercontent.com/kubernetes/kubernetes/v1.32.0/cmd/kubelet/app/options/options.go
- Kubernetes kubelet KubeletConfiguration reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Talos `talosctl` CLI reference (v1.9): https://raw.githubusercontent.com/siderolabs/talos/v1.9.0/website/content/v1.9/reference/cli.md
- Talos v1alpha1 machine configuration reference (KubeletConfig): https://raw.githubusercontent.com/siderolabs/talos/v1.9.0/website/content/v1.9/reference/configuration/v1alpha1/config.md
- Talos kubelet ProtectedConfigurationFields source: https://raw.githubusercontent.com/siderolabs/talos/v1.9.0/pkg/machinery/kubelet/kubelet.go
- Talos kubelet_spec controller source: https://github.com/siderolabs/talos/blob/v1.9.0/internal/app/machined/pkg/controllers/k8s/kubelet_spec.go
- Talos CRI image GC controller source: https://github.com/siderolabs/talos/blob/main/internal/app/machined/pkg/controllers/cri/image_gc.go

## Issues Found
1. **Invalid `extraConfig` fields in "Container Garbage Collection" section.** The post recommended setting `maxPerPodContainerCount`, `maxContainerCount`, and `minimumContainerTTLDuration` under `machine.kubelet.extraConfig`. These are NOT fields on the Kubernetes `KubeletConfiguration` v1beta1 struct — they only ever existed as kubelet CLI flags (`--maximum-dead-containers-per-container`, `--maximum-dead-containers`, `--minimum-container-ttl-duration`), and all three of those flags are marked deprecated in upstream Kubernetes with guidance to use `--eviction-hard` / `--eviction-soft` instead. Placing them in `extraConfig` would be rejected as unknown fields. **Fix:** Rewrote the section as "Container Log Rotation" using the valid `containerLogMaxSize` and `containerLogMaxFiles` `extraConfig` fields, added a brief note explaining that dead-container cleanup is handled by the container runtime and that the legacy flags are deprecated in favor of eviction settings (which the post already covers).

2. **Same invalid fields in the "Practical Example: Production Configuration" block.** Removed the `maxPerPodContainerCount: 2` and `minimumContainerTTLDuration: "1m"` lines and the surrounding "Container garbage collection" comment so the example reflects only valid kubelet configuration.

3. **`talosctl df` does not exist.** Used twice (Monitoring Disk Usage, Troubleshooting). The talosctl v1.9 CLI reference has no `df` subcommand; the equivalent is `talosctl usage`. **Fix:** Replaced both occurrences with `talosctl usage --nodes 10.0.0.5 -H /var` (the `-H` flag humanizes sizes; `/var` is the path containing image and container data on Talos).

4. **`talosctl images` does not exist.** The CLI exposes an `image` parent command with a `list` subcommand. **Fix:** Replaced `talosctl images --nodes 10.0.0.5` with `talosctl image list --nodes 10.0.0.5`.

## Review Notes
- The upstream Kubernetes defaults stated in the post (high threshold 85%, low threshold 80%, minimum image age 2m) are correct and match the v1beta1 type definitions. Confirmed Talos does not override these in `internal/app/machined/pkg/controllers/k8s/kubelet_spec.go`.
- Worth noting (not edited into the post to avoid restructuring): Talos also runs its own CRI-level image garbage collector independent of the kubelet (`internal/app/machined/pkg/controllers/cri/image_gc.go`), with a cleanup interval of 15 minutes and a grace period of 60 minutes. It preserves images referenced by etcd and the kubelet spec. This runs in addition to the kubelet's disk-pressure-driven GC that the post discusses; readers tuning aggressive low thresholds should be aware that Talos itself will also clean up unused images.
- The `imageMaximumGCAge` field also exists in modern KubeletConfiguration (default `0s`, disabled) and could be added in a future revision to give users an "evict images simply for being unused too long" knob, but the current post is complete without it.
- The `kubectl describe node ... | grep -A 5 Conditions` example will work but is fragile to formatting changes; `kubectl get node <name> -o jsonpath='{.status.conditions[?(@.type=="DiskPressure")]}'` would be more robust. Left as-is since it is technically correct.
- The conclusion still references "container GC" as one of three layers; this is loose phrasing rather than a technical error after the section was reworked, so it was left alone.
