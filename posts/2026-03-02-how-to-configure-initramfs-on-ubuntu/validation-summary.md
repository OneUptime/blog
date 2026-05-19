# Validation Summary: How to Configure initramfs on Ubuntu

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu
- Linux kernel initramfs/initrd
- initramfs-tools
- update-initramfs, mkinitramfs, lsinitramfs, unmkinitramfs
- GRUB kernel command-line configuration
- LUKS/cryptsetup
- LVM2

## Sources Consulted
- Ubuntu Manpage: update-initramfs(8): https://manpages.ubuntu.com/manpages/resolute/man8/update-initramfs.8.html
- Ubuntu Manpage: initramfs.conf(5): https://manpages.ubuntu.com/manpages/resolute/man5/initramfs.conf.5.html
- Ubuntu Manpage: initramfs-tools(7): https://manpages.ubuntu.com/manpages/resolute/man7/initramfs-tools.7.html
- Ubuntu Manpage: lsinitramfs(8): https://manpages.ubuntu.com/manpages/resolute/man8/lsinitramfs.8.html
- Ubuntu Manpage: unmkinitramfs(8): https://manpages.ubuntu.com/manpages/resolute/man8/unmkinitramfs.8.html
- Ubuntu Manpage: crypttab(5): https://manpages.ubuntu.com/manpages/jammy/man5/crypttab.5.html
- Local Ubuntu/Debian man pages for update-initramfs(8), initramfs.conf(5), initramfs-tools(7), mkinitramfs(8), lsinitramfs(8), and unmkinitramfs(8)
- Local initramfs-tools hook-functions implementation at /usr/share/initramfs-tools/hook-functions
- Ubuntu package metadata for cryptsetup-initramfs and lvm2

## Issues Found
- The post said `sudo update-initramfs -u` updates the currently running kernel. According to update-initramfs(8), omitting `-k` updates the newest installed kernel by default. I changed that comment and added the correct currently-running-kernel command using `-k $(uname -r)`.
- The post described `update-initramfs -u -k all` as updating all installed kernels. For update mode, `all` applies to installed kernels that already have an initramfs. I clarified the comment.
- The `MODULES` setting was labeled as "Boot type". initramfs.conf(5) defines it as the module inclusion mode, while boot type is controlled separately by `BOOT`. I corrected the wording.
- The `BOOT=local` comment said it includes NFS support. initramfs.conf(5) says `BOOT=local` boots from local media and `BOOT=nfs` is used for an NFS root. I corrected the comment.
- The boot script phase comments referred to `pivot_root`. initramfs-tools documents this stage as handing execution to the real init after moving procfs/sysfs, so I changed the wording to avoid implying a specific pivot_root mechanism.
- The GRUB debugging example edited `/etc/default/grub` but did not regenerate GRUB configuration. I added `sudo update-grub` so the edited kernel command line is applied.

## Review Notes
The rest of the commands, initramfs-tools hook and boot script structure, `copy_exec`/`copy_file` usage, breakpoints such as `break=premount`, crypttab field format, and LVM/cryptsetup package guidance were consistent with the consulted documentation. The post remains Ubuntu/initramfs-tools specific; systems using dracut or systemd-native initrd tooling may differ.
