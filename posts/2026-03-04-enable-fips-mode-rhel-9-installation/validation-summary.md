# Validation Summary: How to Enable FIPS Mode on RHEL During Installation

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- FIPS mode / FIPS 140-3
- Anaconda installer
- Kickstart automated installation
- OpenSSL
- RHEL system-wide crypto policies
- LUKS disk encryption

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Switching RHEL to FIPS mode": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- Red Hat Enterprise Linux 9 Automatically installing RHEL, "Kickstart commands and options reference": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/kickstart-commands-and-options-reference_rhel-installer
- Red Hat Enterprise Linux 9 Automatically installing RHEL, "Starting Kickstart installations": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/starting-kickstart-installations_rhel-installer
- Red Hat Enterprise Linux 9 Interactively installing RHEL from installation media, "Booting the installation media": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_from_installation_media/booting-the-installer-from-local-media_rhel-installer
- Red Hat Enterprise Linux 9 Interactively installing RHEL over the network, "Customizing the system in the installer": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_over_the_network/customizing-the-system-in-the-installer_rhel-installer
- Red Hat Enterprise Linux 9 Considerations in adopting RHEL 9, security and OpenSSL FIPS notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/considerations_in_adopting_rhel_9/considerations_in_adopting_rhel_9
- Pykickstart command reference: https://pykickstart.readthedocs.io/en/latest/kickstart-docs.html

## Issues Found
- The post used `fips --enable` as a Kickstart directive. That command is not listed in the RHEL 9 Kickstart reference or pykickstart command reference. I changed the automated-installation guidance to add `fips=1` to the PXE/custom ISO boot entry that loads the Kickstart file, and kept `bootloader --append="fips=1"` only as installed-kernel command-line configuration.
- The boot-menu instructions only mentioned pressing Tab. Red Hat documents Tab for BIOS-style boot editing and `e` for UEFI GRUB editing, so I updated the instruction to mention both.
- The Anaconda GUI section implied that selecting a FIPS/STIG profile would configure FIPS mode. Red Hat documents that starting with RHEL 9.6, STIG and other security profiles do not automatically enable FIPS at first boot. I added the requirement to still enable `fips=1` before installation starts.
- The OpenSSL behavior said only the FIPS provider is active. On RHEL 9/OpenSSL 3, the more accurate statement is that the FIPS provider is loaded and OpenSSL uses the FIPS property query for approved algorithms. I updated that wording.
- The introductory wording described algorithms as "NIST-validated." FIPS validates cryptographic modules and approves algorithms, so I changed it to "FIPS-approved cryptographic algorithms and validated cryptographic modules."
- The closing sentence said FIPS enablement could be a one-line addition to boot parameters or the Kickstart file. Because the invalid Kickstart directive was removed, I changed this to refer to boot parameters.

## Review Notes
The remaining commands and verification checks are consistent with Red Hat's RHEL 9 FIPS guidance. The OpenSSL `md5` rejection test depends on the system actually booting with FIPS enabled and the standard RHEL OpenSSL configuration being intact; custom OpenSSL configuration can change provider behavior and should be reviewed separately in hardened environments.
