# How to Create CloudFormation Stacks in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CloudFormation, Infrastructure as Code, DevOps

Description: Learn how to create and manage AWS CloudFormation stacks using Terraform, including stack sets, nested stacks, and cross-stack references.

---

It might seem counterintuitive to manage one infrastructure-as-code tool with another, but there are practical reasons to create CloudFormation stacks through Terraform. Maybe your organization has existing CloudFormation templates that work well and you do not want to rewrite them. Perhaps certain AWS features only have CloudFormation support. Or you might be migrating from CloudFormation to Terraform gradually and need both to coexist.

Whatever the reason, Terraform has first-class support for creating and managing CloudFormation stacks. This guide covers the full spectrum - from simple stacks to stack sets for multi-account deployments.

## Prerequisites

You will need:

- Terraform 1.0 or later
- AWS CLI configured with appropriate permissions
- Familiarity with both CloudFormation template syntax and Terraform HCL

## Provider Configuration

```hcl
# Standard AWS provider setup
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

## Creating a Basic CloudFormation Stack

The `aws_cloudformation_stack` resource lets you deploy a CloudFormation template directly from Terraform.

```hcl
# Create a CloudFormation stack with an inline template
resource "aws_cloudformation_stack" "vpc_stack" {
  name = "my-vpc-stack"

  # Inline CloudFormation template in JSON
  template_body = jsonencode({
    AWSTemplateFormatVersion = "2010-09-09"
    Description              = "VPC created via CloudFormation managed by Terraform"

    Parameters = {
      VpcCidr = {
        Type        = "String"
        Default     = "10.0.0.0/16"
        Description = "CIDR block for the VPC"
      }
    }

    Resources = {
      MyVPC = {
        Type = "AWS::EC2::VPC"
        Properties = {
          CidrBlock          = { Ref = "VpcCidr" }
          EnableDnsSupport   = true
          EnableDnsHostnames = true
          Tags = [
            {
              Key   = "Name"
              Value = "terraform-managed-cfn-vpc"
            }
          ]
        }
      }
    }

    Outputs = {
      VpcId = {
        Description = "The VPC ID"
        Value       = { Ref = "MyVPC" }
      }
    }
  })

  # Pass parameters to the CloudFormation template
  parameters = {
    VpcCidr = "10.0.0.0/16"
  }

  tags = {
    ManagedBy = "Terraform"
  }
}

# Access CloudFormation stack outputs in Terraform
output "vpc_id" {
  value = aws_cloudformation_stack.vpc_stack.outputs["VpcId"]
}
```

## Using an External Template File

For larger templates, storing them inline gets unwieldy. You can reference an external file instead.

```hcl
# Reference a template file stored locally
resource "aws_cloudformation_stack" "app_stack" {
  name = "my-app-stack"

  # Load the template from a local file
  template_body = file("${path.module}/templates/app-stack.yaml")

  parameters = {
    Environment  = "production"
    InstanceType = "t3.medium"
    KeyName      = "my-keypair"
  }

  # Capabilities required for IAM resources
  capabilities = ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM"]

  # Timeout for stack creation
  timeout_in_minutes = 30

  # Prevent accidental deletion
  on_failure = "ROLLBACK"

  tags = {
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}
```

## Using Templates from S3

When your templates are stored in S3 (common in enterprise setups), use `template_url` instead.

```hcl
# Upload the template to S3 first
resource "aws_s3_object" "cfn_template" {
  bucket = aws_s3_bucket.templates.id
  key    = "cloudformation/network-stack.yaml"
  source = "${path.module}/templates/network-stack.yaml"
  etag   = filemd5("${path.module}/templates/network-stack.yaml")
}

# Create a stack using the S3 template URL
resource "aws_cloudformation_stack" "network_stack" {
  name         = "network-stack"
  template_url = "https://${aws_s3_bucket.templates.bucket_regional_domain_name}/${aws_s3_object.cfn_template.key}"

  parameters = {
    VpcCidr = "10.0.0.0/16"
  }

  capabilities = ["CAPABILITY_IAM"]

  depends_on = [aws_s3_object.cfn_template]
}
```

## CloudFormation Stack Sets for Multi-Account Deployments

Stack sets let you deploy the same CloudFormation template across multiple AWS accounts and regions. This is especially useful in AWS Organizations setups.

```hcl
# IAM role for StackSets administration
resource "aws_iam_role" "stackset_admin" {
  name = "AWSCloudFormationStackSetAdministrationRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "cloudformation.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "stackset_admin_policy" {
  name = "stackset-admin-policy"
  role = aws_iam_role.stackset_admin.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "sts:AssumeRole"
        Resource = "arn:aws:iam::*:role/AWSCloudFormationStackSetExecutionRole"
      }
    ]
  })
}

