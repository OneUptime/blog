# How to Create Terraform Modules That Support Multiple Regions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Multi-Region, AWS, Disaster Recovery, Infrastructure as Code

Description: Design Terraform modules that deploy infrastructure across multiple regions for high availability, disaster recovery, and global user proximity with practical patterns.

---

Deploying infrastructure across multiple regions is a common requirement for disaster recovery, regulatory compliance, and serving users globally. But multi-region Terraform configurations can get messy fast if you do not design your modules with region flexibility from the start. This post covers the patterns that make multi-region modules clean and maintainable.

## The Provider Aliasing Approach

The foundation of multi-region modules is provider aliases. You create multiple provider configurations, one per region, and pass them to your modules.

```hcl
# Root module - configure providers for each region
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu_west_1"
  region = "eu-west-1"
}

provider "aws" {
  alias  = "ap_southeast_1"
  region = "ap-southeast-1"
}

# Deploy the same module to each region
module "vpc_us" {
  source = "./modules/vpc"
  providers = {
    aws = aws.us_east_1
  }

  name       = "app-us-east-1"
  cidr_block = "10.0.0.0/16"
}

module "vpc_eu" {
  source = "./modules/vpc"
  providers = {
    aws = aws.eu_west_1
  }

  name       = "app-eu-west-1"
  cidr_block = "10.1.0.0/16"
}

module "vpc_ap" {
  source = "./modules/vpc"
  providers = {
    aws = aws.ap_southeast_1
  }

  name       = "app-ap-southeast-1"
  cidr_block = "10.2.0.0/16"
}
```

## Region Configuration Map Pattern

Instead of repeating module blocks, define your regions in a map and use `for_each`. Note that this requires some creative structuring since you cannot directly use `for_each` with different providers.

```hcl
# Define region configurations
locals {
  regions = {
    us_east_1 = {
      cidr_block = "10.0.0.0/16"
      azs        = ["us-east-1a", "us-east-1b", "us-east-1c"]
      primary    = true
    }
    eu_west_1 = {
      cidr_block = "10.1.0.0/16"
      azs        = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
      primary    = false
    }
    ap_southeast_1 = {
      cidr_block = "10.2.0.0/16"
      azs        = ["ap-southeast-1a", "ap-southeast-1b", "ap-southeast-1c"]
      primary    = false
    }
  }
}

# Unfortunately, you cannot use for_each with different providers
# So you need one module block per region, but the config comes from the map
module "vpc_us_east_1" {
  source = "./modules/vpc"
  providers = {
    aws = aws.us_east_1
  }

  name               = "app-us-east-1"
  cidr_block         = local.regions["us_east_1"].cidr_block
  availability_zones = local.regions["us_east_1"].azs
  is_primary         = local.regions["us_east_1"].primary
}

module "vpc_eu_west_1" {
  source = "./modules/vpc"
  providers = {
    aws = aws.eu_west_1
  }

  name               = "app-eu-west-1"
  cidr_block         = local.regions["eu_west_1"].cidr_block
  availability_zones = local.regions["eu_west_1"].azs
  is_primary         = local.regions["eu_west_1"].primary
}
```

## Building Region-Aware Modules

Design your modules to accept region-specific configuration without hardcoding any region values.

```hcl
# modules/vpc/variables.tf
variable "name" {
  description = "Name prefix for VPC resources"
  type        = string
}

variable "cidr_block" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
}

variable "is_primary" {
  description = "Whether this is the primary region"
  type        = bool
  default     = false
}

variable "enable_nat_gateway" {
  description = "Whether to create NAT gateways"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/vpc/main.tf
# The module does NOT reference any specific region
# It gets the region from the provider passed to it

data "aws_region" "current" {}

resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.tags, {
    Name    = var.name
    Region  = data.aws_region.current.name
    Primary = var.is_primary
  })
}

# Subnets distributed across provided AZs
resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.cidr_block, 4, count.index)
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name = "${var.name}-private-${var.availability_zones[count.index]}"
    Tier = "private"
  })
}

resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.cidr_block, 4, count.index + length(var.availability_zones))
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name = "${var.name}-public-${var.availability_zones[count.index]}"
    Tier = "public"
  })
}
```

## Cross-Region Data Replication Module

A common multi-region pattern is replicating data between regions for disaster recovery.

```hcl
# modules/s3-replication/main.tf
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.source, aws.destination]
    }
  }
}

# Source bucket
resource "aws_s3_bucket" "source" {
  provider = aws.source
  bucket   = "${var.name}-source"
  tags     = var.tags
}

resource "aws_s3_bucket_versioning" "source" {
  provider = aws.source
  bucket   = aws_s3_bucket.source.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Destination bucket
resource "aws_s3_bucket" "destination" {
  provider = aws.destination
  bucket   = "${var.name}-replica"
  tags     = var.tags
}

resource "aws_s3_bucket_versioning" "destination" {
  provider = aws.destination
  bucket   = aws_s3_bucket.destination.id
  versioning_configuration {
    status = "Enabled"
  }
}

# IAM role for replication
resource "aws_iam_role" "replication" {
  provider = aws.source
  name     = "${var.name}-s3-replication"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })
}

# Replication configuration
resource "aws_s3_bucket_replication_configuration" "this" {
  provider = aws.source
  bucket   = aws_s3_bucket.source.id
  role     = aws_iam_role.replication.arn

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.destination.arn
      storage_class = "STANDARD"
    }
  }

  depends_on = [
    aws_s3_bucket_versioning.source,
    aws_s3_bucket_versioning.destination
  ]
}
```

