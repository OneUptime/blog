# How to Manage Multiple AWS Regions in a Single Terraform Config

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Multi-Region, Infrastructure as Code

Description: Learn how to manage AWS resources across multiple regions in a single Terraform configuration using provider aliases, data sources, and module patterns.

---

There are plenty of reasons to deploy across multiple AWS regions: disaster recovery, reduced latency for global users, compliance requirements, or services like CloudFront that require resources in specific regions. Terraform handles multi-region deployments through provider aliases, which let you define multiple AWS providers targeting different regions in the same configuration.

Let's walk through the patterns and practices for managing multi-region infrastructure effectively.

## Provider Aliases

The foundation of multi-region Terraform is provider aliases. Each alias creates a separate AWS provider targeting a different region:

```hcl
# Default provider - primary region
provider "aws" {
  region = "us-east-1"
}

# Alias for EU region
provider "aws" {
  alias  = "eu_west_1"
  region = "eu-west-1"
}

# Alias for Asia Pacific
provider "aws" {
  alias  = "ap_southeast_1"
  region = "ap-southeast-1"
}
```

Resources use the default provider unless you specify otherwise. To use an aliased provider, add the `provider` argument:

```hcl
# This goes in us-east-1 (default provider)
resource "aws_s3_bucket" "primary" {
  bucket = "myapp-primary-data"
}

# This goes in eu-west-1
resource "aws_s3_bucket" "eu_replica" {
  provider = aws.eu_west_1
  bucket   = "myapp-eu-replica-data"
}

# This goes in ap-southeast-1
resource "aws_s3_bucket" "apac_replica" {
  provider = aws.ap_southeast_1
  bucket   = "myapp-apac-replica-data"
}
```

## Common Multi-Region Patterns

### ACM Certificate for CloudFront

CloudFront requires certificates in `us-east-1`. If your primary region is different, you need an alias:

```hcl
provider "aws" {
  region = "eu-west-1"  # Primary region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"  # Required for CloudFront certs
}

# Certificate must be in us-east-1
resource "aws_acm_certificate" "cdn" {
  provider          = aws.us_east_1
  domain_name       = "cdn.example.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Route 53 is global - no special provider needed
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cdn.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  name    = each.value.name
  records = [each.value.record]
  ttl     = 60
  type    = each.value.type
  zone_id = data.aws_route53_zone.main.zone_id
}

# CloudFront distribution references the us-east-1 certificate
resource "aws_cloudfront_distribution" "cdn" {
  # ... configuration ...

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.cdn.arn
    ssl_support_method  = "sni-only"
  }
}
```

For more on certificate management, see our post on [managing ACM certificates with Terraform](https://oneuptime.com/blog/post/manage-aws-acm-certificates-with-terraform/view).

### Multi-Region S3 Replication

Replicate an S3 bucket to another region for disaster recovery:

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "dr_region"
  region = "us-west-2"
}

# Primary bucket
resource "aws_s3_bucket" "primary" {
  bucket = "myapp-primary-2026"
}

resource "aws_s3_bucket_versioning" "primary" {
  bucket = aws_s3_bucket.primary.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Replica bucket in DR region
resource "aws_s3_bucket" "replica" {
  provider = aws.dr_region
  bucket   = "myapp-replica-2026"
}

resource "aws_s3_bucket_versioning" "replica" {
  provider = aws.dr_region
  bucket   = aws_s3_bucket.replica.id
  versioning_configuration {
    status = "Enabled"
  }
}

# IAM role for replication
resource "aws_iam_role" "replication" {
  name = "s3-replication-role"

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

# Replication configuration on the primary bucket
resource "aws_s3_bucket_replication_configuration" "primary" {
  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.primary.id

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.replica.arn
      storage_class = "STANDARD_IA"
    }
  }

  depends_on = [
    aws_s3_bucket_versioning.primary,
    aws_s3_bucket_versioning.replica,
  ]
}
```

## Using Modules for Multi-Region

When you need the same infrastructure in multiple regions, use a module with provider configuration:

```hcl
# modules/vpc/main.tf
resource "aws_vpc" "main" {
  cidr_block = var.cidr_block

  tags = {
    Name = "${var.name}-vpc"
  }
}

