# How to Allocate IPv6 Addresses to Virtual Machines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPAM, Virtual Machine, Address Allocation, DHCPv6, SLAAC

Description: Implement IPv6 address allocation strategies for virtual machines using SLAAC, DHCPv6 reservations, and IPAM integration to ensure unique, trackable IPv6 addresses for each VM.

## Introduction

Allocating IPv6 addresses to virtual machines requires choosing between SLAAC (address autoconfiguration from router-advertised prefixes), DHCPv6 (assigned by server), or static assignment. Each approach has trade-offs for address predictability, IPAM tracking, and operational complexity. This guide covers practical allocation strategies for VM environments, including IPAM integration.

## Address Allocation Strategies

```text
Strategy 1: SLAAC (Stateless Address Autoconfiguration)
├─ VM forms an address from a router-advertised /64 plus an interface ID
├─ Predictable only if the guest uses modified EUI-64 and the MAC is known
├─ No DHCPv6 server needed, but router advertisements are required
└─ Hard to track in IPAM without correlating the chosen IID back to the VM

Strategy 2: DHCPv6 Stateful
├─ DHCPv6 server assigns address from pool
├─ Can reserve specific address per VM (by DUID)
├─ Lease data can be synchronized into IPAM
└─ Requires DHCPv6 server infrastructure

Strategy 3: Static (IPAM-assigned)
├─ IPAM allocates the next available IPv6 address from a prefix
├─ Passed to VM via cloud-init, Terraform, or Ansible
├─ Most traceable - IPAM owns the record
└─ Requires automation for scalability
```

## SLAAC: Predict an EUI-64-Based IPv6 Address from a MAC Address

```python
#!/usr/bin/env python3
# slaac_from_mac.py

import ipaddress

def eui64_from_mac(mac: str) -> str:
    """Generate a modified EUI-64 interface ID from a MAC address."""
    mac_bytes = [int(b, 16) for b in mac.split(":")]
    # Insert ff:fe in the middle
    eui64 = mac_bytes[:3] + [0xff, 0xfe] + mac_bytes[3:]
    # Flip the U/L bit in the first byte
    eui64[0] ^= 0x02
    return ":".join(f"{b:02x}" for b in eui64)

def slaac_address(prefix: str, mac: str) -> str:
    """Compute an EUI-64-based SLAAC IPv6 address for a /64 prefix and MAC."""
    net = ipaddress.ip_network(prefix)
    if net.version != 6 or net.prefixlen != 64:
        raise ValueError("SLAAC EUI-64 examples require a /64 IPv6 prefix")

    eui64 = eui64_from_mac(mac)
    # Combine /64 prefix with EUI-64 interface ID
    iid_int = int(eui64.replace(":", ""), 16)
    addr = ipaddress.IPv6Address(int(net.network_address) | iid_int)
    return str(addr)

# Example: guest uses modified EUI-64 with MAC 52:54:00:ab:cd:01
# on prefix 2001:db8:100::/64

mac = "52:54:00:ab:cd:01"
prefix = "2001:db8:100::/64"
ipv6 = slaac_address(prefix, mac)
print(f"SLAAC address: {ipv6}")
# Output: 2001:db8:100:0:5054:ff:feab:cd01
```

## DHCPv6 Reservations by DUID

```bash
# /etc/kea/kea-dhcp6.conf (excerpt)
{
  "Dhcp6": {
    "subnet6": [
      {
        "id": 1,
        "subnet": "2001:db8:100::/64",
        "pools": [
          { "pool": "2001:db8:100::100 - 2001:db8:100::1ff" }
        ],
        "reservations": [
          {
            "duid": "00:03:00:01:52:54:00:ab:cd:01",
            "ip-addresses": ["2001:db8:100::10"],
            "hostname": "myvm1"
          },
          {
            "duid": "00:03:00:01:52:54:00:ab:cd:02",
            "ip-addresses": ["2001:db8:100::11"],
            "hostname": "myvm2"
          }
        ]
      }
    ]
  }
}
# Validate the config before restarting the service
kea-dhcp6 -t /etc/kea/kea-dhcp6.conf
# Service name varies by distro; this is the Debian/Ubuntu unit name
systemctl restart kea-dhcp6-server
```

## NetBox IPAM Integration for VM IPv6

```python
#!/usr/bin/env python3
# vm_ipv6_allocator.py

import pynetbox

nb = pynetbox.api("https://netbox.example.com", token="your-token")

def allocate_ipv6_for_vm(
    vm_id: int,
    vm_interface_id: int,
    prefix_id: int,
    dns_name: str = "",
) -> str:
    """Allocate next available IPv6 from a NetBox prefix for a VM interface."""

    prefix = nb.ipam.prefixes.get(prefix_id)
    if prefix is None:
        raise ValueError(f"NetBox prefix {prefix_id} was not found")

    vm = nb.virtualization.virtual_machines.get(vm_id)
    if vm is None:
        raise ValueError(f"NetBox VM {vm_id} was not found")

    vm_interface = nb.virtualization.interfaces.get(vm_interface_id)
    if vm_interface is None:
        raise ValueError(f"NetBox VM interface {vm_interface_id} was not found")
    if vm_interface.virtual_machine.id != vm.id:
        raise ValueError(
            f"VM interface {vm_interface_id} does not belong to VM {vm_id}"
        )

    # Get next available IP from the prefix
    available = prefix.available_ips.create({
        "status": "active",
        "dns_name": dns_name,
        "description": f"Allocated to VM: {vm.name}",
    })

    # Assign the IP to the VM interface, then set it as the VM's primary IPv6
    available.assigned_object_type = "virtualization.vminterface"
    available.assigned_object_id = vm_interface.id
    available.save()

    vm.primary_ip6 = available.id
    vm.save()

    print(f"Allocated {available.address} to VM {vm.name}")
    return available.address

# Example usage
ipv6 = allocate_ipv6_for_vm(
    vm_id=101,            # NetBox VM ID
    vm_interface_id=205,  # NetBox VM interface ID
    prefix_id=42,         # NetBox prefix ID for 2001:db8:100::/64
    dns_name="webserver-01.example.com",
)
```

