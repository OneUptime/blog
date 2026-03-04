# How to Use Workspaces for Multi-Region Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, Multi-Region, AWS, High Availability, Disaster Recovery

Description: Learn how to use Terraform workspaces to deploy and manage infrastructure across multiple cloud regions, with patterns for region-specific configuration, cross-region dependencies.

---

Deploying infrastructure across multiple regions is a common requirement for high availability, disaster recovery, and latency optimization. Terraform workspaces offer one way to manage multi-region deployments from a single configuration. Each workspace represents a region (or a region-environment combination), and you use the workspace name to drive region-specific settings. This post shows you how to set it up practically.

## Workspace Naming for Regions

The first decision is your naming convention. There are two common approaches:

### Region as Workspace

```bash
# Each workspace is a region
terraform workspace new us-east-1
terraform workspace new us-west-2
terraform workspace new eu-west-1
```

### Region-Environment Combination

```bash
# Each workspace is a region-environment pair
terraform workspace new us-east-1-prod
terraform workspace new us-east-1-dev
terraform workspace new eu-west-1-prod
terraform workspace new eu-west-1-dev
```

The second approach gives you finer-grained control but results in more workspaces. Pick based on whether you need per-region per-environment isolation.

## Basic Multi-Region Configuration

Here is a configuration that deploys to the region specified by the workspace name:

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket               = "acme-terraform-state"
    key                  = "multi-region/terraform.tfstate"
    region               = "us-east-1"
    dynamodb_table       = "terraform-locks"
    workspace_key_prefix = "regions"
  }
}

locals {
  # Extract region from workspace name
  # Handles both "us-east-1" and "us-east-1-prod" formats
  region_map = {
    "us-east-1"      = "us-east-1"
    "us-east-1-dev"  = "us-east-1"
    "us-east-1-prod" = "us-east-1"
    "us-west-2"      = "us-west-2"
    "us-west-2-dev"  = "us-west-2"
    "us-west-2-prod" = "us-west-2"
    "eu-west-1"      = "eu-west-1"
    "eu-west-1-dev"  = "eu-west-1"
    "eu-west-1-prod" = "eu-west-1"
  }

  region = lookup(local.region_map, terraform.workspace, "us-east-1")
}

# Provider uses the workspace-derived region
provider "aws" {
  region = local.region
}
```

## Region-Specific Configuration

Different regions often need different sizing, availability zones, and AMIs:

```hcl
locals {
  # Configuration per region
  region_config = {
    "us-east-1" = {
      azs              = ["us-east-1a", "us-east-1b", "us-east-1c"]
      vpc_cidr         = "10.0.0.0/16"
      instance_type    = "t3.large"
      ami              = "ami-0c55b159cbfafe1f0"
      certificate_arn  = "arn:aws:acm:us-east-1:123456789012:certificate/abc"
    }
    "us-west-2" = {
      azs              = ["us-west-2a", "us-west-2b", "us-west-2c"]
      vpc_cidr         = "10.1.0.0/16"
      instance_type    = "t3.large"
      ami              = "ami-0d6621c01e8c2de2c"
      certificate_arn  = "arn:aws:acm:us-west-2:123456789012:certificate/def"
    }
    "eu-west-1" = {
      azs              = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
      vpc_cidr         = "10.2.0.0/16"
      instance_type    = "t3.medium"
      ami              = "ami-0e5657f6d3c3ea350"
      certificate_arn  = "arn:aws:acm:eu-west-1:123456789012:certificate/ghi"
    }
  }

  config = local.region_config[local.region]
}
```

## VPC and Networking

Deploy a VPC with subnets across the region's availability zones:

```hcl
# networking.tf

resource "aws_vpc" "main" {
  cidr_block           = local.config.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name   = "vpc-${terraform.workspace}"
    Region = local.region
  }
}

# Create subnets across AZs
resource "aws_subnet" "public" {
  count = length(local.config.azs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = local.config.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-${local.config.azs[count.index]}-${terraform.workspace}"
    Type = "public"
  }
}

resource "aws_subnet" "private" {
  count = length(local.config.azs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 100)
  availability_zone = local.config.azs[count.index]

  tags = {
    Name = "private-${local.config.azs[count.index]}-${terraform.workspace}"
    Type = "private"
  }
}
```

## Compute Resources

```hcl
# compute.tf

resource "aws_launch_template" "app" {
  name_prefix   = "app-${terraform.workspace}-"
  image_id      = local.config.ami
  instance_type = local.config.instance_type

  vpc_security_group_ids = [aws_security_group.app.id]

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name   = "app-${terraform.workspace}"
      Region = local.region
    }
  }
}

resource "aws_autoscaling_group" "app" {
  name                = "asg-${terraform.workspace}"
  vpc_zone_identifier = aws_subnet.private[*].id
  min_size            = 2
  max_size            = 10
  desired_capacity    = 2

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  tag {
    key                 = "Region"
    value               = local.region
    propagate_at_launch = true
  }
}
```

## Cross-Region Dependencies

The tricky part of multi-region workspaces is referencing resources in other regions. Use `terraform_remote_state` to read another workspace's state:

```hcl
# In the us-west-2 workspace, read the us-east-1 workspace's outputs
data "terraform_remote_state" "primary" {
  backend   = "s3"
  workspace = "us-east-1"

  config = {
    bucket               = "acme-terraform-state"
    key                  = "multi-region/terraform.tfstate"
    region               = "us-east-1"
    workspace_key_prefix = "regions"
  }
}

