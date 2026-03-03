# How to Troubleshoot Watchdog Timer Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Watchdog Timer, Troubleshooting, System Reliability, Debugging

Description: A troubleshooting guide for diagnosing and fixing watchdog timer issues on Talos Linux including false resets, module failures, and timeouts

---

Watchdog timers are supposed to be a safety net that quietly runs in the background and only activates when something goes seriously wrong. But sometimes the watchdog itself becomes the problem. False resets interrupt healthy workloads, modules fail to load, timeouts are misconfigured, or the watchdog simply does not fire when it should. Troubleshooting these issues requires understanding how the watchdog subsystem works and where things can go wrong.

This guide covers the most common watchdog timer issues on Talos Linux and how to diagnose and fix them.

## Problem 1: Watchdog Module Fails to Load

The most basic issue is the watchdog kernel module not loading at all. This means no watchdog protection is active.

### Symptoms

```bash
# No watchdog device present
talosctl read /sys/class/watchdog/ --nodes 10.0.0.1
# Empty or missing directory

# Module not in loaded list
talosctl read /proc/modules --nodes 10.0.0.1 | grep wdt
# No output
```

### Diagnosis

Check if the module is available in the kernel:

```bash
# Check kernel messages for module loading errors
talosctl dmesg --nodes 10.0.0.1 | grep -i "watchdog\|iTCO\|wdt\|softdog"

# Common error messages:
# iTCO_wdt: can't request region for resource
# iTCO_wdt: No device detected
# sp5100_tco: I/O address 0x0cd6 already in use
```

### Solutions

The module might not be configured in the Talos machine config:

```yaml
# talos-machine-config.yaml
machine:
  kernel:
    modules:
      - name: iTCO_wdt              # For Intel systems
      # OR
      - name: sp5100_tco            # For AMD systems
      # OR
      - name: softdog               # Software watchdog fallback
```

If the hardware watchdog module fails due to resource conflicts, check if another module is claiming the same I/O region:

```bash
talosctl read /proc/ioports --nodes 10.0.0.1 | grep -i tco
```

On some systems, the `iTCO_vendor_support` module must be loaded alongside `iTCO_wdt`:

```yaml
machine:
  kernel:
    modules:
      - name: iTCO_vendor_support
      - name: iTCO_wdt
```

## Problem 2: False Watchdog Resets

The watchdog is triggering reboots even though the system is functioning normally. This is the most disruptive watchdog issue.

### Symptoms

- Nodes randomly reboot without any visible workload issues
- Reboots correlate with high CPU load periods
- Kernel logs show watchdog panic messages before reboot

### Diagnosis

Check the kernel logs from before the last reboot:

```bash
# Check for soft lockup messages
talosctl dmesg --nodes 10.0.0.1 | grep -i "soft lockup"

# Example:
# watchdog: BUG: soft lockup - CPU#7 stuck for 23s! [my-process:12345]
```

A soft lockup message means a CPU core was busy executing kernel code for longer than the threshold. This is not always a real problem. It can happen during:

- Heavy I/O operations (especially with slow storage)
- Memory pressure causing extensive page reclaim
- Large slab cache operations
- Module loading/unloading
- Firmware interactions (especially on ACPI-heavy systems)

### Solutions

Increase the watchdog threshold to reduce false positives:

```yaml
# talos-machine-config.yaml
machine:
  sysctls:
    # Increase from default 10 to 30 seconds
    kernel.watchdog_thresh: "30"

    # Increase hung task timeout
    kernel.hung_task_timeout_secs: "300"
```

If the soft lockups are caused by I/O operations, tune the dirty page settings to reduce I/O pressure:

```yaml
machine:
  sysctls:
    vm.dirty_ratio: "10"
    vm.dirty_background_ratio: "5"
    vm.dirty_expire_centisecs: "3000"
```

For systems where the false positives cannot be eliminated, you can make the watchdog warn without panicking:

```yaml
machine:
  sysctls:
    kernel.softlockup_panic: "0"        # Warn only, don't panic
    kernel.hung_task_panic: "0"         # Warn only, don't panic
```

This sacrifices automatic recovery for stability, so only use this approach if you have other monitoring in place.

## Problem 3: Watchdog Not Firing When It Should

The opposite problem - the system hangs but the watchdog does not trigger a reboot.

### Symptoms

- A node becomes completely unresponsive
- The node stays in NotReady state indefinitely
- No reboot occurs, requiring manual power cycle

### Diagnosis

This usually means one of:

1. The watchdog is not enabled at all
2. The watchdog timeout is too long
3. Something is still petting the watchdog even though the system is hung
4. The BIOS has the watchdog disabled

```bash
# After manual recovery, check if watchdog was active
talosctl dmesg --nodes 10.0.0.1 | grep -i watchdog

# Check the watchdog device status
talosctl read /sys/class/watchdog/watchdog0/status --nodes 10.0.0.1
talosctl read /sys/class/watchdog/watchdog0/timeout --nodes 10.0.0.1
```

### Solutions

