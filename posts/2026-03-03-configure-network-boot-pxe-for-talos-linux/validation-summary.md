# Validation Summary: How to Configure Network Boot (PXE) for Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.9.0)
- PXE / Network boot
- DHCP (dnsmasq)
- TFTP (dnsmasq)
- HTTP (nginx)
- PXELINUX / Syslinux
- iPXE
- talosctl / Kubernetes
- Talos Image Factory

## Sources Consulted
- Talos Linux v1.9.0 release assets — https://github.com/siderolabs/talos/releases/tag/v1.9.0
- Talos PXE bare-metal docs — https://www.talos.dev/v1.9/talos-guides/install/bare-metal-platforms/pxe/
- Talos Image Factory — https://factory.talos.dev/ and https://pxe.factory.talos.dev/
- Syslinux PXELINUX wiki (HTTP support, lpxelinux.0) — https://wiki.syslinux.org/wiki/index.php?title=PXELINUX
- RFC 4578 (DHCP option 93 client architecture types) — https://datatracker.ietf.org/doc/html/rfc4578
- dnsmasq man page (proxy DHCP, pxe-service, dhcp-match) — https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- iPXE chainloading and option 175 — https://ipxe.org/howto/chainloading
- talosctl reference — https://www.talos.dev/v1.9/reference/cli/

## Issues Found

1. **`pxelinux.0` does not support HTTP URLs.** The original post copied standard `pxelinux.0` to TFTP and then used `KERNEL http://...` / `INITRD http://...` in `pxelinux.cfg/default`. Standard pxelinux.0 is TFTP-only; HTTP support is only present in `lpxelinux.0` (the "loadable" PXELINUX variant, since Syslinux 5.10). The original config would simply fail to fetch kernel/initrd. Fix: changed the copied file to `/usr/lib/PXELINUX/lpxelinux.0`, updated `dhcp-boot=tag:bios,...` to `lpxelinux.0`, updated the proxy-DHCP `pxe-service` entry to `lpxelinux`, and updated the troubleshooting `tftp ... -c get` command to fetch `lpxelinux.0`.

2. **`ipxe-amd64.efi` is not shipped in Talos releases.** Verified directly against the v1.9.0 release asset list — there is no iPXE EFI binary. The `wget` to `https://github.com/siderolabs/talos/releases/download/v1.9.0/ipxe-amd64.efi` would 404. Fix: replaced the download with a copy of `snponly.efi` from the `ipxe` Debian/Ubuntu package (added `ipxe` to the apt install list), and configured dnsmasq to chainload to the Talos Image Factory PXE script for stock Talos once iPXE itself starts and sends DHCP option 175. The Image Factory PXE URL was verified to return a valid `#!ipxe` script for v1.9.0 with the stock schematic ID `376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba`.

3. **dnsmasq UEFI client-arch handling needed a note and an extra `pxe-service` entry.** Per RFC 4578, client-arch 7 = EBC and 9 = x86-64 EFI, but most real firmware reports 7 for x86_64 UEFI. The original `dhcp-match` on both 7 and 9 was already pragmatically correct; I added a clarifying comment. For the proxy-DHCP section I added a `BC_EFI` (arch 7) `pxe-service` line alongside `X86-64_EFI` (arch 9) for real-world UEFI compatibility.

4. **iPXE chainload tag missing from the BIOS/EFI rules.** Added `dhcp-match=set:ipxe,175` and split the EFI rule into `tag:efi64,tag:!ipxe` (serves the iPXE binary first) and `tag:ipxe` (chainloads the Talos boot script). Without this, the iPXE binary would boot but have no script to execute and would drop to a shell.

## Review Notes
- The Talos kernel parameters (`talos.platform=metal`, `talos.config=<URL>`) and talosctl commands (`gen config`, `bootstrap`, `health --wait-timeout`, `validate -m metal -c`) are all correct for Talos v1.9.
- The post uses the Talos Image Factory's stock schematic ID for UEFI chainloading. If readers need custom kernel modules or extensions, they should generate their own schematic at https://factory.talos.dev/ and substitute the ID in the dnsmasq `dhcp-boot` line.
- The author's BIOS flow (lpxelinux + HTTP kernel/initrd + `talos.config=` kernel arg) and the UEFI flow (iPXE chainload to Image Factory script) end up applying configuration through different mechanisms — the BIOS path uses the in-tree `talos.config=` arg, while the Image Factory PXE script bakes config delivery into the iPXE script. Both work, but operators should be aware that the per-MAC `pxelinux.cfg` configs in Step 7 only take effect for the BIOS path; per-machine UEFI customization would require generating per-machine iPXE scripts or using Talos's discovery service.
- Talos's recommended additional kernel parameters (`init_on_alloc=1`, `slab_nomerge`, `pti=on`, `consoleblank=0`, etc.) are not present in the BIOS `APPEND` lines. They are not strictly required for boot but are part of the upstream-recommended hardening; not flagged as an error since the post boots successfully without them.
- `md5sum` is used in troubleshooting; Talos publishes both SHA256 and SHA512 checksums. Not wrong (md5sum on a downloaded file still verifies integrity against itself), but switching to `sha256sum` and comparing against `sha256sum.txt` from the release would be a stricter check.
- The post pins everything to Talos v1.9.0. Readers using a newer Talos version will need to update the version string in paths/URLs and the Image Factory chainload URL.