# Use the primary region's VPC ID for peering
resource "aws_vpc_peering_connection" "to_primary" {
  # Only create peering from secondary regions
  count = local.region != "us-east-1" ? 1 : 0

  vpc_id        = aws_vpc.main.id
  peer_vpc_id   = data.terraform_remote_state.primary.outputs.vpc_id
  peer_region   = "us-east-1"

  tags = {
    Name = "peer-${terraform.workspace}-to-us-east-1"
  }
}
```

## Global Resources

Some resources are global (like Route53, CloudFront, or IAM). Handle them in the primary region only:

```hcl
locals {
  is_primary_region = local.region == "us-east-1"
}

# Route53 health checks - only in primary region
resource "aws_route53_health_check" "app" {
  for_each = local.is_primary_region ? toset(keys(local.region_config)) : toset([])

  fqdn              = "app-${each.key}.example.com"
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 30

  tags = {
    Name = "health-check-${each.key}"
  }
}

# Route53 latency-based routing - only in primary region
resource "aws_route53_record" "app_latency" {
  for_each = local.is_primary_region ? toset(keys(local.region_config)) : toset([])

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  latency_routing_policy {
    region = each.key
  }

  set_identifier = each.key

  alias {
    name                   = "alb-${each.key}.example.com"
    zone_id                = "Z1234567890"
    evaluate_target_health = true
  }
}
```

## Database Replication

Set up a primary database in one region and replicas in others:

```hcl
# Primary database - only in the primary region
resource "aws_db_instance" "primary" {
  count = local.is_primary_region ? 1 : 0

  identifier     = "myapp-db-primary"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  # Enable backups for replication
  backup_retention_period = 7

  tags = {
    Name = "db-primary-${terraform.workspace}"
    Role = "primary"
  }
}

# Read replica - in secondary regions
resource "aws_db_instance" "replica" {
  count = local.is_primary_region ? 0 : 1

  identifier          = "myapp-db-replica-${local.region}"
  replicate_source_db = data.terraform_remote_state.primary.outputs.db_arn

  instance_class = "db.r6g.large"

  tags = {
    Name = "db-replica-${terraform.workspace}"
    Role = "replica"
  }
}

# Output the database ARN for cross-region references
output "db_arn" {
  value = local.is_primary_region ? aws_db_instance.primary[0].arn : aws_db_instance.replica[0].arn
}
```

## Deployment Order

Multi-region deployments usually need a specific order:

```bash
#!/bin/bash
# deploy-all-regions.sh - Deploy in order: primary first, then secondary

PRIMARY="us-east-1"
SECONDARY=("us-west-2" "eu-west-1")

echo "=== Deploying primary region: $PRIMARY ==="
terraform workspace select "$PRIMARY"
terraform apply -auto-approve

echo ""
echo "=== Deploying secondary regions ==="
for REGION in "${SECONDARY[@]}"; do
  echo "--- Deploying $REGION ---"
  terraform workspace select "$REGION"
  terraform apply -auto-approve
done

echo ""
echo "All regions deployed."
```

## Monitoring and Outputs

Track deployments across all regions:

```hcl
output "region" {
  value = local.region
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "alb_dns" {
  value = aws_lb.app.dns_name
}

output "deployment_summary" {
  value = {
    workspace     = terraform.workspace
    region        = local.region
    vpc_cidr      = aws_vpc.main.cidr_block
    instance_type = local.config.instance_type
    asg_name      = aws_autoscaling_group.app.name
  }
}
```

Report script:

```bash
#!/bin/bash
# region-report.sh

ORIGINAL=$(terraform workspace show)
REGIONS=$(terraform workspace list | sed 's/^[ *]*//' | grep -v '^default$')

echo "Multi-Region Deployment Report"
echo "=============================="

for REGION in $REGIONS; do
  terraform workspace select "$REGION" > /dev/null 2>&1
  echo ""
  echo "Region: $REGION"
  terraform output -json deployment_summary 2>/dev/null | python3 -m json.tool
done

terraform workspace select "$ORIGINAL" > /dev/null 2>&1
```

## Limitations

**Provider configuration is static per plan.** You cannot dynamically determine the region at plan time based on dynamic data. The `local.region_map` approach works because it is evaluated during the plan.

**Cross-region references require planning.** The primary region must be applied before secondary regions that reference it through `terraform_remote_state`.

**Global resources need special handling.** Creating Route53 records or IAM policies in every region creates duplicates. Use conditionals to restrict global resources to the primary region.

**VPC CIDR planning.** Each region needs non-overlapping CIDRs if you plan to peer them. Plan your addressing scheme before creating workspaces.

## Conclusion

Workspaces provide a lightweight way to manage multi-region deployments from a single Terraform configuration. The key is a clear naming convention (region or region-environment), a configuration map that ties workspace names to region-specific values, and careful handling of cross-region dependencies through remote state. Deploy the primary region first, then secondary regions, and manage global resources in one region only. For taking this further with dynamic provider configuration per workspace, see our post on [workspaces with dynamic provider configuration](https://oneuptime.com/blog/post/2026-02-23-how-to-use-workspaces-with-dynamic-provider-configuration/view).
