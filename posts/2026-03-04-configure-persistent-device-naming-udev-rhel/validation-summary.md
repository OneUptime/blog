# Validation Summary: How to Configure Persistent Device Naming with udev on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- udev and udevadm
- Persistent block device naming under /dev/disk/
- /etc/fstab UUID-based mounts
- Network interface naming
- USB serial port symlinks
- LVM physical volumes
- GRUB kernel arguments with grubby

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Managing storage devices, "Device names managed by the udev mechanism in /dev/disk/" - https://docs.redhat.com/de/documentation/red_hat_enterprise_linux/8/html-single/managing_storage_devices/managing_storage_devices
- Red Hat Enterprise Linux 8 documentation: Managing file systems, persistent storage naming and UUID usage - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/managing_file_systems/mounting-file-systems_managing-file-systems
- Red Hat Enterprise Linux 8 documentation: Configuring and managing networking, "Implementing consistent network interface naming" and "Configuring user-defined network interface names by using udev rules" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/consistent-network-interface-device-naming_configuring-and-managing-networking
- Local udev(7), udevadm(8), fstab(5), blkid(8), and systemd.link(5) man pages
- Local udevadm --help output for info, control, trigger, and test commands

## Issues Found
- The custom network-interface udev rule omitted the Ethernet device-type match used in Red Hat's documented rule pattern. I added `ATTR{type}=="1"` to each rule so the match is scoped to Ethernet interfaces rather than any net device with the same MAC address.
- The custom network-interface rule file used `/etc/udev/rules.d/70-custom-ifnames.rules`. Red Hat documents `/etc/udev/rules.d/70-persistent-net.rules` for persistent network names, especially when names are needed during boot. I changed the filename in the example accordingly.

## Review Notes
The post is technically relevant and the reviewed commands and configuration snippets are broadly consistent with RHEL and udev documentation. Future improvements could mention that Red Hat also documents systemd `.link` files for custom interface names, and that NetworkManager profiles may need to be updated when an interface is renamed.
