# How to Configure IPv6 for Virtual Machine Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VM Templates, Cloud-init, Packer, VMware, KVM, Automation

Description: Create virtual machine templates with proper IPv6 network configuration using cloud-init, Packer, and platform-specific tools, ensuring new VMs receive IPv6 addresses on first boot.

## Introduction

VM templates are golden images used to create new virtual machines. IPv6 configuration in templates requires care: you should not embed static IPv6 addresses in templates (they'd conflict when multiple VMs are created), and SLAAC or DHCPv6 must be configured to activate on first boot. Cloud-init is the standard tool for per-instance IPv6 configuration, while Packer automates the template creation process.

## Cloud-init for IPv6 in VM Templates

```yaml
# network-config or /etc/cloud/cloud.cfg.d/99-ipv6.yaml

network:
  version: 2
  ethernets:
    primary:
      match:
        name: "e*"
      # Enable both DHCPv4 and DHCPv6. This also works on SLAAC networks.
      dhcp4: true
      dhcp6: true

      # Optional on SLAAC networks:
      # accept-ra: true
      # ipv6-privacy: true

      # Or fully static:
      # addresses:
      #   - "<v4_address>/24"
      #   - "<v6_address>/64"
      # routes:
      #   - to: default
      #     via: "<v4_gateway>"
      #   - to: default
      #     via: "<v6_gateway>"
      # nameservers:
      #   addresses:
      #     - "2001:db8::53"
      #     - "8.8.8.8"
```

## KVM Template with cloud-init IPv6

```bash
# Create a base image with cloud-init ready for IPv6

# Download a cloud image

wget https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img

# Customize the image (remove machine-id so each VM gets unique ID)
virt-customize -a jammy-server-cloudimg-amd64.img \
    --run-command "truncate -s 0 /etc/machine-id" \
    --run-command "rm -f /var/lib/dbus/machine-id" \
    --run-command "ln -s /etc/machine-id /var/lib/dbus/machine-id"

# Create a NoCloud seed image for template testing
cat > user-data.yaml << 'EOF'
#cloud-config
EOF

cat > network-config.yaml << 'EOF'
network:
  version: 2
  ethernets:
    primary:
      match:
        name: "e*"
      dhcp4: true
      dhcp6: true
EOF

cat > meta-data.yaml << 'EOF'
instance-id: template-test
local-hostname: template-vm
EOF

cloud-localds --network-config=network-config.yaml seed.img user-data.yaml meta-data.yaml

# Test the template
qemu-system-x86_64 \
    -drive file=jammy-server-cloudimg-amd64.img,format=qcow2 \
    -drive file=seed.img,format=raw \
    -netdev bridge,id=net0,br=br0 \
    -device virtio-net-pci,netdev=net0 \
    -m 2048 -nographic
```

## VMware Template with IPv6 (vSphere customization)

```text
# VMware vSphere guest customization spec for IPv6

1. vSphere Client → Policies and Profiles → VM Customization Specifications
2. Create New Specification
3. Under "Network Interface Settings":
   - Type: Use DHCP for IPv4
   - IPv6: Enable DHCPv6 or SLAAC
   - Or: Use fixed IPv6 (populated from template at clone time)

4. Use vSphere API to clone with IPv6 customization:
```

```python
#!/usr/bin/env python3
# vsphere_ipv6_template_clone.py

from pyVmomi import vim

def get_vm_by_name(si, name: str):
    view = si.content.viewManager.CreateContainerView(
        si.content.rootFolder, [vim.VirtualMachine], True
    )
    try:
        for vm in view.view:
            if vm.name == name:
                return vm
    finally:
        view.Destroy()
    raise ValueError(f"VM {name!r} not found")

def clone_with_ipv6(si, template_name: str, vm_name: str, ipv6_addr: str):
    """Clone a VMware template with IPv6 configuration."""

    # Get template
    template = get_vm_by_name(si, template_name)

    if template.resourcePool is None:
        raise ValueError("Template is not attached to a resource pool")

    location = vim.vm.RelocateSpec()
    location.pool = template.resourcePool

    # Create customization spec
    ip_settings = vim.vm.customization.IPSettings()
    ip_settings.ip = vim.vm.customization.DhcpIpGenerator()

    # IPv6 settings
    ipv6_settings = vim.vm.customization.IPSettings.IpV6AddressSpec()
    ipv6_addr_obj = vim.vm.customization.FixedIpV6()
    ipv6_addr_obj.ipAddress = ipv6_addr
    ipv6_addr_obj.subnetMask = 64
    ipv6_settings.ip = [ipv6_addr_obj]
    ipv6_settings.gateway = ["2001:db8::1"]
    ip_settings.ipV6Spec = ipv6_settings

    nic_map = vim.vm.customization.AdapterMapping()
    nic_map.adapter = ip_settings

    spec = vim.vm.customization.Specification()
    spec.nicSettingMap = [nic_map]
    spec.globalIPSettings = vim.vm.customization.GlobalIPSettings()
    spec.identity = vim.vm.customization.LinuxPrep(
        hostName=vim.vm.customization.FixedName(name=vm_name),
        domain="example.com"
    )

    # Clone
    clone_spec = vim.vm.CloneSpec()
    clone_spec.location = location
    clone_spec.customization = spec
    clone_spec.powerOn = True
    clone_spec.template = False
    task = template.Clone(name=vm_name, folder=template.parent, spec=clone_spec)
    return task
```

## Packer Template for IPv6-Ready Golden Image

```hcl
# packer/ubuntu-ipv6-template.pkr.hcl

packer {
  required_plugins {
    qemu = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/qemu"
    }
  }
}

source "qemu" "ubuntu-ipv6" {
  iso_url          = "https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso"
  iso_checksum     = "sha256:9bc6028870aef3f74f4e16b900008179e78b130e6b0b9a140635434a46aa98b0"
  disk_size        = "10240"
  format           = "qcow2"
  memory           = 2048
  output_directory = "output"
  vm_name          = "ubuntu-ipv6-template"

  # Use bridged networking with IPv6 during build
  net_device     = "virtio-net"
  net_bridge     = "br0"
  disk_interface = "virtio"
  communicator   = "ssh"
  ssh_username   = "ubuntu"
  ssh_password   = "ubuntu"
  ssh_timeout    = "30m"
  shutdown_command = "echo 'ubuntu' | sudo -S shutdown -P now"

  # http/ must contain NoCloud user-data and meta-data for autoinstall.
  boot_wait = "5s"
  headless  = true
  boot_command = [
    "c<wait>",
    "linux /casper/vmlinuz autoinstall 'ds=nocloud-net;s=http://{{ .HTTPIP }}:{{ .HTTPPort }}/' ---<enter><wait>",
    "initrd /casper/initrd<enter><wait>",
    "boot<enter>"
  ]

  http_directory = "http"
}

build {
  sources = ["source.qemu.ubuntu-ipv6"]

  # Clear instance-specific state
  provisioner "shell" {
    inline = [
      "sudo truncate -s 0 /etc/machine-id",
      "sudo rm -f /var/lib/dbus/machine-id",
      "sudo ln -s /etc/machine-id /var/lib/dbus/machine-id",
      "sudo cloud-init clean --logs",
    ]
  }

  # Ensure cloud-init network config for IPv6 is in place
  provisioner "file" {
    source      = "files/99-ipv6-dhcp.yaml"
    destination = "/tmp/99-ipv6-dhcp.yaml"
  }

  provisioner "shell" {
    inline = [
      "sudo install -m 644 /tmp/99-ipv6-dhcp.yaml /etc/cloud/cloud.cfg.d/",
    ]
  }
}
```

## Template Pre-boot Checklist for IPv6

```bash
# Before converting a VM to a template, verify:

# 1. Machine ID is cleared (so clones get a new machine identity)
cat /etc/machine-id
# Should be empty or "uninitialized"

# 2. No static IPv6 address is configured unless clone-time customization will replace it
grep -R -E "dhcp6:|accept-ra:|addresses:|gateway6:|routes:" /etc/netplan/ /etc/network/interfaces 2>/dev/null
# For automatic IPv6, expect dhcp6: true or accept-ra: true; do not leave a production IPv6 address or default route baked into the template.

# 3. cloud-init is clean
sudo cloud-init clean --logs

# 4. SSH host keys are removed (will regenerate on first boot)
sudo rm -f /etc/ssh/ssh_host_*

# 5. Hostname is generic or cloud-init-managed
hostname
# Should be "ubuntu" or "template-vm", not a production hostname
```

## Conclusion

VM templates for IPv6 environments should use cloud-init network configuration or platform metadata to enable DHCPv6 and RA-driven IPv6 on first boot rather than baking in a static IPv6 address. Clearing the machine-id is recommended so each clone gets a unique machine identity; on systemd-based guests this also avoids reusing DHCP client identity state. Packer automates the template build process and can install cloud-init configurations as part of the build. VMware provides a customization spec mechanism for injecting IPv6 settings at clone time. For Linux images that use cloud-init with netplan-compatible Version 2 network configuration, `dhcp6: true` with optional `accept-ra: true` is a practical default for SLAAC/DHCPv6 environments.