# Create the StackSet
resource "aws_cloudformation_stack_set" "security_baseline" {
  name             = "security-baseline"
  description      = "Deploy security baseline across all accounts"
  permission_model = "SERVICE_MANAGED"

  # Template for the stack set
  template_body = jsonencode({
    AWSTemplateFormatVersion = "2010-09-09"
    Description              = "Security baseline configuration"

    Resources = {
      SecurityTrail = {
        Type = "AWS::CloudTrail::Trail"
        Properties = {
          TrailName         = "organization-trail"
          S3BucketName      = "org-cloudtrail-logs"
          IsLogging         = true
          IsMultiRegionTrail = true
        }
      }
    }
  })

  capabilities = ["CAPABILITY_IAM"]

  # Auto-deploy to new accounts in the organization
  auto_deployment {
    enabled                          = true
    retain_stacks_on_account_removal = false
  }

  lifecycle {
    ignore_changes = [administration_role_arn]
  }
}

# Deploy the StackSet to specific OUs
resource "aws_cloudformation_stack_set_instance" "security_baseline" {
  stack_set_name = aws_cloudformation_stack_set.security_baseline.name

  deployment_targets {
    organizational_unit_ids = ["ou-abc123def456"]
  }

  region = "us-east-1"
}
```

## Referencing CloudFormation Outputs in Terraform

One powerful pattern is creating resources in CloudFormation and then referencing their outputs in Terraform.

```hcl
# Create infrastructure via CloudFormation
resource "aws_cloudformation_stack" "database_stack" {
  name = "database-stack"

  template_body = file("${path.module}/templates/database.yaml")

  parameters = {
    DBInstanceClass = "db.r5.large"
    DBName          = "myapp"
  }

  capabilities = ["CAPABILITY_IAM"]
}

# Use CloudFormation outputs in other Terraform resources
resource "aws_ssm_parameter" "db_endpoint" {
  name  = "/myapp/database/endpoint"
  type  = "String"
  value = aws_cloudformation_stack.database_stack.outputs["DBEndpoint"]
}

# Reference in an application configuration
resource "aws_ecs_task_definition" "app" {
  family = "my-app"

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "my-app:latest"
      environment = [
        {
          name  = "DB_HOST"
          value = aws_cloudformation_stack.database_stack.outputs["DBEndpoint"]
        }
      ]
    }
  ])
}
```

## Importing Existing CloudFormation Stacks

If you have existing CloudFormation stacks that you want Terraform to manage, you can import them.

```hcl
# First, write the resource block
resource "aws_cloudformation_stack" "existing_stack" {
  name          = "my-existing-stack"
  template_body = file("${path.module}/templates/existing.yaml")
}
```

Then run the import command:

```bash
# Import the existing stack into Terraform state
terraform import aws_cloudformation_stack.existing_stack my-existing-stack
```

## Handling Stack Policies

Stack policies prevent unintentional updates to critical stack resources.

```hcl
# Stack with a policy that protects the database from replacement
resource "aws_cloudformation_stack" "protected_stack" {
  name = "protected-resources"

  template_body = file("${path.module}/templates/app.yaml")

  # Policy that prevents updates to the database resource
  policy_body = jsonencode({
    Statement = [
      {
        Effect    = "Allow"
        Action    = "Update:*"
        Principal = "*"
        Resource  = "*"
      },
      {
        Effect    = "Deny"
        Action    = "Update:Replace"
        Principal = "*"
        Resource  = "LogicalResourceId/ProductionDatabase"
      }
    ]
  })

  parameters = {
    Environment = "production"
  }

  capabilities = ["CAPABILITY_IAM"]
}
```

## Notification Configuration

You can configure SNS notifications for stack events to stay informed about stack operations.

```hcl
# SNS topic for CloudFormation notifications
resource "aws_sns_topic" "cfn_notifications" {
  name = "cloudformation-notifications"
}

# Stack with notifications enabled
resource "aws_cloudformation_stack" "notified_stack" {
  name = "notified-stack"

  template_body = file("${path.module}/templates/app.yaml")

  # Send stack events to SNS
  notification_arns = [aws_sns_topic.cfn_notifications.arn]

  parameters = {
    Environment = "staging"
  }

  tags = {
    Environment = "staging"
  }
}
```

## Best Practices

Here are some recommendations for managing CloudFormation stacks through Terraform:

1. **Use outputs liberally.** CloudFormation stack outputs are the bridge between your CloudFormation resources and the rest of your Terraform configuration.

2. **Store templates in version control.** Keep your CloudFormation YAML/JSON templates alongside your Terraform code.

3. **Set appropriate timeouts.** Complex stacks can take a while to create. Set `timeout_in_minutes` to avoid unnecessary failures.

4. **Always specify capabilities.** If your template creates IAM resources, you must include the appropriate capabilities or the stack creation will fail.

5. **Use stack sets for multi-account.** If you are working with AWS Organizations, stack sets are the right tool for deploying consistent configurations across accounts.

6. **Plan your migration.** If you are moving from CloudFormation to Terraform, import existing stacks first and then gradually replace them with native Terraform resources.

## Conclusion

Managing CloudFormation stacks through Terraform gives you the best of both worlds. You keep your existing CloudFormation templates and gain Terraform's state management, planning, and multi-provider capabilities. Whether you are maintaining legacy templates or deploying stack sets across an organization, Terraform handles CloudFormation stacks cleanly and predictably.

For more on managing AWS infrastructure with Terraform, see our guide on [creating Organizations and SCPs in Terraform](https://oneuptime.com/blog/post/2026-02-23-create-organizations-and-scps-in-terraform/view).
