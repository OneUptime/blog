# How to Generate Random Shuffled Lists with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Random Provider, Shuffle, Infrastructure as Code, Load Balancing

Description: Learn how to generate randomly shuffled lists with Terraform using the random_shuffle resource for load distribution, failover ordering, and randomized configurations.

---

The random_shuffle resource in Terraform takes a list of values and returns them in a random order. This is useful for distributing workloads across resources, creating randomized failover orders, selecting random subsets of availability zones, and any scenario where you want non-deterministic ordering of a known set of values.

In this guide, we will explore the random_shuffle resource with practical examples. We will cover basic shuffling, subset selection with result_count, keeper-based regeneration, and real-world use cases for shuffled lists in infrastructure configuration.

## Understanding random_shuffle

The random_shuffle resource accepts an input list and produces a result list with the same elements in a random order. Optionally, you can use the result_count parameter to select only a subset of the shuffled list. Like all random provider resources, the shuffled order is stored in state and remains consistent across applies unless keepers change.

## Basic Setup

```hcl
# main.tf - Provider configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Basic List Shuffling

```hcl
# basic.tf - Simple list shuffling
resource "random_shuffle" "example" {
  input = ["alpha", "beta", "gamma", "delta", "epsilon"]
}

output "shuffled" {
  value = random_shuffle.example.result
  # Example: ["gamma", "alpha", "epsilon", "delta", "beta"]
}
```

## Shuffling Availability Zones

Distribute resources across availability zones in random order to avoid hotspots:

```hcl
# az-shuffle.tf - Randomize AZ distribution
data "aws_availability_zones" "available" {
  state = "available"
}

resource "random_shuffle" "az_order" {
  input = data.aws_availability_zones.available.names

  # Only select 3 AZs even if more are available
  result_count = 3
}

# Use the shuffled AZs for subnet creation
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = var.vpc_id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = random_shuffle.az_order.result[count.index]

  tags = {
    Name = "private-${random_shuffle.az_order.result[count.index]}"
    Tier = "private"
  }
}

variable "vpc_id" {
  type    = string
  default = "vpc-12345"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

output "selected_azs" {
  value = random_shuffle.az_order.result
}
```

## Randomizing DNS Failover Order

Create a random priority order for DNS failover records:

```hcl
# dns-failover.tf - Randomize failover priorities
variable "backend_ips" {
  description = "IP addresses of backend servers"
  type        = list(string)
  default     = ["10.0.1.10", "10.0.2.10", "10.0.3.10", "10.0.4.10"]
}

resource "random_shuffle" "backend_order" {
  input = var.backend_ips

  keepers = {
    # Reshuffle weekly to distribute load
    rotation_week = formatdate("YYYY-WW", timestamp())
  }
}

# Create weighted DNS records with shuffled priorities
resource "aws_route53_record" "backend" {
  count   = length(var.backend_ips)
  zone_id = var.zone_id
  name    = "api.example.com"
  type    = "A"
  ttl     = 300

  weighted_routing_policy {
    # Higher weight for earlier positions in shuffled list
    weight = length(var.backend_ips) - count.index
  }

  set_identifier = "backend-${count.index}"
  records        = [random_shuffle.backend_order.result[count.index]]
}

variable "zone_id" {
  type    = string
  default = "Z1234567890"
}
```

## Selecting a Random Subset

Use result_count to select a random subset of items:

```hcl
# subset.tf - Select random subsets
variable "all_regions" {
  type = list(string)
  default = [
    "us-east-1", "us-west-2", "eu-west-1",
    "eu-central-1", "ap-southeast-1", "ap-northeast-1"
  ]
}

# Select 3 random regions for a multi-region deployment
resource "random_shuffle" "deployment_regions" {
  input        = var.all_regions
  result_count = 3

  keepers = {
    deployment_id = var.deployment_id
  }
}

variable "deployment_id" {
  type    = string
  default = "deploy-001"
}

output "selected_regions" {
  value = random_shuffle.deployment_regions.result
  # Example: ["eu-west-1", "us-east-1", "ap-northeast-1"]
}
```

## Distributing Workloads Across Shards

Shuffle assignment of workloads to database shards:

```hcl
# shard-distribution.tf - Distribute tenants across shards
variable "database_shards" {
  type    = list(string)
  default = ["shard-a", "shard-b", "shard-c", "shard-d"]
}

variable "tenant_groups" {
  type = list(string)
  default = [
    "group-1", "group-2", "group-3", "group-4",
    "group-5", "group-6", "group-7", "group-8"
  ]
}

# Shuffle shards for each tenant group assignment
resource "random_shuffle" "shard_assignment" {
  input = var.database_shards

  keepers = {
    # Reshuffle when shards change
    shard_count = length(var.database_shards)
  }
}

locals {
  # Assign tenant groups to shards in round-robin from shuffled order
  tenant_shard_map = {
    for idx, group in var.tenant_groups :
    group => random_shuffle.shard_assignment.result[idx % length(var.database_shards)]
  }
}

output "tenant_shard_assignments" {
  value = local.tenant_shard_map
}
```

## Randomizing Test Data Sources

Select random test data fixtures for integration testing:

```hcl
# test-data.tf - Random test configurations
variable "test_scenarios" {
  type = list(string)
  default = [
    "high-load",
    "slow-network",
    "database-failover",
    "cache-miss",
    "concurrent-writes",
    "large-payload",
    "timeout-simulation"
  ]
}

# Select 3 random scenarios for each test run
resource "random_shuffle" "test_scenarios" {
  input        = var.test_scenarios
  result_count = 3

  keepers = {
    test_run = var.test_run_id
  }
}

variable "test_run_id" {
  type    = string
  default = "run-001"
}

output "selected_scenarios" {
  value = random_shuffle.test_scenarios.result
}
```

## Shuffling for Blue-Green Deployments

Randomize the order of instance replacement during blue-green deployments:

```hcl
# blue-green.tf - Randomize replacement order
variable "instance_ids" {
  type = list(string)
  default = [
    "i-001", "i-002", "i-003",
    "i-004", "i-005", "i-006"
  ]
}

resource "random_shuffle" "replacement_order" {
  input = var.instance_ids

  keepers = {
    # New order for each deployment
    deploy_version = var.app_version
  }
}

variable "app_version" {
  type    = string
  default = "2.0.0"
}

output "replacement_order" {
  description = "Order in which instances will be replaced"
  value       = random_shuffle.replacement_order.result
}
```

## Using Keepers for Controlled Re-Shuffling

```hcl
# keepers.tf - Different keeper strategies
# Shuffle once, never change
resource "random_shuffle" "stable" {
  input = ["a", "b", "c", "d", "e"]
}

# Shuffle on every deployment
resource "random_shuffle" "per_deploy" {
  input = ["a", "b", "c", "d", "e"]
  keepers = {
    deploy_time = timestamp()
  }
}

# Shuffle when the input list changes
resource "random_shuffle" "on_change" {
  input = var.dynamic_list
  keepers = {
    list_hash = md5(join(",", var.dynamic_list))
  }
}

variable "dynamic_list" {
  type    = list(string)
  default = ["x", "y", "z"]
}
```

## Conclusion

The random_shuffle resource is a simple but powerful tool for introducing controlled randomness into your infrastructure configurations. Whether you are distributing resources across availability zones, randomizing failover priorities, or selecting test scenarios, shuffled lists help you avoid predictable patterns that could lead to hotspots or biased testing. Combined with keepers, you have full control over when re-shuffling occurs. For other random value needs, check out [random integers](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-random-integers-with-terraform/view) and [the random provider overview](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-random-provider-for-unique-names-in-terraform/view).
