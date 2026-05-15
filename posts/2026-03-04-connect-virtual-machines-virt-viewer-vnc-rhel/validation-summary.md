# Validation Summary: How to Connect to Virtual Machines Using virt-viewer and VNC on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux virtualization
- KVM/QEMU
- libvirt and virsh
- virt-viewer
- VNC console access
- SSH tunneling
- Serial console access
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Connecting to virtual machines": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_connecting-to-virtual-machines_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 10 documentation, "Connecting to virtual machines": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_and_managing_linux_virtual_machines/connecting-to-virtual-machines
- libvirt domain XML format documentation: https://libvirt.org/formatdomain.html
- libvirt virsh manual: https://www.libvirt.org/manpages/virsh.html
- virt-viewer man page: https://www.mankier.com/1/virt-viewer

## Issues Found
- The serial console setup instructions only mentioned enabling `serial-getty@ttyS0.service`. Red Hat's documentation also requires the guest kernel command line to include the serial console, such as `console=ttyS0`, otherwise `virsh console` can connect to an unresponsive console. I added the `grubby --update-kernel=ALL --args="console=ttyS0"` command to the guest OS notes.

## Review Notes
- The VNC examples and libvirt XML syntax are valid. Exposing VNC on `0.0.0.0` is technically supported, but it should be handled carefully in production because VNC console access can be sensitive; SSH tunneling or restricted firewall rules are preferable where possible.
