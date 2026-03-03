# How to Install QEMU Guest Agent on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, QEMU, Virtualization, Proxmox, Guest Agent

Description: Step-by-step guide to installing the QEMU Guest Agent on Talos Linux for better VM integration with Proxmox, libvirt, and other QEMU-based hypervisors.

---

When running Talos Linux as a virtual machine on QEMU-based hypervisors like Proxmox, libvirt, or plain QEMU/KVM, the QEMU Guest Agent provides an important communication channel between the hypervisor and the guest operating system. Without it, the hypervisor cannot perform clean shutdowns, get the VM's IP address, freeze the filesystem for snapshots, or collect other guest-level information. Installing the QEMU Guest Agent on Talos Linux is done through a system extension, and this guide shows you exactly how to do it.

## What the QEMU Guest Agent Does

The QEMU Guest Agent (QGA) is a daemon that runs inside a virtual machine and communicates with the hypervisor through a special virtio serial device. It enables several useful features:

- **Clean shutdown and reboot** - The hypervisor can request a proper OS shutdown instead of forcing a power-off
- **IP address reporting** - The hypervisor can query the guest's network configuration
- **Filesystem freeze/thaw** - For consistent snapshots, the guest can freeze I/O before the snapshot is taken
- **Time synchronization** - The guest can sync its clock after being resumed from a suspended state
- **Guest information** - The hypervisor can query OS version, hostname, and other details

These features are particularly important when using Proxmox VE, which relies heavily on the guest agent for VM management.

## Installing the Extension

### Method 1: Machine Configuration

Add the QEMU Guest Agent extension to your machine configuration.

```yaml
# controlplane.yaml or worker.yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/qemu-guest-agent:v8.2.0
```

The version tag should match the latest available version compatible with your Talos version. Check the extensions repository for the current version.

### Method 2: Image Factory

Generate a custom image with the QEMU Guest Agent pre-installed.

```bash
# Create the schematic
cat > qemu-schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/qemu-guest-agent
EOF

# Submit to Image Factory
SCHEMATIC_ID=$(curl -sX POST \
  --data-binary @qemu-schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" | jq -r '.id')

# Download the ISO for Proxmox installation
curl -Lo talos-qemu.iso \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-amd64.iso"
```

### Method 3: Imager Tool

```bash
# Generate ISO with the guest agent
docker run --rm -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  iso \
  --system-extension-image ghcr.io/siderolabs/qemu-guest-agent:v8.2.0
```

## Combining with Other Extensions

In practice, you will often combine the QEMU Guest Agent with other extensions. Here is a typical configuration for a Proxmox-based Talos cluster.

```yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/qemu-guest-agent:v8.2.0
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.4
```

Or with Image Factory.

```bash
cat > proxmox-schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/qemu-guest-agent
      - siderolabs/iscsi-tools
EOF
```

## Applying to Your Cluster

### New Installation

For new Talos installations, include the extension in the machine config before applying.

```bash
# Generate configurations
talosctl gen config my-cluster https://10.0.0.1:6443

# Edit controlplane.yaml and worker.yaml to add the extension
# Then apply to your nodes
talosctl apply-config --insecure \
  --nodes 10.0.0.10 \
  --file controlplane.yaml
```

### Existing Cluster

For nodes that are already running, update the config and upgrade.

```bash
# Create a config patch
cat > qemu-patch.yaml << 'EOF'
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/qemu-guest-agent:v8.2.0
EOF

# Apply the patch
talosctl -n 10.0.0.10 patch machineconfig --patch @qemu-patch.yaml

# Upgrade to apply the extension
talosctl -n 10.0.0.10 upgrade \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

## Configuring Proxmox for the Guest Agent

After installing the extension on the Talos side, you also need to enable the guest agent in the Proxmox VM configuration.

### Via Proxmox Web UI

1. Select your Talos VM in the Proxmox web interface
2. Go to Options
3. Find "QEMU Guest Agent" and click Edit
4. Check "Use QEMU Guest Agent"
5. Click OK

### Via Command Line

```bash
# On the Proxmox host
qm set <vmid> --agent enabled=1

# For example:
qm set 100 --agent enabled=1

# You can also set it during VM creation
qm create 100 \
  --name talos-cp-01 \
  --memory 4096 \
  --cores 2 \
  --agent enabled=1 \
  --net0 virtio,bridge=vmbr0 \
  --scsi0 local-lvm:32 \
  --cdrom local:iso/talos-amd64.iso
