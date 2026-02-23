# How to Create Service Catalog Products in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Service Catalog, Governance, Infrastructure as Code

Description: Learn how to create AWS Service Catalog portfolios, products, and constraints using Terraform to provide self-service infrastructure provisioning with governance.

---

AWS Service Catalog lets you create and manage curated catalogs of IT services that your organization approves for use. Think of it as an internal marketplace where teams can provision pre-approved infrastructure without needing deep AWS knowledge or broad permissions. When you manage Service Catalog with Terraform, you get version-controlled product definitions that you can roll out consistently across your organization.

This guide walks through setting up portfolios, products, constraints, and access controls in Terraform.

## Prerequisites

- Terraform 1.0 or later
- AWS CLI configured with administrative permissions
- CloudFormation templates for the products you want to offer
- Basic understanding of AWS IAM

## Provider Setup

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
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

## Creating a Portfolio

A portfolio is a collection of products. You organize products into portfolios and then grant access to specific IAM principals.

```hcl
# Create a portfolio for networking products
resource "aws_servicecatalog_portfolio" "networking" {
  name          = "Networking Products"
  description   = "Pre-approved networking infrastructure components"
  provider_name = "Platform Engineering Team"

  tags = {
    Team        = "platform-engineering"
    Environment = "all"
  }
}

# Create a portfolio for compute products
resource "aws_servicecatalog_portfolio" "compute" {
  name          = "Compute Products"
  description   = "Pre-approved compute infrastructure including EC2 and ECS"
  provider_name = "Platform Engineering Team"

  tags = {
    Team        = "platform-engineering"
    Environment = "all"
  }
}
```

## Creating a Product

Products are backed by CloudFormation templates. Each product can have multiple versions (provisioning artifacts).

```hcl
# S3 bucket to store product templates
resource "aws_s3_bucket" "catalog_templates" {
  bucket = "my-org-service-catalog-templates"
}

# Upload the VPC template
resource "aws_s3_object" "vpc_template" {
  bucket = aws_s3_bucket.catalog_templates.id
  key    = "products/vpc/v1.0.0/template.yaml"
  source = "${path.module}/templates/vpc-product.yaml"
  etag   = filemd5("${path.module}/templates/vpc-product.yaml")
}

# Create a VPC product in Service Catalog
resource "aws_servicecatalog_product" "vpc" {
  name        = "Standard VPC"
  description = "A standard VPC with public and private subnets across two availability zones"
  owner       = "Platform Engineering"
  type        = "CLOUD_FORMATION_TEMPLATE"
  distributor = "Internal"

  # Support information shown to end users
  support_description = "Contact the platform team on Slack at #platform-support"
  support_email       = "platform@company.com"
  support_url         = "https://wiki.company.com/platform/vpc"

  # Initial product version
  provisioning_artifact_parameters {
    name                        = "v1.0.0"
    description                 = "Initial release with standard VPC configuration"
    template_url                = "https://${aws_s3_bucket.catalog_templates.bucket_regional_domain_name}/${aws_s3_object.vpc_template.key}"
    type                        = "CLOUD_FORMATION_TEMPLATE"
    disable_template_validation = false
  }

  tags = {
    ProductType = "networking"
  }
}
```

## Associating Products with Portfolios

Once you have products and portfolios, you link them together.

```hcl
# Associate the VPC product with the networking portfolio
resource "aws_servicecatalog_product_portfolio_association" "vpc_networking" {
  portfolio_id = aws_servicecatalog_portfolio.networking.id
  product_id   = aws_servicecatalog_product.vpc.id
}
```

## Granting Portfolio Access

You control who can browse and provision products by granting access to IAM roles, users, or groups.

```hcl
# Grant access to the developers IAM role
resource "aws_servicecatalog_principal_portfolio_association" "dev_access" {
  portfolio_id  = aws_servicecatalog_portfolio.networking.id
  principal_arn = aws_iam_role.developers.arn
  principal_type = "IAM"
}

# Grant access to the DevOps group
resource "aws_servicecatalog_principal_portfolio_association" "devops_access" {
  portfolio_id  = aws_servicecatalog_portfolio.networking.id
  principal_arn = aws_iam_group.devops.arn
  principal_type = "IAM"
}
```

## Adding Constraints

Constraints control how products can be provisioned. There are several types of constraints you can apply.

### Launch Constraint

A launch constraint specifies the IAM role that Service Catalog assumes when provisioning the product. This is important because end users do not need direct permissions to create the underlying resources.

```hcl
# IAM role for Service Catalog to use when launching products
resource "aws_iam_role" "sc_launch_role" {
  name = "ServiceCatalogLaunchRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "servicecatalog.amazonaws.com"
        }
      }
    ]
  })
}

# Attach policies that allow creating the product resources
resource "aws_iam_role_policy" "sc_launch_policy" {
  name = "launch-policy"
  role = aws_iam_role.sc_launch_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:*",
          "cloudformation:*",
          "s3:GetObject"
        ]
        Resource = "*"
      }
    ]
  })
}

# Apply the launch constraint to the VPC product
resource "aws_servicecatalog_constraint" "vpc_launch" {
  portfolio_id = aws_servicecatalog_portfolio.networking.id
  product_id   = aws_servicecatalog_product.vpc.id
  type         = "LAUNCH"

  parameters = jsonencode({
    RoleArn = aws_iam_role.sc_launch_role.arn
  })

  description = "Launch constraint for VPC product"
}
```

