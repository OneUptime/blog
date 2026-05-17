# Validation Summary: How to Use PowerTOP for Power Consumption Analysis on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PowerTOP (Intel power analysis tool)
- Ubuntu Linux
- Linux kernel power management (C-states, ASPM, ALPM, runtime PM)
- systemd (service units)
- chrony (NTP)
- Linux sysfs/procfs power management knobs (`/sys/module/snd_hda_intel`, `/sys/module/pcie_aspm`, `/sys/class/scsi_host`, `/proc/sys/vm/dirty_writeback_centisecs`)
- rfkill, Bluetooth power management
- strace (for wakeup investigation)

## Sources Consulted
- Ubuntu PowerTOP man page: https://manpages.ubuntu.com/manpages/jammy/man8/powertop.8.html
- PowerTOP upstream source: https://github.com/fenrus75/powertop
- Linux kernel VM sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Linux kernel HD audio power-saving docs: https://docs.kernel.org/sound/designs/powersave.html
- Ubuntu SATA ALPM wiki: https://wiki.ubuntu.com/Kernel/PowerManagementALPM
- Red Hat ASPM documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/power_management_guide/aspm
- chrony configuration reference: https://chrony-project.org/doc/

## Issues Found
1. **Wrong unit / value for `dirty_writeback_centisecs`.** The post said "default 15 seconds, increase to 60" and ran `echo 60 | sudo tee /proc/sys/vm/dirty_writeback_centisecs`. The sysctl is in centiseconds (hundredths of a second), the kernel default is 500 (5 seconds), and PowerTOP's auto-tune sets it to 1500 (15 seconds). A value of 60 would equal 0.6 seconds — the opposite of the intent. Fixed the comment to describe the actual unit and default, and corrected the value to `1500`.

2. **Misleading chrony `makestep` reference in the "Reduce NTP poll frequency" section.** `makestep 1.0 3` controls startup clock stepping (step the clock if offset > 1s for the first 3 updates) and has nothing to do with poll interval. Removed the misleading `makestep` line; kept the `minpoll`/`maxpoll` guidance (which is the actual mechanism for reducing wakeups) and added a brief note that these are powers of 2 seconds.

## Review Notes
- PowerTOP CLI flags (`--version`, `--auto-tune`, `--calibrate`, `--html=`, `--csv=`, `--time=`) are all valid per the upstream man page.
- The systemd unit path `/usr/sbin/powertop` is correct for the Ubuntu package.
- `med_power_with_dipm` is a valid SATA ALPM policy; it's the kernel default on recent kernels (6.x), so writing it may be a no-op on newer systems but is harmless.
- `snd_hda_intel` `power_save` value of `1` sets a 1-second idle timeout before powering down the codec, which is correct.
- `pcie_aspm` policy `powersave` is valid (alternatives: `default`, `performance`, `powersupersave`).
- The example output blocks in the "Tab" sections are illustrative rather than exact reproductions of PowerTOP output — that's fine for a tutorial.
