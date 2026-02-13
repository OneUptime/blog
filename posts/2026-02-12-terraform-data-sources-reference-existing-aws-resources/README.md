# How to Use Terraform Data Sources to Reference Existing AWS Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Infrastructure, Data Sources

Description: Learn how to use Terraform data sources to look up and reference existing AWS resources like VPCs, subnets, AMIs, and secrets without managing them in your state.

---

Not everything in your AWS account is managed by Terraform. Maybe the VPC was created by another team, the SSL certificates live in a different stack, or the AMIs are built by a separate pipeline. Data sources let you read information about existing resources and use it in your Terraform configuration without importing those resources into your state.

This is one of Terraform's most useful features, and understanding it well makes the difference between brittle, hardcoded configurations and flexible, composable ones.

## What's a Data Source?

A data source is a read-only query that fetches information about existing infrastructure. Unlike resources (which Terraform creates and manages), data sources just look things up. They don't modify anything.

```hcl
# This CREATES a VPC (resource)
resource "aws_vpc" "new" {
  cidr_block = "10.0.0.0/16"
}

# This LOOKS UP an existing VPC (data source)
data "aws_vpc" "existing" {
  id = "vpc-12345678"
}
```

Both give you a VPC object you can reference, but only the resource is managed by Terraform. The data source just reads what's already there.

## Looking Up VPCs

The most common data source usage is finding existing VPCs and subnets.

```hcl
# Find a VPC by its ID
data "aws_vpc" "main" {
  id = "vpc-0abc123def456"
}

# Find a VPC by tag
data "aws_vpc" "production" {
  tags = {
    Environment = "production"
    Name        = "main-vpc"
  }
}

# Find the default VPC
data "aws_vpc" "default" {
  default = true
}

# Use the VPC's properties
resource "aws_security_group" "app" {
  vpc_id = data.aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
  }
}
```

## Looking Up Subnets

Find subnets by various criteria.

```hcl
# Find all private subnets in a VPC
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  tags = {
    Tier = "Private"
  }
}

# Get details about each subnet
data "aws_subnet" "private" {
  for_each = toset(data.aws_subnets.private.ids)
  id       = each.value
}

# Use the subnet IDs
module "ecs_service" {
  source     = "./modules/ecs-service"
  subnet_ids = data.aws_subnets.private.ids
}
```

The distinction between `aws_subnets` (plural) and `aws_subnet` (singular) is important. The plural version returns a list of IDs matching your filter. The singular version returns the full details of a single subnet.

## Finding the Latest AMI

One of the most useful data sources. Find the latest Amazon Linux or Ubuntu AMI without hardcoding IDs.

```hcl
# Find the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

# Find the latest Ubuntu 22.04 AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

# Use the AMI in an EC2 instance
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
}
```

## Current Account and Region

Frequently needed for constructing ARNs and other identifiers.

```hcl
# Get the current AWS account ID
data "aws_caller_identity" "current" {}

# Get the current region
data "aws_region" "current" {}

# Get available AZs in the current region
data "aws_availability_zones" "available" {
  state = "available"

  # Exclude local zones
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

# Use them in configurations
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  azs        = data.aws_availability_zones.available.names
}

# Construct an ARN
resource "aws_iam_policy" "example" {
  name = "example"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "arn:aws:s3:::my-bucket-${local.account_id}/*"
    }]
  })
}
```

## Reading Secrets

Look up secrets from AWS Secrets Manager or SSM Parameter Store.

```hcl
# Read a secret from Secrets Manager
data "aws_secretsmanager_secret" "db_credentials" {
  name = "production/db/credentials"
}

data "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = data.aws_secretsmanager_secret.db_credentials.id
}

# Read an SSM parameter
data "aws_ssm_parameter" "db_endpoint" {
  name = "/production/db/endpoint"
}

# Use in your configuration
locals {
  db_creds    = jsondecode(data.aws_secretsmanager_secret_version.db_credentials.secret_string)
  db_endpoint = data.aws_ssm_parameter.db_endpoint.value
}
```

Be careful with secrets in data sources. The values end up in your state file, so make sure your state backend is properly secured. See our guide on [Terraform state with S3 backend](https://oneuptime.com/blog/post/2026-02-12-terraform-state-with-s3-backend-and-dynamodb-locking/view) for securing state.

## Looking Up Route 53 Zones

Find existing hosted zones for DNS record management.

```hcl
# Find a public hosted zone by name
data "aws_route53_zone" "main" {
  name         = "example.com."
  private_zone = false
}

# Create a record in the existing zone
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true
  }
}
```

## ACM Certificates

Look up existing SSL certificates.

```hcl
# Find a certificate by domain name
data "aws_acm_certificate" "main" {
  domain   = "example.com"
  statuses = ["ISSUED"]
}

# Use it with an ALB listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = data.aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

## IAM Policies

Reference AWS-managed IAM policies by name.

```hcl
# Look up a managed policy
data "aws_iam_policy" "admin" {
  name = "AdministratorAccess"
}

# Reference it in a role
resource "aws_iam_role_policy_attachment" "admin" {
  role       = aws_iam_role.admin.name
  policy_arn = data.aws_iam_policy.admin.arn
}
```

## Remote State as a Data Source

Read outputs from another Terraform state file.

```hcl
# Reference another project's state
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "prod/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use outputs from the other state
resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
  vpc_security_group_ids = [
    data.terraform_remote_state.networking.outputs.app_security_group_id
  ]
}
```

## Best Practices

Use data sources instead of hardcoding IDs. Hardcoded IDs break when you deploy to a different account or region. Data sources look up the right value at plan time.

Be specific with your filters. If multiple resources match your query, Terraform throws an error (for singular data sources). Use tags, names, and filters to narrow results down to exactly one match.

Understand the plan-time vs apply-time distinction. Data source values are resolved during `terraform plan`, so they need to be queryable at that point. If a resource hasn't been created yet (because it's in the same configuration), you can't use a data source to find it.

## Wrapping Up

Data sources bridge the gap between Terraform-managed and non-Terraform infrastructure. Use them to look up VPCs from other teams, find the latest AMIs, read secrets, and reference remote state. They keep your configurations flexible and portable across accounts and environments.

For related patterns, check out our guide on [Terraform modules for reusable infrastructure](https://oneuptime.com/blog/post/2026-02-12-terraform-modules-for-reusable-aws-infrastructure/view) and [Terraform local values and variables](https://oneuptime.com/blog/post/2026-02-12-terraform-local-values-and-variables/view).
