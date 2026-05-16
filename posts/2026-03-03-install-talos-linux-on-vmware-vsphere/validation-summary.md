# Validation Summary: How to Install Talos Linux on VMware vSphere

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux v1.7.0
- VMware vSphere / vCenter
- govc (govmomi CLI)
- talosctl
- Kubernetes / kubectl
- HAProxy (load balancing)
- Talos VIP (virtual IP) feature
- vSphere CSI Driver v3.0.0

## Sources Consulted
- Sidero Labs Talos getting-started / talosctl install: https://docs.siderolabs.com/talos/v1.7/getting-started/talosctl
- Talos v1.7.0 GitHub release (OVA filenames): https://github.com/siderolabs/talos/releases/tag/v1.7.0
- govc USAGE reference: https://github.com/vmware/govmomi/blob/main/govc/USAGE.md
- Talos VIP networking docs: https://docs.siderolabs.com/talos/v1.7/networking/vip/
- vSphere CSI Driver v3.0.0 release and manifests: https://github.com/kubernetes-sigs/vsphere-csi-driver/releases/tag/v3.0.0
- Talos `--insecure` config apply guidance: https://www.talos.dev/v1.10/talos-guides/configuration/insecure/
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli

## Issues Found
1. **govc tarball extraction (pre-existing fix in working tree)**: The download URL returns a `.tar.gz`, not a plain `.gz`. The earlier `curl ... -o govc.gz` followed by `gunzip govc.gz` was wrong and would not produce a working binary. Replaced with `curl ... -o govc.tar.gz` and `tar -xzf govc.tar.gz govc`. (This change was already staged when the review began.)

2. **`govc vm.markastemplate` missing `-vm` flag**: The command `govc vm.markastemplate talos-v1.7.0` is invalid — govc expects the VM via the `-vm` flag, not as a positional argument. Updated to `govc vm.markastemplate -vm talos-v1.7.0` per the official govc USAGE.md.

## Review Notes
- `curl -sL https://talos.dev/install | sh` is a legitimate install path documented by Sidero Labs (listed as the "Automated Script" method alongside Homebrew and manual downloads).
- The `guestinfo.talos.config` extraConfig key (base64-encoded) is the canonical vSphere bootstrap mechanism for Talos.
- The Talos VIP YAML snippet is structurally correct. Official Talos examples typically also include `dhcp: true` (or static addressing) on the same interface; the post's commented snippet implicitly assumes other addressing is present, which is fine for an illustrative comment.
- vSphere CSI driver v3.0.0 (released 2023-03) and its `vmware-system-csi` namespace, manifests path, and raw GitHub URL are all valid. Newer 3.x releases (3.1, 3.2, 3.3) are available; users may want to pick a more recent version in production.
- Talos v1.7.0 is now several releases behind (v1.10 is current as of mid-2026). The installer image `ghcr.io/siderolabs/installer:v1.7.0` and OVA pin match each other and are internally consistent, but users planning a new production cluster would benefit from a newer Talos release. Left as-is to match the post's stated version.
- `talosctl health --wait-timeout` is a valid flag; there is an open Sidero issue (#12553) noting some versions cap effective wait at ~5 min, but the flag itself is correct.
