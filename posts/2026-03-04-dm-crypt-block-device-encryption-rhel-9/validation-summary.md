# Validation Summary: How to Configure dm-crypt for Low-Level Block Device Encryption on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL 9
- dm-crypt
- LUKS and LUKS2
- cryptsetup
- dm-integrity
- dmsetup
- systemd crypttab
- Linux swap and filesystems

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Encrypting block devices using LUKS": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/encrypting-block-devices-using-luks_security-hardening
- cryptsetup-open(8) manual page: https://www.man7.org/linux/man-pages/man8/cryptsetup-loopaesOpen.8.html
- cryptsetup(8) manual page: https://man.he.net/man8/cryptsetup
- systemd crypttab(5) manual page: https://man7.org/linux/man-pages/man5/crypttab.5@@systemd.html
- Linux kernel dm-crypt documentation: https://www.kernel.org/doc/html/latest/admin-guide/device-mapper/dm-crypt.html
- cryptsetup 2.0 release notes for LUKS2 authenticated encryption example: https://gitlab.com/cryptsetup/cryptsetup/-/blob/main/docs/v2.0.0-ReleaseNotes

## Issues Found
- The integrity protection example used `cryptsetup open --type plain --integrity aead`, but `--integrity` is a LUKS2 formatting option in cryptsetup, and authenticated encryption with dm-integrity is managed as a LUKS2 device stack. Changed the section title and commands to use `cryptsetup luksFormat --type luks2 --integrity aead`, followed by `cryptsetup open`.

## Review Notes
- The plain-mode dm-crypt examples, key-file usage, encrypted swap flow, crypttab options, `dmsetup` table syntax, and status/benchmark commands are technically consistent with the referenced documentation.
- Authenticated encryption support in cryptsetup documentation is still described as experimental and has operational limitations such as no discard/TRIM support in that mode.
