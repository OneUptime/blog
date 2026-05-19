# Validation Summary: How to Configure Kernel Samepage Merging (KSM) on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ubuntu
- Linux Kernel Samepage Merging (KSM)
- KVM/QEMU virtualization
- Linux sysfs
- systemd services
- Bash shell commands

## Sources Consulted
- Linux kernel KSM administrator documentation: https://docs.kernel.org/admin-guide/mm/ksm.html
- Linux kernel sysfs KSM ABI documentation: https://docs.kernel.org/next/admin-guide/abi-testing-files.html
- Linux `madvise(2)` manual page: https://www.man7.org/linux/man-pages/man2/madvise.2.html
- QEMU user documentation for memory backend `merge` / `MADV_MERGEABLE`: https://www.qemu.org/docs/master/system/qemu-manpage.html
- Linux `/proc/PID/smaps` / `VmFlags` documentation: https://www.man7.org/linux/man-pages/man5/proc_pid_smaps.5.html
- libvirt domain XML documentation for disabling shared pages with `<nosharepages/>`: https://www.libvirt.org/formatdomain

## Issues Found
- The post calculated KSM memory savings as `(pages_sharing - pages_shared) * page_size`. The kernel documentation defines `pages_sharing` as the additional sharing sites, which is already the saved-page count. Updated all savings formulas to use `pages_sharing * page_size`.
- The `pages_shared` and `pages_sharing` comments were misleading. Updated them to distinguish shared KSM pages from additional mappings sharing those pages.
- The default `sleep_millisecs` value was listed as `200ms`. The kernel documentation lists the default as `20ms`. Updated the default.
- The persistence example used `kernel.mm.ksm.*` sysctl keys, but KSM is controlled through `/sys/kernel/mm/ksm/`, not documented sysctl keys. Replaced the sysctl and `rc.local` example with a systemd service that writes the sysfs settings at startup.
- The QEMU/KVM description said KVM automatically marks guest memory as mergeable. Updated the wording to say QEMU/KVM can mark guest RAM as mergeable, matching QEMU's documented memory merge option.
- The verification command searched `/proc/<pid>/maps` for `MADV_MERGEABLE`, but `maps` does not show madvise flags. Replaced it with a `/proc/<pid>/smaps` check for the `mg` VmFlags flag, which is documented as the mergeable advise flag.
- The `max_page_sharing` tuning note incorrectly implied one write could cause many COW faults. Updated the note to describe the deduplication and latency tradeoff more accurately.
- The UKSM section described UKSM as "User-space KSM" and implied Ubuntu patches include it. Updated this to describe UKSM as an alternative KSM implementation found in third-party kernels.
- The closing memory-savings examples were overly specific without source context. Reworded them to a conditional statement that savings can reach gigabytes depending on guest count, contents, workload activity, and tuning.

## Review Notes
The remaining examples are shell snippets that assume KSM is enabled in the running kernel and that the commands are executed with root privileges where sysfs writes are required. The post now avoids unsupported sysctl configuration and uses the documented KSM sysfs interface.
