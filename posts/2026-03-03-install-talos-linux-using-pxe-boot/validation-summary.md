# Validation Summary: How to Install Talos Linux Using PXE Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.9.0)
- PXE Boot / iPXE
- TFTP (tftpd-hpa)
- DHCP (ISC DHCP, dnsmasq)
- HTTP (nginx)
- syslinux / pxelinux (lpxelinux.0)
- Kubernetes
- talosctl

## Sources Consulted
- Talos PXE bare-metal docs: https://docs.siderolabs.com/talos/v1.9/platform-specific-installations/bare-metal-platforms/pxe/
- Talos v1.9.0 GitHub release assets: https://github.com/siderolabs/talos/releases/tag/v1.9.0 (verified via `gh release view`)
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.9/reference/cli/
- talosctl install script docs: https://www.talos.dev/v1.9/talos-guides/install/talosctl/
- iPXE downloads: https://boot.ipxe.org/ipxe.efi
- RFC 4578 (DHCP option 93 / Client System Architecture) for UEFI arch codes

## Issues Found
No technical issues found.

Specifically verified:
- Release asset filenames `vmlinuz-amd64` and `initramfs-amd64.xz` exist in the v1.9.0 release.
- The required kernel parameters `talos.platform=metal`, `slab_nomerge`, and `pti=on` are correctly documented as mandatory by Sidero Labs.
- `talosctl` subcommands (`gen config`, `apply-config` with `--insecure`/`--nodes`/`--file`, `bootstrap`, `health`, `kubeconfig`, `config endpoint`, `config node`) all match the v1.9 CLI reference.
- The `talosctl` install one-liner `curl -sL https://talos.dev/install | sh` is the official method.
- DHCP option 93 architecture values `00:07` (EFI BC) and `00:09` (EFI x86-64) are correct for UEFI clients per RFC 4578.
- `lpxelinux.0` is the correct HTTP-capable variant of `pxelinux.0` for serving the kernel/initramfs over HTTP from TFTP-served bootloader.
- iPXE EFI binary URL `https://boot.ipxe.org/ipxe.efi` is valid.
- The PXELINUX per-MAC config filename format (`01-aa-bb-cc-dd-ee-ff`) is correct (hardware type 01 = Ethernet, MAC with dashes, lowercase).
- The `talos.config=` kernel parameter for fetching machine config over HTTP is a real, documented mechanism.

## Review Notes
- The post pins to Talos v1.9.0. As newer Talos releases come out, readers should update the download URLs accordingly. The PXE workflow itself has been stable across recent Talos versions.
- The Debian/Ubuntu package paths (`/usr/lib/PXELINUX/lpxelinux.0`, `/usr/lib/syslinux/modules/bios/ldlinux.c32`) are correct on current Debian/Ubuntu; the `syslinux` metapackage pulls in `syslinux-common` which provides the modules.
- The post does not explicitly mention that Secure Boot must be disabled (or that you need signed Talos UEFI assets) until the troubleshooting section — readers with Secure Boot enabled may hit issues before reaching that section, but the information is present.
- For production deployments the `--insecure` apply-config approach is appropriate for first-time provisioning over the maintenance API, which is the intended workflow.
