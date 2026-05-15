# Validation Summary: How to Harden RHEL During Installation with Secure Partitioning

## Status
validated

## Post Type
Tutorial / hardening guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Anaconda and Kickstart storage configuration
- Linux filesystems and mount options
- LVM
- systemd mount units
- LUKS disk encryption
- OpenSCAP and SCAP Security Guide
- CIS and DISA STIG hardening baselines

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Kickstart commands and options reference, including `part`, `logvol`, `--fsoptions`, `/boot/efi`, and LUKS options: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/kickstart-commands-and-options-reference_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Securing RHEL during and right after installation, disk partitioning guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_securing-rhel-during-installation-security-hardening
- Red Hat Enterprise Linux 9 documentation: Scanning the system for configuration compliance and vulnerabilities, OpenSCAP commands and supported profiles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Red Hat Enterprise Linux 9 image builder OpenSCAP documentation, profile ID long and short forms: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/assembly_creating-pre-hardened-images-with-image-builder-openscap-integration_composing-a-customized-rhel-system-image
- Local `mount(8)` man page for `nodev`, `nosuid`, `noexec`, `defaults`, and remount behavior.
- Local `systemd.mount(5)` man page for mount unit `Options=` behavior.
- Local `findmnt --help` output for `-l`, `-t`, and `-o` options.

## Issues Found
- The Kickstart example did not apply the `nodev,nosuid` mount options to `/boot`, even though the recommended layout table specified them. I added `--fsoptions="nodev,nosuid"` to the `/boot` partition line so the generated `/etc/fstab` matches the table.
- The recommended layout listed `/boot/efi` mount options, but Red Hat's Kickstart documentation states that Anaconda hard codes EFI system partition options and ignores user-specified `--fsoptions` for `/boot/efi`. I added a comment to the Kickstart snippet so readers do not try to set `/boot/efi` options there.

## Review Notes
The OpenSCAP CIS profile command uses the valid long-form CIS Level 2 Server profile ID for current RHEL 9 SCAP Security Guide content. The post's `/boot/efi` size is larger than Red Hat's general recommendation, but that is acceptable for a hardened server layout.
