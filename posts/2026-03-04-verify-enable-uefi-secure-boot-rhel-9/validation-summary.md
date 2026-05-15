# Validation Summary: How to Verify and Enable UEFI Secure Boot on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- UEFI Secure Boot
- shim and GRUB2
- Linux kernel module signing
- mokutil
- pesign
- KVM/libvirt with OVMF
- VMware and Hyper-V virtual machines

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Signing a kernel and modules for Secure Boot: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/signing-a-kernel-and-modules-for-secure-boot_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation: Creating a SecureBoot virtual machine: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/securing-virtual-machines-in-rhel_configuring-and-managing-virtualization
- Microsoft Learn: Hyper-V generation 2 virtual machine security features: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/generation-2-virtual-machine-security-features
- Microsoft Learn: Should I create a generation 1 or 2 virtual machine in Hyper-V?: https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/plan/Should-I-create-a-generation-1-or-2-virtual-machine-in-Hyper-V
- Local command help output for `mokutil --help` and `modinfo --help`
- `pesign(1)` manual reference for `--show-signature` and `--in`: https://www.mankier.com/1/pesign

## Issues Found
- The `mokutil --sb-state` description was too absolute. I changed it to say the command typically returns `SecureBoot enabled` or `SecureBoot disabled`, and noted that setup-mode platform state can also be reported.
- The third-party module failure example used a message more commonly associated with permissive module signature checking and kernel tainting. I changed it to the enforced Secure Boot failure form: `Required key not available`.
- The Secure Boot logging section said blocked items show up in system logs. Firmware-level Secure Boot failures can occur before the OS can log anything, so I narrowed the statement to Secure Boot or module signature enforcement events after the kernel starts.

## Review Notes
The core RHEL 9 Secure Boot chain, `mokutil` checks, UEFI-mode verification, `pesign --show-signature` usage, MOK enrollment concept, and KVM/libvirt OVMF requirement are consistent with the consulted documentation. Future improvements could add architecture-specific paths for AArch64, but the current x86_64 examples match the post's package and path assumptions.
