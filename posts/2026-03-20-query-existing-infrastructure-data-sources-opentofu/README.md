# How to Query Existing Infrastructure with Data Sources in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Data Source, Query, Existing Infrastructure, Infrastructure as Code, DevOps

Description: A guide to querying existing infrastructure using data sources in OpenTofu to reference resources managed outside your configuration.

## Introduction

Data sources allow OpenTofu to fetch information about infrastructure that exists outside your current configuration - whether created manually, by another team, or managed by a different Terraform/OpenTofu workspace. This enables you to reference existing resources without importing them as managed resources into your state.

## Querying an Existing VPC

```hcl
# Look up a VPC by its ID

data "aws_vpc" "existing" {
  id = var.vpc_id
}

# Use the data in new resources
resource "aws_subnet" "new" {
  vpc_id     = data.aws_vpc.existing.id
  cidr_block = "10.0.100.0/24"

  tags = {
    Name = "new-subnet-in-existing-vpc"
  }
}
```

## Filtering Data Sources

```hcl
# Find a VPC by tag instead of ID
data "aws_vpc" "production" {
  tags = {
    Environment = "production"
    ManagedBy   = "platform-team"
  }
}

# Find an AMI by filters
data "aws_ami" "ubuntu_latest" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}
```

## Multiple Data Source Instances

```hcl
# Query multiple existing security groups
data "aws_security_group" "web" {
  name   = "web-servers"
  vpc_id = data.aws_vpc.production.id
}

data "aws_security_group" "database" {
  name   = "database-servers"
  vpc_id = data.aws_vpc.production.id
}

data "aws_subnet" "app" {
  vpc_id = data.aws_vpc.production.id

  tags = {
    Name = "app-subnet"
  }
}

# Use both in a new resource
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu_latest.id
  instance_type = "t3.micro"
  subnet_id     = data.aws_subnet.app.id

  vpc_security_group_ids = [
    data.aws_security_group.web.id,
    data.aws_security_group.database.id,
  ]
}
```

## Getting Account and Region Information

```hcl
# Always useful: current AWS account info
data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_partition" "current" {}

# Build ARNs from fetched data
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.region
  partition  = data.aws_partition.current.partition

  log_bucket_arn = "arn:${local.partition}:s3:::${var.log_bucket_name}"
}

resource "aws_iam_role_policy" "s3_access" {
  role = var.app_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject"]
      Resource = "${local.log_bucket_arn}/*"
    }]
  })
}
```

## Querying Route53 Zones

```hcl
# Look up an existing hosted zone
data "aws_route53_zone" "main" {
  name         = "example.com"
  private_zone = false
}

# Create DNS records in the existing zone
resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.${data.aws_route53_zone.main.name}"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}
```

## Querying Secrets Manager

```hcl
# Retrieve an existing secret
data "aws_secretsmanager_secret" "db_creds" {
  name = "myapp/production/db-credentials"
}

data "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = data.aws_secretsmanager_secret.db_creds.id
}

locals {
  db_credentials = jsondecode(
    data.aws_secretsmanager_secret_version.db_creds.secret_string
  )
}

resource "aws_db_instance" "app" {
  allocated_storage   = 20
  identifier          = "myapp-db"
  engine              = "postgres"
  instance_class      = "db.t3.micro"
  username            = local.db_credentials.username
  password            = local.db_credentials.password
  skip_final_snapshot = true
}
```

## Cross-Account Queries

```hcl
# Query resources in another AWS account
provider "aws" {
  alias  = "shared_services"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::123456789012:role/ReadOnlyRole"
  }
}

data "aws_vpc" "shared" {
  provider = aws.shared_services
  id       = var.shared_vpc_id
}

# Use data from the shared VPC in current-account resources
resource "aws_security_group" "allow_shared_https" {
  name   = "allow-shared-https"
  vpc_id = var.local_vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.shared.cidr_block]
  }
}
```

## Querying Kubernetes Cluster Info

```hcl
data "aws_eks_cluster" "main" {
  name = var.cluster_name
}

data "aws_eks_cluster_auth" "main" {
  name = var.cluster_name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
}
```

## Conclusion

Data sources are fundamental to OpenTofu's ability to work with mixed infrastructure - some managed by your configuration, some existing independently. Use data sources to look up shared networking resources, find the latest AMIs, retrieve secrets, and reference infrastructure owned by other teams. Unlike managed resources, data sources are read-only and never modify infrastructure. OpenTofu reads them during the plan phase when possible, but can defer reading them until the apply phase if they depend on values that are not yet known.