## Multi-Region Database Module

For databases, multi-region typically means a primary with read replicas.

```hcl
# modules/rds-multi-region/main.tf
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.primary, aws.replica]
    }
  }
}

# Primary database
resource "aws_db_instance" "primary" {
  provider = aws.primary

  identifier     = "${var.name}-primary"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.storage_gb
  storage_encrypted     = true
  multi_az              = true
  db_subnet_group_name  = var.primary_subnet_group
  vpc_security_group_ids = var.primary_security_groups

  backup_retention_period = 7
  username               = var.db_username
  password               = var.db_password

  tags = merge(var.tags, {
    Role = "primary"
  })
}

# Cross-region read replica
resource "aws_db_instance" "replica" {
  provider = aws.replica

  identifier          = "${var.name}-replica"
  replicate_source_db = aws_db_instance.primary.arn
  instance_class      = var.replica_instance_class

  storage_encrypted          = true
  db_subnet_group_name       = var.replica_subnet_group
  vpc_security_group_ids     = var.replica_security_groups

  # Replica-specific settings
  backup_retention_period = 1
  skip_final_snapshot     = true

  tags = merge(var.tags, {
    Role = "replica"
  })
}
```

## Global Routing with Route 53

Tie multi-region deployments together with DNS-based routing:

```hcl
# modules/global-routing/main.tf

# Health checks for each regional endpoint
resource "aws_route53_health_check" "regional" {
  for_each = var.regional_endpoints

  fqdn              = each.value.health_check_fqdn
  port               = each.value.health_check_port
  type               = "HTTPS"
  resource_path      = each.value.health_check_path
  failure_threshold  = 3
  request_interval   = 30

  tags = merge(var.tags, {
    Name   = "${var.name}-${each.key}-health"
    Region = each.key
  })
}

# Latency-based routing records
resource "aws_route53_record" "regional" {
  for_each = var.regional_endpoints

  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = each.value.alb_dns_name
    zone_id                = each.value.alb_zone_id
    evaluate_target_health = true
  }

  latency_routing_policy {
    region = each.value.aws_region
  }

  set_identifier  = each.key
  health_check_id = aws_route53_health_check.regional[each.key].id
}
```

```hcl
# Usage in root module
module "global_routing" {
  source = "./modules/global-routing"

  name           = "myapp"
  domain_name    = "api.myapp.com"
  hosted_zone_id = var.hosted_zone_id

  regional_endpoints = {
    us_east_1 = {
      aws_region        = "us-east-1"
      alb_dns_name      = module.app_us.alb_dns_name
      alb_zone_id       = module.app_us.alb_zone_id
      health_check_fqdn = module.app_us.alb_dns_name
      health_check_port = 443
      health_check_path = "/health"
    }
    eu_west_1 = {
      aws_region        = "eu-west-1"
      alb_dns_name      = module.app_eu.alb_dns_name
      alb_zone_id       = module.app_eu.alb_zone_id
      health_check_fqdn = module.app_eu.alb_dns_name
      health_check_port = 443
      health_check_path = "/health"
    }
  }
}
```

## CIDR Planning for Multi-Region

Plan your CIDR blocks carefully to avoid overlaps, especially if you need VPC peering between regions.

```hcl
# locals.tf - Central CIDR allocation
locals {
  # Each region gets a /16 from a /8 range
  region_cidrs = {
    us_east_1      = "10.0.0.0/16"
    us_west_2      = "10.1.0.0/16"
    eu_west_1      = "10.2.0.0/16"
    eu_central_1   = "10.3.0.0/16"
    ap_southeast_1 = "10.4.0.0/16"
    ap_northeast_1 = "10.5.0.0/16"
  }

  # Reserved ranges for future use
  # 10.6.0.0/16 through 10.255.0.0/16
}
```

## Conclusion

Multi-region Terraform modules require careful planning around provider aliases, CIDR allocation, and data replication. Design your modules to be region-agnostic by accepting configuration through variables and inheriting the region from the provider. Use provider aliases to deploy the same module to multiple regions, and tie everything together with global routing. The patterns here work for both active-active and active-passive multi-region architectures.

For related patterns, see our posts on [how to create Terraform modules with dynamic provider configuration](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-with-dynamic-provider-configuration/view) and [how to create Terraform modules for networking patterns](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-for-networking-patterns/view).
