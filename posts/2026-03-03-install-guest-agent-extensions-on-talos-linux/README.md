# How to Install Guest Agent Extensions on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Guest Agent, Virtualization, QEMU, VMware, System Extensions, Infrastructure

Description: Learn how to install guest agent extensions on Talos Linux for better integration with virtualization platforms like Proxmox, VMware, and other hypervisors.

---

When running Talos Linux as a virtual machine, guest agent extensions bridge the gap between the VM and the hypervisor. They enable features like graceful shutdown coordination, IP address reporting, filesystem freeze for consistent snapshots, and general VM management. Without a guest agent, the hypervisor has limited visibility into what is happening inside the VM. This guide covers installing and configuring guest agent extensions for the most common virtualization platforms.

## Why Guest Agents Matter

Guest agents provide bidirectional communication between the VM and the hypervisor. Here is what they enable:

- **Graceful shutdown** - The hypervisor can request a clean shutdown instead of forcing a power off
- **IP address reporting** - The hypervisor can see the VM's current IP addresses without guessing
- **Filesystem freeze/thaw** - Enables consistent snapshots by freezing the filesystem before taking a snapshot
- **Time synchronization** - The hypervisor can sync the VM clock after migration or resume
- **Resource reporting** - CPU, memory, and disk usage visible from the hypervisor management interface
- **Custom commands** - Some platforms allow running commands through the guest agent channel

## QEMU Guest Agent (Proxmox/KVM/libvirt)

The QEMU guest agent is the most commonly needed extension for users running Talos on Proxmox VE, KVM, or any libvirt-based platform.

### Installation

Add the QEMU guest agent extension to your Talos image:

```bash
# Using Image Factory
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/json" \
  -d '{
    "customization": {
      "systemExtensions": {
        "officialExtensions": [
          "siderolabs/qemu-guest-agent"
        ]
      }
    }
  }'
```

Include it in your machine configuration:

```yaml
machine:
  install:
    image: factory.talos.dev/installer/<schematic-with-qga>:v1.7.0
    extensions:
      - image: ghcr.io/siderolabs/qemu-guest-agent:v1.7.0
```

Or upgrade an existing node:

```bash
talosctl -n 192.168.1.10 upgrade \
  --image factory.talos.dev/installer/<schematic-with-qga>:v1.7.0
```

### Proxmox Configuration

On the Proxmox side, make sure the QEMU guest agent communication channel is enabled:

```bash
# In the Proxmox VM configuration
# Enable QEMU guest agent in VM settings
qm set <vmid> --agent enabled=1

# Or through the Proxmox web UI:
# VM -> Options -> QEMU Guest Agent -> Enable
```

The VM needs a virtio serial device for the guest agent to communicate through. Proxmox adds this automatically when you enable the guest agent option.

### Verifying on Proxmox

After the node boots with the extension:

```bash
# On the Proxmox host, check if the agent is responding
qm agent <vmid> ping

# Get network information through the agent
qm agent <vmid> network-get-interfaces

# Get system information
qm agent <vmid> get-osinfo
```

On the Talos side:

```bash
# Check the extension is installed
talosctl -n 192.168.1.10 get extensions | grep qemu

# Check the guest agent service
talosctl -n 192.168.1.10 services | grep qemu

# View guest agent logs
talosctl -n 192.168.1.10 logs ext-qemu-guest-agent
```

### Enabling Filesystem Freeze for Snapshots

The QEMU guest agent supports filesystem freeze, which is essential for consistent VM snapshots. When Proxmox takes a snapshot, it can freeze the filesystem first to ensure no writes are in progress:

```bash
# On Proxmox, take a snapshot with guest agent support
qm snapshot <vmid> my-snapshot --vmstate 0

# The guest agent will automatically handle freeze/thaw
```

## VMware Open VM Tools

For VMware environments (ESXi, vSphere, Workstation), the open-vm-tools extension provides guest agent functionality.

### Installation

```bash
# Create schematic with VMware tools
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/json" \
  -d '{
    "customization": {
      "systemExtensions": {
        "officialExtensions": [
          "siderolabs/open-vm-tools"
        ]
      }
    }
  }'
```

Include in machine configuration:

```yaml
machine:
  install:
    image: factory.talos.dev/installer/<schematic-with-vmtools>:v1.7.0
    extensions:
      - image: ghcr.io/siderolabs/open-vm-tools:v1.7.0
```

### VMware-Side Configuration

