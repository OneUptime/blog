# How to Configure Watchdog Timers in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Watchdog Timer, System Reliability, Hardware Monitoring, Kubernetes

Description: Learn how to configure hardware and software watchdog timers in Talos Linux for automatic recovery from system hangs

---

Watchdog timers are a fundamental reliability mechanism that automatically resets a system when it becomes unresponsive. The concept is simple: a timer counts down, and if the system does not reset the timer before it expires, the hardware triggers a reboot. This ensures that even if your operating system hangs completely, the node will recover without human intervention.

On Talos Linux, watchdog timers are particularly important because there is no SSH access to manually intervene when a node becomes unresponsive. This guide explains how to configure both hardware and software watchdog timers on Talos Linux.

## How Watchdog Timers Work

A watchdog timer works like a dead man's switch. The system must periodically send a "heartbeat" signal to the watchdog device. If the heartbeat stops (because the system has hung, panicked, or crashed), the watchdog triggers a reset after a configurable timeout.

There are two types of watchdog timers:

1. **Hardware watchdog** - A dedicated chip on the motherboard that operates independently of the CPU and OS. Even if the kernel crashes completely, the hardware watchdog will trigger a reset.

2. **Software watchdog** - Implemented in the Linux kernel as the `softdog` module. It monitors the kernel's ability to schedule and run timer callbacks. If the kernel becomes unresponsive (but has not completely crashed), the software watchdog triggers a reset.

For maximum reliability, you want both types active. The hardware watchdog catches total system failures, while the software watchdog catches kernel hangs where the hardware might still appear functional.

## Enabling Hardware Watchdog in Talos Linux

Most server motherboards include a hardware watchdog (usually the Intel TCO or IPMI watchdog). Talos Linux includes the necessary kernel modules and can activate the watchdog through the machine configuration:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      # Load watchdog modules
      - iTCO_wdt.heartbeat=30     # Intel TCO watchdog with 30s timeout
```

The hardware watchdog typically creates a device at `/dev/watchdog` or `/dev/watchdog0`. Talos Linux opens this device and periodically writes to it to prevent the timeout from expiring.

## Configuring the Watchdog Timeout

The watchdog timeout determines how long the system can be unresponsive before a reset is triggered. Setting it too short causes unnecessary reboots during temporary load spikes. Setting it too long means a hung node sits idle for too long before recovering.

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      # Hardware watchdog timeout
      - iTCO_wdt.heartbeat=60        # 60 second timeout
      - iTCO_wdt.nowayout=1          # Prevent accidental watchdog disable
```

A good starting point is 60 seconds. This gives the system enough time to recover from temporary high-load situations while ensuring that genuinely hung nodes reboot within a minute.

The `nowayout` option prevents the watchdog from being stopped once started. This is a safety feature: if the process that was petting the watchdog crashes, the watchdog will still trigger a reset rather than being accidentally disabled.

## Software Watchdog Configuration

The software watchdog (softdog) provides an additional layer of monitoring. It can detect kernel soft lockups and scheduler stalls that the hardware watchdog might not catch:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      # Software watchdog
      - softlockup_panic=1           # Panic on soft lockup detection
      - hung_task_panic=1            # Panic on hung task detection
      - hung_task_timeout_secs=120   # Hung task timeout

  sysctls:
    # Kernel watchdog settings
    kernel.softlockup_panic: "1"
    kernel.hung_task_panic: "1"
    kernel.hung_task_timeout_secs: "120"
    kernel.watchdog_thresh: "10"     # Soft lockup detection threshold
```

When a soft lockup is detected (a CPU core fails to schedule for longer than `watchdog_thresh` seconds), the kernel will panic. Combined with the hardware watchdog, a panic leads to a reboot, recovering the node.

## NMI Watchdog

The NMI (Non-Maskable Interrupt) watchdog uses hardware performance counters to detect hard lockups where the CPU is completely stuck and cannot even process normal interrupts:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      - nmi_watchdog=1               # Enable NMI watchdog
```

The NMI watchdog fires a non-maskable interrupt periodically. If the NMI handler detects that the regular timer interrupt has not been running, it means the CPU is in a hard lockup state. The handler then triggers a panic and (with the hardware watchdog) a reboot.

Note: For performance-sensitive workloads, the NMI watchdog adds slight jitter to CPU-bound processes. If you are using CPU isolation for low-latency workloads, you may want to disable it:

