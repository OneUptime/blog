# How to Use Packer Data Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Packer, Data Source, AMI Lookup, Image Management

Description: Learn how to use OpenTofu data sources to find and reference Packer-built images across AWS, Azure, and GCP, with filtering strategies for different deployment scenarios.

## Introduction

OpenTofu data sources query the cloud provider's image catalog at plan time to find Packer-built images matching specific criteria. Understanding the available filters and how to combine them gives you precise control over which image version gets deployed.

## AWS: aws_ami Data Source

```hcl
# Find the most recent Packer-built image

data "aws_ami" "app_server" {
  most_recent = true
  owners      = ["self"]  # Only images owned by your account

  # Filter by Packer-set tags
  filter {
    name   = "tag:ManagedBy"
    values = ["Packer"]
  }

  filter {
    name   = "tag:Application"
    values = ["app-server"]
  }

  filter {
    name   = "tag:Environment"
    values = ["base"]  # Images built without env-specific config
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

output "latest_ami" {
  value = {
    id           = data.aws_ami.app_server.id
    name         = data.aws_ami.app_server.name
    version      = data.aws_ami.app_server.tags["Version"]
    build_date   = data.aws_ami.app_server.creation_date
  }
}
```

## AWS: Finding Images by Name Pattern

```hcl
# Find images matching a name pattern (glob)
data "aws_ami" "app_v1" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["app-server-1.*"]  # Wildcard matching
  }
}

# Find images from a shared AMI (cross-account)
data "aws_ami" "golden_image" {
  most_recent = true
  owners      = ["123456789012"]  # The account that shared the AMI

  filter {
    name   = "tag:Type"
    values = ["golden-image"]
  }
}
```

## AWS: Multiple Images for Different Services

```hcl
locals {
  services = {
    web      = { application = "web-server", env = "base" }
    api      = { application = "api-server", env = "base" }
    worker   = { application = "worker", env = "base" }
  }
}

data "aws_ami" "service_images" {
  for_each    = local.services
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "tag:Application"
    values = [each.value.application]
  }

  filter {
    name   = "tag:Environment"
    values = [each.value.env]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

resource "aws_launch_template" "services" {
  for_each = local.services

  name_prefix = "${each.key}-"
  image_id    = data.aws_ami.service_images[each.key].id
}
```

## Azure: azurerm_image Data Source

```hcl
# Find by name prefix with descending sort (most recent first)
data "azurerm_image" "app_server" {
  name_regex          = "^app-server-"
  sort_descending     = true
  resource_group_name = "packer-images-rg"
}

# Find a specific version
data "azurerm_image" "app_server_v2" {
  name                = "app-server-2-0-0"
  resource_group_name = "packer-images-rg"
}
```

## GCP: google_compute_image Data Source

```hcl
# Find latest image in a family
data "google_compute_image" "app_server" {
  project = var.project_id
  family  = "app-server"  # Points to latest image in the family
}

# Find by specific name
data "google_compute_image" "app_server_v1" {
  project = var.project_id
  name    = "app-server-1-0-0-20250115"
}

# Find latest image with label filters
data "google_compute_image" "app_server_prod" {
  project     = var.project_id
  filter      = "labels.application=app-server AND labels.stage=prod-ready"
  most_recent = true  # Required when the filter matches multiple images
}
```

## Validating Image Freshness

```hcl
# Use a check block to warn about stale images.
# RFC 3339 timestamps sort lexicographically, so a string ">" comparison
# is equivalent to a chronological comparison.
check "ami_freshness" {
  assert {
    condition     = data.aws_ami.app_server.creation_date > timeadd(timestamp(), "-720h")
    error_message = "Warning: AMI ${data.aws_ami.app_server.id} is more than 30 days old"
  }
}
```

## Conclusion

OpenTofu's cloud provider data sources provide multiple strategies for finding Packer images: tag-based filters for flexible querying, name patterns for version matching, and image families (GCP) or sort_descending (Azure) for latest-version lookups. The `for_each` pattern works well when you have multiple services each with their own Packer-built image, keeping all image references in a single configuration block.