On the vSphere side, VMware Tools status will automatically change to "Running" once the extension is active:

```
vSphere Client -> VM -> Summary -> VMware Tools: Running (open-vm-tools)
```

### Features Enabled by VMware Tools

- IP address reporting in vCenter
- Clean shutdown through vCenter "Shut Down Guest OS"
- Quiesced snapshots
- Time synchronization with ESXi host
- Guest customization (hostname, network settings)
- vMotion optimization

### Verifying VMware Tools

```bash
# Check extension on the Talos node
talosctl -n 192.168.1.10 get extensions | grep vm-tools

# Check service status
talosctl -n 192.168.1.10 services | grep vmtools

# View logs
talosctl -n 192.168.1.10 logs ext-open-vm-tools
```

## Installing on Multiple Nodes

For clusters running on a single virtualization platform, deploy the guest agent to all nodes:

```bash
#!/bin/bash

# Choose the right schematic based on your hypervisor
# For Proxmox/KVM:
IMAGE="factory.talos.dev/installer/<schematic-with-qga>:v1.7.0"

# For VMware:
# IMAGE="factory.talos.dev/installer/<schematic-with-vmtools>:v1.7.0"

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"

for node in $NODES; do
  echo "Upgrading $node with guest agent..."
  talosctl -n "$node" upgrade --image "$IMAGE"

  echo "Waiting for $node to reboot..."
  sleep 120

  echo "Verifying $node..."
  talosctl -n "$node" get extensions
  talosctl -n "$node" services

  echo "$node complete."
  echo "---"
done
```

## Combining Guest Agents with Other Extensions

You often need the guest agent alongside other extensions. You can include multiple extensions in a single schematic:

```bash
# Schematic with QEMU guest agent and iSCSI tools
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/json" \
  -d '{
    "customization": {
      "systemExtensions": {
        "officialExtensions": [
          "siderolabs/qemu-guest-agent",
          "siderolabs/iscsi-tools"
        ]
      }
    }
  }'
```

## Troubleshooting

### Guest Agent Not Responding

If the hypervisor cannot communicate with the guest agent:

```bash
# Check if the extension is installed
talosctl -n 192.168.1.10 get extensions -o yaml

# Check if the service is running
talosctl -n 192.168.1.10 services

# View service logs for errors
talosctl -n 192.168.1.10 logs ext-qemu-guest-agent

# On Proxmox, check the virtio serial device exists
qm monitor <vmid>
# Then: info chardev
```

Common issues:

1. **Missing virtio serial device** - The hypervisor needs to provide the communication channel. On Proxmox, enable the QEMU guest agent option in the VM settings.

2. **Extension not loaded** - Verify the installer image includes the guest agent extension.

3. **Service not started** - Check the service status and logs for startup errors.

### IP Address Not Reported

If the hypervisor does not show the VM's IP address:

```bash
# Check if the guest agent can see the network interfaces
# On Proxmox:
qm agent <vmid> network-get-interfaces

# If this returns an error, the guest agent might not be running
# or the virtio serial device might not be connected
```

### Graceful Shutdown Not Working

If the hypervisor's "Shutdown" button forces a power off instead of a clean shutdown:

```bash
# Verify the ACPI shutdown handler is working
talosctl -n 192.168.1.10 dmesg | grep -i "acpi\|shutdown"

# Check guest agent logs during shutdown
talosctl -n 192.168.1.10 logs ext-qemu-guest-agent
```

## Performance Considerations

Guest agents have minimal overhead. The QEMU guest agent is a lightweight daemon that sits idle most of the time, only waking up to respond to hypervisor queries. You can safely install it on all VMs without worrying about resource consumption.

```bash
# Check resource usage (it should be negligible)
talosctl -n 192.168.1.10 services | grep qemu
```

## Security Considerations

Guest agents open a communication channel between the VM and the hypervisor. In security-sensitive environments, consider:

1. **Limit guest agent commands** - Some hypervisors allow restricting which guest agent commands are available
2. **Monitor guest agent logs** - Watch for unexpected commands being executed
3. **Network isolation** - The guest agent uses a local virtio channel, not the network, so it does not increase your network attack surface

Guest agent extensions are one of those small additions that significantly improve the operational experience when running Talos Linux on virtualized infrastructure. The installation process is straightforward, and the benefits in terms of management visibility and clean lifecycle operations make it worthwhile for every virtualized Talos deployment.
