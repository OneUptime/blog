# Validation Summary: How to Configure Watchdog Timers in Talos Linux

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Talos Linux (`WatchdogTimerConfig`, `machine.kernel.modules`, `machine.install.extraKernelArgs`, `machine.sysctls`, `talosctl`)
- Linux kernel watchdog subsystem (`/dev/watchdog0`, `/sys/class/watchdog/`)
- Linux kernel lockup detectors (`softlockup_panic`, `hung_task_panic`, `hung_task_timeout_secs`, `watchdog_thresh`, NMI watchdog)
- `iTCO_wdt` kernel module (Intel TCO hardware watchdog)
- IPMI / BMC watchdog via `ipmitool`
- Kubernetes DaemonSet

## Sources Consulted
- [Talos `WatchdogTimerConfig` reference (v1.9)](https://www.talos.dev/v1.9/reference/configuration/runtime/watchdogtimerconfig/)
- [Talos `v1alpha1` Config reference (v1.7)](https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/) — for `machine.kernel.modules` structure
- [ipmitool source — `lib/ipmi_mc.c`](https://github.com/ipmitool/ipmitool/blob/master/lib/ipmi_mc.c) — for `mc watchdog set` option syntax
- Linux kernel documentation for soft lockup / hung task detectors and the iTCO_wdt module parameters

## Issues Found

1. **Hardware watchdog configuration used the wrong mechanism.** The original post enabled the hardware watchdog by adding `iTCO_wdt.heartbeat=30` to `machine.install.extraKernelArgs`. That only sets a default kernel-module parameter; nothing in Talos would actually open `/dev/watchdog0` or pet it on an interval, so the watchdog would simply fire after the timeout and reboot the node. Talos has a dedicated `WatchdogTimerConfig` document (separate from the main machine config, `apiVersion: v1alpha1`, `kind: WatchdogTimerConfig`, fields `device` and `timeout`) that opens the device, applies the timeout via `ioctl`, and pets it automatically. Updated both the "Enabling Hardware Watchdog" and "Configuring the Watchdog Timeout" examples to use this document.

2. **Kernel-module parameter loading.** Moved the `iTCO_wdt.nowayout=1` example from `extraKernelArgs` to `machine.kernel.modules.parameters`, which is the documented Talos API for passing parameters to specific kernel modules.

3. **Conflation of `softdog` with kernel lockup detectors.** The "Software Watchdog Configuration" section and Layer 3 of the cascade described `softlockup_panic` / `hung_task_panic` / `watchdog_thresh` as `softdog` configuration. `softdog` is a different thing — it is a kernel module that provides a `/dev/watchdog` interface in software. The sysctls and kernel args shown actually configure the in-kernel soft lockup and hung task detectors. Reworded the section header text and the cascade entry to reflect this; left the configuration values themselves alone because they are valid.

4. **Invalid `ipmitool` command syntax.** The post used `ipmitool mc watchdog set timer use 4 action 1 timeout 300` followed by `ipmitool mc watchdog set running`. The first uses an incorrect (space-separated, positional) form; the documented ipmitool syntax is `option=value` (e.g. `timeout=300 action=reset use=sms`). The second command does not exist — there is no `set running` subcommand; the watchdog is armed by `ipmitool mc watchdog reset`. Replaced both with the correct invocations.

5. **Testing example was non-functional.** The original example used `talosctl read /proc/sysrq-trigger` and a comment telling the reader to "write 'c' to trigger panic". `talosctl read` is read-only, and there is no `talosctl write` to `/proc/sysrq-trigger`, so the instruction could not actually be carried out. Rewrote the section to describe the realistic test paths (privileged in-cluster workload writing to sysrq-trigger, or pulling power for the IPMI path) and to focus on the safer verification of device state.

6. **Apply step omitted the watchdog document.** Because the watchdog config is now a separate document, added a second `talosctl apply-config` call for `talos-watchdog-config.yaml` and noted that `WatchdogTimerConfig` changes are applied at runtime (kernel args / module params still require a reboot).

## Review Notes
- The `talosctl service [<id>]` and `talosctl services` commands, the `/sys/class/watchdog/watchdog0/{status,timeout}` paths, and the `nmi_watchdog`, `softlockup_panic`, `hung_task_panic`, `hung_task_timeout_secs`, and `kernel.watchdog_thresh` sysctls/cmdline params were all verified against documentation and left as-is.
- `WatchdogTimerConfig` was introduced in the Talos v1.7 cycle; readers on older Talos releases will need to upgrade or fall back to userspace petting via a privileged workload.
- The `dontstop` flag in the corrected `ipmitool mc watchdog set` example sets the "don't stop timer on BMC init" bit, which matches the original intent of the IPMI `Timer Use` byte `0x44` that the (incorrect) previous command was trying to express.
- The IPMI DaemonSet example installs `ipmitool` via `apk add` at container start every pod restart. That is fine for demonstration but in production it is preferable to bake `ipmitool` into a custom image so that loss of registry connectivity does not break the watchdog daemon.
