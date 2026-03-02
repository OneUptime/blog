# How to Configure VMware vSphere Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, VMware, vSphere, Virtualization, Infrastructure as Code

Description: A practical guide to configuring the VMware vSphere provider in Terraform for managing virtual machines, networks, and storage in on-premises environments.

---

VMware vSphere remains the backbone of many on-premises data centers, and managing it through Terraform brings the same infrastructure-as-code benefits that cloud teams enjoy. The vSphere provider lets you create and manage virtual machines, configure networking, handle storage, and automate operations that would otherwise require clicking through the vSphere Client.

If you are running a hybrid environment or maintaining on-premises infrastructure alongside cloud resources, the vSphere provider lets you manage everything from a single Terraform configuration.

## Prerequisites

- Terraform 1.0 or later
- VMware vCenter Server (the provider connects to vCenter, not individual ESXi hosts)
- A vCenter user account with appropriate permissions
- Network access from the Terraform runner to vCenter

## Declaring the Provider

```hcl
# versions.tf - Declare the vSphere provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    vsphere = {
      source  = "hashicorp/vsphere"
      version = "~> 2.6"
    }
  }
}
```

## Provider Configuration

```hcl
# provider.tf - Connect to vCenter
provider "vsphere" {
  # vCenter Server address
  vsphere_server = var.vsphere_server

  # Credentials
  user     = var.vsphere_user
  password = var.vsphere_password

  # Allow self-signed certificates (common in lab environments)
  allow_unverified_ssl = var.allow_unverified_ssl
}

variable "vsphere_server" {
  type        = string
  description = "vCenter Server FQDN or IP"
}

variable "vsphere_user" {
  type        = string
  description = "vCenter username (user@domain)"
}

variable "vsphere_password" {
  type        = string
  sensitive   = true
  description = "vCenter password"
}

variable "allow_unverified_ssl" {
  type        = bool
  default     = false
  description = "Allow self-signed SSL certificates"
}
```

### Environment Variables

```bash
# Set credentials via environment variables
export VSPHERE_SERVER="vcenter.example.com"
export VSPHERE_USER="administrator@vsphere.local"
export VSPHERE_PASSWORD="your-password"
export VSPHERE_ALLOW_UNVERIFIED_SSL="true"
```

## Looking Up Existing Infrastructure

Before creating VMs, you need to reference existing vSphere objects like datacenters, clusters, datastores, and networks.

```hcl
# Look up the datacenter
data "vsphere_datacenter" "dc" {
  name = "DC01"
}

# Look up the compute cluster
data "vsphere_compute_cluster" "cluster" {
  name          = "Production-Cluster"
  datacenter_id = data.vsphere_datacenter.dc.id
}

# Look up the datastore
data "vsphere_datastore" "datastore" {
  name          = "SAN-01"
  datacenter_id = data.vsphere_datacenter.dc.id
}

# Look up the network
data "vsphere_network" "network" {
  name          = "VM Network"
  datacenter_id = data.vsphere_datacenter.dc.id
}

# Look up the resource pool
data "vsphere_resource_pool" "pool" {
  name          = "Production-Cluster/Resources"
  datacenter_id = data.vsphere_datacenter.dc.id
}

# Look up a VM template
data "vsphere_virtual_machine" "template" {
  name          = "ubuntu-22.04-template"
  datacenter_id = data.vsphere_datacenter.dc.id
}
```

## Creating Virtual Machines

### From a Template

The most common approach is cloning from a template.

```hcl
# Create a VM from a template
resource "vsphere_virtual_machine" "web" {
  name             = "web-server-01"
  resource_pool_id = data.vsphere_resource_pool.pool.id
  datastore_id     = data.vsphere_datastore.datastore.id
  folder           = "Production/Web"

  # Hardware configuration
  num_cpus = 4
  memory   = 8192  # MB

  # Use the template's guest OS type
  guest_id = data.vsphere_virtual_machine.template.guest_id

  # Firmware (match the template)
  firmware = data.vsphere_virtual_machine.template.firmware

  # Network adapter
  network_interface {
    network_id   = data.vsphere_network.network.id
    adapter_type = data.vsphere_virtual_machine.template.network_interface_types[0]
  }

  # Disk configuration
  disk {
    label            = "disk0"
    size             = 50  # GB
    thin_provisioned = true
  }

  # Clone from template
  clone {
    template_uuid = data.vsphere_virtual_machine.template.id

    customize {
      linux_options {
        host_name = "web-server-01"
        domain    = "example.com"
      }

      network_interface {
        ipv4_address = "10.0.1.10"
        ipv4_netmask = 24
      }

      ipv4_gateway    = "10.0.1.1"
      dns_server_list = ["10.0.0.10", "10.0.0.11"]
      dns_suffix_list = ["example.com"]
    }
  }

  tags = [
    vsphere_tag.environment_production.id,
    vsphere_tag.role_web.id,
  ]
}
```

### Multiple VMs with for_each

