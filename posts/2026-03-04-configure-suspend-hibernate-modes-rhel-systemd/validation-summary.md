# Validation Summary: How to Configure Suspend and Hibernate Modes on RHEL with systemd

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- systemd and systemctl
- systemd-logind and logind.conf
- Linux suspend, hibernate, and hybrid sleep
- Linux swap partitions and swap files
- grubby kernel arguments
- dracut initramfs regeneration

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation: Shutting down, suspending, and hibernating the system - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/using_systemd_unit_files_to_customize_and_optimize_your_system/shutting-down-suspending-and-hibernating-the-system
- systemd systemctl manual - https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd logind.conf manual - https://www.freedesktop.org/software/systemd/man/latest/logind.conf.html
- Linux kernel documentation: Using swap files with software suspend - https://docs.kernel.org/power/swsusp-and-swap-files.html
- Linux kernel documentation: Kernel command-line parameters - https://docs.kernel.org/admin-guide/kernel-parameters.html
- Local man pages for systemctl(1), logind.conf(5), and filefrag(8)

## Issues Found
- The sleep target status check omitted `hybrid-sleep.target` even though the post describes hybrid sleep as one of the supported modes. Added `hybrid-sleep.target` to the command.
- The hibernate section stated that swap must be at least as large as RAM. This is a common sizing rule, but the technical requirement is that swap be large enough for the hibernation image. Reworded the sentence to avoid overstating the requirement.
- The swap setup section was titled "Set Up a Swap Partition" while the commands create a swap file. Renamed it to "Set Up Swap Space".
- The resume-device instructions did not clearly distinguish swap partitions from swap files. Updated the commands to use `blkid` for a swap partition UUID and `findmnt -T /swapfile` for the filesystem UUID that contains a swap file.
- The swap-file resume offset must be supplied in page-size units. Updated the `filefrag` command to use `-b$(getconf PAGESIZE)` and extract the first physical offset for `resume_offset`.
- The kernel argument example always included `resume_offset`, which is only needed for swap files. Split the `grubby` examples into swap-partition and swap-file variants.

## Review Notes
The `systemctl suspend`, `systemctl hibernate`, `systemctl hybrid-sleep`, `logind.conf` lid-switch options, `/proc/acpi/wakeup` examples, `grubby --update-kernel=ALL --args=...`, and `dracut -f` usage are technically valid. Future improvements could mention `systemctl suspend-then-hibernate` and note that graphical desktop environments may override lid handling through logind inhibitors, but those additions were outside the requested correctness-only scope.
