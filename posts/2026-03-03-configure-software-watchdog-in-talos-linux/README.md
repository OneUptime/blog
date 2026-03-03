# How to Configure Software Watchdog in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Software Watchdog, Kernel Monitoring, System Reliability, Linux Kernel

Description: How to configure the Linux software watchdog on Talos Linux for detecting kernel hangs, soft lockups, and hung tasks

---

The software watchdog in Linux monitors the kernel's ability to schedule tasks and respond to events. While a hardware watchdog catches complete system freezes, the software watchdog detects more subtle problems: a kernel thread stuck in an infinite loop, a driver blocking a CPU core, or a deadlock preventing task scheduling. These issues might not trigger a hardware watchdog because the system appears alive at the hardware level, but they can make a node effectively useless for running workloads.

On Talos Linux, the software watchdog is configured through kernel parameters and sysctl settings. This guide covers how to set it up and tune it for your environment.

## Types of Software Watchdog Detection

The Linux kernel includes several software watchdog mechanisms, each designed to catch different failure modes:

### Soft Lockup Detection

A soft lockup occurs when a CPU core is executing kernel code for an extended period without yielding to the scheduler. This means no other tasks can run on that core, including critical system tasks and your application workloads.

The soft lockup detector works by running a high-priority kernel thread on each CPU. If this thread does not get scheduled for a configurable period (default 20 seconds), the kernel logs a warning and, optionally, triggers a panic.

```yaml
# talos-machine-config.yaml
machine:
  sysctls:
    # Soft lockup detection settings
    kernel.softlockup_panic: "1"         # Panic on soft lockup (triggers reboot)
    kernel.softlockup_all_cpu_backtrace: "1"  # Dump all CPU backtraces
    kernel.watchdog_thresh: "10"         # Detection threshold in seconds
```

### Hard Lockup Detection

A hard lockup occurs when a CPU core does not respond to interrupts. This is worse than a soft lockup because even interrupt handlers cannot run. The hard lockup detector uses Non-Maskable Interrupts (NMIs) triggered by hardware performance counters.

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      - nmi_watchdog=1                   # Enable NMI watchdog
  sysctls:
    kernel.hardlockup_panic: "1"         # Panic on hard lockup
    kernel.hardlockup_all_cpu_backtrace: "1"
```

### Hung Task Detection

A hung task is a process stuck in an uninterruptible sleep state (D state) for longer than expected. This usually indicates a problem with a storage device, a network filesystem, or a kernel driver. Hung tasks are different from lockups because the CPU itself is fine, but specific processes cannot make progress.

```yaml
# talos-machine-config.yaml
machine:
  sysctls:
    kernel.hung_task_panic: "1"          # Panic on hung task
    kernel.hung_task_timeout_secs: "120" # Timeout in seconds
    kernel.hung_task_check_count: "32768" # Max tasks to check
    kernel.hung_task_warnings: "10"      # Max warnings before panic
```

## The softdog Kernel Module

In addition to the built-in watchdog detectors, Linux provides the `softdog` kernel module. This module creates a `/dev/watchdog` device that must be periodically written to by a userspace process. If the process stops writing (because userspace has hung), the module triggers a system reboot.

```yaml
# talos-machine-config.yaml
machine:
  kernel:
    modules:
      - name: softdog                    # Load the softdog module
        parameters:
          - soft_margin=60               # 60 second timeout
          - nowayout=1                   # Cannot be stopped once started
```

The softdog module is useful as a fallback when hardware watchdog is not available, such as in virtual machines or cloud instances that do not expose watchdog hardware.

## Configuring All Software Watchdog Components

Here is a comprehensive configuration that enables all software watchdog components:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      # Enable NMI watchdog for hard lockup detection
      - nmi_watchdog=1

      # Reboot on kernel panic instead of hanging
      - panic=10                         # Wait 10 seconds then reboot

      # Soft lockup settings via boot args
      - softlockup_panic=1

  sysctls:
    # Soft lockup configuration
    kernel.softlockup_panic: "1"
    kernel.softlockup_all_cpu_backtrace: "1"
    kernel.watchdog_thresh: "10"

    # Hard lockup configuration
    kernel.hardlockup_panic: "1"
    kernel.hardlockup_all_cpu_backtrace: "1"

    # Hung task configuration
    kernel.hung_task_panic: "1"
    kernel.hung_task_timeout_secs: "120"
    kernel.hung_task_check_count: "32768"
    kernel.hung_task_warnings: "10"

    # Kernel panic behavior
    kernel.panic: "10"                   # Reboot 10s after panic
    kernel.panic_on_oops: "1"           # Panic on kernel oops
    kernel.panic_on_warn: "0"           # Don't panic on warnings (too aggressive)

  kernel:
    modules:
      - name: softdog
        parameters:
          - soft_margin=60
          - nowayout=1
```

