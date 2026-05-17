# Validation Summary: How to Install Ubuntu Server on an IBM POWER (ppc64el) System

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Ubuntu Server 24.04 LTS (ppc64el)
- IBM POWER8 / POWER9 / POWER10 architecture
- OpenPOWER systems (Raptor Talos II, Blackbird)
- PowerVM, LPARs, HMC, IVM
- PowerNV, OPAL firmware, Petitboot bootloader
- SLOF (Slimline Open Firmware)
- PReP boot partition / GRUB on POWER
- Subiquity / cloud-init autoinstall storage schema
- KVM, libvirt, virt-install
- powerpc-utils (ppc64_cpu), numactl, hugepages

## Sources Consulted
- [Ubuntu cdimage 24.04 release directory](https://cdimage.ubuntu.com/releases/24.04/release/)
- [Ubuntu for POWER download page](https://ubuntu.com/download/server/power)
- [Netbooting the live server installer on IBM Power (ppc64el) with Petitboot](https://ubuntu.com/server/docs/install/netboot-ppc64el)
- [ppc64el/CommonQuestions — Ubuntu Wiki](https://wiki.ubuntu.com/ppc64el/CommonQuestions)
- [Phoronix: Ubuntu 22.04 LTS To Shift Its PPC64EL Baseline To POWER9 CPUs, Dropping POWER8](https://www.phoronix.com/news/Ubuntu-22.04-LTS-POWER9)
- [virt-install man page (virt-manager upstream)](https://github.com/virt-manager/virt-manager/blob/main/man/virt-install.rst)
- [OPAL Specification — skiboot docs](https://open-power.github.io/skiboot/doc/opal-spec.html)
- IBM HMC reference for `mksyscfg`, `mkvopt`, `chhwres` command syntax

## Issues Found
1. **POWER8 support claim was incomplete.** The post said "Ubuntu 14.04+" for POWER8, but Canonical shifted the ppc64el baseline to POWER9 in Ubuntu 22.04, so POWER8 cannot run the 24.04 ISO downloaded later in the post. Updated the POWER8 bullet to note that support ended at 20.04 LTS.
2. **"Two contexts" listed three items.** The Virtualization Environments section opened with "POWER systems commonly run in two contexts" but enumerated three bullets, and the third bullet ("PowerVM virtual machines through HMC") was just a management surface for the first bullet. Merged the HMC note into the PowerVM LPAR bullet so the count matches.
3. **ISO filename used a non-existent version-less name.** `ubuntu-24.04-live-server-ppc64el.iso` is not the actual filename on cdimage; the published image is `ubuntu-24.04.4-live-server-ppc64el.iso`. Updated the `wget` URL accordingly and added a note to bump the point release as new ones ship.
4. **"UEFI-Based POWER Systems" section overstated UEFI adoption.** POWER hardware boots via SLOF (PowerVM) or OPAL/Petitboot (PowerNV); standard UEFI is not the firmware on POWER9/POWER10 servers. Rewrote the section as "Detecting the Active Firmware" — kept the `/sys/firmware/efi` check, removed the inaccurate claim that POWER9/POWER10 increasingly support UEFI, and reflected that the PReP layout shown earlier is the normal case.
5. **PowerNV disk layout incorrectly showed a UEFI/EFI variant.** PowerNV does not boot via UEFI, so the "With UEFI support" layout was misleading. Removed the EFI variant and kept the correct PReP + /boot + / layout.
6. **`virt-install --os-type linux` is deprecated.** The `--os-type` flag has been removed/deprecated in modern virt-install; `--os-variant`/`--osinfo` is now the canonical way to specify the guest OS. Replaced `--os-type linux --os-variant ubuntu24.04` with `--osinfo ubuntu24.04`.
7. **`kvm-ok` was used without installing the package that ships it.** `kvm-ok` lives in the `cpu-checker` package, not `qemu-kvm`. Added `cpu-checker` to the `apt install` line.

## Review Notes
- The HMC command examples (`mksyscfg`, `mkvopt`, `chhwres`) use real flag syntax and reasonable defaults; minimum proc units of `0.1` is conservative-but-safe (POWER7+ supports 0.05, but 0.1 works everywhere).
- The PReP partition type ID `0x41` and subiquity/curtin `flag: prep` are both correct.
- `dpkg --print-architecture` correctly outputs `ppc64el` while `uname -m` outputs `ppc64le` — the asymmetric naming is intentional (Debian vs. kernel convention) and the post handles it correctly.
- The `apt-cache show <pkg> | grep -A 2 "Package:"` recipe in the "Package Availability" section is weak: `apt-cache madison <pkg>` or `rmadison <pkg>` is more authoritative for per-architecture availability. Left as-is since it still produces useful output and the post also points readers to Launchpad.
- POWER10 has experimental UEFI work in the wider ecosystem (e.g., TianoCore ports on top of OPAL), but it is not the shipping default on enterprise POWER hardware, which is why the section was rewritten to focus on firmware detection rather than implying UEFI is a normal install path.
