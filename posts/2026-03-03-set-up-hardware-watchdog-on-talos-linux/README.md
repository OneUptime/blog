# How to Set Up Hardware Watchdog on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Hardware Watchdog, System Reliability, Bare Metal, Server Management

Description: Step-by-step instructions for setting up hardware watchdog timers on Talos Linux for automatic node recovery from system failures

---

A hardware watchdog is a dedicated timer circuit on your server's motherboard that reboots the machine if the operating system stops responding. Unlike software-based monitoring, a hardware watchdog operates independently of the CPU and kernel. Even if your system experiences a complete kernel panic, a memory corruption event, or a firmware bug that freezes the processor, the hardware watchdog will still fire and reset the machine.

For Talos Linux nodes running in production without SSH access, the hardware watchdog is your last line of defense against unrecoverable hangs. This guide covers how to identify, enable, and configure hardware watchdog timers on Talos Linux.

## Identifying Your Hardware Watchdog

Different server platforms use different watchdog hardware. The most common types are:

- **Intel TCO (Timer/Counter Oscillator)** - Found on Intel chipsets, this is the most common watchdog on x86 servers
- **IPMI/BMC Watchdog** - Available on servers with IPMI/BMC management controllers
- **SP5100 TCO** - Found on AMD platforms
- **WDAT (Watchdog Action Table)** - ACPI-based watchdog defined in firmware tables

To identify which watchdog hardware your system has, check the kernel messages on a Talos node:

```bash
# Check for watchdog devices
talosctl dmesg --nodes 10.0.0.1 | grep -i watchdog

# Example output:
# iTCO_wdt: Intel TCO WatchDog Timer Driver v1.11
# iTCO_wdt: Found a Intel PCH TCO device (Version=6, TCOBASE=0x0400)
# iTCO_wdt: initialized. heartbeat=30 sec (nowayout=0)
```

```bash
# Check which watchdog modules are loaded
talosctl read /proc/modules --nodes 10.0.0.1 | grep -i wdt

# Check the watchdog device
talosctl read /sys/class/watchdog/ --nodes 10.0.0.1
```

## Enabling Intel TCO Watchdog

The Intel TCO watchdog is the most common on datacenter servers. Enable it through the Talos machine configuration:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      # Enable Intel TCO watchdog
      - iTCO_wdt.heartbeat=60       # 60 second timeout
      - iTCO_wdt.nowayout=1         # Cannot be stopped once started
  kernel:
    modules:
      - name: iTCO_wdt              # Ensure the module is loaded
      - name: iTCO_vendor_support   # Vendor support module
```

The `heartbeat` parameter sets the watchdog timeout in seconds. If the system does not pet the watchdog within this period, a reset is triggered.

The `nowayout` parameter is critical for reliability. When set to 1, the watchdog cannot be disabled once activated, even if the process that opened it crashes or closes the file descriptor. Without this, a process crash could leave the watchdog disabled.

## Enabling AMD SP5100 TCO Watchdog

For AMD-based servers, the SP5100 TCO watchdog is the equivalent:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      - sp5100_tco.heartbeat=60
      - sp5100_tco.nowayout=1
  kernel:
    modules:
      - name: sp5100_tco
```

## Enabling WDAT (ACPI) Watchdog

Some systems expose a watchdog through ACPI tables. This is common on modern UEFI-based servers:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      - wdat_wdt.heartbeat=60
      - wdat_wdt.nowayout=1
  kernel:
    modules:
      - name: wdat_wdt
```

## Configuring IPMI Watchdog

IPMI-based watchdog timers operate at the BMC level, which means they work even if the host OS kernel is completely dead. This is the most reliable watchdog option for bare metal servers.

Setting up the IPMI watchdog requires running a daemon that periodically communicates with the BMC:

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
      hostNetwork: true
      tolerations:
      - operator: Exists
      containers:
      - name: watchdog
        image: alpine:latest
        securityContext:
          privileged: true
        command:
        - /bin/sh
        - -c
        - |
          apk add --no-cache ipmitool

          # Configure IPMI watchdog
          # Timer use: 4 = SMS/OS (appropriate for OS monitoring)
          # Pre-timeout action: 0 = None
          # Timeout action: 1 = Hard reset
          # Pre-timeout interval: 10 seconds (warning before timeout)
          # Timeout: 120 seconds
          ipmitool mc watchdog set timer use 4 \
            pretimeout 10 \
            action 1 \
            pretime_action 0 \
            timeout 120

          # Start the watchdog
          ipmitool mc watchdog set running

          echo "IPMI watchdog started with 120s timeout"

          # Pet the watchdog every 30 seconds
          while true; do
            ipmitool mc watchdog reset
            sleep 30
          done
        resources:
          requests:
            cpu: "10m"
            memory: "32Mi"
          limits:
            cpu: "50m"
            memory: "64Mi"
```

