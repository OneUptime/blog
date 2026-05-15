# Validation Summary: How to Manage Virtual Machines with virsh Commands on RHEL

## Status
validated

## Post Type
Tutorial / command reference

## Technologies Covered
- Red Hat Enterprise Linux
- KVM
- libvirt
- virsh
- Linux virtualization

## Sources Consulted
- libvirt virsh man page: https://www.libvirt.org/manpages/virsh.html
- Red Hat Enterprise Linux 10 virtualization management documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_and_managing_linux_virtual_machines/basic-concepts-of-virtualization-in-rhel
- Red Hat Enterprise Linux 7 virtualization CLI documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/virtualization_getting_started_guide/chap-cli-intro

## Issues Found
- The `domifaddr` comment said it gets the IP address of a VM. Updated it to clarify that it works for running VMs when address data is available from DHCP leases, the guest agent, or ARP data.
- The `undefine` comment implied deleting a VM definition generally. Updated it to clarify that undefining a running VM does not stop it.
- The `undefine --remove-all-storage` comment implied all storage is always removed. Updated it to clarify that this applies to libvirt-managed storage volumes for inactive VMs.
- The `domdisplay` comment said it opens a graphical console. Updated it to state that it shows the graphical console URI.

## Review Notes
Most listed `virsh` commands and flags are valid and current. Several live resource-management operations depend on hypervisor support, guest state, and guest configuration, so administrators should check `virsh help <command>` on the target RHEL host for environment-specific behavior.
