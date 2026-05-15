# Validation Summary: How to Encrypt Swap Space on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux swap
- dm-crypt
- LUKS/LUKS2
- cryptsetup
- systemd crypttab
- util-linux swapon, swapoff, and mkswap
- device-mapper

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Encrypting block devices using LUKS": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- crypttab(5), Linux manual page: https://man7.org/linux/man-pages/man5/crypttab.5.html
- Linux kernel documentation, "Swap suspend": https://docs.kernel.org/power/swsusp.html
- systemd-hibernate-resume-generator documentation: https://www.freedesktop.org/software/systemd/man/systemd-hibernate-resume-generator.html
- Local util-linux mkswap(8) manual page
- Local util-linux swapon(8) manual page
- Local dmsetup --help output

## Issues Found
- The introduction said encrypting swap "eliminates" the physical-access risk. Red Hat's LUKS documentation notes disk encryption protects data when the system is off, but decrypted data is available while the system is running and unlocked. Changed the wording to "reduces this risk by protecting the data at rest."
- The Mermaid diagram labeled swapping as happening under "Low memory pressure." Swap is used when memory pressure exists, so the label was changed to "Memory pressure."
- The LUKS section implied that creating LUKS swap is sufficient for hibernation. Linux hibernation also requires the resume device path to be configured, so the section title and explanatory text were adjusted to mention hibernation-capable systems and the required resume path configuration.
- The keyfile note did not mention the resume-time requirement for hibernation. Added a sentence that a keyfile used for hibernation must be available in the initramfs path that unlocks swap during resume.
- The performance section claimed encrypted swap impact is "typically under 5%." That exact general number was not supported by the consulted official documentation and can vary by workload and device, so it was changed to a workload-dependent statement.

## Review Notes
The random-key crypttab entry is consistent with crypttab documentation: `/dev/urandom` may be used as a key file for swap, and the `swap` option implies plain mode and formats the mapped device with `mkswap` at boot. The post correctly warns by context that this method is for non-hibernating systems; using `swap` destroys the named partition contents at each boot.
