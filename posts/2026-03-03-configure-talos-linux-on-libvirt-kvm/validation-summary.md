# Validation Summary: How to Configure Talos Linux on libvirt/KVM

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (v1.7.0)
- libvirt / virsh / virt-install
- KVM / QEMU (qemu-img)
- libvirt network XML (DHCP with static host reservations, NAT)
- UEFI / OVMF firmware boot
- talosctl (gen config, apply-config, bootstrap, kubeconfig, VIP)
- Terraform with dmacvicar/libvirt provider
- Kubernetes (control-plane / worker topology)

## Sources Consulted
- Talos v1.7 VIP networking guide: https://docs.siderolabs.com/talos/v1.7/networking/vip/
- Talos v1.7 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- siderolabs/talos v1.7.0 GitHub release assets (verified `metal-amd64.raw.xz` exists)
- libvirt network XML format: https://libvirt.org/formatnetwork.html (verified `<host mac/name/ip>` attributes for IPv4 DHCP)
- dmacvicar/terraform-provider-libvirt docs at tag v0.8.3 (matches schema in post)
- dmacvicar/terraform-provider-libvirt docs at tag v0.9.7 (latest release; uses a different nested-attribute schema)

## Issues Found
1. **`--config-patch` used for control-plane-only VIP setting.** The VIP (`machine.network.interfaces[].vip`) field is only valid on control plane nodes per the Talos documentation, but the post passed the patch via `--config-patch`, which applies to all node types (including workers). Changed to `--config-patch-control-plane`, which targets only `init` and `controlplane` configs.
2. **Terraform `dmacvicar/libvirt` provider not version-pinned.** The HCL example uses the v0.8.x flat schema (`disk { ... }`, `network_interface { ... }`, `boot_device { ... }`, top-level `firmware`, optional `type`). v0.9.0+ replaced this with a nested-attribute schema (`devices = { disks = [...] }`, `os = { boot_devices = [...], firmware = ... }`) and made `type` required. Without pinning, `terraform init` resolves the latest provider (currently v0.9.7) and the example fails to apply. Added `version = "~> 0.8.0"` to the `required_providers` block so the example matches the schema as written.

## Review Notes
- The Talos v1.7.0 `metal-amd64.raw.xz` download URL is valid and present in the GitHub release.
- The libvirt network XML, `qemu-img create -b ... -F raw`, `virt-install` flags (`--boot uefi`, `--console pty,target.type=serial`, `--noautoconsole`, `--import`), `virsh` lifecycle / snapshot / attach-disk commands, and `virsh undefine --nvram` cleanup for UEFI domains are all syntactically correct.
- The `interface:` field in the machine config is still accepted in v1.7 but Talos has been moving toward `deviceSelector` as the preferred selector; this is fine for now but worth noting for future updates.
- v0.8.x of the libvirt Terraform provider is the most recent release using the flat schema and is what the example targets. If/when the post is refreshed for newer provider versions, the `libvirt_domain` block will need to be rewritten using the nested `os = { ... }` / `devices = { ... }` schema and `type = "kvm"` added (now required).
- Talos v1.7.0 is from April 2024 and is past Sidero's official support window as of 2026; readers running this in production should consider a currently supported release. The CLI flags and config schema referenced in the post still apply to current releases, so the guide remains structurally accurate.
