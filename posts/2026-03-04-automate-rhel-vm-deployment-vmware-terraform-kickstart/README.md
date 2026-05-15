# How to Automate RHEL VM Deployment in VMware Using Terraform and Kickstart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VMware, Terraform, Kickstart, Automation, Infrastructure as Code, Linux

Description: Automate the deployment of RHEL virtual machines on VMware vSphere using Terraform for infrastructure provisioning and Kickstart for unattended OS installation.

---

Combining Terraform with Kickstart lets you automate the RHEL VM deployment workflow on VMware. Terraform handles VM creation and resource allocation, while Kickstart handles unattended OS installation and configuration after the installer is started with the Kickstart boot option.

## Prerequisites

- Terraform installed on your workstation
- VMware vSphere environment with API access
- RHEL ISO uploaded to a vSphere datastore
- A web server hosting the Kickstart file

## Create a Kickstart File

Host this file on an HTTP server accessible from your vSphere network.

```bash
# /var/www/html/ks/rhel9-base.cfg

cat > rhel9-base.cfg << 'EOF'
# RHEL 9 Kickstart for VMware deployment
lang en_US.UTF-8
keyboard us
timezone America/New_York --utc
rootpw --iscrypted $6$rounds=4096$salt$hashedpassword
reboot

# Network configuration
network --bootproto=dhcp --device=ens192 --activate
network --hostname=rhel-vm

# Disk partitioning with LVM
clearpart --all --initlabel
autopart --type=lvm

# Package selection
%packages
@core
open-vm-tools
insights-client
%end

# Post-installation script
%post
systemctl enable vmtoolsd
subscription-manager register --username user --password pass --auto-attach
dnf update -y
%end
EOF
```

## Create the Terraform Configuration

```hcl
# main.tf - Terraform configuration for RHEL VM on vSphere

terraform {
  required_providers {
    vsphere = {
      source  = "vmware/vsphere"
      version = "~> 2.11"
    }
  }
}

variable "vsphere_user" {
  type = string
}

variable "vsphere_password" {
  type      = string
  sensitive = true
}

variable "vsphere_server" {
  type = string
}

# vSphere provider configuration
provider "vsphere" {
  user                 = var.vsphere_user
  password             = var.vsphere_password
  vsphere_server       = var.vsphere_server
  allow_unverified_ssl = true
}

# Data sources for existing vSphere resources
data "vsphere_datacenter" "dc" {
  name = "Datacenter1"
}

data "vsphere_datastore" "datastore" {
  name          = "datastore1"
  datacenter_id = data.vsphere_datacenter.dc.id
}

data "vsphere_compute_cluster" "cluster" {
  name          = "Cluster1"
  datacenter_id = data.vsphere_datacenter.dc.id
}

data "vsphere_network" "network" {
  name          = "VM Network"
  datacenter_id = data.vsphere_datacenter.dc.id
}

# Virtual machine resource
resource "vsphere_virtual_machine" "rhel_vm" {
  name             = "rhel9-server"
  resource_pool_id = data.vsphere_compute_cluster.cluster.resource_pool_id
  datastore_id     = data.vsphere_datastore.datastore.id

  num_cpus                   = 4
  memory                     = 8192
  guest_id                   = "rhel9_64Guest"
  wait_for_guest_net_timeout = 0
  wait_for_guest_ip_timeout  = 0

  # Use PVSCSI for best disk performance
  scsi_type = "pvscsi"

  network_interface {
    network_id   = data.vsphere_network.network.id
    adapter_type = "vmxnet3"
  }

  disk {
    label            = "disk0"
    size             = 50
    thin_provisioned = true
  }

  # Boot from the RHEL ISO
  cdrom {
    datastore_id = data.vsphere_datastore.datastore.id
    path         = "iso/rhel-9.4-x86_64-dvd.iso"
  }

  # Optional VM metadata for inventory; Anaconda reads the inst.ks boot option below.
  extra_config = {
    "guestinfo.kickstart" = "http://webserver.example.com/ks/rhel9-base.cfg"
  }
}
```

## Deploy the VM

```bash
# Initialize Terraform
terraform init

# Review the planned changes
terraform plan

# Apply the configuration to create the VM
terraform apply -auto-approve
```

## Append Kickstart to Boot Parameters

When the VM boots from the ISO, interrupt GRUB and add the Kickstart parameter:

```bash
inst.ks=http://webserver.example.com/ks/rhel9-base.cfg
```

For fully automated boot, configure the ISO or PXE to include this parameter by default.

## Verify Deployment

```bash
# SSH into the new VM after installation completes
ssh root@<vm-ip>

# Confirm the OS and tools
cat /etc/redhat-release
systemctl status vmtoolsd
```

With PXE or a custom ISO that includes the Kickstart boot option, this approach scales to deploying hundreds of identical RHEL VMs by adjusting the Terraform count or using `for_each` with a list of VM definitions.
