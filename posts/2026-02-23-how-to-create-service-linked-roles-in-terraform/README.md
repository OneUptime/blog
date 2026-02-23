# How to Create Service-Linked Roles in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Service-Linked Roles, Infrastructure as Code

Description: Learn how to create and manage AWS service-linked roles in Terraform for services like ECS, Elasticsearch, Auto Scaling, and Spot Fleet.

---

AWS service-linked roles are a special type of IAM role that is linked directly to an AWS service. The service defines the permissions for these roles, and only the linked service can assume them. While many service-linked roles are created automatically when you first use a service, some require explicit creation. Terraform provides the `aws_iam_service_linked_role` resource to manage these roles as part of your infrastructure code.

This guide explains what service-linked roles are, when you need to create them explicitly, and how to manage them with Terraform.

## What Are Service-Linked Roles?

Service-linked roles differ from regular IAM roles in several ways:

- **Predefined permissions.** The linked service defines the permissions policy. You cannot modify it.
- **Trust policy is fixed.** Only the linked service can assume the role. You cannot change the trust policy.
- **Service-managed lifecycle.** The linked service can update the role's permissions as its requirements change.
- **Naming convention.** Service-linked roles follow a naming pattern like `AWSServiceRoleForElasticLoadBalancing`.

Some AWS services automatically create their service-linked role when you first use them through the console. But when you provision infrastructure entirely through Terraform, you may need to create these roles explicitly before creating the resources that depend on them.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with IAM permissions to create service-linked roles
- AWS CLI configured with valid credentials

## Basic Service-Linked Role Creation

The `aws_iam_service_linked_role` resource creates a service-linked role for a given service.

```hcl
# Create a service-linked role for Elasticsearch (OpenSearch)
resource "aws_iam_service_linked_role" "elasticsearch" {
  aws_service_name = "es.amazonaws.com"
  description      = "Service-linked role for Amazon OpenSearch Service"
}
```

The `aws_service_name` parameter identifies which AWS service the role is linked to. Each service has a specific service principal name.

## Common Service-Linked Roles

Here are service-linked roles you commonly need to create with Terraform.

### Auto Scaling

```hcl
# Service-linked role for Auto Scaling
resource "aws_iam_service_linked_role" "autoscaling" {
  aws_service_name = "autoscaling.amazonaws.com"
  description      = "Service-linked role for EC2 Auto Scaling"
}
```

### Elastic Load Balancing

```hcl
# Service-linked role for ELB
resource "aws_iam_service_linked_role" "elb" {
  aws_service_name = "elasticloadbalancing.amazonaws.com"
  description      = "Service-linked role for Elastic Load Balancing"
}
```

### ECS

```hcl
# Service-linked role for ECS
resource "aws_iam_service_linked_role" "ecs" {
  aws_service_name = "ecs.amazonaws.com"
  description      = "Service-linked role for Amazon ECS"
}
```

### Spot Fleet

```hcl
# Service-linked role for EC2 Spot Fleet
resource "aws_iam_service_linked_role" "spot" {
  aws_service_name = "spotfleet.amazonaws.com"
  description      = "Service-linked role for EC2 Spot Fleet"
}
```

### RDS

```hcl
# Service-linked role for RDS
resource "aws_iam_service_linked_role" "rds" {
  aws_service_name = "rds.amazonaws.com"
  description      = "Service-linked role for Amazon RDS"
}
```

### Application Auto Scaling

```hcl
# Service-linked role for Application Auto Scaling (used by ECS, DynamoDB, etc.)
resource "aws_iam_service_linked_role" "app_autoscaling" {
  aws_service_name = "ecs.application-autoscaling.amazonaws.com"
  description      = "Service-linked role for ECS Application Auto Scaling"
}
```

## Using Custom Suffixes

Some services support custom suffixes to differentiate between multiple service-linked roles for the same service. This is useful when different teams or applications need separate roles.

```hcl
# Service-linked role with a custom suffix
resource "aws_iam_service_linked_role" "autoscaling_custom" {
  aws_service_name = "autoscaling.amazonaws.com"
  custom_suffix    = "app-team"
  description      = "Service-linked role for the app team's Auto Scaling groups"
}
```

Not all services support custom suffixes. Check the AWS documentation for the specific service to see if this feature is available.

## Handling Already-Existing Roles

If a service-linked role already exists in your account (perhaps created automatically by the console), Terraform will fail when trying to create it. You can handle this with a data source or by importing the existing role.

### Importing an Existing Role

```bash
# Import an existing service-linked role into Terraform state
terraform import aws_iam_service_linked_role.elasticsearch arn:aws:iam::123456789012:role/aws-service-role/es.amazonaws.com/AWSServiceRoleForAmazonElasticsearchService
```