## Understanding watchdog_thresh

The `watchdog_thresh` parameter is central to soft lockup detection. It sets the threshold in seconds:

```text
watchdog_thresh = 10

Soft lockup detection:  2 * watchdog_thresh = 20 seconds
Hard lockup detection:  watchdog_thresh = 10 seconds
```

The soft lockup threshold is always double the `watchdog_thresh` value. The hard lockup threshold equals `watchdog_thresh`. This means with the default of 10 seconds:

- A soft lockup is detected after 20 seconds of a CPU not scheduling
- A hard lockup is detected after 10 seconds of a CPU not responding to interrupts

For systems under heavy load, you might want to increase this to avoid false positives:

```yaml
machine:
  sysctls:
    kernel.watchdog_thresh: "30"         # Higher threshold for busy systems
```

## Kernel Panic Configuration

The software watchdog triggers a kernel panic when it detects a problem. The panic behavior determines what happens next:

```yaml
machine:
  install:
    extraKernelArgs:
      # Time to wait before rebooting after panic (seconds)
      - panic=10

  sysctls:
    # Reboot timer after panic
    kernel.panic: "10"

    # Also panic on kernel oops (memory corruption, null pointer, etc.)
    kernel.panic_on_oops: "1"

    # Don't panic on kernel warnings (these are usually recoverable)
    kernel.panic_on_warn: "0"
```

Setting `kernel.panic` to 10 means the system waits 10 seconds after a panic before rebooting. This gives enough time for the panic message to be logged to persistent storage (if available) or captured by a serial console.

## Watchdog for Virtual Machines

Cloud instances and virtual machines often do not have hardware watchdog support. In these environments, the software watchdog becomes the primary recovery mechanism:

```yaml
# Configuration optimized for virtual machines
machine:
  install:
    extraKernelArgs:
      - nmi_watchdog=0                   # Disable NMI (not reliable in VMs)
      - panic=5                          # Faster reboot after panic

  sysctls:
    kernel.softlockup_panic: "1"
    kernel.hung_task_panic: "1"
    kernel.hung_task_timeout_secs: "300" # Higher timeout for cloud storage
    kernel.watchdog_thresh: "20"         # Higher threshold for VM overhead
    kernel.panic: "5"

  kernel:
    modules:
      - name: softdog
        parameters:
          - soft_margin=120              # 2 minute software watchdog
          - nowayout=1
```

Cloud storage operations can be slower and more variable than local storage, so the hung task timeout should be higher to avoid false positives from temporary I/O slowdowns.

## Monitoring Software Watchdog Events

Track software watchdog events to identify recurring problems:

```bash
# Check kernel logs for watchdog events
talosctl dmesg --nodes 10.0.0.1 | grep -i "lockup\|watchdog\|hung_task\|panic"

# Example output:
# watchdog: BUG: soft lockup - CPU#3 stuck for 22s!
# Kernel panic - not syncing: softlockup: hung tasks
```

Set up log collection to capture these messages before the system reboots. If a node experiences repeated watchdog-triggered reboots, the kernel messages from just before the panic contain the diagnostic information you need.

## Tuning for Stability vs Speed

There is a tradeoff between detecting failures quickly and avoiding false positives:

```yaml
# Aggressive settings (fast detection, risk of false positives)
machine:
  sysctls:
    kernel.watchdog_thresh: "5"
    kernel.hung_task_timeout_secs: "60"
    kernel.softlockup_panic: "1"
    kernel.panic: "3"

# Conservative settings (fewer false positives, slower detection)
machine:
  sysctls:
    kernel.watchdog_thresh: "30"
    kernel.hung_task_timeout_secs: "300"
    kernel.softlockup_panic: "1"
    kernel.panic: "30"
```

Start with conservative settings and tighten them as you gain confidence that your workloads do not trigger false positives.

## Applying and Verifying

```bash
# Apply the configuration
talosctl apply-config --nodes 10.0.0.1 --file talos-machine-config.yaml

# Reboot for kernel arg changes
talosctl reboot --nodes 10.0.0.1

# Verify settings after reboot
talosctl read /proc/sys/kernel/softlockup_panic --nodes 10.0.0.1
talosctl read /proc/sys/kernel/hung_task_timeout_secs --nodes 10.0.0.1
talosctl read /proc/sys/kernel/watchdog_thresh --nodes 10.0.0.1
```

## Conclusion

The software watchdog in Talos Linux provides essential detection for kernel-level failures that would otherwise leave a node hung indefinitely. By configuring soft lockup detection, hard lockup detection, and hung task monitoring, you create a comprehensive safety net that catches a wide range of failure modes. Combined with a hardware watchdog and proper panic configuration, your Talos nodes will automatically recover from almost any type of system hang, keeping your Kubernetes cluster healthy without manual intervention.
