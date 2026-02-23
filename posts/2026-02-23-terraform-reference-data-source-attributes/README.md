# How to Reference Data Source Attributes in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Data Sources, Infrastructure as Code, DevOps

Description: Learn how to reference data source attributes in Terraform using the data prefix to look up existing infrastructure and use those values in your configuration.

---

Data sources in Terraform let you read information from your cloud provider without creating or managing resources. They are essential for referencing infrastructure that already exists - things like an existing VPC, the latest AMI, or a DNS zone that was created outside of your Terraform configuration.

This post focuses on how to reference the attributes that data sources return, using the `data.<type>.<name>.<attribute>` syntax.

## The data Prefix

When you define a data source and want to use the values it returns, you use the `data` prefix:

```hcl
# Define a data source to look up the latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# Reference the data source attribute
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id  # data.<type>.<name>.<attribute>
  instance_type = "t3.micro"
}
```

The syntax is `data.<data_source_type>.<local_name>.<attribute>`. This is how Terraform distinguishes data source references from resource references.

## Looking Up Existing VPCs and Subnets

One of the most common use cases is referencing infrastructure that already exists in your AWS account:

```hcl
# Look up an existing VPC by tag
data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["production-vpc"]
  }
}

# Look up subnets within that VPC
data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]  # reference the VPC data source
  }

  filter {
    name   = "tag:Type"
    values = ["public"]
  }
}

# Use the looked-up values in a resource
resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = data.aws_subnets.public.ids[0]  # first subnet ID

  vpc_security_group_ids = [aws_security_group.app.id]
}

# Use VPC attributes in a security group
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = data.aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]  # reference VPC CIDR
  }
}
```

## Referencing AWS Caller Identity

The `aws_caller_identity` data source gives you information about the AWS account running Terraform:

```hcl
# Get current AWS account information
data "aws_caller_identity" "current" {}

# Get current region
data "aws_region" "current" {}

# Use them to build ARNs or account-specific values
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  # Build an ECR repository URL
  ecr_url = "${local.account_id}.dkr.ecr.${local.region}.amazonaws.com"
}

resource "aws_iam_policy" "app" {
  name = "app-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "arn:aws:s3:::my-bucket-${data.aws_caller_identity.current.account_id}/*"
      }
    ]
  })
}
```

## Referencing IAM Policy Documents

The `aws_iam_policy_document` data source generates JSON policy documents, and its primary attribute is `json`:

```hcl
# Build an IAM policy using the data source
data "aws_iam_policy_document" "s3_read" {
  statement {
    sid    = "AllowS3Read"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.data.arn,
      "${aws_s3_bucket.data.arn}/*",
    ]
  }
}

# Reference the generated JSON
resource "aws_iam_policy" "s3_read" {
  name   = "s3-read-policy"
  policy = data.aws_iam_policy_document.s3_read.json  # .json attribute
}

# Use the same document as an inline policy
resource "aws_iam_role_policy" "app" {
  name   = "app-s3-access"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.s3_read.json
}
```

## Referencing Availability Zones

Looking up availability zones is a clean way to make your configuration region-agnostic:

```hcl
# Get all available AZs in the current region
data "aws_availability_zones" "available" {
  state = "available"
}

# Reference AZ names and count
resource "aws_subnet" "public" {
  count             = length(data.aws_availability_zones.available.names)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "public-${data.aws_availability_zones.available.names[count.index]}"
  }
}
```

## Data Sources with for_each

You can use data sources with `for_each` to look up multiple items:

```hcl
variable "certificate_domains" {
  type    = list(string)
  default = ["example.com", "api.example.com"]
}

# Look up existing ACM certificates
data "aws_acm_certificate" "certs" {
  for_each = toset(var.certificate_domains)

  domain   = each.key
  statuses = ["ISSUED"]
}

# Reference a specific certificate
output "main_cert_arn" {
  value = data.aws_acm_certificate.certs["example.com"].arn
}

# Build a map of domain to cert ARN
output "all_cert_arns" {
  value = { for domain, cert in data.aws_acm_certificate.certs : domain => cert.arn }
}
```

## Chaining Data Sources

Data sources can reference each other, just like resources:

```hcl
# Step 1: Look up the VPC
data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
    values = ["production-vpc"]
  }
}

# Step 2: Look up subnets in that VPC (references step 1)
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

# Step 3: Look up details for each subnet (references step 2)
data "aws_subnet" "private" {
  for_each = toset(data.aws_subnets.private.ids)
  id       = each.key
}

# Now you have full details for each subnet
output "subnet_cidrs" {
  value = { for id, subnet in data.aws_subnet.private : id => subnet.cidr_block }
}
```

## Data Sources in Expressions

Data source attributes work in all the same expression contexts as resource attributes:

```hcl
data "aws_region" "current" {}

# In conditionals
locals {
  is_us_east = data.aws_region.current.name == "us-east-1"
}

# In string interpolation
resource "aws_s3_bucket" "regional" {
  bucket = "myapp-data-${data.aws_region.current.name}"
}

# In dynamic blocks
data "aws_ip_ranges" "cloudfront" {
  regions  = ["global"]
  services = ["cloudfront"]
}

resource "aws_security_group" "cloudfront" {
  name   = "cloudfront-access"
  vpc_id = data.aws_vpc.main.id

  dynamic "ingress" {
    for_each = data.aws_ip_ranges.cloudfront.cidr_blocks
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }
}
```

## Finding Available Attributes

Every data source has its own set of attributes. Check the Terraform provider documentation for the data source you are using. The "Attributes Reference" section lists everything available.

You can also explore attributes in the Terraform console:

```bash
terraform console

> data.aws_vpc.main.id
"vpc-0abc123def456"

> data.aws_vpc.main.cidr_block
"10.0.0.0/16"

> data.aws_availability_zones.available.names
tolist([
  "us-east-1a",
  "us-east-1b",
  "us-east-1c",
])
```

## Data Source vs Resource Reference

The key difference in syntax:

```hcl
# Resource reference (no "data" prefix)
aws_instance.web.id

# Data source reference (has "data" prefix)
data.aws_ami.amazon_linux.id
```

If you forget the `data.` prefix on a data source reference, Terraform will look for a managed resource of that type instead, and you will get a confusing error.

## Wrapping Up

Referencing data source attributes with `data.<type>.<name>.<attribute>` lets you pull information from your existing infrastructure into Terraform. This is essential for working with resources you did not create through Terraform, integrating with shared infrastructure, and keeping your configurations dynamic rather than hardcoding values.

For related reading, see [How to Reference Resource Attributes in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-resource-attributes/view) and [How to Use Terraform Data Sources to Reference Existing AWS Resources](https://oneuptime.com/blog/post/terraform-data-sources-reference-existing-aws-resources/view).