resource "aws_subnet" "public" {
  count             = length(var.public_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnets[count.index]
  availability_zone = var.azs[count.index]
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnets[count.index]
  availability_zone = var.azs[count.index]
}
```

Then instantiate it for each region:

```hcl
# main.tf
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "eu"
  region = "eu-west-1"
}

# VPC in US
module "vpc_us" {
  source = "./modules/vpc"

  name           = "us-east"
  cidr_block     = "10.0.0.0/16"
  public_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24"]
  azs            = ["us-east-1a", "us-east-1b"]
}

# VPC in EU
module "vpc_eu" {
  source = "./modules/vpc"

  providers = {
    aws = aws.eu  # Pass the aliased provider
  }

  name           = "eu-west"
  cidr_block     = "10.1.0.0/16"
  public_subnets = ["10.1.1.0/24", "10.1.2.0/24"]
  private_subnets = ["10.1.10.0/24", "10.1.11.0/24"]
  azs            = ["eu-west-1a", "eu-west-1b"]
}
```

The `providers` block in the module call passes the aliased provider. Inside the module, resources use the provider they're given - no aliases needed in the module itself.

## Dynamic Multi-Region with for_each

For truly dynamic multi-region deployments, you can use `for_each` with modules:

```hcl
locals {
  regions = {
    primary = {
      region         = "us-east-1"
      cidr           = "10.0.0.0/16"
      azs            = ["us-east-1a", "us-east-1b"]
    }
    dr = {
      region         = "us-west-2"
      cidr           = "10.1.0.0/16"
      azs            = ["us-west-2a", "us-west-2b"]
    }
    eu = {
      region         = "eu-west-1"
      cidr           = "10.2.0.0/16"
      azs            = ["eu-west-1a", "eu-west-1b"]
    }
  }
}
```

Unfortunately, Terraform doesn't support dynamic provider configuration with `for_each` on providers. Each provider alias must be explicitly defined. This is a known limitation. The workaround is to define all the providers you need statically and map them in your module calls.

## Data Sources Across Regions

You can query resources in other regions using provider aliases on data sources:

```hcl
# Look up the latest AMI in each region
data "aws_ami" "ubuntu_us" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

data "aws_ami" "ubuntu_eu" {
  provider    = aws.eu_west_1
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}
```

AMI IDs are different in each region, so you need to look them up per region.

## Global Services

Some AWS services are global (Route 53, IAM, CloudFront). These don't need special provider configuration, but it's good practice to use your default provider consistently:

```hcl
# Route 53 is global - uses default provider
resource "aws_route53_zone" "main" {
  name = "example.com"
}

# IAM is global - uses default provider
resource "aws_iam_role" "global_role" {
  name = "cross-region-role"
  # ...
}
```

## VPC Peering Across Regions

Connect VPCs in different regions with cross-region peering:

```hcl
# Peering connection (requester side)
resource "aws_vpc_peering_connection" "cross_region" {
  vpc_id      = module.vpc_us.vpc_id
  peer_vpc_id = module.vpc_eu.vpc_id
  peer_region = "eu-west-1"
  auto_accept = false

  tags = {
    Name = "us-to-eu-peering"
  }
}

# Accepter side (in the other region)
resource "aws_vpc_peering_connection_accepter" "cross_region" {
  provider                  = aws.eu_west_1
  vpc_peering_connection_id = aws_vpc_peering_connection.cross_region.id
  auto_accept               = true

  tags = {
    Name = "eu-from-us-peering"
  }
}
```

## State Management for Multi-Region

Multi-region configurations can get large. Consider splitting into separate state files:

```
infrastructure/
  networking/        # VPCs, peering, transit gateways
  us-east-1/         # Regional resources
  eu-west-1/         # Regional resources
  global/            # IAM, Route 53, CloudFront
```

Each directory has its own state file. Use `terraform_remote_state` data sources to share information between them:

```hcl
# In the us-east-1 config, reference networking outputs
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "mycompany-terraform-state"
    key    = "production/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use the VPC ID from the networking state
resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.networking.outputs.us_east_1_private_subnet_ids[0]
  # ...
}
```

## Wrapping Up

Multi-region Terraform boils down to provider aliases and passing them to modules. The patterns are straightforward, but the complexity grows with the number of regions and resources. Start with explicit provider aliases for the regions you need, use modules for repeatable infrastructure, and split state files by region when things get large. The biggest gotcha is the CloudFront certificate requirement for `us-east-1` - make sure you have that provider alias defined early.
