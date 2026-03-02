# How to Use Data Sources with Filters in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Data Source, Filter, AWS, Infrastructure as Code

Description: Learn how to use filter blocks in Terraform data sources to query cloud resources by attributes, tags, and states for dynamic infrastructure configuration.

---

Terraform data sources let you look up existing infrastructure. But when your cloud account has hundreds of VPCs, thousands of subnets, and dozens of AMIs, you need a way to narrow down the results. Filter blocks solve this. They let you query resources by their attributes, tags, states, and other properties - returning exactly the resources you need.

Most AWS data sources support filter blocks that map directly to the AWS API's filter parameters. Azure and GCP have their own filtering mechanisms. This post focuses primarily on the AWS filter pattern since it is the most widely used, but the concepts apply across providers.

## Basic Filter Syntax

Filters are defined as blocks within a data source. Each filter has a `name` (the attribute to filter on) and `values` (a list of acceptable values).

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}
```

The `name` field corresponds to the AWS API filter name, and `values` is a list - the filter matches if the attribute equals any of the provided values.

## Multiple Filters (AND Logic)

When you define multiple filter blocks, they combine with AND logic. A resource must match all filters to be returned.

```hcl
data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]

  # Filter 1: Must match the name pattern
  filter {
    name   = "name"
    values = ["app-server-*"]
  }

  # Filter 2: Must be an HVM image
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  # Filter 3: Must be an EBS-backed image
  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }

  # Filter 4: Must be available (not pending or deregistered)
  filter {
    name   = "state"
    values = ["available"]
  }
}
```

This returns only AMIs that match all four conditions: name pattern, HVM virtualization, EBS root device, and available state.

## Multiple Values (OR Logic Within a Filter)

Within a single filter, multiple values work as OR logic. The attribute can match any of the listed values.

```hcl
data "aws_instances" "web_servers" {
  filter {
    name   = "instance-type"
    values = ["t3.medium", "t3.large", "t3.xlarge"]  # Any of these types
  }

  filter {
    name   = "instance-state-name"
    values = ["running"]
  }
}
```

This finds all running instances of type t3.medium OR t3.large OR t3.xlarge.

## Filtering by Tags

Tags are the most common filter criteria. The filter name for tags follows the pattern `tag:KeyName`.

```hcl
data "aws_vpc" "production" {
  filter {
    name   = "tag:Environment"
    values = ["production"]
  }

  filter {
    name   = "tag:ManagedBy"
    values = ["terraform"]
  }
}
```

This finds a VPC tagged with `Environment=production` AND `ManagedBy=terraform`.

### Filtering by Tag Existence

You can also check if a tag exists (regardless of its value):

```hcl
data "aws_instances" "tagged" {
  filter {
    name   = "tag-key"
    values = ["Environment"]  # Has any Environment tag
  }
}
```

Or filter by tag value regardless of key:

```hcl
data "aws_instances" "production" {
  filter {
    name   = "tag-value"
    values = ["production"]  # Any tag with value "production"
  }
}
```

## Wildcard Patterns

Many AWS filters support wildcards. The `*` character matches any number of characters.

```hcl
data "aws_ami" "recent" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["web-server-2026-*"]  # Matches web-server-2026-01, web-server-2026-02-15, etc.
  }
}
```

## Common Filter Use Cases

### Finding Subnets by Tier

```hcl
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }

  tags = {
    Tier = "private"
  }
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }

  tags = {
    Tier = "public"
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = data.aws_subnets.private.ids[0]
}
```

### Finding Security Groups by Name Pattern

```hcl
data "aws_security_groups" "app" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }

  filter {
    name   = "group-name"
    values = ["app-*"]
  }
}

output "app_security_group_ids" {
  value = data.aws_security_groups.app.ids
}
```

### Finding EBS Volumes by State

```hcl
data "aws_ebs_volumes" "available" {
  filter {
    name   = "status"
    values = ["available"]  # Not attached to any instance
  }

  filter {
    name   = "tag:Environment"
    values = [var.environment]
  }
}

output "unattached_volumes" {
  value = data.aws_ebs_volumes.available.ids
}
```

### Finding Running Instances by Multiple Criteria

```hcl
data "aws_instances" "app_servers" {
  filter {
    name   = "instance-state-name"
    values = ["running"]
  }

  filter {
    name   = "tag:Application"
    values = ["web-app"]
  }

  filter {
    name   = "tag:Environment"
    values = [var.environment]
  }

  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
}