```hcl
# Define VM specifications
locals {
  vms = {
    "web-01" = {
      cpus    = 4
      memory  = 8192
      ip      = "10.0.1.10"
      disk_gb = 50
    }
    "web-02" = {
      cpus    = 4
      memory  = 8192
      ip      = "10.0.1.11"
      disk_gb = 50
    }
    "app-01" = {
      cpus    = 8
      memory  = 16384
      ip      = "10.0.1.20"
      disk_gb = 100
    }
  }
}

resource "vsphere_virtual_machine" "servers" {
  for_each = local.vms

  name             = each.key
  resource_pool_id = data.vsphere_resource_pool.pool.id
  datastore_id     = data.vsphere_datastore.datastore.id

  num_cpus = each.value.cpus
  memory   = each.value.memory
  guest_id = data.vsphere_virtual_machine.template.guest_id

  network_interface {
    network_id = data.vsphere_network.network.id
  }

  disk {
    label            = "disk0"
    size             = each.value.disk_gb
    thin_provisioned = true
  }

  clone {
    template_uuid = data.vsphere_virtual_machine.template.id

    customize {
      linux_options {
        host_name = each.key
        domain    = "example.com"
      }

      network_interface {
        ipv4_address = each.value.ip
        ipv4_netmask = 24
      }

      ipv4_gateway    = "10.0.1.1"
      dns_server_list = ["10.0.0.10"]
    }
  }
}
```

## Tags and Categories

Tags help organize VMs in vSphere.

```hcl
# Create a tag category
resource "vsphere_tag_category" "environment" {
  name        = "Environment"
  cardinality = "SINGLE"
  description = "Environment classification"

  associable_types = [
    "VirtualMachine",
    "Datastore",
  ]
}

resource "vsphere_tag_category" "role" {
  name        = "Role"
  cardinality = "MULTIPLE"
  description = "Server role"

  associable_types = [
    "VirtualMachine",
  ]
}

# Create tags
resource "vsphere_tag" "environment_production" {
  name        = "Production"
  category_id = vsphere_tag_category.environment.id
}

resource "vsphere_tag" "role_web" {
  name        = "Web Server"
  category_id = vsphere_tag_category.role.id
}
```

## Distributed Virtual Switch

```hcl
# Create a distributed virtual switch
resource "vsphere_distributed_virtual_switch" "dvs" {
  name          = "Production-DVS"
  datacenter_id = data.vsphere_datacenter.dc.id

  uplinks         = ["uplink1", "uplink2"]
  active_uplinks  = ["uplink1"]
  standby_uplinks = ["uplink2"]

  host {
    host_system_id = data.vsphere_host.esxi1.id
    devices        = ["vmnic0", "vmnic1"]
  }
}

# Create a port group on the DVS
resource "vsphere_distributed_port_group" "web_pg" {
  name                            = "Web-Servers"
  distributed_virtual_switch_uuid = vsphere_distributed_virtual_switch.dvs.id

  vlan_id = 100
}
```

## VM Storage Policies

```hcl
# Look up a storage policy
data "vsphere_storage_policy" "gold" {
  name = "Gold Storage Policy"
}

# Apply the storage policy to a VM
resource "vsphere_virtual_machine" "critical_db" {
  name             = "db-server-01"
  resource_pool_id = data.vsphere_resource_pool.pool.id

  storage_policy_id = data.vsphere_storage_policy.gold.id

  # ... other VM configuration
}
```

## Content Library

```hcl
# Create a content library
resource "vsphere_content_library" "templates" {
  name            = "VM Templates"
  description     = "Template library for VM deployment"
  storage_backing = [data.vsphere_datastore.datastore.id]
}

# Upload an OVF template
resource "vsphere_content_library_item" "ubuntu" {
  name        = "ubuntu-22.04"
  description = "Ubuntu 22.04 LTS template"
  library_id  = vsphere_content_library.templates.id
  type        = "ovf"

  file_url = "https://cloud-images.ubuntu.com/releases/22.04/release/ubuntu-22.04-server-cloudimg-amd64.ova"
}
```

## Best Practices

1. Always use templates for VM creation. Building VMs from scratch is slow and error-prone. Create golden images and clone from them.

2. Use customization specs (the `customize` block) to set unique hostnames, IPs, and domain settings for each VM.

3. Organize VMs into folders. The `folder` attribute keeps your vSphere inventory clean.

4. Use tags for classification and reporting. They integrate with vSphere monitoring and billing tools.

5. Match the template's firmware type (BIOS or EFI) in your VM configuration to avoid boot failures.

6. Use thin provisioning for disks unless you have a specific reason to use thick provisioning.

7. Test with a single VM before deploying multiple VMs with `for_each` or `count`.

## Wrapping Up

The vSphere provider brings Terraform's infrastructure-as-code approach to on-premises VMware environments. You can manage VMs, networking, storage, and organization all from your Terraform configuration. This is especially powerful in hybrid environments where you manage both cloud and on-premises resources.

For monitoring the VMs and services running in your vSphere environment, [OneUptime](https://oneuptime.com) provides agent-based and agentless monitoring that works across on-premises and cloud infrastructure.
