# How to Create Alibaba Cloud VPCs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Alibaba Cloud, VPC, Networking, Infrastructure as Code

Description: Learn how to create Alibaba Cloud VPCs and VSwitches with OpenTofu for isolated, private cloud networking.

Alibaba Cloud VPCs (Virtual Private Clouds) provide isolated network environments for your cloud resources. VSwitches (subnets) divide the VPC across availability zones. OpenTofu lets you define the complete VPC topology as code.

## Creating a VPC

```hcl
resource "alicloud_vpc" "production" {
  vpc_name    = "production-vpc"
  cidr_block  = "10.0.0.0/16"
  description = "Production VPC for application workloads"

  tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}

output "vpc_id" {
  value = alicloud_vpc.production.id
}
```

## Listing Available Zones

```hcl
data "alicloud_zones" "available" {
  available_resource_creation = "VSwitch"
}
```

## Creating VSwitches (Subnets)

```hcl
# Public VSwitch in Zone A

resource "alicloud_vswitch" "public_a" {
  vswitch_name = "public-vsw-a"
  vpc_id       = alicloud_vpc.production.id
  cidr_block   = "10.0.1.0/24"
  zone_id      = data.alicloud_zones.available.zones[0].id
}

# Public VSwitch in Zone B for HA
resource "alicloud_vswitch" "public_b" {
  vswitch_name = "public-vsw-b"
  vpc_id       = alicloud_vpc.production.id
  cidr_block   = "10.0.2.0/24"
  zone_id      = data.alicloud_zones.available.zones[1].id
}

# Private VSwitch in Zone A
resource "alicloud_vswitch" "private_a" {
  vswitch_name = "private-vsw-a"
  vpc_id       = alicloud_vpc.production.id
  cidr_block   = "10.0.11.0/24"
  zone_id      = data.alicloud_zones.available.zones[0].id
}
```

## Creating Multiple VSwitches with for_each

```hcl
variable "vswitches" {
  type = map(object({
    cidr_block = string
    zone_index = number
  }))
  default = {
    "web-a"  = { cidr_block = "10.0.1.0/24", zone_index = 0 }
    "web-b"  = { cidr_block = "10.0.2.0/24", zone_index = 1 }
    "app-a"  = { cidr_block = "10.0.11.0/24", zone_index = 0 }
    "db-a"   = { cidr_block = "10.0.21.0/24", zone_index = 0 }
  }
}

resource "alicloud_vswitch" "main" {
  for_each = var.vswitches

  vswitch_name = each.key
  vpc_id       = alicloud_vpc.production.id
  cidr_block   = each.value.cidr_block
  zone_id      = data.alicloud_zones.available.zones[each.value.zone_index].id
}
```

## Adding a NAT Gateway for Private VSwitches

```hcl
resource "alicloud_nat_gateway" "main" {
  vpc_id           = alicloud_vpc.production.id
  nat_gateway_name = "production-nat"
  payment_type     = "PayAsYouGo"
  nat_type         = "Enhanced"
  vswitch_id       = alicloud_vswitch.public_a.id
}

resource "alicloud_eip_address" "nat" {
  address_name = "nat-eip"
  payment_type = "PayAsYouGo"
}

resource "alicloud_eip_association" "nat" {
  allocation_id = alicloud_eip_address.nat.id
  instance_id   = alicloud_nat_gateway.main.id
  instance_type = "Nat"
}
```

## VPC Peering

```hcl
resource "alicloud_vpc_peer_connection" "peer" {
  peer_connection_name = "prod-to-dev"
  vpc_id               = alicloud_vpc.production.id
  accepting_ali_uid    = var.peer_account_id
  accepting_region_id  = "cn-hangzhou"
  accepting_vpc_id     = var.peer_vpc_id
}
```

## Conclusion

Alibaba Cloud VPC networking in OpenTofu starts with a VPC and VSwitches per availability zone. Use `for_each` to create multiple VSwitches cleanly, add a NAT Gateway with an EIP for outbound internet access from private VSwitches, and reference zone IDs from the `alicloud_zones` data source to avoid hardcoding availability zone names.