### Using Lifecycle Rules

```hcl
# Prevent errors if the role already exists
resource "aws_iam_service_linked_role" "elasticsearch" {
  aws_service_name = "es.amazonaws.com"

  lifecycle {
    # If the role already exists, do not try to recreate it
    prevent_destroy = true
  }
}
```

### Conditional Creation

```hcl
variable "create_service_linked_roles" {
  description = "Whether to create service-linked roles (set to false if they already exist)"
  type        = bool
  default     = true
}

resource "aws_iam_service_linked_role" "elasticsearch" {
  count = var.create_service_linked_roles ? 1 : 0

  aws_service_name = "es.amazonaws.com"
  description      = "Service-linked role for Amazon OpenSearch Service"
}
```

## Creating Multiple Service-Linked Roles

When setting up a new AWS account, you might need to create several service-linked roles at once.

```hcl
# List of services that need service-linked roles
variable "service_linked_roles" {
  description = "Map of AWS services that need service-linked roles"
  type = map(object({
    service_name = string
    description  = string
  }))
  default = {
    ecs = {
      service_name = "ecs.amazonaws.com"
      description  = "Amazon ECS service-linked role"
    }
    elasticsearch = {
      service_name = "es.amazonaws.com"
      description  = "Amazon OpenSearch service-linked role"
    }
    autoscaling = {
      service_name = "autoscaling.amazonaws.com"
      description  = "EC2 Auto Scaling service-linked role"
    }
    elb = {
      service_name = "elasticloadbalancing.amazonaws.com"
      description  = "Elastic Load Balancing service-linked role"
    }
    rds = {
      service_name = "rds.amazonaws.com"
      description  = "Amazon RDS service-linked role"
    }
    spot = {
      service_name = "spotfleet.amazonaws.com"
      description  = "EC2 Spot Fleet service-linked role"
    }
  }
}

resource "aws_iam_service_linked_role" "roles" {
  for_each = var.service_linked_roles

  aws_service_name = each.value.service_name
  description      = each.value.description
}
```

## Ordering Dependencies

When a service-linked role must exist before another resource can be created, use `depends_on` to establish the dependency.

```hcl
# Create the service-linked role for OpenSearch
resource "aws_iam_service_linked_role" "opensearch" {
  aws_service_name = "es.amazonaws.com"
}

# The OpenSearch domain depends on the service-linked role
resource "aws_opensearch_domain" "main" {
  domain_name    = "my-domain"
  engine_version = "OpenSearch_2.7"

  cluster_config {
    instance_type  = "r6g.large.search"
    instance_count = 2
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 100
    volume_type = "gp3"
  }

  # Ensure the service-linked role exists before creating the domain
  depends_on = [aws_iam_service_linked_role.opensearch]
}
```

## Important Notes

There are several things to keep in mind about service-linked roles:

1. **You cannot modify permissions.** The permissions are defined by the AWS service and cannot be changed through Terraform or any other tool.

2. **Deletion may take time.** When you destroy a service-linked role, AWS needs to verify that the service is no longer using it. This can cause Terraform destroy to take longer than expected.

3. **One per service (usually).** Most services only allow one service-linked role per account. Creating a second one will fail unless the service supports custom suffixes.

4. **IAM permissions needed.** The IAM principal running Terraform needs the `iam:CreateServiceLinkedRole` permission for the specific service.

5. **Automatic creation varies.** Some services create their service-linked role automatically, others do not. When automating everything with Terraform, it is safer to create them explicitly.

## Permissions Required to Create Service-Linked Roles

Your Terraform execution role needs these permissions:

```hcl
resource "aws_iam_policy" "terraform_slr_permissions" {
  name = "terraform-service-linked-role-management"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "iam:CreateServiceLinkedRole",
          "iam:DeleteServiceLinkedRole",
          "iam:GetServiceLinkedRoleDeletionStatus",
        ]
        Resource = "arn:aws:iam::*:role/aws-service-role/*"
      }
    ]
  })
}
```

For more on IAM role management with Terraform, see [How to Create IAM Roles with Trust Policies in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-roles-with-trust-policies-in-terraform/view).

## Conclusion

Service-linked roles are a necessary part of many AWS service configurations. While they are often created automatically through the console, infrastructure-as-code workflows with Terraform benefit from explicit creation. This ensures your Terraform runs succeed in new accounts, makes dependencies clear, and keeps your infrastructure fully codified. Handle already-existing roles gracefully with imports or conditional creation, and always establish proper dependencies between service-linked roles and the resources that need them.
