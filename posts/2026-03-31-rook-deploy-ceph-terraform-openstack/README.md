# How to Deploy Ceph with Terraform on OpenStack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Terraform, OpenStack, Infrastructure as Code, Kubernetes

Description: Use Terraform to provision VMs and Cinder volumes on OpenStack, then deploy Rook-Ceph on Kubernetes for on-premises distributed storage infrastructure.

---

OpenStack is a popular private cloud platform for running Ceph on-premises. Terraform's OpenStack provider automates VM provisioning, Cinder volume attachment, and Kubernetes cluster setup for a Rook-Ceph deployment.

## Project Structure

```text
ceph-openstack/
  main.tf
  network.tf
  compute.tf
  volumes.tf
  rook.tf
  variables.tf
```

## OpenStack Provider Configuration

```hcl
# main.tf
terraform {
  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 1.54"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
}

provider "openstack" {
  auth_url    = var.os_auth_url
  tenant_name = var.os_tenant_name
  user_name   = var.os_username
  password    = var.os_password
  region      = var.os_region
}
```

## Network Setup

```hcl
# network.tf
resource "openstack_networking_network_v2" "ceph_net" {
  name           = "ceph-network"
  admin_state_up = true
}

resource "openstack_networking_subnet_v2" "ceph_subnet" {
  name            = "ceph-subnet"
  network_id      = openstack_networking_network_v2.ceph_net.id
  cidr            = "192.168.100.0/24"
  ip_version      = 4
  dns_nameservers = ["8.8.8.8"]
}

resource "openstack_networking_router_v2" "ceph_router" {
  name                = "ceph-router"
  admin_state_up      = true
  external_network_id = var.external_network_id
}

resource "openstack_networking_router_interface_v2" "ceph_router_iface" {
  router_id = openstack_networking_router_v2.ceph_router.id
  subnet_id = openstack_networking_subnet_v2.ceph_subnet.id
}
```

## Compute Instances for Ceph Nodes

```hcl
# compute.tf
data "openstack_images_image_v2" "ubuntu" {
  name        = "Ubuntu-22.04"
  most_recent = true
}

resource "openstack_compute_instance_v2" "ceph_nodes" {
  count           = var.node_count
  name            = "ceph-node-${count.index}"
  image_id        = data.openstack_images_image_v2.ubuntu.id
  flavor_name     = var.node_flavor
  key_pair        = var.key_pair_name
  security_groups = [openstack_networking_secgroup_v2.ceph.name]

  network {
    uuid = openstack_networking_network_v2.ceph_net.id
  }

  metadata = {
    role = "ceph-storage"
  }
}

resource "openstack_networking_secgroup_v2" "ceph" {
  name = "ceph-secgroup"
}

resource "openstack_networking_secgroup_rule_v2" "ceph_mon" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 6789
  port_range_max    = 6789
  remote_ip_prefix  = "192.168.100.0/24"
  security_group_id = openstack_networking_secgroup_v2.ceph.id
}

resource "openstack_networking_secgroup_rule_v2" "ceph_osd" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 6800
  port_range_max    = 7300
  remote_ip_prefix  = "192.168.100.0/24"
  security_group_id = openstack_networking_secgroup_v2.ceph.id
}
```

## Cinder Volume Attachment for OSDs

```hcl
# volumes.tf
resource "openstack_blockstorage_volume_v3" "osd_volumes" {
  count = var.node_count * var.osds_per_node

  name        = "ceph-osd-vol-${count.index}"
  size        = var.osd_volume_size_gb
  volume_type = "ceph-ssd"

  metadata = {
    purpose = "ceph-osd"
  }
}

resource "openstack_compute_volume_attach_v2" "osd_attachments" {
  count = var.node_count * var.osds_per_node

  instance_id = openstack_compute_instance_v2.ceph_nodes[
    floor(count.index / var.osds_per_node)
  ].id
  volume_id = openstack_blockstorage_volume_v3.osd_volumes[count.index].id
}
```

## Variables

```hcl
# variables.tf
variable "os_auth_url" { type = string }
variable "os_tenant_name" { type = string }
variable "os_username" { type = string }
variable "os_password" { type = string; sensitive = true }
variable "os_region" { type = string; default = "RegionOne" }
variable "external_network_id" { type = string }
variable "node_count" { type = number; default = 3 }
variable "node_flavor" { type = string; default = "m1.xlarge" }
variable "key_pair_name" { type = string }
variable "osds_per_node" { type = number; default = 2 }
variable "osd_volume_size_gb" { type = number; default = 500 }
```

## Deploying

```bash
# Set OpenStack credentials
export TF_VAR_os_auth_url=https://openstack.example.com:5000/v3
export TF_VAR_os_password=<password>

terraform init
terraform plan
terraform apply

# After provisioning, install Kubernetes (kubeadm or k3s)
# then deploy Rook-Ceph via Helm
helm repo add rook-release https://charts.rook.io/release
helm install rook-ceph rook-release/rook-ceph -n rook-ceph --create-namespace
```

## Summary

Terraform's OpenStack provider automates provisioning of network resources, compute instances, and Cinder volume attachments for Rook-Ceph deployments in private cloud environments. This approach brings infrastructure-as-code discipline to on-premises OpenStack deployments, making Ceph cluster creation as repeatable as public cloud deployments.
