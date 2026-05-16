# Validation Summary: How to Install Talos Linux Using iPXE

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (v1.9.0)
- iPXE (network boot firmware)
- PXE / UEFI / BIOS network boot
- ISC DHCP server
- dnsmasq
- nginx (HTTP boot asset server)
- TFTP
- talosctl CLI
- kubectl
- Kubernetes bootstrapping

## Sources Consulted
- Talos Linux official documentation: https://www.talos.dev/v1.9/
- Talos Linux releases on GitHub: https://github.com/siderolabs/talos/releases/tag/v1.9.0
- Talos kernel parameters reference: https://www.talos.dev/v1.9/reference/kernel/
- iPXE official documentation: https://ipxe.org/
- iPXE command reference: https://ipxe.org/cmd
- iPXE script syntax: https://ipxe.org/syntax
- iPXE binary downloads: https://boot.ipxe.org/
- iPXE source: https://github.com/ipxe/ipxe
- ISC DHCP documentation
- dnsmasq man page
- IANA DHCP processor architecture types (RFC 4578)

## Issues Found
No technical issues found.

All commands, configuration snippets, and technical claims were verified against official documentation:

- Talos v1.9.0 release asset URLs (`vmlinuz-amd64`, `initramfs-amd64.xz` from `github.com/siderolabs/talos/releases/download/v1.9.0/`) match the actual release artifacts.
- The `talosctl` install command via `https://talos.dev/install` matches official guidance.
- iPXE script primitives used (`#!ipxe`, `set`, `echo`, `kernel`, `initrd`, `boot`, `chain`, `iseq`, `goto`, `:label`, `sleep`, `||` and `&&` operators) are all valid.
- Talos kernel parameters (`talos.platform=metal`, `talos.config=<URL>`) are the documented mechanisms for bare-metal boot and machine-config retrieval.
- DHCP option 93 (client architecture) values `00:07` (EFI x64 / EFI BC) and `00:09` (EFI x86-64) are the conventional pair used by iPXE templates to detect UEFI clients.
- ISC DHCP `user-class` and `option arch` conditional logic and dnsmasq `dhcp-userclass` / `dhcp-boot` tagged syntax are syntactically correct.
- iPXE chainload binary URLs `https://boot.ipxe.org/undionly.kpxe` and `https://boot.ipxe.org/ipxe.efi` are the official locations.
- iPXE build targets `bin/undionly.kpxe` (BIOS) and `bin-x86_64-efi/ipxe.efi` (UEFI), and the `EMBED=` argument, are correct.
- `talosctl` subcommands used (`gen config`, `apply-config --insecure --nodes --file`, `config endpoint`, `config node`, `bootstrap`, `health`, `kubeconfig`) all match current CLI usage.
- `console=ttyS0 console=tty0` correctly enables serial + VGA console output on Linux.
- `tcpdump` invocation for DHCP/TFTP/HTTP traffic (ports 67, 68, 69, 80) is correct.

## Review Notes
- The dnsmasq snippet in Step 5 only handles BIOS chainloading (`undionly.kpxe`) and does not include a UEFI branch (`ipxe.efi`) the way the ISC DHCP snippet does. This is a simplification rather than an error, but UEFI-only environments will need to extend the dnsmasq config with arch-tag matching (e.g., `dhcp-match=set:efi64,option:client-arch,7` plus a `dhcp-boot=tag:efi64,...` line).
- The multi-line MAC routing example with trailing `||` relies on iPXE's shell-like line-continuation behavior for `&&` / `||`. This is a widely used pattern and matches what iPXE's parser supports, but readers writing their own scripts should be aware that arbitrary line breaks inside a chained command are not allowed.
- Talos v1.9 is current at the time of review; readers using newer Talos versions may prefer to source customized boot assets from the Talos Image Factory (`factory.talos.dev`) for system extensions, but the plain `vmlinuz` / `initramfs.xz` artifacts on GitHub Releases remain valid for stock installs.
- `talosctl health` will use the endpoints and nodes set via `talosctl config endpoint` / `talosctl config node`. For more rigorous health checks, `--control-plane-nodes` and `--worker-nodes` flags can be passed explicitly.
- The post does not cover Secure Boot signing in depth beyond mentioning the workaround; this is acceptable for an iPXE-focused guide.