```yaml
# For low-latency nodes, disable NMI watchdog
machine:
  install:
    extraKernelArgs:
      - nmi_watchdog=0               # Disable on performance-sensitive nodes
```

## Talos System Watchdog

Talos Linux includes its own system-level watchdog that monitors the health of critical system services. When Talos detects that a critical service (like kubelet or containerd) has failed and cannot be recovered, it can trigger a node reboot.

This is configured as part of the Talos system and runs automatically. You can check the status of Talos services:

```bash
# Check all Talos service statuses
talosctl services --nodes 10.0.0.1

# Check specific service health
talosctl service kubelet --nodes 10.0.0.1
talosctl service containerd --nodes 10.0.0.1
talosctl service etcd --nodes 10.0.0.1
```

## Watchdog Timer Cascade

For maximum reliability, set up a cascade of watchdog mechanisms:

```text
Layer 1: Application health checks (Kubernetes liveness probes)
  - Restarts individual containers
  - Timeout: 10-30 seconds

Layer 2: Talos service monitoring
  - Restarts system services (kubelet, containerd)
  - Timeout: 30-60 seconds

Layer 3: Software watchdog (softdog)
  - Detects kernel soft lockups and scheduler stalls
  - Timeout: 10-20 seconds for detection, panic triggers reboot

Layer 4: Hardware watchdog (iTCO_wdt)
  - Catches complete system hangs and kernel panics
  - Timeout: 60 seconds
  - Reboots the entire node

Layer 5: IPMI/BMC watchdog
  - External hardware that can power cycle the server
  - Timeout: 300 seconds
  - Works even if the OS and kernel are completely dead
```

## IPMI Watchdog for Bare Metal

If your servers have IPMI/BMC capability, you can configure an additional watchdog at the hardware management level:

```yaml
# ipmi-watchdog-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ipmi-watchdog
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: ipmi-watchdog
  template:
    metadata:
      labels:
        app: ipmi-watchdog
    spec:
      hostPID: true
      containers:
      - name: ipmi-watchdog
        image: alpine:latest
        securityContext:
          privileged: true
        command:
        - /bin/sh
        - -c
        - |
          apk add --no-cache ipmitool
          # Set IPMI watchdog: 5 minute timeout, reset action
          ipmitool mc watchdog set timer use 4 action 1 timeout 300
          ipmitool mc watchdog set running
          # Pet the IPMI watchdog every 60 seconds
          while true; do
            ipmitool mc watchdog reset
            sleep 60
          done
```

## Monitoring Watchdog Health

Verify that your watchdog timers are active and functioning:

```bash
# Check if hardware watchdog is active
talosctl read /proc/sys/kernel/watchdog --nodes 10.0.0.1

# Check watchdog device
talosctl read /sys/class/watchdog/watchdog0/status --nodes 10.0.0.1
talosctl read /sys/class/watchdog/watchdog0/timeout --nodes 10.0.0.1

# Check soft lockup settings
talosctl read /proc/sys/kernel/softlockup_panic --nodes 10.0.0.1
talosctl read /proc/sys/kernel/hung_task_timeout_secs --nodes 10.0.0.1
```

## Testing the Watchdog

Testing the watchdog in a controlled manner is important. Do this only on non-production nodes:

```bash
# Trigger a kernel panic to test watchdog reboot
# WARNING: This will immediately crash the node
talosctl read /proc/sysrq-trigger --nodes 10.0.0.1
# Then write 'c' to trigger panic
```

A safer test is to verify the watchdog device exists and has the correct timeout, without actually triggering it.

## Applying Watchdog Configuration

Apply the watchdog configuration and reboot:

```bash
# Apply machine configuration
talosctl apply-config --nodes 10.0.0.1 --file talos-machine-config.yaml

# Reboot for kernel arg changes
talosctl reboot --nodes 10.0.0.1

# Verify after reboot
talosctl read /proc/cmdline --nodes 10.0.0.1
```

## Conclusion

Watchdog timers on Talos Linux provide an essential safety net for unattended Kubernetes nodes. The combination of hardware watchdog, software watchdog, NMI watchdog, and Talos service monitoring creates a multi-layered recovery system. When a node hangs for any reason, the watchdog cascade ensures it reboots and rejoins the cluster automatically. Configure the timeouts based on your environment, test the recovery process in staging, and monitor watchdog health as part of your regular operational checks.
