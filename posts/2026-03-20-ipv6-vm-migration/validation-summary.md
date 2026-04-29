# Validation Summary: How to Configure IPv6 for VM Migration (vMotion/Live Migration)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 networking
- VMware ESXi / vSphere vMotion
- Microsoft Hyper-V Live Migration
- KVM/QEMU live migration
- libvirt remote migration
- Linux `ip6tables`
- IPv6 Neighbor Discovery

## Sources Consulted
- VMware ESXCLI Command Reference: https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html
- VMware vMotion networking requirements: https://knowledge.broadcom.com/external/article/342209/understand-vmotion-networking-requiremen.html
- Microsoft Learn: Add-VMMigrationNetwork: https://learn.microsoft.com/he-il/powershell/module/hyper-v/add-vmmigrationnetwork?view=windowsserver2016-ps
- Microsoft Learn: Move-VM: https://learn.microsoft.com/en-us/powershell/module/hyper-v/move-vm?view=windowsserver2025-ps
- Microsoft Learn: Compare-VM: https://learn.microsoft.com/en-us/powershell/module/hyper-v/compare-vm?view=windowsserver2025-ps
- libvirt migration documentation: https://libvirt.org/migration.html
- libvirt remote support: https://www.libvirt.org/remote
- QEMU invocation documentation: https://www.qemu.org/docs/master/system/invocation.html
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html

## Issues Found
- The sample IPv6 addresses used non-hex words such as `vmotion` and `livemig`, which are invalid IPv6 literals. Replaced them with valid documentation-prefix examples.
- The VMware `esxcli network ip interface ipv6 address add` example used unsupported flags (`--ip`, `--prefix-length`). Replaced them with the documented `--ipv6` form and added the documented IPv6 enablement steps, including the reboot caveat for global IPv6 enablement.
- The Hyper-V section referenced `Test-VMMigration`, which is not a documented Hyper-V cmdlet. Replaced the verification example with `Compare-VM`, which Microsoft documents for migration compatibility checks.
- The first Hyper-V `Move-VM` example included `-DestinationStoragePath` unnecessarily. Simplified it to the documented host-move form and kept `-IncludeStorage` only on the storage-move example.
- The libvirt/KVM section implied that changing only the destination libvirt URI was enough to force the migration data path onto IPv6. Updated the example to use an explicit IPv6 migration URI for the native migration stream and aligned the tunnelled example with documented libvirt patterns.
- The post-migration explanation claimed the hypervisor sends “gratuitous NDP” to update a new MAC-to-IP mapping. That is too broad and technically misleading for live migration. Reworded the section to describe address continuity accurately and to use normal IPv6 traffic as the refresh example.
- The firewall section used an invalid IPv6 source prefix and included a distro-specific `ip6tables-save` path that was not generally correct. Corrected the prefix and removed the incorrect persistence command.
- The KVM/Proxmox verification commands lacked important prerequisites. Added notes that `virsh domifaddr` depends on guest-agent or lease data and that `qm guest exec` requires `qemu-guest-agent`.

## Review Notes
- The libvirt examples assume `desthost.example.com` resolves to the destination host's IPv6 address when the article discusses tunnelled control connections.
- The `ip6tables` examples are still acceptable where the iptables compatibility layer is in use; an `nftables` version could be a future improvement, but it is not required for correctness.
