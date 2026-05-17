# Validation Summary: How to Configure Static Pods on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `machine.pods` field)
- Kubernetes static pods and mirror pods
- kubelet static pod manifest behavior
- `talosctl apply-config` CLI
- Prometheus `node-exporter` (v1.7.0)
- Fluent Bit (`fluent/fluent-bit:2.2`)
- `nicolaka/netshoot` debug image
- nginx container images (1.25, 1.26)
- `ghcr.io/siderolabs/talosctl` container image

## Sources Consulted
- Talos Linux configuration reference: https://www.talos.dev/v1.7/reference/configuration/v1alpha1/config/
- Talos Linux static pods advanced guide: https://www.talos.dev/v1.6/advanced/static-pods/
- Kubernetes static pods documentation: https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/
- Prometheus node_exporter v1.7.0 release: https://github.com/prometheus/node_exporter/releases/tag/v1.7.0
- talosctl container image: https://github.com/siderolabs/talos/pkgs/container/talosctl

## Issues Found
1. **node-exporter example missing `root` volume mount.** The container args included `--path.rootfs=/host/root`, but no corresponding `root` hostPath volume was mounted at `/host/root`. Added a `root` hostPath volume mounting `/` at `/host/root` (readOnly) so the arg actually resolves to a valid path, matching standard node-exporter containerized deployment patterns.
2. **Filename inconsistency in the "Updating Static Pods" section.** The heredoc wrote the manifest to `static-pod-patch.yaml` but the subsequent `talosctl apply-config` command referenced `updated-config.yaml`, leaving readers with a broken copy/paste flow. Renamed the heredoc target to `updated-config.yaml` so the two commands agree, and updated the surrounding comments to match.

## Review Notes
- The `machine.pods` field is correct for Talos v1alpha1 machine configuration; Talos renders the listed pod manifests to `/etc/kubernetes/manifests/` where the kubelet picks them up.
- The claim that mirror pods appear in the API server with the node name appended is accurate (standard Kubernetes mirror-pod naming).
- The limitation statement about service accounts is broadly correct: static pods do not get automatic ServiceAccount token projection because they bypass admission controllers; tokens can still be mounted manually via projected volumes if needed, but that is beyond the post's scope.
- `nginx:1.25`, `nginx:1.26`, `prom/node-exporter:v1.7.0`, `fluent/fluent-bit:2.2`, and `nicolaka/netshoot:latest` are all valid public images at the time of review. Pinning `nicolaka/netshoot` to a tagged version (instead of `latest`) would be a future improvement for reproducibility, but is not technically wrong.
- The etcd-backup example uses `ghcr.io/siderolabs/talosctl:latest` purely as an illustrative shell host; the actual backup logic is just a placeholder loop, which the post is upfront about.
