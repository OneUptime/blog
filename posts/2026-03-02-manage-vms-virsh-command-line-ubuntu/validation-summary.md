# Validation Summary: How to Manage VMs with virsh Command Line on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- virsh (libvirt CLI)
- KVM / QEMU
- libvirt
- virt-install
- virt-clone
- virt-top
- qemu-img
- libvirt virtual networks (XML configuration)
- Ubuntu (host OS)

## Sources Consulted
- Official libvirt virsh manpage: https://libvirt.org/manpages/virsh.html
- Official libvirt virt-install manpage: https://manpages.debian.org/virt-install
- libvirt domain XML format: https://libvirt.org/formatdomain.html
- libvirt network XML format: https://libvirt.org/formatnetwork.html
- virt-clone documentation: https://manpages.debian.org/virt-clone

## Issues Found

1. **Invalid `virsh wait` command** (Batch Operations section): The post used `timeout 60 virsh wait "$vm" --state shutoff` to wait for a VM to reach the shutoff state. There is no `virsh wait` subcommand in libvirt, and no `--state` flag exists on any virsh subcommand for waiting. Replaced with a proper polling loop using `virsh domstate`, which returns `shut off` (with a space) when the domain is stopped:
   ```bash
   timeout 60 bash -c "until [ \"\$(virsh domstate \"$vm\")\" = 'shut off' ]; do sleep 1; done"
   ```

## Review Notes

- All other virsh subcommands referenced (`list`, `start`, `shutdown`, `destroy`, `reboot`, `suspend`, `resume`, `save`, `restore`, `autostart`, `dominfo`, `dumpxml`, `domstats`, `domifaddr`, `domblkinfo`, `domblklist`, `edit`, `attach-device`, `detach-device`, `setvcpus`, `setmaxmem`, `setmem`, `vcpupin`, `attach-disk`, `detach-disk`, `domblkstat`, `domiflist`, `attach-interface`, `detach-interface`, `domifstat`, `net-list`, `net-dumpxml`, `net-define`, `net-start`, `net-autostart`, `snapshot-create-as`, `snapshot-list`, `snapshot-info`, `snapshot-revert`, `snapshot-delete`, `console`, `vncdisplay`, `domdisplay`) and their flags are valid and current.
- The `virt-install` and `virt-clone` command examples use correct flag syntax.
- The network XML example follows the proper libvirt network format schema.
- The `--graphics spice` option in `virt-install` is valid, though note that SPICE support was deprecated in QEMU 8.x and may be removed in future releases — users on newer Ubuntu versions might prefer `--graphics vnc` or `--graphics none`. Not corrected since SPICE still works on currently supported Ubuntu LTS releases.
- The comment "Start all VMs that have autostart disabled" is slightly misleading — the loop actually attempts to start every VM (whether autostart is enabled or not) and silently ignores already-running ones. Left as-is since the behavior is benign and the code itself is correct.
- The `qemu:///system` URI and `qemu+ssh://` remote URI are correct.
