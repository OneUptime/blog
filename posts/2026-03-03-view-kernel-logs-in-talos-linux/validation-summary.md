# Validation Summary: How to View Kernel Logs in Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- talosctl
- Linux kernel logs and dmesg
- Kubernetes node memory troubleshooting
- Talos machine configuration

## Sources Consulted
- Sidero Labs Talos Linux logging documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/logging-and-telemetry/logging
- Sidero Labs talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero Labs KmsgLogConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/runtime/kmsglogconfig
- Linux kernel printk documentation: https://www.kernel.org/doc/html/latest/core-api/printk-basics.html
- Linux kernel command-line parameter documentation: https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html

## Issues Found
- The post stated that `machine.logging.destinations` forwards all machine logs including kernel messages. Talos documentation distinguishes service log destinations from kernel log delivery, so the example was changed to use `KmsgLogConfig` and the surrounding explanation now notes that `machine.logging.destinations` is for service logs.
- The post said dmesg severity levels appear in the timestamp area. Talos dmesg output prefixes messages with facility and severity before the timestamp, so the wording was corrected.
- The OOM guidance implied every OOM kill means the whole node lacks memory and suggested reducing pod resource requests. This was corrected to account for node memory pressure or workload memory cgroup limits, and to mention workload usage and pod memory limits.
- The post said `loglevel=7` enables debug-level kernel messages and can flood the log buffer. Linux kernel documentation describes `loglevel` as controlling console output, while printk messages are written to the kernel log buffer. The explanation was corrected.

## Review Notes
The `talosctl dmesg` command and `--follow` flag match the official Talos CLI reference. Local `talosctl` was not installed in the workspace, so command verification used official Sidero Labs documentation rather than local `--help` output.
