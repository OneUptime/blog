# Validation Summary: How to Use Ansible to Configure Secure Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- UEFI Secure Boot
- Linux kernel module signing
- Machine Owner Keys (MOK)
- DKMS
- mokutil, sbverify, OpenSSL, efivar

## Sources Consulted
- Ansible built-in module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/
- OpenSSL req and x509 command help from the local OpenSSL 3.0.13 installation
- mokutil command help from the local mokutil installation
- sbverify command help from the local sbsigntool installation
- Linux kernel module signing documentation: https://www.kernel.org/doc/html/v5.15/admin-guide/module-signing.html
- Debian DKMS source showing supported framework.conf signing variables: https://sources.debian.org/src/dkms/3.0.10-8%2Bdeb12u1/dkms.in
- Debian Secure Boot documentation: https://wiki.debian.org/SecureBoot
- Ubuntu Secure Boot documentation: https://documentation.ubuntu.com/security/docs/security-features/platform-protections/secure-boot/
- Microsoft Secure Boot documentation for PK, KEK, db, and dbx behavior: https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/oem-secure-boot

## Issues Found
- The Platform Key and Key Exchange Key descriptions were oversimplified. Updated them to describe PK as authorizing KEK changes and KEK as authorizing signature and revocation database updates.
- The MOK key count matched only lines beginning with `SHA1`, which can miss other fingerprint labels. Changed the filter to count lines containing `Fingerprint:`.
- The package installation examples omitted tools and kernel header/development packages needed by later commands. Added `openssl` and the matching Linux header/development package entries.
- The OpenSSL key generation command used `-nodes`, which is deprecated in OpenSSL 3. Replaced it with `-noenc`.
- The module signing playbook used a Debian/Ubuntu-specific `sign-file` path. Changed it to `/lib/modules/{{ ansible_kernel }}/build/scripts/sign-file`, which is the standard kernel build symlink path used across distributions when headers are installed.
- The DKMS auto-signing example used a `POST_BUILD` hook in `/etc/dkms/framework.conf`, but DKMS supports signing through `mok_signing_key` and `mok_certificate` framework variables. Replaced the hook with those variables.
- The GRUB verification example used a hard-coded certificate path that is not generally present and would report invalid results on many systems. Changed it to use `sbverify --list` to report whether embedded signatures are present at the configured EFI path.

## Review Notes
The examples remain distribution-sensitive. Ubuntu, Debian, RHEL-family systems, Fedora, and vendor images can differ in shim paths, DKMS behavior, package names, and Secure Boot policy. The post now avoids the most brittle incorrect assumptions, but production automation should still parameterize EFI loader paths and test each target distribution.
