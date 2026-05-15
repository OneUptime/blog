# Validation Summary: How to Enable Secure Boot for RHEL Virtual Machines in Hyper-V

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 8 and 9
- Microsoft Hyper-V Generation 2 virtual machines
- UEFI Secure Boot
- PowerShell Hyper-V cmdlets
- shim, GRUB2, MOK, mokutil, pesign
- Linux kernel module signing

## Sources Consulted
- Microsoft Learn: Hyper-V Generation 2 virtual machine security features, including Secure Boot templates: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/generation-2-virtual-machine-security-features
- Microsoft Learn: Set-VMFirmware Hyper-V PowerShell cmdlet: https://learn.microsoft.com/powershell/module/hyper-v/set-vmfirmware
- Red Hat Documentation: RHEL 9, Signing a kernel and modules for Secure Boot: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/signing-a-kernel-and-modules-for-secure-boot_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Documentation: RHEL 8, Signing a kernel and modules for Secure Boot: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/signing-a-kernel-and-modules-for-secure-boot_managing-monitoring-and-updating-the-kernel
- Red Hat Customer Portal: UEFI Secure Boot revocation and shim behavior: https://access.redhat.com/articles/5991201
- Local mokutil help output for supported options, including `--sb-state` and `--import`
- Local OpenSSL help output for `openssl req` options

## Issues Found
- The boot chain incorrectly said Hyper-V UEFI firmware verifies GRUB2 directly. I changed this to say firmware verifies the Microsoft-signed shim bootloader, then shim verifies GRUB2, and GRUB2 verifies the Linux kernel. This matches Red Hat's Secure Boot chain documentation.
- The `od ... | tail -1` SecureBoot EFI variable check did not reliably return only the variable value byte; it could return the whole output line. I changed it to `awk '{print $NF}'` so the command prints the final byte, where `1` means enabled and `0` means disabled.
- The signature verification comment referred generically to "the bootloader" while the command checks `/boot/efi/EFI/redhat/shimx64.efi`. I changed the comment to identify shim specifically.

## Review Notes
- The PowerShell `Set-VMFirmware` usage and `MicrosoftUEFICertificateAuthority` Secure Boot template are consistent with Microsoft Hyper-V documentation for Linux Generation 2 VMs.
- The `mokutil --import`, `mokutil --sb-state`, `pesign -S -i`, and `sign-file` usage are consistent with the documented Secure Boot and module-signing workflow.
- Red Hat's documented key generation workflow uses `efikeygen` and the pesign NSS database, while the post uses an OpenSSL-generated X.509 key pair. The OpenSSL approach is common and compatible with `mokutil` and `sign-file`; for stricter RHEL operational alignment, a future post could mention the Red Hat-documented `efikeygen` path.
