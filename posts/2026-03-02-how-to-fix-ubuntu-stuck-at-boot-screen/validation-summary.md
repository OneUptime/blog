# Validation Summary: How to Fix Ubuntu Stuck at Boot Screen

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ubuntu
- GRUB 2
- Linux kernel boot parameters
- systemd and systemctl
- initramfs-tools
- Ubuntu NVIDIA driver tooling
- fsck and filesystem recovery
- Plymouth
- APT package management

## Sources Consulted
- Ubuntu Server documentation: NVIDIA drivers installation: https://ubuntu.com/server/docs/how-to/graphics/install-nvidia-drivers/
- Ubuntu Community Help Wiki: GRUB 2: https://help.ubuntu.com/community/Grub2
- Ubuntu Community Help Wiki: GRUB 2 setup: https://help.ubuntu.com/community/Grub2/Setup
- Ubuntu manpage: update-initramfs: https://manpages.ubuntu.com/manpages/resolute/man8/update-initramfs.8.html
- Linux kernel documentation: kernel command-line parameters: https://docs.kernel.org/admin-guide/kernel-parameters.html
- systemd documentation: systemd-analyze: https://www.freedesktop.org/software/systemd/man/systemd-analyze.html
- systemd documentation: systemctl: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd documentation: systemd-fsck@.service: https://www.freedesktop.org/software/systemd/man/251/systemd-fsck%40.service.html
- Linux man-pages: fsck(8): https://man7.org/linux/man-pages/man8/fsck.8.html
- Local Ubuntu 24.04 command help/manpages for `ubuntu-drivers`, `apt`, `apt-mark`, `systemctl`, `systemd-analyze`, `fsck`, and `bootparam`.

## Issues Found
- The NVIDIA driver section used `sudo ubuntu-drivers autoinstall`, which is deprecated in current Ubuntu tooling. Changed it to `sudo ubuntu-drivers install`, matching Canonical's current documented command and local `ubuntu-drivers --help` output.
- The NVIDIA driver section advised purging `xserver-xorg-video-nouveau` as "removing the nouveau driver". That package is the Xorg Nouveau display driver, not the Nouveau kernel module itself, so the wording and command were misleading. Replaced it with `ubuntu-drivers devices` followed by `sudo ubuntu-drivers install`.
- The hardware detection command only searched for VGA controllers. Some GPU devices appear as 3D or display controllers, so changed it to `lspci | grep -Ei 'vga|3d|display'`.
- The specific NVIDIA install example used `sudo apt install nvidia-driver-535`. Canonical's current `ubuntu-drivers` documentation recommends using `ubuntu-drivers install nvidia:<version>` when selecting a branch, so changed the example to `sudo ubuntu-drivers install nvidia:535`.
- The kernel hold command used `sudo apt hold`, but `hold` is an `apt-mark` command, not an `apt` command in current Ubuntu APT. Changed it to `sudo apt-mark hold linux-image-6.8.0-50-generic`.
- The `rootdelay=30` explanation said it gives the disk extra time before the kernel gives up. The kernel documentation defines `rootdelay` as a delay before attempting to mount the root filesystem, so the sentence was corrected.

## Review Notes
The remaining commands and configuration examples are technically valid for typical modern Ubuntu systems. Some recovery details are intentionally general because device names, kernel versions, NVIDIA driver branches, Secure Boot behavior, filesystems, and enabled services vary by installation.
