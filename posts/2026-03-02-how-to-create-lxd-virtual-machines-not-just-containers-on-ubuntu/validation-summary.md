# Validation Summary: How to Create LXD Virtual Machines (Not Just Containers) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- LXD
- LXC CLI
- QEMU/KVM virtual machines
- LXD images and remotes
- LXD storage volumes and disk devices
- LXD clustering and VM live migration
- LXD GPU devices

## Sources Consulted
- LXD requirements: https://documentation.ubuntu.com/lxd/latest/requirements/
- LXD instances overview: https://documentation.ubuntu.com/lxd/stable-5.0/explanation/instances/
- LXD `lxc launch` man page: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/launch/
- LXD `lxc exec` man page: https://documentation.ubuntu.com/lxd/en/latest/reference/manpages/lxc/exec/
- LXD guest OS compatibility and LXD agent notes: https://documentation.ubuntu.com/lxd/latest/guest-os-compatibility/
- LXD console access: https://documentation.ubuntu.com/lxd/stable-5.0/howto/instances_console/
- LXD `lxc console` man page: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/console/
- LXD disk device reference: https://documentation.ubuntu.com/lxd/latest/reference/devices_disk/
- LXD storage volume management: https://documentation.ubuntu.com/lxd/latest/howto/storage_volumes/
- LXD `lxc storage volume create` man page: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/storage/volume/create/
- LXD VM migration guide: https://documentation.ubuntu.com/lxd/stable-5.0/howto/move_instances/
- LXD cluster evacuation: https://documentation.ubuntu.com/lxd/en/latest/reference/manpages/lxc/cluster/evacuate/
- LXD GPU device reference: https://documentation.ubuntu.com/lxd/default/reference/devices_gpu/
- LXD remote image servers: https://documentation.ubuntu.com/lxd/stable-5.0/reference/remote_image_servers/
- LXD image list man page: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/image/list/

## Issues Found
- The post referred to the QEMU guest agent as the component that enables `lxc exec` for VMs. LXD documentation describes this as the `lxd-agent`, so the command and explanation were changed to use `lxd-agent`.
- The VGA console was described as VNC-like and compatible with VNC clients. LXD documents the VGA console as SPICE graphical output, so the wording now points to SPICE clients such as `remote-viewer` or `spice-gtk-client`.
- The live migration section omitted the requirement to enable stateful migration for a running VM. The section now sets `migration.stateful=true` and uses `lxc cluster evacuate --action=live-migrate` for the evacuation example.
- The additional disk example attempted to create and attach a storage-pool disk device without a `source`, and implied it would appear mounted at `/mnt/data`. LXD storage-volume disk devices require a source volume; block volumes appear as block devices in VMs and must be partitioned/formatted/mounted by the guest. The example now creates a block volume and attaches it with `source=data-disk`.
- The performance section claimed LXD VMs are significantly lighter than KVM VMs managed through libvirt, but LXD VMs are also QEMU/KVM-backed and that claim is not established by the shown benchmark. The section now limits the comparison to LXD containers versus LXD VMs.
- The troubleshooting section used `lxc list --refresh`, but current official `lxc list` documentation has no `--refresh` flag. The command was replaced with `lxc list` and `lxc info myvm`.

## Review Notes
- The local environment did not have the `lxc` CLI installed, so CLI syntax was validated against official LXD man pages and documentation rather than local `--help` output.
- Some performance values and image sizes are approximate and host-dependent. They are reasonable as illustrative examples but should not be treated as guarantees.
