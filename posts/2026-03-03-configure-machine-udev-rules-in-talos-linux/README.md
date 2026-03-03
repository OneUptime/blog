# How to Configure Machine Udev Rules in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Udev Rules, Device Management, Machine Configuration, Kubernetes

Description: Learn how to configure custom udev rules in Talos Linux to manage device permissions, naming, and behavior for hardware and storage devices.

---

Udev is the Linux device manager. It handles dynamic device node creation, sets permissions on device files, and can trigger actions when hardware is added or removed. On traditional Linux, you would drop rule files into `/etc/udev/rules.d/` and reload the daemon. Talos Linux, being immutable, handles this through the machine configuration instead. The `machine.udev` section lets you define custom udev rules that Talos applies at boot time.

This guide covers when and how to use udev rules in Talos Linux, with practical examples for common scenarios.

## Why You Need Custom Udev Rules

Out of the box, Talos handles standard hardware just fine. You typically need custom udev rules when you are working with specialized hardware like GPUs, InfiniBand adapters, custom storage controllers, or USB devices that need specific permissions. Some software also requires certain device naming conventions or symlinks that the default rules do not provide.

Common reasons include:
- Setting permissions on GPU devices for non-root container access
- Creating stable symlinks for serial devices
- Assigning specific names to network interfaces
- Configuring storage device parameters like I/O scheduler and queue depth

## The Udev Configuration Section

Udev rules go under `machine.udev` in the Talos machine configuration:

```yaml
# Basic udev rule configuration
machine:
  udev:
    rules:
      - SUBSYSTEM=="net", ACTION=="add", ATTR{address}=="aa:bb:cc:dd:ee:ff", NAME="mgmt0"
```

Each entry in the `rules` list is a single udev rule string. These rules follow the standard Linux udev rule syntax, so any udev documentation you find online applies here.

## Setting Device Permissions

One of the most common uses is setting permissions on device nodes so that containers can access them without running as root:

```yaml
# Set permissions on NVIDIA GPU devices
machine:
  udev:
    rules:
      # Make NVIDIA devices accessible to containers
      - KERNEL=="nvidia*", MODE="0666"
      - KERNEL=="nvidia-uvm*", MODE="0666"

      # Make InfiniBand devices accessible
      - KERNEL=="infiniband/*", MODE="0666"
      - SUBSYSTEM=="infiniband_verbs", MODE="0666"
```

The `MODE` assignment sets the file permissions on the device node. `0666` means read-write access for all users. This is common for GPU devices because containerized workloads often need direct device access.

## Creating Stable Device Symlinks

Device names like `/dev/sda` or `/dev/ttyUSB0` can change between reboots depending on device enumeration order. Udev rules let you create stable symlinks based on hardware attributes:

```yaml
# Create stable symlinks for serial devices
machine:
  udev:
    rules:
      # Create a stable name for a specific USB serial device
      - SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", SYMLINK+="serial-sensor"

      # Create a stable name based on serial number
      - SUBSYSTEM=="tty", ATTRS{serial}=="A12345", SYMLINK+="gps-receiver"
```

With these rules, your applications can reference `/dev/serial-sensor` or `/dev/gps-receiver` instead of `/dev/ttyUSB0`, and it will work regardless of the order devices are detected.

## Network Interface Naming

Sometimes you need specific names for network interfaces, especially in environments with multiple network cards:

```yaml
# Name network interfaces based on MAC address
machine:
  udev:
    rules:
      # Assign a specific name to the management interface
      - SUBSYSTEM=="net", ACTION=="add", ATTR{address}=="00:11:22:33:44:55", NAME="mgmt0"

      # Assign a name to the storage network interface
      - SUBSYSTEM=="net", ACTION=="add", ATTR{address}=="00:11:22:33:44:66", NAME="storage0"

      # Assign a name to the workload network interface
      - SUBSYSTEM=="net", ACTION=="add", ATTR{address}=="00:11:22:33:44:77", NAME="workload0"
```

Be careful with network interface renaming in Talos. The `machine.network.interfaces` section references interfaces by name, so if you rename an interface with a udev rule, you need to use the new name in your network configuration.

## Storage Device Tuning

Udev rules can set I/O scheduler and queue depth for block devices, which is useful for optimizing storage performance:

