# Validation Summary: How to Customize the Initramfs with dracut on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- dracut
- initramfs/initrd
- GRUB/grubby
- Linux kernel modules
- Shell scripting

## Sources Consulted
- dracut upstream manual: https://cdn.kernel.org/pub/linux/utils/boot/dracut/dracut.html
- dracut.conf(5) manual: https://man7.org/linux/man-pages/man5/dracut.conf.5.html
- Red Hat Enterprise Linux 9 kernel command-line and boot entry documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9.1 release notes for grubby `--add-kernel`, `--initrd`, `--copy-default`, and `--title` behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.1_release_notes/known-issues

## Issues Found
- The configuration snippet used `firmware_dir="/lib/firmware"`, but the documented dracut configuration option is `fw_dir+=" :<dir>[:<dir> ...] "`. Changed it to `fw_dir+=" :/lib/firmware "`.
- The hook script used `source /etc/myapp/boot-config.conf`. dracut hook examples use POSIX-style dot sourcing, which is safer because hooks are shell scripts in the initramfs environment. Changed it to `. /etc/myapp/boot-config.conf`.
- The testing section said to copy the test initramfs and create a GRUB entry, but only copied the file. Added a `grubby --add-kernel ... --initrd ... --copy-default --title ...` command so the test initramfs is actually selectable from the boot menu.
- The compression comment claimed `zstd` is fastest on RHEL. The dracut manual documents `zstd` as a supported compression value but does not substantiate that broad performance claim. Changed the comment to the neutral `Set compression algorithm`.

## Review Notes
The review environment did not have `dracut` or `lsinitrd` installed, so CLI behavior was verified against upstream dracut manuals and Red Hat documentation rather than local command output. The post remains a practical RHEL-focused tutorial after the corrections.
