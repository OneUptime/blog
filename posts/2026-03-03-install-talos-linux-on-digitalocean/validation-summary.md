# Validation Summary: How to Install Talos Linux on DigitalOcean

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Talos Linux (v1.7.0)
- DigitalOcean (Droplets, VPC, Load Balancer, Block Storage / CSI)
- `doctl` (DigitalOcean CLI)
- `talosctl`
- `kubectl`
- Kubernetes
- Cilium CNI
- DigitalOcean CSI driver

## Sources Consulted
- Talos v1.7.0 GitHub release assets: https://github.com/siderolabs/talos/releases/tag/v1.7.0
- Talos DigitalOcean install guide: https://www.talos.dev/v1.7/talos-guides/install/cloud-platforms/digitalocean/
- doctl reference docs: https://docs.digitalocean.com/reference/doctl/reference/
  - `compute image create`
  - `vpcs create`
  - `compute load-balancer create`
  - `compute droplet create`
- digitalocean/csi-digitalocean GitHub repo: https://github.com/digitalocean/csi-digitalocean
- cilium-cli v0.15.0 release notes: https://github.com/cilium/cilium-cli/releases/tag/v0.15.0
- Cilium Helm install docs: https://docs.cilium.io/en/stable/installation/k8s-install-helm/

## Issues Found

1. **DigitalOcean CSI driver install URL was invalid.** The post referenced `csi-digitalocean-latest.yaml`, which has not been a valid asset since the pre-2.0 era of the driver. Modern releases ship as a directory of three files (`crds.yaml`, `driver.yaml`, `snapshot-controller.yaml`) under `csi-digitalocean-vX.Y.Z/`. Replaced the single `kubectl apply` with three `kubectl apply` calls pinned to `csi-digitalocean-v4.10.0/`, which is contemporary with the Talos v1.7.0 release referenced throughout the post.

2. **Spurious `eth1` interface in the Talos machine-config patch.** The original patch defined DHCP on both `eth0` and `eth1`. DigitalOcean droplets do not reliably expose a second NIC (`eth1`); the official Talos DigitalOcean guide does not configure any additional interfaces and relies on DHCP on `eth0`. Including a DHCP entry for an interface that may not exist can stall Talos boot waiting on link. Removed the `eth1` entry; left `eth0` DHCP intact.

## Review Notes

- The Talos asset URL `https://github.com/siderolabs/talos/releases/download/v1.7.0/digital-ocean-amd64.raw.gz` is correct for v1.7.0. Note that the upstream Talos project now generally recommends pulling images via the Image Factory (`https://factory.talos.dev`) rather than from raw GitHub release assets — future revisions of this post could mention this option, especially for users who need extensions or non-default schematics.
- The post pins everything to Talos v1.7.0, which is already several minor releases behind current as of the validation date. The commands themselves remain valid but readers running on a newer Talos minor will need to update both the image URL and the `ghcr.io/siderolabs/installer:v1.7.0` reference.
- `doctl`'s `--format` and `--no-header` are documented as persistent (global) flags rather than per-command flags, but they are valid on all the subcommands used here.
- `cilium install --helm-set ipam.mode=kubernetes` is correct for cilium-cli v0.15+ (which is the helm-mode default); `--helm-set` was *not* renamed to `--set`. Both flags exist on `helm` itself, but on `cilium install` the helm passthrough is `--helm-set`.
- The post does not disable `kube-proxy` or enable Cilium's kube-proxy replacement, which is a common recommendation for Talos + Cilium deployments but not strictly required for the cluster to come up. Could be added as an optional optimization in a future revision.
- The DigitalOcean load balancer is created before the droplets exist; this is supported (the LB simply has no backends initially), and the post correctly registers droplets via `add-droplets` after creation.
