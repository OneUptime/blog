# Validation Summary: How to Restore a RHEL System from a ReaR Rescue Image

## Status
validated

## Post Type
Tutorial / recovery guide

## Technologies Covered
- Red Hat Enterprise Linux
- Relax-and-Recover (ReaR)
- GRUB2
- SELinux
- Linux networking and filesystem recovery commands

## Sources Consulted
- Red Hat Enterprise Linux 7 System Administrator's Guide, Chapter 27, Relax-and-Recover: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-relax-and-recover_rear
- Red Hat Enterprise Linux 10 Risk reduction and recovery operations, ReaR recovery and layout documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/risk_reduction_and_recovery_operations/index
- Red Hat Enterprise Linux 10 Managing, monitoring, and updating the kernel, Reinstalling GRUB: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_monitoring_and_updating_the_kernel/reinstalling-grub
- Relax-and-Recover User Guide, Configuration: https://relax-and-recover.org/rear-user-guide/basics/configuration.html
- Relax-and-Recover rear(8) manual page: https://www.mankier.com/8/rear

## Issues Found
- The prerequisites implied that the rescue ISO must always be created with `rear mkbackup`. Updated this to allow either `rear mkbackup` or `rear mkrescue`, because ReaR distinguishes rescue image creation from backup creation depending on whether an internal or external backup method is configured.
- The recovery sequence stated that ReaR always mounts NFS/CIFS/local media and extracts an archive. Updated this to say ReaR restores from the configured backup method or prompts for restore under `/mnt/local`, matching Red Hat's documented distinction between NETFS/internal backups and other backup workflows.
- The recovery sequence stated that ReaR restores SELinux contexts. Updated this to describe SELinux relabel preparation, and added `touch /.autorelabel` inside the chroot so the restored filesystem is relabeled on first boot as Red Hat documents.
- The disk layout example omitted the `disk` keyword and partition table field used in ReaR `disklayout.conf` disk entries. Updated the example to show valid `disk /dev/sda ... msdos` lines.
- The verification step ran `grub2-install --recheck /dev/sda` from the chroot. ReaR normally handles bootloader installation during recovery, and that manual command is BIOS-disk-specific and not a portable verification step for RHEL systems. Replaced it with a read-only check for generated GRUB configuration files.

## Review Notes
- The `dd` USB example is syntactically valid and the ReaR documentation confirms ISO output names of the form `rear-$(hostname).iso`; administrators should still verify the target block device before running it.
- The service checks are examples and may need to be changed for systems that do not run `sshd` or `firewalld`.
