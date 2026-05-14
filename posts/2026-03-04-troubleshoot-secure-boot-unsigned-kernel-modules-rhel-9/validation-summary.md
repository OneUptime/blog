# Validation Summary: How to Troubleshoot Secure Boot Failures with Unsigned Kernel Modules on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- UEFI Secure Boot
- Linux kernel module signing
- Machine Owner Key (MOK)
- mokutil
- DKMS
- OpenSSL

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Signing a kernel and modules for Secure Boot": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/signing-a-kernel-and-modules-for-secure-boot_assembly_managing-kernel-command-line-parameters-with-uki
- DKMS project documentation, "Module signing" and "Secure Boot": https://github.com/dkms-project/dkms
- Local `mokutil --help` output for supported options including `--import`, `--list-enrolled`, `--list-new`, and `--sb-state`.
- Local `openssl req -help` output for `-x509`, `-outform`, and `-addext` option support.

## Issues Found
- The OpenSSL certificate generation command did not request the Code Signing extended key usage. I added `-addext "extendedKeyUsage=codeSigning"` so the generated certificate is compatible with systems that validate the code-signing EKU for module signatures.
- The DKMS automation section used the older `sign_tool` helper approach. I replaced it with the current DKMS signing configuration variables: `mok_signing_key`, `mok_certificate`, and `sign_file`.
- The certificate expiration section implied that an expired certificate simply requires re-signing existing modules. I changed it to match RHEL 9 behavior: modules must be signed within the certificate validity period, and `sign-file` does not warn when validity dates are wrong.

## Review Notes
The core RHEL 9 Secure Boot flow is accurate: externally built modules must be signed with a trusted key, `mokutil --import` queues MOK enrollment, MokManager completes enrollment at reboot, and `/usr/src/kernels/$(uname -r)/scripts/sign-file` appends module signatures. The examples assume `kernel-devel`, `mokutil`, and OpenSSL are installed and that the module path matches the third-party package layout.
