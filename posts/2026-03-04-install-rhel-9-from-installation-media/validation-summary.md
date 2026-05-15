# Validation Summary: How to Install Red Hat Enterprise Linux 9 from Installation Media Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Anaconda installer
- Red Hat Customer Portal installation ISO images
- Linux, macOS, and Windows bootable USB media creation
- LVM, XFS, EFI System Partition, swap
- Red Hat Subscription Manager and Simple Content Access
- DNF
- firewalld
- SELinux
- chrony
- Kickstart

## Sources Consulted
- Red Hat documentation: Interactively installing RHEL from installation media, installation boot media options and USB creation: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/interactively_installing_rhel_from_installation_media/Red_Hat_Enterprise_Linux-9-Interactively_installing_RHEL_from_installation_media-en-US.pdf
- Red Hat documentation: Creating a bootable installation medium for RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/assembly_creating-a-bootable-installation-medium_rhel-installer
- Red Hat documentation: Kickstart autopart storage defaults for RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Red Hat documentation: Using SELinux in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat documentation: Configuring firewalls and packet filters in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat documentation: Configuring time synchronization with chrony in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings
- Red Hat Customer Portal: Simple Content Access: https://access.redhat.com/articles/simple-content-access

## Issues Found
- The DVD ISO description said it contains the full package set. Red Hat describes the DVD ISO as including the BaseOS and AppStream repositories needed to complete a standard installation without other repositories, so the wording was corrected to avoid implying that all possible RHEL content is included.
- The automatic partitioning description omitted that Anaconda creates `/home` on large enough drives. The text now mentions `/home` alongside `/boot`, `/`, and swap.
- The first-boot registration steps used `subscription-manager attach --auto`. Red Hat states that most accounts have been moved to Simple Content Access and that attach commands such as `subscription-manager attach --auto` are obsolete and no longer required in that model. The command was removed and replaced with a note explaining current SCA behavior and the older entitlement-model caveat.

## Review Notes
The remaining commands and technical claims were consistent with Red Hat documentation: ISO checksum verification with `sha256sum`, direct USB writing with `dd`, Fedora Media Writer on Windows, Secure Boot support, XFS as the default file system, chrony as the RHEL time synchronization implementation, firewalld being enabled during installation, and SELinux enforcing mode as the default. The examples use RHEL 9.4 filenames and release output; these are valid examples for that minor release, but future readers installing a later RHEL 9 minor release will see a different ISO filename and `/etc/redhat-release` value.