output "app_server_ips" {
  value = data.aws_instances.app_servers.private_ips
}
```

### Finding Snapshots for Restore

```hcl
data "aws_ebs_snapshot" "latest_backup" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "tag:Application"
    values = ["database"]
  }

  filter {
    name   = "tag:Environment"
    values = ["production"]
  }

  filter {
    name   = "status"
    values = ["completed"]
  }
}

resource "aws_ebs_volume" "restored" {
  availability_zone = var.az
  snapshot_id       = data.aws_ebs_snapshot.latest_backup.id
  size              = data.aws_ebs_snapshot.latest_backup.volume_size

  tags = {
    Name = "restored-from-${data.aws_ebs_snapshot.latest_backup.id}"
  }
}
```

## The tags Argument vs. filter Blocks

Some AWS data sources offer both a `tags` argument and filter blocks. The `tags` argument is a shorthand for tag filters.

```hcl
# Using the tags argument (shorthand)
data "aws_vpc" "main" {
  tags = {
    Environment = "production"
    Team        = "platform"
  }
}

# Equivalent using filter blocks
data "aws_vpc" "main" {
  filter {
    name   = "tag:Environment"
    values = ["production"]
  }

  filter {
    name   = "tag:Team"
    values = ["platform"]
  }
}
```

Both produce the same result. The `tags` argument is more concise. Use filter blocks when you need wildcard matching or OR logic in tag values.

## Dynamic Filters

You can build filters dynamically using `dynamic` blocks:

```hcl
variable "instance_filters" {
  type = map(list(string))
  default = {
    "instance-state-name" = ["running"]
    "instance-type"       = ["t3.medium", "t3.large"]
  }
}

data "aws_instances" "filtered" {
  dynamic "filter" {
    for_each = var.instance_filters
    content {
      name   = filter.key
      values = filter.value
    }
  }

  filter {
    name   = "tag:Environment"
    values = [var.environment]
  }
}
```

This lets callers of your module customize the filters without modifying the data source definition.

## Handling No Results

If a filter returns no results, most data sources fail with an error. Handle this carefully:

```hcl
# This fails if no matching instances exist
data "aws_instances" "app" {
  filter {
    name   = "tag:App"
    values = ["nonexistent"]
  }
}
```

For data sources that return lists (like `aws_instances`, `aws_subnets`), an empty result typically returns an empty list rather than an error. For singular data sources (like `aws_ami`, `aws_vpc`), no match is an error.

To handle potential misses:

```hcl
# Use count to make the lookup conditional
data "aws_ami" "custom" {
  count       = var.use_custom_ami ? 1 : 0
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = [var.custom_ami_pattern]
  }
}

locals {
  ami_id = var.use_custom_ami ? data.aws_ami.custom[0].id : var.default_ami_id
}
```

## Azure Filter Patterns

Azure data sources use different filtering mechanisms. Instead of filter blocks, they typically use arguments.

```hcl
data "azurerm_virtual_network" "main" {
  name                = "production-vnet"
  resource_group_name = "networking-rg"
}

data "azurerm_subnet" "app" {
  name                 = "app-subnet"
  virtual_network_name = data.azurerm_virtual_network.main.name
  resource_group_name  = "networking-rg"
}
```

## GCP Filter Patterns

GCP data sources often use a `filter` string rather than blocks:

```hcl
data "google_compute_instances" "app" {
  filter = "labels.environment=${var.environment} AND labels.role=app"
  zone   = var.zone
}
```

## Summary

Filters are what make data sources practical in real-world environments. Without them, you would need exact IDs for every lookup. With filters, you can find resources by name patterns, tags, states, types, and any other attribute the cloud API exposes. Use multiple filter blocks for AND logic, multiple values within a filter for OR logic, and wildcards for pattern matching.

For specific filter examples, see our posts on [dynamic AMI lookup](https://oneuptime.com/blog/post/2026-02-23-terraform-dynamic-ami-lookup/view) and [availability zone discovery](https://oneuptime.com/blog/post/2026-02-23-terraform-availability-zone-discovery/view).
