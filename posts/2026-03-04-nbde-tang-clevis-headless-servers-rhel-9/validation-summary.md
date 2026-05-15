# Validation Summary: How to Implement NBDE with Tang and Clevis for Headless RHEL Servers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Network-Bound Disk Encryption
- Tang
- Clevis
- LUKS
- dracut/initramfs networking
- Kickstart
- IPMI/iLO operational recovery

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, Network-Bound Disk Encryption and Clevis/Tang procedures: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat Enterprise Linux 9 boot options reference for dracut network boot options: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/custom-boot-options_rhel-installer
- clevis-luks-bind man page for `-y`, `-f`, `-k`, and binding behavior: https://manpages.ubuntu.com/manpages/jammy/man1/clevis-luks-bind.1.html
- clevis-encrypt-tang man page for `url`, `thp`, and `adv` Tang pin configuration: https://manpages.debian.org/testing/clevis/clevis-encrypt-tang.1.en.html
- tang-show-keys man page for Tang signing-key thumbprint verification: https://www.mankier.com/1/tang-show-keys
- ipmitool man page for BMC watchdog command family: https://manpages.ubuntu.com/manpages/trusty/man1/ipmitool.1.html

## Issues Found
- The Kickstart example used `clevis luks bind -f` and described `-f` as skipping interactive thumbprint verification. In current Clevis/RHEL usage, `-y` is the option that automatically answers prompts, while `-f` is for LUKSMeta initialization behavior and older workflows. Changed the Kickstart command to use `-y`.
- The Kickstart example did not provide the existing LUKS passphrase non-interactively, which would make an automated `%post` binding unsuitable as written. Added `-k -` and a stdin placeholder so Clevis can read the passphrase during Kickstart.
- Updated the prose below the Kickstart snippet to describe `-y`, `-k -`, and `thp` accurately.

## Review Notes
The post uses example device names, IP addresses, hostnames, and interface names that must be adapted per host. Red Hat's RHEL 9 documentation also shows `dracut --hostonly-cmdline`, `grubby --args="rd.neednet=1"`, and `dracut --regenerate-all` variants for early-boot networking; the post's dracut configuration-file approach is valid but should be tested on the exact hardware and network path used by the headless servers.
