# Validation Summary: How to Set Up TFTP Server for Network Boot on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- TFTP
- PXE network boot
- systemd socket units
- firewalld
- SELinux

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Interactively installing RHEL over the network": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/interactively_installing_rhel_over_the_network/Red_Hat_Enterprise_Linux-9-Interactively_installing_RHEL_over_the_network-en-US.pdf
- Red Hat Enterprise Linux 9 documentation, "Configuring a TFTP service for diskless clients": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/setting-up-a-remote-diskless-system_managing-storage-devices
- Red Hat Enterprise Linux 9 documentation, "Using and configuring firewalld": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- RFC 1350, "The TFTP Protocol (Revision 2)": https://www.rfc-editor.org/rfc/rfc1350.html

## Issues Found
- The post used placeholder paths and service names such as `/etc/<service>/config.conf` and `<service-name>`. Replaced these with RHEL 9 TFTP-specific commands using `dnf install tftp-server`, `/var/lib/tftpboot`, and `tftp.socket`.
- The firewall example opened an unspecified TCP port. TFTP uses UDP and RHEL/firewalld provides a `tftp` service definition, so the post now uses `firewall-cmd --add-service=tftp` and `firewall-cmd --permanent --add-service=tftp`.
- The verification and troubleshooting commands referenced generic service names and TCP/HTTP-style checks. Updated them to check `tftp.socket`, inspect its journal, verify UDP listeners with `ss -lunp`, and test a file download with a TFTP client.
- The original guidance mentioned authentication settings for TFTP. TFTP does not provide authentication in the way typical application services do, so this was replaced with guidance about boot loader files, kernel/initramfs paths, and PXE or GRUB menu entries.

## Review Notes
The article now covers the TFTP service setup accurately for RHEL 9, but a complete production network-boot environment also requires correctly configured DHCP options and boot files appropriate to the client firmware, such as BIOS PXE or UEFI GRUB.
