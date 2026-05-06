# Validation Summary: How to Configure DHCP Option 66 and Option 67 for TFTP Boot

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCP
- BOOTP
- TFTP
- PXE boot
- ISC DHCP (`dhcpd`)
- dnsmasq
- Wireshark/TShark

## Sources Consulted
- RFC 2132: DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132.html
- RFC 4578: DHCP Options for the Intel Preboot eXecution Environment (PXE): https://www.ietf.org/rfc/rfc4578
- ISC DHCP `dhcpd.conf(5)` documentation: https://manpages.debian.org/testing/isc-dhcp-server/dhcpd.conf.5.en.html
- ISC DHCP `dhcp-options` documentation: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- dnsmasq man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- Wireshark DHCP display filter reference: https://www.wireshark.org/docs/dfref/d/dhcp.html
- ISC DHCP `dhclient(8)` documentation: https://manpages.debian.org/testing/isc-dhcp-client/dhclient.8.en.html

## Issues Found
- The ISC DHCP and VoIP examples used `filename` as if it were DHCP option 67. In ISC DHCP, `filename` sets the BOOTP boot file field, while DHCP option 67 is `option bootfile-name`. I added `option bootfile-name` and kept `filename` for compatibility.
- The post described `siaddr` as a TFTP server IP in the header without making clear that it is the BOOTP `next-server` field and distinct from option 66. I clarified the explanation and the key takeaways so the BOOTP fields and DHCP options are not conflated.
- The dnsmasq example said options 66 and 67 were configured via `dhcp-boot`, but `dhcp-boot` sets BOOTP boot parameters. I added `dhcp-option-force` entries so the example explicitly sends DHCP options 66 and 67, while still using `dhcp-boot` for PXE compatibility.
- The UEFI matching only handled architecture `7`. Per RFC 4578, UEFI-related PXE clients may appear as architecture `7` or `9`, so I updated the dnsmasq example to match both and made the ISC vendor-class match less brittle by matching the PXE prefix instead of an exact full string.
- The `tshark` example used legacy `bootp.*` display-field names. Current Wireshark/TShark releases expose these fields under `dhcp.*`, so I updated the command accordingly.

## Review Notes
- ISC DHCP is end-of-life, but the corrected configuration syntax remains valid for existing deployments.
- RFC 4578 labels architecture `7` as EFI BC and `9` as EFI x86-64; in practice, PXE environments often need to account for both.
- `shimx64.efi` is a valid example UEFI loader, but the exact EFI boot file depends on the boot stack in use, such as `grubx64.efi`, `ipxe.efi`, or a vendor-specific loader.