### Template Constraint

Template constraints restrict which parameter values end users can specify when launching a product.

```hcl
# Restrict the VPC CIDR ranges users can choose
resource "aws_servicecatalog_constraint" "vpc_template" {
  portfolio_id = aws_servicecatalog_portfolio.networking.id
  product_id   = aws_servicecatalog_product.vpc.id
  type         = "TEMPLATE"

  parameters = jsonencode({
    Rules = {
      RestrictCidr = {
        Assertions = [
          {
            Assert = {
              "Fn::Contains" = [
                ["10.0.0.0/16", "10.1.0.0/16", "10.2.0.0/16"],
                { Ref = "VpcCidr" }
              ]
            }
            AssertDescription = "VPC CIDR must be one of the approved ranges"
          }
        ]
      }
    }
  })

  description = "Restrict VPC CIDR to approved ranges"
}
```

### Tag Update Constraint

Control whether end users can update tags on provisioned products.

```hcl
# Allow users to update tags on provisioned VPCs
resource "aws_servicecatalog_constraint" "vpc_tag_update" {
  portfolio_id = aws_servicecatalog_portfolio.networking.id
  product_id   = aws_servicecatalog_product.vpc.id
  type         = "RESOURCE_UPDATE"

  parameters = jsonencode({
    TagUpdatesOnProvisionedProduct = "ALLOWED"
  })

  description = "Allow tag updates on provisioned VPC products"
}
```

## Sharing Portfolios Across Accounts

In a multi-account setup, you can share portfolios with other AWS accounts or your entire organization.

```hcl
# Share portfolio with a specific AWS account
resource "aws_servicecatalog_portfolio_share" "shared_with_dev" {
  portfolio_id     = aws_servicecatalog_portfolio.networking.id
  principal_id     = "123456789012" # Target account ID
  type             = "ACCOUNT"
  share_tag_options = true
}

# Share with an entire organization
resource "aws_servicecatalog_portfolio_share" "shared_with_org" {
  portfolio_id     = aws_servicecatalog_portfolio.networking.id
  principal_id     = "o-abc123def4" # Organization ID
  type             = "ORGANIZATION"
  share_tag_options = true
}
```

## Tag Options

Tag options enforce consistent tagging on provisioned products.

```hcl
# Define tag options
resource "aws_servicecatalog_tag_option" "environment" {
  key    = "Environment"
  value  = "production"
  active = true
}

resource "aws_servicecatalog_tag_option" "environment_staging" {
  key    = "Environment"
  value  = "staging"
  active = true
}

# Associate tag options with a portfolio
resource "aws_servicecatalog_tag_option_resource_association" "env_networking" {
  resource_id   = aws_servicecatalog_portfolio.networking.id
  tag_option_id = aws_servicecatalog_tag_option.environment.id
}

resource "aws_servicecatalog_tag_option_resource_association" "env_staging_networking" {
  resource_id   = aws_servicecatalog_portfolio.networking.id
  tag_option_id = aws_servicecatalog_tag_option.environment_staging.id
}
```

## Provisioning a Product with Terraform

You can also use Terraform to provision products from the catalog, which is useful for automation.

```hcl
# Provision a VPC from the Service Catalog product
resource "aws_servicecatalog_provisioned_product" "my_vpc" {
  name                       = "dev-team-vpc"
  product_id                 = aws_servicecatalog_product.vpc.id
  provisioning_artifact_name = "v1.0.0"

  provisioning_parameters {
    key   = "VpcCidr"
    value = "10.0.0.0/16"
  }

  provisioning_parameters {
    key   = "Environment"
    value = "development"
  }

  tags = {
    Team = "development"
  }
}

# Output the provisioned product details
output "provisioned_vpc_outputs" {
  value = aws_servicecatalog_provisioned_product.my_vpc.outputs
}
```

## Building a Complete Product Module

For real-world use, wrap your product creation in a reusable module.

```hcl
# modules/service-catalog-product/variables.tf
variable "product_name" {
  type        = string
  description = "Name of the product"
}

variable "portfolio_id" {
  type        = string
  description = "Portfolio to associate the product with"
}

variable "template_url" {
  type        = string
  description = "S3 URL for the CloudFormation template"
}

variable "launch_role_arn" {
  type        = string
  description = "IAM role ARN for launching the product"
}

variable "version" {
  type        = string
  default     = "v1.0.0"
  description = "Product version"
}
```

## Best Practices

1. **Use launch constraints everywhere.** Without a launch constraint, users need direct IAM permissions to create the underlying resources, which defeats the purpose of Service Catalog.

2. **Version your products.** Always use meaningful version names so users know what changed between releases.

3. **Test templates before publishing.** Validate CloudFormation templates independently before adding them as products.

4. **Share portfolios, not products.** Sharing at the portfolio level is cleaner and easier to manage than sharing individual products.

5. **Use tag options for compliance.** Enforce required tags through tag options to maintain cost allocation and governance standards.

## Conclusion

AWS Service Catalog with Terraform gives you a powerful self-service platform for your organization. Your platform team defines the approved infrastructure patterns, and development teams provision what they need without waiting for tickets or needing broad AWS permissions. Everything stays in version control, and you maintain full governance over what gets deployed and how.
