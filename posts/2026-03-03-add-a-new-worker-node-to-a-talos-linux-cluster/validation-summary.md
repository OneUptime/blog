# Validation Summary: How to Add a New Worker Node to a Talos Linux Cluster

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (v1.7.0)
- talosctl CLI
- Kubernetes / kubectl
- Talos Image Factory
- Proxmox, QEMU/KVM, libvirt (VM provisioning)
- PXE boot
- Talos system extensions (iscsi-tools, qemu-guest-agent)

## Sources Consulted
- Talos Linux v1.7 documentation: https://www.talos.dev/v1.7/
- talosctl CLI reference: https://www.talos.dev/v1.7/reference/cli/
- Talos v1.7.0 GitHub release: https://github.com/siderolabs/talos/releases/tag/v1.7.0
- Talos Image Factory docs: https://www.talos.dev/v1.7/learn-more/image-factory/
- Talos system extensions docs: https://www.talos.dev/v1.7/talos-guides/configuration/system-extensions/
- siderolabs/extensions repo: https://github.com/siderolabs/extensions
- talosctl health timeout issue: https://github.com/siderolabs/talos/issues/12553

## Issues Found

1. **CIDR scanning with `talosctl -n`** (Step 2): The original used `talosctl -n 10.0.0.0/24 disks` to "scan" for nodes. The `-n/--nodes` flag does NOT accept CIDR notation — only specific IPs or comma-separated lists. Replaced with a verification command against the known IP (`talosctl -n 10.0.0.40 --insecure disks`) and clarified that discovery should come from console output, DHCP lease tables, or the hypervisor.

2. **Inaccurate join-process description** (Step 4): The original listed "Generate a bootstrap TLS certificate" as a separate step. This is misleading — Talos PKI material is embedded in the machine config from `talosctl gen config`, not generated on the node. The actual Kubernetes-side bootstrap is the kubelet client cert issued via the CSR API. Updated steps 4 and 5 to accurately reflect that the kubelet contacts the API server and bootstraps its client certificate via the CSR API.

3. **Invalid `installerconfig` resource** (Troubleshooting → Node Not Installing): `talosctl get installerconfig` references a resource that does not exist in Talos. Replaced with `talosctl get machineconfig`, which is the correct way to verify the applied configuration.

## Review Notes

- The `--wait-timeout 10m` flag passed to `talosctl health` is syntactically valid and documented, but there is an outstanding upstream bug (siderolabs/talos#12553) where values above ~5 minutes are effectively capped. The flag is still correct to use; in practice users will observe the cap.
- The post pins Talos v1.7.0 (released April 2024). At time of review (May 2026) the v1.7.x line is older but still supported by the URLs and documentation referenced. The commands and flags shown remain valid on more recent Talos releases.
- The `kubectl run` invocation in "Test Pod Scheduling" uses `--overrides` and also specifies the `nginx` image inside the override JSON. This works because `--image` is required by `kubectl run`, but the override's `containers[].image` (`nginx:1.25`) takes precedence — slightly redundant but functionally correct.
- The extension image references (`ghcr.io/siderolabs/iscsi-tools`, `ghcr.io/siderolabs/qemu-guest-agent`) use the correct GHCR paths; the example tag versions are illustrative and users should pick versions matching their Talos release.