## Terraform: Allocate IPv6 from NetBox

```hcl
# main.tf

terraform {
  required_providers {
    netbox = {
      source = "e-breuninger/netbox"
    }
    libvirt = {
      source = "dmacvicar/libvirt"
    }
  }
}

provider "netbox" {
  server_url = "https://netbox.example.com"
  api_token  = var.netbox_token
}

provider "libvirt" {
  uri = "qemu:///system"
}

# Allocate IPv6 for each VM
resource "netbox_available_ip_address" "vm_ipv6" {
  count       = var.vm_count
  prefix_id   = var.ipv6_prefix_id
  status      = "active"
  dns_name    = "vm-${count.index}.example.com"
  description = "VM ${count.index} IPv6 address"
}

output "vm_ipv6_addresses" {
  value = netbox_available_ip_address.vm_ipv6[*].ip_address
}

resource "libvirt_cloudinit_disk" "vm_init" {
  count = var.vm_count
  name  = "vm-${count.index}-seed"

  user_data = <<-EOF
    #cloud-config
    hostname: vm-${count.index}
  EOF

  meta_data = yamlencode({
    "instance-id"    = "vm-${count.index}"
    "local-hostname" = "vm-${count.index}"
  })

  network_config = templatefile("network-config.yaml.tpl", {
    ipv6_address = netbox_available_ip_address.vm_ipv6[count.index].ip_address
    ipv6_gateway = var.ipv6_gateway
  })
}

resource "libvirt_volume" "vm_cloudinit" {
  count = var.vm_count
  name  = "vm-${count.index}-seed.iso"
  pool  = var.libvirt_pool

  create = {
    content = {
      url = libvirt_cloudinit_disk.vm_init[count.index].path
    }
  }
}

# Assumes a bootable disk already exists for each VM in var.vm_disk_names
resource "libvirt_domain" "vm" {
  count       = var.vm_count
  name        = "vm-${count.index}"
  type        = "kvm"
  memory      = 2048
  memory_unit = "MiB"
  vcpu        = 2

  os = {
    type         = "hvm"
    type_arch    = "x86_64"
    type_machine = "q35"
  }

  devices = {
    disks = [
      {
        source = {
          volume = {
            pool   = var.libvirt_pool
            volume = var.vm_disk_names[count.index]
          }
        }
        target = {
          bus = "virtio"
          dev = "vda"
        }
      },
      {
        device = "cdrom"
        source = {
          volume = {
            pool   = libvirt_volume.vm_cloudinit[count.index].pool
            volume = libvirt_volume.vm_cloudinit[count.index].name
          }
        }
        target = {
          bus = "sata"
          dev = "sda"
        }
      }
    ]

    interfaces = [
      {
        type  = "network"
        model = { type = "virtio" }
        source = {
          network = {
            network = "default"
          }
        }
      }
    ]
  }

  running = true
}
```

## Cloud-init: Apply Allocated IPv6 to VM

```yaml
# network-config.yaml.tpl (cloud-init NoCloud network-config)
version: 2
ethernets:
  eth0:  # Replace with the guest's actual interface name if needed
    dhcp4: true
    addresses:
      - "${ipv6_address}"
    routes:
      - to: default
        via: "${ipv6_gateway}"
    nameservers:
      addresses:
        - "2001:db8::53"
```

## Bulk Allocation Script

```python
#!/usr/bin/env python3
# bulk_allocate_ipv6.py

import pynetbox
import csv

nb = pynetbox.api("https://netbox.example.com", token="your-token")

def bulk_allocate_from_csv(csv_file: str, prefix_id: int) -> list:
    """Allocate IPv6 addresses for VMs listed in CSV."""
    results = []
    prefix = nb.ipam.prefixes.get(prefix_id)
    if prefix is None:
        raise ValueError(f"NetBox prefix {prefix_id} was not found")

    with open(csv_file) as f:
        reader = csv.DictReader(f)
        for row in reader:
            vm_name = row["vm_name"]
            allocated = prefix.available_ips.create({
                "status": "active",
                "dns_name": f"{vm_name}.example.com",
                "description": f"VM: {vm_name}",
            })
            results.append({
                "vm_name": vm_name,
                "ipv6": allocated.address,
            })
            print(f"  {vm_name}: {allocated.address}")

    return results

# Usage: bulk_allocate_from_csv("vms.csv", prefix_id=42)
```

## Conclusion

IPv6 address allocation for VMs involves three common approaches: SLAAC, DHCPv6 reservations, and IPAM-driven static assignment. When a guest uses modified EUI-64 for SLAAC, knowing its MAC lets you predict the resulting IPv6 address for a given /64 prefix, but many modern guests use stable or temporary interface identifiers instead. For production environments, IPAM integration via NetBox or similar tools provides centralized tracking of which VM holds which IPv6 address. Terraform and cloud-init work together for automated allocation: Terraform queries the IPAM API for the next available IPv6, then passes it to cloud-init network-config for configuration during VM boot.
