# Validation Summary: How to Enable and Configure Kernel Crash Dumps with kdump on Ubuntu

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu
- Linux kernel crash dumps
- kdump and kexec
- kdump-tools
- makedumpfile
- crash utility
- GRUB kernel parameters
- SysRq
- SSH and NFS remote dump targets

## Sources Consulted
- Ubuntu Server documentation: Kernel crash dump: https://ubuntu.com/server/docs/how-to/software/kernel-crash-dump/
- Ubuntu manpage: kdump-tools.conf(5), Noble: https://manpages.staging.ubuntu.com/manpages/noble/man5/kdump-tools.5.html
- Ubuntu manpage: kdump-config(8), Noble: https://manpages.ubuntu.com/manpages/noble/man8/kdump-config.8.html
- Ubuntu manpage: makedumpfile(8), Noble: https://manpages.ubuntu.com/manpages/noble/man8/makedumpfile.8.html
- Linux kernel documentation: kdump: https://docs.kernel.org/5.10/admin-guide/kdump/kdump.html
- Linux kernel documentation: kernel command-line parameters: https://www.kernel.org/doc/html/v4.19/admin-guide/kernel-parameters.html
- Ubuntu package metadata for kdump-tools, linux-crashdump, and makedumpfile from apt-cache

## Issues Found
- The post referred to `/etc/kdump-tools/kdump.conf` as the main Ubuntu kdump configuration file. Changed it to `/etc/default/kdump-tools`, which is the file documented by Ubuntu's kdump-tools manpage.
- The post used `crashkernel=auto`, which is not documented in the Linux kernel command-line reference used for Ubuntu. Replaced it with Ubuntu's documented range-based `crashkernel` syntax.
- The reserved-memory verification example looked for a generic "Reserving" message. Updated it to grep for `crashkernel` and describe the documented "crashkernel reserved" output.
- The configuration snippet included an unsupported `DUMP_LEVEL` variable. Updated the text to explain that dump level is passed through `MAKEDUMP_ARGS` with `-d`.
- The makedumpfile compression comment incorrectly listed `-s` for Snappy. Corrected it to `-p`.
- The post described level 31 as excluding only zero and cache pages. Updated it to include zero pages, cache pages, user data pages, and free pages, matching the makedumpfile dump-level table.
- The SysRq crash test used shell redirection commands that require a root shell. Replaced them with `sudo sysctl -w kernel.sysrq=1` and a root shell redirection command.
- The example dump contents used `dmesg.txt`; Ubuntu's documented kdump-tools output uses timestamped `dmesg.<timestamp>` files. Updated the example.
- The remote SSH configuration used unsupported `KDUMP_SSH_USER`, `KDUMP_SSH_HOST`, and `KDUMP_SSH_PORT` variables. Replaced them with Ubuntu's documented `SSH`, `SSH_KEY`, and `HOSTTAG` settings.
- The SSH key deployment example used `ssh-copy-id`; replaced it with `kdump-config propagate`, which is the kdump-tools command documented for propagating the configured kdump SSH key.
- The NFS example referred to `kdump.conf`; updated the comment to `/etc/default/kdump-tools`.
- The dump-size section suggested `MAKEDUMP_ARGS="-c -d 63"`, but makedumpfile documents 31 as the maximum dump level. Replaced it with a supported retry list example, `-d 11,31`.

## Review Notes
Ubuntu 24.10 and later can enable kdump by default on systems that meet Canonical's installer-time criteria. The post remains valid as a manual configuration guide, especially for older releases or systems where kdump was not enabled automatically.
