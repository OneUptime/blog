# Validation Summary: How to Install Talos Linux on Hetzner Cloud

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Hetzner Cloud (hcloud CLI)
- Kubernetes (kubectl)
- talosctl
- Cilium CNI
- Hetzner Cloud Controller Manager (CCM) via Helm
- Hetzner CSI driver via Helm

## Sources Consulted
- Talos v1.7.0 release assets: https://github.com/siderolabs/talos/releases/tag/v1.7.0
- Talos Hetzner Cloud install guide: https://www.talos.dev/v1.7/talos-guides/install/cloud-platforms/hetzner/
- hcloud CLI load balancer commands: https://github.com/hetznercloud/cli/tree/main/internal/cmd/loadbalancer
- hetznercloud/helm-charts index: https://github.com/hetznercloud/helm-charts/blob/main/index.yaml
- hcloud-cloud-controller-manager chart values: https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/main/chart/values.yaml
- Hetzner CSI driver chart: https://github.com/hetznercloud/csi-driver/tree/main/chart

## Issues Found

1. **Wrong Talos image variant for Hetzner Cloud.** The post originally instructed downloading `nocloud-amd64.raw.xz`. The official Talos Hetzner guide recommends the Hetzner-specific `hcloud-amd64.raw.xz` variant, which includes the `hcloud` platform integration. Changed the curl URL and the `xz -d -c` filename to `hcloud-amd64.raw.xz`.

2. **Non-existent `hcloud load-balancer update-health-check` subcommand.** The hcloud CLI has no such subcommand — health checks are configured as inline flags on `add-service` (or via `update-service`). Combined the separate `add-service` and `update-health-check` blocks into a single `add-service` call using `--health-check-protocol`, `--health-check-port`, `--health-check-interval`, `--health-check-timeout`, and `--health-check-retries`.

## Review Notes

- `networking.clusterCIDR=10.244.0.0/16` is the chart default, so the explicit `--set` is redundant but harmless. Left as-is since it makes the value visible to the reader and matches Cilium's typical pod CIDR.
- The post correctly creates the `hcloud` secret with both `token` and `network` keys before installing the CCM with `networking.enabled=true`, which is required for the private-network integration.
- Talos v1.7.0 was released in May 2024; readers may want to substitute a newer patch release (e.g., v1.7.x or later minor) when following this guide. The image-builder workflow itself remains valid.
- The cx22 and cx32 server types are valid current-generation Intel AMD64 instances (replacements for the older cx11/cx21 line).
- The temporary "boot Ubuntu and `dd` the image to /dev/sda" pattern is the standard community workaround for importing custom images into Hetzner Cloud, which has no native image-import API.