Verify the watchdog is properly configured and the `nowayout` flag is set:

```yaml
machine:
  install:
    extraKernelArgs:
      - iTCO_wdt.heartbeat=60
      - iTCO_wdt.nowayout=1            # Critical: prevent watchdog from stopping
```

Check BIOS settings. Some servers require the watchdog to be explicitly enabled in the BIOS/UEFI:

```
BIOS Settings to verify:
- OS Watchdog Timer: Enabled
- Watchdog Timer Action: Reset
- TCO Timer: Enabled
```

Add an IPMI watchdog as a backup layer:

```yaml
# Deploy IPMI watchdog DaemonSet as backup
# See the hardware watchdog guide for details
```

## Problem 4: Watchdog Timeout Too Short for Maintenance Operations

Certain operations like system upgrades, kernel module loading, or large etcd snapshots can briefly block the system. If the watchdog timeout is shorter than these operations, it triggers an unnecessary reboot.

### Symptoms

- Reboots during Talos upgrades
- Reboots during etcd maintenance
- Reboots during heavy pod scheduling

### Solutions

Increase the timeout to accommodate maintenance operations:

```yaml
machine:
  install:
    extraKernelArgs:
      - iTCO_wdt.heartbeat=120          # 2 minutes instead of 1
  sysctls:
    kernel.hung_task_timeout_secs: "300" # 5 minutes for hung task
```

For scheduled maintenance, consider temporarily adjusting the watchdog. With Talos, you can apply a config change that increases the timeout before maintenance and revert after:

```bash
# Apply a maintenance-friendly config
talosctl apply-config --nodes 10.0.0.1 --file maintenance-config.yaml

# Perform maintenance
talosctl upgrade --nodes 10.0.0.1 --image ghcr.io/siderolabs/installer:v1.7.0

# Revert to normal config after maintenance
talosctl apply-config --nodes 10.0.0.1 --file production-config.yaml
```

## Problem 5: Multiple Watchdog Conflicts

Having both hardware and software watchdog modules loaded can sometimes cause conflicts where they compete for the `/dev/watchdog` device.

### Symptoms

```bash
# Kernel log shows conflict
talosctl dmesg --nodes 10.0.0.1 | grep watchdog
# softdog: watchdog already in use
# OR
# iTCO_wdt: cannot register miscdev on minor=130 (err=-16)
```

### Solutions

Only load one watchdog module for the `/dev/watchdog` device. If hardware watchdog is available, prefer it over softdog:

```yaml
# Use hardware watchdog when available
machine:
  kernel:
    modules:
      - name: iTCO_wdt               # Hardware watchdog takes priority
      # Do NOT load softdog simultaneously
```

If you need both for different purposes, use the secondary watchdog device:

```yaml
# The first module gets /dev/watchdog0
# The second module gets /dev/watchdog1
machine:
  kernel:
    modules:
      - name: iTCO_wdt               # Gets /dev/watchdog0
      - name: softdog                 # Gets /dev/watchdog1
```

## Problem 6: Watchdog Causing Boot Loops

If a node reboots and the same problem that triggered the watchdog is still present, the node will boot, hang, get rebooted by the watchdog, and repeat indefinitely.

### Symptoms

- Node keeps rebooting in a cycle
- Node never reaches Ready state
- Node health checks keep failing

### Solutions

Add a boot delay to break the loop and give the system time to stabilize:

```yaml
machine:
  install:
    extraKernelArgs:
      - panic=30                      # Wait 30 seconds before rebooting on panic
```

Investigate the root cause from the kernel logs. Use a serial console or IPMI console to capture the panic messages during the boot loop:

```bash
# Connect to serial console via IPMI
ipmitool -H bmc-ip -U admin -P password sol activate
```

## Diagnostic Checklist

When troubleshooting watchdog issues, work through this checklist:

```bash
# 1. Is the watchdog module loaded?
talosctl read /proc/modules --nodes NODE | grep -i wdt

# 2. Is the watchdog device present?
talosctl dmesg --nodes NODE | grep -i "watchdog.*initialized"

# 3. What is the current timeout?
talosctl read /sys/class/watchdog/watchdog0/timeout --nodes NODE

# 4. Is nowayout enabled?
talosctl dmesg --nodes NODE | grep -i "nowayout"

# 5. Are there any error messages?
talosctl dmesg --nodes NODE | grep -iE "watchdog|lockup|hung_task|panic"

# 6. What are the current sysctl values?
talosctl read /proc/sys/kernel/softlockup_panic --nodes NODE
talosctl read /proc/sys/kernel/hung_task_timeout_secs --nodes NODE
talosctl read /proc/sys/kernel/watchdog_thresh --nodes NODE
```

## Conclusion

Watchdog timer issues on Talos Linux usually fall into two categories: the watchdog not working when it should, or working when it should not. Both require systematic diagnosis starting with module loading, device presence, and timeout configuration. The key is finding the right balance between fast failure detection and avoiding false positives. Use the diagnostic checklist to quickly identify the root cause, and always test watchdog changes in a staging environment before rolling them out to production.