```yaml
# Tune storage devices
machine:
  udev:
    rules:
      # Set I/O scheduler for NVMe devices
      - SUBSYSTEM=="block", KERNEL=="nvme*", ATTR{queue/scheduler}="none"

      # Set read-ahead for spinning disks
      - SUBSYSTEM=="block", KERNEL=="sd[a-z]", ATTR{bdi/read_ahead_kb}="4096"

      # Increase queue depth for SAS drives
      - SUBSYSTEM=="block", KERNEL=="sd[a-z]", ATTR{device/queue_depth}="64"
```

NVMe devices generally perform best with no scheduler (or `none`) because they have their own internal command queuing. Spinning disks might benefit from the `mq-deadline` scheduler.

## GPU Configuration Rules

GPU passthrough to containers is a common requirement for machine learning workloads. Here is a comprehensive udev configuration for NVIDIA GPUs:

```yaml
# Complete NVIDIA GPU udev configuration
machine:
  udev:
    rules:
      # NVIDIA character devices
      - KERNEL=="nvidia", RUN+="/bin/bash -c '/usr/bin/nvidia-smi'"
      - KERNEL=="nvidia", MODE="0666"
      - KERNEL=="nvidia-caps/*", MODE="0666"
      - KERNEL=="nvidia-modeset", MODE="0666"
      - KERNEL=="nvidia-uvm", MODE="0666"
      - KERNEL=="nvidia-uvm-tools", MODE="0666"
      - KERNEL=="nvidiactl", MODE="0666"
```

These rules ensure that all NVIDIA device nodes are world-accessible, which allows containers to use GPUs without elevated privileges.

## Writing Udev Rules - Syntax Primer

If you are not familiar with udev rule syntax, here is a quick primer. A udev rule consists of match keys (using `==`) and assignment keys (using `=` or `+=`):

```yaml
machine:
  udev:
    rules:
      # Match keys (conditions) use ==
      # KERNEL - match the device name
      # SUBSYSTEM - match the device subsystem
      # ATTR{name} - match a device attribute
      # ATTRS{name} - match an attribute from parent devices
      # ACTION - match the event action (add, remove, change)

      # Assignment keys (actions) use = or +=
      # NAME - set the device node name
      # SYMLINK+ - add a symlink (+=)
      # MODE - set permissions
      # OWNER - set the device node owner
      # GROUP - set the device node group
      # RUN+ - run a command when the rule matches

      # Example combining multiple conditions and actions
      - SUBSYSTEM=="block", KERNEL=="sd[a-z]", ATTRS{vendor}=="ATA", ATTR{queue/scheduler}="mq-deadline", ATTR{queue/nr_requests}="256"
```

## Applying Udev Rules

Apply the configuration with the udev rules:

```bash
# Apply config with udev rules
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file worker.yaml
```

Udev rule changes typically require a reboot for all rules to take effect properly. Some rules might activate through device re-enumeration, but a clean reboot is the reliable way:

```bash
# Reboot to apply udev rules
talosctl reboot --nodes 192.168.1.100
```

## Verifying Udev Rules

After the node boots, verify that your rules are working:

```bash
# Check if a device has the expected permissions
talosctl list --nodes 192.168.1.100 /dev/ | grep nvidia

# Check device properties
talosctl read --nodes 192.168.1.100 /sys/block/nvme0n1/queue/scheduler
```

You can also check the Talos logs for any udev errors:

```bash
# Check for udev-related messages in the logs
talosctl dmesg --nodes 192.168.1.100 | grep -i udev
```

## Troubleshooting

If your udev rules are not working as expected, the most common issues are syntax errors and incorrect match conditions. Udev rules are sensitive to whitespace and quoting. Make sure you are using the correct comparison operators (`==` for matching, `=` for assignment). Also verify that the device attributes you are matching actually exist by checking `/sys/` paths on a similar Linux system.

Another common issue is rule ordering. Udev processes rules in alphabetical order by filename. In Talos, all custom rules go into a single file, so the order within your rules list matters. Put more specific rules before more general ones.

Custom udev rules in Talos Linux give you the control you need over device management while maintaining the immutable, declarative nature of the operating system. Use them judiciously and always test on non-production hardware first.
