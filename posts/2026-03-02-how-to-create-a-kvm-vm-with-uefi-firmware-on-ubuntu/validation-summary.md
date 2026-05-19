# Validation Summary: How to Create a KVM VM with UEFI Firmware on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- KVM
- QEMU
- libvirt
- virt-install
- OVMF / EDK II UEFI firmware
- UEFI Secure Boot
- swtpm / virtual TPM
- Windows 11 VM requirements

## Sources Consulted
- libvirt Domain XML format: https://www.libvirt.org/formatdomain
- libvirt Secure Boot knowledge base: https://libvirt.org/kbase/secureboot.html
- virt-install manual page: https://www.mankier.com/1/virt-install
- Ubuntu 24.04 ovmf package file list: https://packages.ubuntu.com/noble/all/ovmf/filelist
- Ubuntu 22.04 ovmf package file list: https://packages.ubuntu.com/jammy/all/ovmf/filelist
- Microsoft Windows 11 requirements: https://learn.microsoft.com/en-us/windows/whats-new/windows-11-requirements

## Issues Found
- The post used `OVMF_CODE.fd` and `OVMF_VARS.fd` as the expected OVMF files, but Ubuntu 24.04's `ovmf` package ships the current 4 MB firmware names (`OVMF_CODE_4M.fd` and `OVMF_VARS_4M.fd`). Updated the examples and XML output to use the Ubuntu 24.04-compatible filenames.
- The Secure Boot examples referenced `OVMF_VARS.secboot.fd`, which is not present in the Ubuntu 24.04 `ovmf` package. Updated Secure Boot examples to use `OVMF_CODE_4M.secboot.fd` with `OVMF_VARS_4M.ms.fd`, the enrolled Microsoft-key variable template available in Ubuntu.
- The `virt-install` Secure Boot option was written as `loader.secure=yes`. Current `virt-install` documentation and examples use `loader_secure=yes` for this boot suboption. Updated the commands accordingly.
- The Secure Boot explanation said `loader.secure=yes` enables enforcement mode. libvirt documents the loader `secure` attribute as indicating Secure Boot capability, while enforcement depends on enrolled keys in the variable store. Updated the explanation to distinguish firmware capability from the enrolled-key template.
- The post used `virsh vncdisplay` while describing a VNC/SPICE port. Replaced it with `virsh domdisplay`, which reports the graphical display URI for the domain and is appropriate for VNC or SPICE.

## Review Notes
The remaining commands and claims are broadly consistent with libvirt, virt-install, Ubuntu packaging, and Microsoft Windows 11 requirements. The exact OVMF file names can vary by Ubuntu release and distribution, so future updates should re-check the host distribution's `ovmf` package file list before publishing command examples.
