# How to Configure Alibaba Cloud IPv6 Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Alibaba Cloud, IPv6, VPC, ECS, Dual-Stack, China

Description: Configure IPv6 on Alibaba Cloud ECS instances and VPC for dual-stack deployments including China region specifics.

## Introduction

Alibaba Cloud IPv6 Networking covers the provider-specific steps needed to enable IPv6 on VPCs and vSwitches, assign IPv6 addresses to ECS instances, enable Internet reachability when required, and validate end-to-end IPv6 connectivity.

## Step 1: Enable IPv6 on the Instance/Resource

```bash
# On Alibaba Cloud, enable IPv6 on the VPC and target vSwitch first.
# IPv6 is available only in regions that support the IPv4/IPv6 dual stack.
# If you need Internet access, create an IPv6 gateway if one is not created
# automatically and enable IPv6 Internet bandwidth for the instance IPv6 address.

# After the IPv6 address is assigned to the ECS instance ENI, verify it locally
ip -6 addr show
```

## Step 2: Configure the Network Interface

```bash
# After assigning IPv6, check whether the OS already recognizes the address
ip -6 addr show

# Compare the instance configuration with Alibaba Cloud instance metadata
MAC=$(curl -s http://100.100.100.200/latest/meta-data/mac)
curl -s http://100.100.100.200/latest/meta-data/network/interfaces/macs/${MAC}/ipv6s && echo
curl -s http://100.100.100.200/latest/meta-data/network/interfaces/macs/${MAC}/ipv6-gateway && echo

# Recommended on supported Linux images: configure IPv6 with Cloud Assistant
sudo acs-plugin-manager --exec --plugin=ecs-utils-ipv6

# Recheck address and route state after configuration
ip -6 addr show
ip -6 route show
```

## Step 3: Configure Firewall Rules for IPv6

```bash
# On Alibaba Cloud, allow IPv6 in both the ECS security group and the guest OS firewall.
# Typical rules include ICMPv6 plus only the application ports you need.

# Allow loopback traffic
ip6tables -A INPUT -i lo -j ACCEPT

# Allow ICMPv6 (required for IPv6 operation)
ip6tables -A INPUT -p ipv6-icmp -j ACCEPT
ip6tables -A OUTPUT -p ipv6-icmp -j ACCEPT

# Allow established connections
ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH over IPv6
ip6tables -A INPUT -s 2001:db8:100::/48 -p tcp --dport 22 -j ACCEPT

# Default deny
ip6tables -P INPUT DROP
```

## Step 4: DNS Configuration for IPv6

```bash
# Add AAAA record for the instance hostname
# (In Alibaba Cloud DNS or your authoritative DNS provider)
# Alibaba Cloud DNS PTR management applies to public IPv4 addresses, not IPv6.

# Verify resolution
dig +short AAAA myhost.example.com
# Should return the IPv6 address
```

## Step 5: Test IPv6 Connectivity

```bash
# Test outbound IPv6
ping -6 -c 3 aliyun.com

# Test inbound IPv6 after security-group rules and IPv6 Internet bandwidth are in place
curl -6 http://[2001:db8::1]/health

# Verify dual-stack (both IPv4 and IPv6 work)
curl -4 http://myhost.example.com/health
curl -6 http://myhost.example.com/health
```

## Step 6: Infrastructure as Code

```terraform
data "alicloud_zones" "default" {
  available_resource_creation = "VSwitch"
}

variable "image_id" {
  type = string
}

variable "instance_type" {
  type = string
}

resource "alicloud_vpc" "main" {
  vpc_name    = "ipv6-vpc"
  cidr_block  = "172.16.0.0/12"
  enable_ipv6 = true
}

resource "alicloud_vswitch" "main" {
  vpc_id               = alicloud_vpc.main.id
  zone_id              = data.alicloud_zones.default.zones[0].id
  cidr_block           = "172.16.0.0/21"
  vswitch_name         = "ipv6-vswitch"
  enable_ipv6          = true
  ipv6_cidr_block_mask = "22"
}

resource "alicloud_security_group" "main" {
  security_group_name = "ipv6-sg"
  vpc_id              = alicloud_vpc.main.id
}

resource "alicloud_instance" "main" {
  # Use an ECS instance type that supports IPv6 addresses on the ENI
  instance_name        = "ipv6-instance"
  image_id             = var.image_id
  instance_type        = var.instance_type
  system_disk_category = "cloud_essd"
  vswitch_id           = alicloud_vswitch.main.id
  security_groups      = [alicloud_security_group.main.id]
  ipv6_address_count   = 1
}

resource "alicloud_vpc_ipv6_gateway" "main" {
  ipv6_gateway_name = "ipv6-gateway"
  vpc_id            = alicloud_vpc.main.id
}

data "alicloud_vpc_ipv6_addresses" "main" {
  associated_instance_id = alicloud_instance.main.id
  status                 = "Available"
}

resource "alicloud_vpc_ipv6_internet_bandwidth" "main" {
  ipv6_address_id      = data.alicloud_vpc_ipv6_addresses.main.addresses[0].id
  ipv6_gateway_id      = alicloud_vpc_ipv6_gateway.main.ipv6_gateway_id
  internet_charge_type = "PayByBandwidth"
  bandwidth            = "10"
}
```

## Common Issues

```bash
# Issue: IPv6 address not assigned or not visible in the OS
ip -6 addr show
MAC=$(curl -s http://100.100.100.200/latest/meta-data/mac)
curl -s http://100.100.100.200/latest/meta-data/network/interfaces/macs/${MAC}/ipv6s && echo

# Issue: No IPv6 Internet connectivity
ip -6 route show
# Confirm IPv6 Internet bandwidth is enabled for the IPv6 address

# Issue: Can't ping IPv6 address
# Check the ECS security group, host firewall, and any egress-only rule
ip6tables -L INPUT -n -v
```

## Conclusion

Alibaba Cloud IPv6 Networking requires enabling IPv6 on the VPC and vSwitch, assigning IPv6 addresses to ECS ENIs, enabling IPv6 Internet bandwidth when Internet reachability is required, configuring security groups and host firewall rules that permit ICMPv6, and verifying end-to-end connectivity. Use Infrastructure as Code (Terraform) to ensure consistent IPv6 configuration across all instances. Monitor IPv6 endpoint availability with OneUptime from IPv6 vantage points.
