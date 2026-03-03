# How to Understand the machined Service in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, machined, System Services, Kubernetes, Configuration Management, Infrastructure

Description: Explore the machined service in Talos Linux, the core daemon that manages node configuration, system state, and orchestrates all other services on the machine.

---

Every operating system needs a central coordinator that manages the lifecycle of the machine itself. In traditional Linux, that role belongs to systemd or init. In Talos Linux, the equivalent is `machined` - the core service that handles everything from applying configuration changes to managing the boot process and coordinating other system services.

If you have ever applied a machine configuration patch, upgraded a node, or rebooted through `talosctl`, you have interacted with `machined` even if you did not realize it. This post breaks down what `machined` does, how it works, and why it matters.

## The Role of machined

The `machined` service is the heart of a Talos Linux node. It is responsible for:

- Processing and applying machine configuration
- Managing the lifecycle of all other system services
- Handling node reboots, shutdowns, and upgrades
- Managing disk partitions and filesystem layout
- Coordinating the boot sequence
- Exposing system state through the Talos API

When `apid` receives a management request from `talosctl`, many of those requests ultimately get forwarded to `machined` for execution. It is the service that actually does the work of changing the system state.

## How machined Starts

During the boot process, `machined` is one of the first services to start. It reads the machine configuration from the system partition, validates it, and then begins setting up the node according to that configuration. The boot sequence looks roughly like this:

```text
BIOS/UEFI --> Bootloader --> Kernel --> machined starts
    |
    |--> Read machine config from disk
    |--> Validate configuration
    |--> Set up networking
    |--> Start system services (apid, trustd, etcd, kubelet)
    |--> Report node ready
```

The machine configuration is stored in a dedicated partition on disk. When `machined` starts, it reads this configuration and uses it as the source of truth for everything that follows.

## Machine Configuration Processing

The most important job of `machined` is processing the machine configuration. This YAML document describes every aspect of the node: network settings, disk layout, Kubernetes parameters, cluster membership, and more.

```yaml
# Simplified machine configuration structure
machine:
  type: controlplane
  network:
    hostname: cp-1
    interfaces:
      - interface: eth0
        dhcp: true
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.7.0
  certSANs:
    - 192.168.1.10
cluster:
  clusterNetwork:
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
```

When you apply a configuration change using `talosctl apply-config` or `talosctl patch`, the request goes to `apid`, which forwards it to `machined`. The `machined` service then:

1. Validates the new configuration against the schema
2. Compares it with the current running configuration
3. Determines which changes can be applied live versus which require a reboot
4. Applies the changes or schedules a reboot

```bash
# Apply a configuration patch
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {"op": "add", "path": "/machine/network/hostname", "value": "worker-1"}
]'

# Check if any changes require a reboot
talosctl -n 192.168.1.10 get machineconfig -o yaml
```

## Live vs Reboot-Required Changes

Not all configuration changes are created equal. Some can be applied immediately without disrupting the node, while others require a full reboot. The `machined` service knows the difference and will tell you when a reboot is needed.

Changes that can typically be applied live:

- Network configuration updates
- Adding or removing SANs to certificates
- Changing Kubernetes labels or taints

Changes that generally require a reboot:

- Disk layout modifications
- Kernel parameter changes
- Install image updates
- System extension additions

```bash
# Apply config and see what mode is required
talosctl -n 192.168.1.10 apply-config --file new-config.yaml --dry-run

# The output will indicate if a reboot is necessary
```

## Service Management

The `machined` service also acts as the service manager for all other Talos services. It starts, stops, and monitors services like `apid`, `trustd`, `etcd`, and `kubelet`.

```bash
# List all services managed by machined
talosctl -n 192.168.1.10 services

# Example output
# NODE           SERVICE      STATE     HEALTH   LAST CHANGE
# 192.168.1.10   apid         Running   OK       5h ago
# 192.168.1.10   containerd   Running   OK       5h ago
# 192.168.1.10   etcd         Running   OK       5h ago
# 192.168.1.10   kubelet      Running   OK       5h ago
# 192.168.1.10   machined     Running   OK       5h ago
# 192.168.1.10   trustd       Running   OK       5h ago
```

Each service has a defined dependency graph. For example, `etcd` depends on networking being available, and `kubelet` depends on `etcd` being healthy (on control plane nodes). The `machined` service respects these dependencies and starts services in the correct order.

## Handling Upgrades

When you upgrade a Talos node, `machined` orchestrates the entire process:

```bash
# Trigger an upgrade
talosctl -n 192.168.1.10 upgrade --image ghcr.io/siderolabs/installer:v1.8.0
```

Behind the scenes, `machined` does the following:

1. Downloads the new installer image
2. Writes the new OS image to the inactive partition (Talos uses an A/B partition scheme)
3. Updates the bootloader to point to the new partition
4. Reboots the node
5. On boot, validates the new image is healthy
6. If the new image fails to boot, automatically rolls back to the previous partition

This A/B partition scheme with automatic rollback is managed entirely by `machined` and provides a safety net against bad upgrades.

## Accessing machined Logs

Since `machined` manages so many aspects of the system, its logs are often the best place to start when debugging issues:

```bash
# View machined logs
talosctl -n 192.168.1.10 logs machined

# Follow logs in real time
talosctl -n 192.168.1.10 logs machined -f

# Filter for specific events
talosctl -n 192.168.1.10 logs machined | grep "config"
```

## Resource Management

The `machined` service exposes the system state through a resource-based model. You can query these resources to understand the current state of the node:

```bash
# Get machine status
talosctl -n 192.168.1.10 get machinestatus

# Get the current machine configuration
talosctl -n 192.168.1.10 get machineconfig

# Get machine type (controlplane or worker)
talosctl -n 192.168.1.10 get machinetype

# List all available resource types
talosctl -n 192.168.1.10 get rd
```

This resource model is one of the distinctive features of Talos. Instead of parsing configuration files or checking service status through ad-hoc commands, everything is available through a consistent resource API.

## Troubleshooting Common machined Issues

### Configuration Apply Fails

If applying a new configuration fails, check the validation errors:

```bash
# Validate config before applying
talosctl validate --config machine-config.yaml --mode metal
```

Common validation failures include incorrect YAML syntax, missing required fields, or invalid values for specific parameters.

### Node Stuck During Boot

If a node seems stuck during boot, `machined` might be waiting for a dependency. Check the service states:

```bash
# From another node that can proxy the request
talosctl -n <stuck-node-ip> services

# Check machined logs for what it is waiting on
talosctl -n <stuck-node-ip> logs machined
```

### Upgrade Rollback

If an upgrade fails and the node rolls back, `machined` logs will show the rollback event:

```bash
# Check for rollback events
talosctl -n 192.168.1.10 logs machined | grep -i rollback

# Verify which image is currently running
talosctl -n 192.168.1.10 version
```

## Why machined Matters

The `machined` service embodies the Talos philosophy of treating infrastructure as code. Every aspect of the node is defined in a declarative configuration, and `machined` is the engine that reconciles the desired state with the actual state. There is no imperative "run this command to install a package" workflow. Instead, you declare what the node should look like, and `machined` makes it happen.

This model makes Talos nodes predictable and reproducible. Two nodes with the same configuration will behave identically because `machined` processes the configuration the same way every time. There is no room for configuration drift because there is no way to make ad-hoc changes outside the configuration.

Understanding `machined` is fundamental to working effectively with Talos Linux. It is the service that ties everything together, from initial boot to ongoing configuration management, upgrades, and service orchestration.
