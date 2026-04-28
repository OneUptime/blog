# How to Handle Import ID Formats for Different Resource Types in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Import

Description: Learn how to find the correct import ID format for different OpenTofu provider resource types when using import blocks or the tofu import command.

## Introduction

Each resource type uses a different format for its import ID. Some use a single identifier (like an instance ID or bucket name), others use composite IDs with separators (like `account-id/resource-name`), and some use ARNs or full resource paths. Knowing where to find the correct format prevents import failures.

## Finding the Import ID Format

Every provider resource in documentation has an "Import" section showing the ID format:

```bash
# Check the provider documentation for the resource

# Example: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket#import

# Or: run plan with -generate-config-out to see what ID format is used
tofu plan -generate-config-out=generated.tf
# Look at the imported resource's 'id' attribute
```

## AWS Resource Import IDs

```bash
# Single identifier
tofu import aws_s3_bucket.data "my-bucket-name"
tofu import aws_iam_role.app "MyRoleName"
tofu import aws_instance.web "i-0abc123456def"
tofu import aws_vpc.main "vpc-0abc123456"
tofu import aws_subnet.public "subnet-0abc123456"
tofu import aws_security_group.web "sg-0abc123456"

# Composite with slash
tofu import aws_ecs_service.web "cluster-name/service-name"

# Composite with colon
tofu import aws_iam_role_policy.app "RoleName:PolicyName"

# Composite with comma
tofu import aws_s3_bucket_acl.data "bucket-name,private"

# Full ARN
tofu import aws_alb_listener_rule.app "arn:aws:elasticloadbalancing:us-east-1:123456:listener/app/my-alb/.../rule/..."
```

## GCP Resource Import IDs

```hcl
# Format: projects/{{project}}/...resource/{{name}}
import {
  to = google_storage_bucket.data
  id = "my-project/my-bucket"  # project/bucket-name
}

import {
  to = google_compute_instance.web
  id = "projects/my-project/zones/us-central1-a/instances/my-instance"
}

import {
  to = google_sql_database_instance.db
  id = "my-project/my-database-instance"
}
```

## Azure Resource Import IDs

```hcl
# Azure uses full resource ID paths
import {
  to = azurerm_resource_group.main
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg"
}

import {
  to = azurerm_storage_account.state
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg/providers/Microsoft.Storage/storageAccounts/mystorageaccount"
}
```

## Common Import ID Patterns

| Pattern | Example Resources |
|---|---|
| Name only | `aws_iam_role`, `aws_s3_bucket` |
| Cloud ID | `aws_instance` (`i-...`), `aws_vpc` (`vpc-...`) |
| `parent/child` | `aws_ecs_service` |
| `parent:child` | `aws_iam_role_policy` |
| `project/resource` | GCP resources |
| Full resource path | Azure resources |
| ARN | Some AWS resources |

## Finding IDs in the Cloud Console

```bash
# AWS: Use AWS CLI to find the right ID
aws s3 ls  # Bucket names
aws ec2 describe-instances --query 'Reservations[].Instances[].InstanceId'
aws iam list-roles --query 'Roles[].RoleName'

# GCP: Use gcloud CLI
gcloud projects list --format='value(projectId)'
gcloud compute instances list --format='value(selfLink)'

# Azure: Use az CLI
az resource list --query '[].id' -o tsv
```

## Validating Before Import

```bash
# Test the ID format by trying a plan first
import {
  to = aws_iam_role_policy.app
  id = "MyRole:MyPolicy"  # Testing this format
}
```

```bash
tofu plan

# If wrong format, you get an error at plan time:
# Error: Cannot import non-existent remote object
# The import ID "MyRole:MyPolicy" was not found.
# Verify the ID format in the provider documentation.
```

## Importing Resources with ARNs

```hcl
# Some resources require the full ARN
import {
  to = aws_iam_policy.custom
  id = "arn:aws:iam::123456789012:policy/MyCustomPolicy"
}

import {
  to = aws_sns_topic.alerts
  id = "arn:aws:sns:us-east-1:123456789012:my-alerts-topic"
}
```

## Conclusion

The import ID format is resource-specific and documented in each provider's resource documentation under the "Import" section. For AWS resources, IDs range from simple names (IAM roles, S3 buckets) to cloud-assigned IDs (instance IDs, VPC IDs) to composite slash-separated values (role/policy). For GCP and Azure, IDs typically include the project or subscription in a structured path. Always check the documentation and validate the ID at plan time before applying.
