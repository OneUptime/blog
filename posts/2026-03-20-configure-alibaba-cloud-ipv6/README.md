# How to Configure Alibaba Cloud VPC with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Alibaba Cloud, VPC, Aliyun, Networking, Terraform

Description: Configure IPv6 on Alibaba Cloud VPC, enabling dual-stack networking on ECS instances with IPv6 internet access via IPv6 gateways.

## Introduction

Alibaba Cloud VPC supports IPv6 through a dual-stack model. IPv6 is enabled at the VPC level, then on VSwitch (subnet), and ECS instances. An IPv6 Gateway is required for IPv6 internet access, and when you enable IPv6 through API, CLI, or Terraform, Alibaba Cloud does not auto-create the gateway for you.

## Enabling IPv6 via Alibaba Cloud CLI

```bash
# Install Alibaba Cloud CLI using the official installer for your OS:
# https://help.aliyun.com/zh/cli/installation-guide/
#
# On CLI 3.3.0+, install the VPC plugin if needed
aliyun plugin list-remote
aliyun plugin install --names vpc

# Configure credentials
aliyun configure

# Enable IPv6 on existing VPC
aliyun vpc ModifyVpcAttribute \
  --VpcId "vpc-..." \
  --EnableIPv6 true

# Create VSwitch with IPv6
aliyun vpc CreateVSwitch \
  --VpcId "vpc-..." \
  --ZoneId "cn-hangzhou-h" \
  --CidrBlock "192.168.1.0/24" \
  --Ipv6CidrBlock "0"    # 0 = first /64 from VPC's /56

# Create IPv6 Gateway for IPv6 internet access
aliyun vpc CreateIpv6Gateway \
  --VpcId "vpc-..." \
  --Name "ipv6-gw"
```

## Terraform: Alibaba Cloud VPC with IPv6

```hcl
# provider.tf
provider "alicloud" {
  region     = "cn-hangzhou"
  access_key = var.access_key
  secret_key = var.secret_key
}

data "alicloud_zones" "available" {
  available_resource_creation = "VSwitch"
}

data "alicloud_instance_types" "ipv6" {
  availability_zone                 = data.alicloud_zones.available.zones[0].id
  system_disk_category              = "cloud_efficiency"
  minimum_eni_ipv6_address_quantity = 1
}

data "alicloud_images" "ubuntu" {
  name_regex  = "^ubuntu_22_04.*64"
  most_recent = true
  owners      = "system"
}

# VPC with IPv6 enabled
resource "alicloud_vpc" "main" {
  vpc_name    = "ipv6-vpc"
  cidr_block  = "192.168.0.0/16"
  enable_ipv6 = true
  ipv6_isp    = "BGP"

  # Alibaba Cloud auto-assigns a /56 IPv6 range to the VPC
}

# VSwitch (subnet) with IPv6 /64
resource "alicloud_vswitch" "public" {
  vpc_id               = alicloud_vpc.main.id
  cidr_block           = "192.168.1.0/24"
  zone_id              = data.alicloud_zones.available.zones[0].id
  vswitch_name         = "public-vswitch"
  enable_ipv6          = true
  ipv6_cidr_block_mask = 0  # 0 = first /64 from the VPC's /56
}

# ECS instance with dual-stack
resource "alicloud_instance" "web" {
  instance_name              = "web-server"
  availability_zone          = data.alicloud_zones.available.zones[0].id
  image_id                   = data.alicloud_images.ubuntu.images[0].id
  instance_type              = data.alicloud_instance_types.ipv6.instance_types[0].id
  system_disk_category       = "cloud_efficiency"
  vswitch_id                 = alicloud_vswitch.public.id
  security_groups            = [alicloud_security_group.web.id]
  ipv6_address_count         = 1  # Assign 1 IPv6 address

  internet_max_bandwidth_out = 10
  internet_charge_type       = "PayByTraffic"
}
```

## IPv6 Gateway and Bandwidth

```hcl
# IPv6 Gateway (required for IPv6 internet access)
resource "alicloud_vpc_ipv6_gateway" "gw" {
  ipv6_gateway_name = "ipv6-gw"
  vpc_id            = alicloud_vpc.main.id
}

data "alicloud_vpc_ipv6_addresses" "web" {
  associated_instance_id = alicloud_instance.web.id
  status                 = "Available"
}

# Assign public bandwidth to IPv6 addresses
resource "alicloud_vpc_ipv6_internet_bandwidth" "bw" {
  ipv6_address_id      = data.alicloud_vpc_ipv6_addresses.web.addresses[0].id
  internet_charge_type = "PayByBandwidth"
  bandwidth            = 100  # Mbps
  ipv6_gateway_id      = alicloud_vpc_ipv6_gateway.gw.ipv6_gateway_id
}
```

## Security Group for IPv6

```hcl
resource "alicloud_security_group" "web" {
  security_group_name = "web-sg"
  vpc_id              = alicloud_vpc.main.id
}

# Allow IPv6 HTTP
resource "alicloud_security_group_rule" "http_ipv6" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "80/80"
  priority          = 1
  security_group_id = alicloud_security_group.web.id
  ipv6_cidr_ip      = "::/0"
}
```

## Verifying IPv6 on ECS

```bash
# SSH into instance (via IPv4 initially)
# Check IPv6 address assigned
ip -6 addr show
# inet6 2408:4001:...::/128 scope global dynamic

# Test internet connectivity
ping -6 2001:4860:4860::8888
curl -6 https://ifconfig.co

# Verify routing
ip -6 route show
# default via fe80::1 dev <interface> proto ra
```

## Conclusion

Alibaba Cloud VPC IPv6 requires an IPv6 Gateway for internet access and explicit bandwidth assignment to each IPv6 address. Enable IPv6 on both the VPC and VSwitch, then assign `/64` VSwitches with `ipv6_cidr_block_mask`. Use `alicloud_vpc_ipv6_internet_bandwidth` with the IPv6 address resource ID to control per-instance IPv6 egress bandwidth. Monitor Alibaba Cloud ECS instance IPv6 availability with OneUptime.
