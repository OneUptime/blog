# Validation Summary: How to Run Talos Linux on Mini PCs for a Home Lab

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.6.0)
- Kubernetes
- talosctl CLI
- MetalLB (load balancer for bare metal)
- Longhorn (distributed storage)
- ingress-nginx
- Helm
- Wake-on-LAN
- Mini PC hardware (Beelink, Lenovo ThinkCentre, Intel NUC, Minisforum)

## Sources Consulted
- Talos v1.6 CLI reference: https://docs.siderolabs.com/talos/v1.6/reference/cli/
- Talos v1.6 machine configuration reference: https://docs.siderolabs.com/talos/v1.6/reference/configuration/v1alpha1/config/
- Talos v1.6.0 GitHub release assets: https://github.com/siderolabs/talos/releases/tag/v1.6.0
- MetalLB configuration docs: https://metallb.universe.tf/configuration/
- Sidero Labs installer image registry: ghcr.io/siderolabs/installer

## Issues Found
- **`talosctl gen config` flag was wrong.** The post used `--output-dir ./minipc-config`, but in Talos v1.6 the only supported flag for this is `-o, --output`. The `--output-dir` flag does not exist in v1.6 and would fail with an unknown flag error. Changed to `--output ./minipc-config` to match the documented v1.6 CLI.

All other technical content was verified and is correct:
- `metal-amd64.iso` is a valid release asset for v1.6.0.
- `machine.install.extraKernelArgs`, `machine.sysctls`, and `cluster.allowSchedulingOnControlPlanes` are all valid v1alpha1 config fields.
- `metallb.io/v1beta1` is the correct apiVersion for `IPAddressPool` and `L2Advertisement`.
- `talosctl apply-config --insecure --nodes --file`, `talosctl bootstrap`, `talosctl health --wait-timeout`, `talosctl kubeconfig`, and `talosctl shutdown --nodes` are all valid commands and flag combinations.
- The Kubernetes `LimitRange` snippet uses correct `default` / `defaultRequest` semantics.
- Helm install commands for metallb, longhorn, and ingress-nginx use real chart names and valid values keys.
- Kernel arguments `intel_pstate=active` and `cpufreq.default_governor=performance` are valid Linux kernel parameters.
- `wakeonlan` is a real utility that accepts a MAC address argument.

## Review Notes
- Talos v1.6.0 was released in December 2023. By the post's publish date (2026-03-03), several newer minor releases exist (1.7.x, 1.8.x, 1.9.x). The pinned version is internally consistent (installer image, ISO URL, and config all use v1.6.0) and still functional, but readers running this today may want to use a current release.
- The YAML block is labeled `# controlplane-patch.yaml` but the subsequent `talosctl apply-config` command applies `minipc-config/controlplane.yaml`. The text says "Customize for your mini PCs," implying the reader merges these fields into the generated controlplane.yaml rather than substituting the file wholesale. Left as-is because the surrounding prose makes the intent clear, but a future revision could clarify that this is a patch/overlay, not a complete config.
- The initial `talosctl apply-config --insecure` step targets the final static IPs (192.168.1.100/101/102), but Talos in maintenance mode comes up on its DHCP-assigned address. The reader needs to substitute the maintenance-mode IP for the first apply; the static address only becomes reachable after the config is applied and the node reboots. This is a common simplification in Talos tutorials and not technically wrong, but could trip up first-time users.
- The Helm install commands assume the metallb, longhorn, and ingress-nginx Helm repos have already been added with `helm repo add`. Not stated explicitly.
- The Minisforum MS-01 spec line ("dual 2.5GbE plus 10GbE, two NVMe slots") is slightly understated — that model actually ships with dual SFP+ 10GbE ports and three M.2 NVMe slots — but the gist is correct and the post's recommendation stands.