The IPMI watchdog should have a longer timeout than the OS-level watchdog. This way, the OS watchdog handles normal recovery, and the IPMI watchdog serves as a backup if the OS watchdog itself fails.

## Verifying Hardware Watchdog Operation

After configuring the watchdog, verify it is active:

```bash
# Check watchdog device information
talosctl read /sys/class/watchdog/watchdog0/identity --nodes 10.0.0.1
# Output: iTCO_wdt

talosctl read /sys/class/watchdog/watchdog0/timeout --nodes 10.0.0.1
# Output: 60

talosctl read /sys/class/watchdog/watchdog0/status --nodes 10.0.0.1
# Output should show the watchdog is active

# Check kernel log for watchdog initialization
talosctl dmesg --nodes 10.0.0.1 | grep -i "watchdog\|iTCO\|wdt"

# For IPMI watchdog, check from the DaemonSet
kubectl exec -n kube-system ipmi-watchdog-xxxxx -- ipmitool mc watchdog get
```

## Tuning the Timeout

The watchdog timeout should be long enough to avoid false positives but short enough to provide timely recovery:

```text
Use case                          Recommended timeout
-------------------------------------------------
High availability (HA) cluster    30-60 seconds
Standard production               60-120 seconds
Development/testing               120-300 seconds
IPMI backup watchdog              180-600 seconds
```

For HA clusters where fast failover is critical, a shorter timeout gets the node rebooted and back into the cluster quickly. For less critical environments, a longer timeout reduces the risk of unnecessary reboots during temporary load spikes.

## Handling BIOS/UEFI Settings

Some servers require the watchdog to be enabled in the BIOS/UEFI before the OS can use it. Common settings to check:

```text
BIOS Setting                  Required Value
-------------------------------------------------
OS Watchdog Timer            Enabled
Watchdog Timer Action        Reset
Watchdog Timeout             (varies)
TCO Timer                    Enabled
IPMI Watchdog               Enabled
```

If the watchdog module loads but the device does not appear functional, check these BIOS settings. Some server vendors disable the watchdog by default to prevent accidental reboots during initial setup.

## Watchdog and Kubernetes Node Health

The hardware watchdog works in conjunction with Kubernetes node health monitoring. Here is how the layers interact:

```text
1. Pod health check fails
   -> Kubernetes restarts the pod (seconds)

2. kubelet becomes unresponsive
   -> Talos restarts kubelet (30-60 seconds)
   -> Node marked NotReady after node-monitor-grace-period

3. Kernel soft lockup detected
   -> Software watchdog triggers panic
   -> Hardware watchdog reboots after panic (60 seconds)

4. Complete system hang (kernel/hardware freeze)
   -> Hardware watchdog timeout expires
   -> Machine reboots (60-120 seconds)

5. Hardware watchdog also fails
   -> IPMI watchdog triggers power cycle (120-300 seconds)
```

Configure the Kubernetes controller manager to handle node failures:

```yaml
# kube-controller-manager settings (via Talos config)
cluster:
  controllerManager:
    extraArgs:
      node-monitor-period: "5s"          # Check node status every 5s
      node-monitor-grace-period: "40s"   # Mark NotReady after 40s
      pod-eviction-timeout: "30s"        # Start evicting pods after 30s
```

## Monitoring Watchdog Events

Track watchdog-triggered reboots to understand node stability:

```bash
# Check if the last reboot was triggered by watchdog
talosctl dmesg --nodes 10.0.0.1 | grep -i "watchdog\|reset reason\|reboot"

# Check IPMI event log for watchdog events
kubectl exec -n kube-system ipmi-watchdog-xxxxx -- ipmitool sel list | grep -i watchdog
```

Set up alerts for watchdog reboots. If a node is being rebooted by the watchdog frequently, there is an underlying issue that needs investigation - the watchdog is a recovery mechanism, not a fix.

## Applying the Configuration

```bash
# Apply the machine configuration
talosctl apply-config --nodes 10.0.0.1 --file talos-machine-config.yaml

# Reboot for kernel module and arg changes
talosctl reboot --nodes 10.0.0.1

# Verify watchdog is active after reboot
talosctl dmesg --nodes 10.0.0.1 | grep watchdog
```

## Conclusion

Hardware watchdog timers on Talos Linux provide the most reliable mechanism for automatic recovery from system failures. Since Talos nodes have no SSH access for manual intervention, a properly configured hardware watchdog ensures that even the most severe system failures result in an automatic reboot rather than an indefinite hang. Configure both the OS-level watchdog and an IPMI watchdog for defense in depth, tune the timeouts based on your availability requirements, and monitor for watchdog events to catch recurring issues.