```

### Via Terraform

If you are using Terraform with the Proxmox provider.

```hcl
resource "proxmox_vm_qemu" "talos_node" {
  name        = "talos-worker-01"
  target_node = "pve1"

  agent    = 1  # Enable QEMU Guest Agent

  cores    = 2
  memory   = 4096

  disk {
    type    = "scsi"
    storage = "local-lvm"
    size    = "32G"
  }

  network {
    model  = "virtio"
    bridge = "vmbr0"
  }
}
```

## Verifying the Guest Agent

After both the Talos extension and Proxmox configuration are in place, verify the guest agent is working.

### From Talos

```bash
# Check that the extension is loaded
talosctl -n 10.0.0.10 get extensions

# Verify the guest agent service is running
talosctl -n 10.0.0.10 services | grep qemu

# Check for the virtio serial device
talosctl -n 10.0.0.10 dmesg | grep virtio
```

### From Proxmox

```bash
# On the Proxmox host, query the guest agent
qm agent <vmid> ping

# Get network information from the guest
qm agent <vmid> network-get-interfaces

# Get OS information
qm agent <vmid> get-osinfo

# Get the guest's hostname
qm agent <vmid> get-host-name
```

If the `ping` command returns successfully, the guest agent is working.

### Via Proxmox Web UI

In the Proxmox web interface, select your VM and look at the Summary tab. When the guest agent is working, you will see the VM's IP address displayed under "IPs." Without the guest agent, this field shows nothing.

## Guest Agent Features in Practice

### Clean Shutdown

With the guest agent, Proxmox can request a clean shutdown.

```bash
# This sends a shutdown request through the guest agent
qm shutdown <vmid>

# Without the guest agent, only forced stop works
qm stop <vmid>
```

### Filesystem Freeze for Snapshots

When taking a Proxmox snapshot, the guest agent freezes the filesystem to ensure consistency.

```bash
# Take a snapshot - the guest agent freezes I/O automatically
qm snapshot <vmid> pre-upgrade

# The freeze/thaw happens automatically when the guest agent is present
```

### Time Synchronization

After restoring a VM from a snapshot or resuming from suspend, the guest agent can sync the clock.

```bash
# Sync the guest clock from the Proxmox host
qm agent <vmid> set-user-password
```

## Using with libvirt

If you are using libvirt instead of Proxmox, configure the guest agent channel in your VM XML.

```xml
<channel type='unix'>
  <target type='virtio' name='org.qemu.guest_agent.0'/>
</channel>
```

Or with virt-install.

```bash
virt-install \
  --name talos-node \
  --memory 4096 \
  --vcpus 2 \
  --disk path=talos.qcow2,size=32 \
  --channel unix,target.type=virtio,target.name=org.qemu.guest_agent.0 \
  --os-variant generic \
  --import
```

## Automating VM Provisioning with Guest Agent

For automated Talos cluster provisioning on Proxmox, the guest agent enables scripted workflows.

```bash
#!/bin/bash
# provision-talos-vm.sh

VMID=$1
NAME=$2
IP=$3

# Create the VM
qm create ${VMID} \
  --name ${NAME} \
  --memory 4096 \
  --cores 2 \
  --agent enabled=1 \
  --net0 virtio,bridge=vmbr0 \
  --scsi0 local-lvm:32

# Start the VM with Talos ISO
qm set ${VMID} --cdrom local:iso/talos-custom.iso
qm start ${VMID}

# Wait for the guest agent to come up
echo "Waiting for guest agent..."
until qm agent ${VMID} ping 2>/dev/null; do
  sleep 5
done

# Get the IP address from the guest agent
VM_IP=$(qm agent ${VMID} network-get-interfaces | \
  jq -r '.[] | select(.name != "lo") | .["ip-addresses"][] | select(.["ip-address-type"] == "ipv4") | .["ip-address"]')

echo "VM ${NAME} is ready at ${VM_IP}"

# Apply Talos config
talosctl apply-config --insecure \
  --nodes ${VM_IP} \
  --file controlplane.yaml
```

## Troubleshooting

If the guest agent is not working, check these common issues.

```bash
# Verify the virtio serial channel exists in the VM config
qm config <vmid> | grep agent

# Make sure the guest agent is enabled
# agent: enabled=1 should appear in the output

# Check if the serial device is detected by the guest
talosctl -n <node-ip> dmesg | grep "virtio\|serial"

# Verify the extension version matches your Talos version
talosctl -n <node-ip> get extensions -o yaml
```

If the extension is loaded but the agent does not respond, the most common cause is a missing virtio serial channel in the VM configuration.

## Conclusion

The QEMU Guest Agent is a small but important addition to Talos Linux VMs running on QEMU-based hypervisors. It enables clean shutdowns, IP address reporting, filesystem-consistent snapshots, and better integration with tools like Proxmox. The installation process is simple - add the system extension, enable the agent in your hypervisor configuration, and you are done. For anyone running Talos on Proxmox or libvirt, this extension should be part of your standard node configuration.
