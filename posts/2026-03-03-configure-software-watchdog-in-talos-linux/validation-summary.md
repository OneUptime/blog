# Validation Summary: How to Configure Software Watchdog in Talos Linux

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Talos Linux (machine config: `machine.sysctls`, `machine.install.extraKernelArgs`, `machine.kernel.modules`)
- Linux kernel watchdog subsystem (soft lockup, hard lockup, hung task detection)
- `softdog` kernel module
- `talosctl` CLI (`apply-config`, `reboot`, `dmesg`, `read`)
- sysctl kernel parameters (`kernel.softlockup_panic`, `kernel.watchdog_thresh`, `kernel.hung_task_*`, `kernel.panic*`)

## Sources Consulted
- Talos v1alpha1 config reference: https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config/
- Talos kernel build config: https://raw.githubusercontent.com/siderolabs/pkgs/main/kernel/build/config-amd64
- Talos "Customizing the Kernel" guide: https://docs.siderolabs.com/talos/v1.9/build-and-extend-talos/customizing-the-kernel
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.8/reference/cli/
- Linux kernel sysctl docs: https://www.kernel.org/doc/Documentation/admin-guide/sysctl/kernel.rst
- Linux lockup-watchdogs docs: https://www.kernel.org/doc/Documentation/admin-guide/lockup-watchdogs.rst
- Linux watchdog-parameters docs: https://www.kernel.org/doc/Documentation/watchdog/watchdog-parameters.txt

## Issues Found
1. **softdog module not available in default Talos kernel.** The post described loading the `softdog` module via `machine.kernel.modules` as if it were always available. Verification of the Talos kernel build config at `siderolabs/pkgs` shows `# CONFIG_SOFT_WATCHDOG is not set`, so the module is not shipped in the stock Talos kernel. Added a caveat noting that the user must build a custom kernel or supply the module via a system extension before the configuration will work.

2. **Incorrect comment on `kernel.hung_task_warnings`.** The original comment described the value as "Max warnings before panic," which is wrong. Per the kernel sysctl docs, this value is a rate-limit on the number of warnings printed — it does not trigger a panic (panics are governed by `hung_task_panic`). Updated the comment to "Max warnings to print (rate-limit)."

## Review Notes
- The threshold formula explanation (`soft lockup = 2 * watchdog_thresh`, `hard lockup = watchdog_thresh`) is a commonly used simplification. In practice the NMI-based hard lockup detector's worst-case detection window can be slightly longer than `watchdog_thresh`, but the post's framing is consistent with the kernel's `lockup-watchdogs` documentation and is acceptable.
- All sysctl parameter names, softdog module parameters (`soft_margin`, `nowayout`), kernel command-line args (`nmi_watchdog`, `panic`, `softlockup_panic`), and `talosctl` invocations were verified as correct.
- `nmi_watchdog=0` for VMs is a reasonable recommendation since NMI watchdog relies on hardware PMU counters that are not always reliably virtualized.
