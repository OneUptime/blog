# Validation Summary: How to Install Ubuntu Server on an ARM64 (AArch64) Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server 24.04 LTS (ARM64 / AArch64)
- AWS EC2 Graviton (t4g instance family)
- Hetzner Cloud (cax11 Ampere Altra server type, hcloud CLI)
- Oracle Cloud Infrastructure (VM.Standard.A1.Flex / Ampere A1)
- Raspberry Pi 5 (preinstalled image)
- QEMU / KVM (qemu-system-aarch64, AAVMF UEFI firmware)
- qemu-user-static + binfmt-support for cross-arch emulation
- GRUB (grubaa64.efi)
- EDK2 UEFI firmware for ARM boards
- npm cross-arch builds

## Sources Consulted
- Ubuntu cdimage release index: https://cdimage.ubuntu.com/releases/24.04/release/
- Ubuntu ARM64 documentation: https://ubuntu.com/download/server/arm
- Canonical Ubuntu on Raspberry Pi: https://ubuntu.com/raspberry-pi
- AWS EC2 Graviton instance docs (t4g family): https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html
- Canonical AWS AMI naming (`ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*`): https://cloud-images.ubuntu.com/locator/ec2/
- Hetzner Cloud server types (cax11 = Ampere Altra, 2 vCPU / 4 GB): https://docs.hetzner.com/cloud/servers/overview
- hcloud CLI reference (`server create`, `--type`, `--image`, `--ssh-key`): https://github.com/hetznercloud/cli
- Oracle Cloud Always Free A1.Flex (4 OCPU / 24 GB): https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- OCI CLI `compute instance launch` reference: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/compute/instance/launch.html
- QEMU `qemu-system-aarch64` and `-machine virt` documentation: https://www.qemu.org/docs/master/system/arm/virt.html
- Ubuntu `qemu-efi-aarch64` package (AAVMF firmware at `/usr/share/AAVMF/`): https://packages.ubuntu.com/noble/qemu-efi-aarch64
- Ubuntu `qemu-system-arm` package (provides `qemu-system-aarch64`): https://packages.ubuntu.com/noble/qemu-system-arm
- Tianocore EDK2 / pftf RPi UEFI projects: https://github.com/pftf/RPi4 and https://github.com/worproject/rpi5-uefi
- npm config `arch` option: https://docs.npmjs.com/cli/v10/using-npm/config#arch
- Ubuntu binfmt-support + qemu-user-static docs: https://wiki.ubuntu.com/ARM64/QemuUserStatic

## Issues Found
- **Inline shell comment broke a backslash line-continuation in the Hetzner example.** The original `--type cax11 \    # Ampere Altra-based server type` is not a valid bash continuation: the `\` escapes the trailing space, the `#` then starts a comment that consumes the newline, so the next argument never reaches the command. I verified the failure mode in a local bash shell. Fix: moved the annotation to a standalone comment line above the command so the continuation works correctly.

## Review Notes
- The download URLs use the unversioned filenames (e.g. `ubuntu-24.04-live-server-arm64.iso`, `ubuntu-24.04-preinstalled-server-arm64+raspi.img.xz`). Canonical generally publishes point-release filenames (e.g. `ubuntu-24.04.2-live-server-arm64.iso`) and maintains the unversioned URLs as convenience symlinks; this works today but may break for a future point release if the symlink lapses. Not changed.
- The QEMU install command includes `ovmf`, which is the x86_64 UEFI firmware package and is not required for ARM64 VMs (the ARM firmware comes from `qemu-efi-aarch64`). It is harmless but unnecessary; left as-is to avoid scope creep.
- Under "Kernel and Hardware Support" the comment "Check available CPU performance counters" precedes `ls /sys/devices/system/cpu/cpu0/cpufreq/`, which actually lists CPU frequency scaling files, not performance counters. The command itself is valid and useful; the comment is slightly mislabeled. Left as-is since it is a wording nit, not a technical error in the command.
- `qemu-system-arm` on Ubuntu 24.04 does provide the `qemu-system-aarch64` binary, so the install command is correct even though the package name suggests 32-bit only.
- The Hetzner `cax11` type, AWS `t4g.micro`, and Oracle `VM.Standard.A1.Flex` shape with 4 OCPU / 24 GB are all correct as documented by their respective providers.
- The Raspberry Pi 5 EDK2 UEFI claim is accurate (community project `worproject/rpi5-uefi`); the post does not name it but the high-level claim that Pi 5 supports UEFI via EDK2 firmware is correct.
