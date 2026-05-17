# Validation Summary: How to Use Clevis for Automated LUKS Unlocking on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Clevis (pluggable LUKS decryption framework)
- LUKS / LUKS2 (Linux Unified Key Setup)
- cryptsetup
- TPM 2.0 (Trusted Platform Module, PCRs)
- Tang (network-bound disk encryption server)
- Shamir Secret Sharing (SSS pin)
- initramfs / update-initramfs
- Ubuntu apt package management

## Sources Consulted
- UAPI Group Linux TPM PCR Registry — https://uapi-group.org/specifications/specs/linux_tpm_pcr_registry/
- TCG PC Client Platform Firmware Profile Specification — https://trustedcomputinggroup.org/wp-content/uploads/TCG_PCClient_PFP_r1p05_05_3feb20.pdf
- Linux kernel sysfs-class-tpm ABI documentation — https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-tpm
- Ubuntu `clevis-tpm2` package (Noble) — https://launchpad.net/ubuntu/noble/amd64/clevis-tpm2
- `clevis-encrypt-sss(1)` man page — https://www.mankier.com/1/clevis-encrypt-sss
- `clevis-encrypt-tpm2(1)` man page — https://www.mankier.com/1/clevis-encrypt-tpm2
- `clevis-luks-bind(1)` / `clevis-luks-unbind(1)` / `clevis-luks-list(1)` / `clevis-luks-unlock(1)` Ubuntu manpages
- shim project documentation on MOK / PCR 14 usage

## Issues Found
- **PCR contents table contained incorrect mappings.** The original table listed PCR 14 as "UEFI drivers and applications" and PCR 8 as "Boot manager". Per the UAPI Linux TPM PCR Registry and TCG PC Client Platform Firmware Profile:
  - PCR 14 actually holds shim's MOK (Machine Owner Key) state (MokList, MokListX, MokSBState), not UEFI drivers.
  - PCR 8 is conventionally used by GRUB for commands and the kernel command line, not the boot manager binary.
  - PCR 2 is the correct PCR for UEFI drivers and option ROMs; PCR 4 is the boot loader code.

  Fixed by replacing the table with an accurate mapping that includes PCR 0, 1, 2, 4, 7, 8, and 14 with their correct descriptions. The downstream example binding to PCR 7 and PCR 14 remains valid and meaningful (PCR 14 binding catches MOK enrollment changes).

## Review Notes
- All Clevis commands (`bind`, `unbind`, `list`, `unlock`) match the documented syntax including the `-d`, `-s`, and `-n` flags.
- `clevis-tpm2` is correctly listed as a separate Ubuntu package (it is not bundled into `clevis-luks`).
- `/sys/class/tpm/tpm0/tpm_version_major` is the correct sysfs path; this attribute was added to the stable ABI in Linux 5.5, so very old kernels will not expose it — fine for any currently supported Ubuntu release.
- The SSS pin JSON structure (`t` threshold and `pins` dict with arrays of per-pin configs) is correct.
- The example output format for `clevis luks list` (`SLOT: PIN 'JSON'`) matches actual tool output.
- Tang port 7500 is used as an example; Tang has no hard-coded default port — this is fine but readers should note their own Tang deployment may use a different port (commonly 80 when run behind a reverse proxy).
- The post correctly warns that `clevis` requires LUKS2 for token metadata support and recommends always keeping a recovery passphrase in a separate slot — both important operational caveats.
