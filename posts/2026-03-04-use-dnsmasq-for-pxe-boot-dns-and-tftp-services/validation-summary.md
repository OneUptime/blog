# Validation Summary: How to Use dnsmasq for PXE Boot DNS and TFTP Services on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- dnsmasq
- DHCP
- DNS
- TFTP
- PXE boot
- SYSLINUX/PXELINUX
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Preparing a PXE installation source": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/preparing-for-a-network-install_rhel-installer
- Red Hat Enterprise Linux 9 documentation, "Boot options reference": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_over_the_network/custom-boot-options_rhel-installer
- dnsmasq official man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Fedora syslinux-tftpboot package description for the `/tftpboot` file location: https://packages.fedoraproject.org/pkgs/syslinux/syslinux-tftpboot/

## Issues Found
- The prerequisite for the HTTP installation source did not state RHEL's requirement that an `inst.repo` installation source contain a valid `.treeinfo` file. Updated the prerequisite to make that requirement explicit.

## Review Notes
The tutorial is scoped to BIOS-based PXE clients using PXELINUX. UEFI clients require a different boot loader path and configuration, which is outside the scope of this post. The sample `eth0`, IP addresses, and `inst.repo` URL must still be adjusted to match the reader's network.
