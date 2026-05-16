# Validation Summary: How to Troubleshoot Watchdog Timer Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Linux watchdog subsystem
- Linux kernel module parameters
- Linux kernel sysctls
- IPMI serial console access

## Sources Consulted
- Talos Linux machine configuration reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux boot loader and kernel argument behavior: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/bare-metal-platforms/
- Linux kernel watchdog driver API: https://docs.kernel.org/watchdog/watchdog-api.html
- Linux kernel watchdog module parameters: https://docs.kernel.org/watchdog/watchdog-parameters.html
- Linux kernel sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/kernel.html
- Linux kernel lockup watchdog documentation: https://www.kernel.org/doc/html/v5.13/admin-guide/lockup-watchdogs.html
- Linux sysfs watchdog ABI documentation: https://docs.kernel.org/next/admin-guide/abi-testing-files.html

## Issues Found
- The post used `talosctl read /sys/class/watchdog/` to inspect a directory. Changed those examples to `talosctl list /sys/class/watchdog/`, which matches Talos CLI behavior for listing paths.
- The post implied `talosctl dmesg` could retrieve logs from before the last reboot. Clarified that `talosctl dmesg` shows the current boot and that prior-reset messages require serial/IPMI capture or remote kernel logging.
- The watchdog driver parameter examples used `.machine.install.extraKernelArgs`. Changed the `iTCO_wdt` heartbeat and nowayout examples to `machine.kernel.modules[].parameters`, which is the documented Talos mechanism for configuring module parameters and avoids bootloader-specific caveats.
- The boot-loop delay example used `panic=30` as an installer kernel argument. Changed it to the documented `kernel.panic` sysctl.
- The upgrade command pinned the old `ghcr.io/siderolabs/installer:v1.7.0` image. Updated it to `ghcr.io/siderolabs/installer:v1.12.1`, matching the Talos CLI reference consulted during review.

## Review Notes
The remaining troubleshooting guidance is broadly accurate, but hardware watchdog behavior is driver- and platform-specific. In particular, timeout ranges and BIOS/UEFI option names vary by server vendor, so operators should verify the exact driver and firmware documentation for their hardware.
