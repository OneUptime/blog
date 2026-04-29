# How to Migrate AWS Infrastructure from CloudFormation to OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, CloudFormation, Migration, AWS, Infrastructure as Code

Description: Learn how to migrate existing AWS infrastructure managed by CloudFormation stacks into OpenTofu state without recreating resources.

## Introduction

Migrating from CloudFormation to OpenTofu involves three core phases: writing OpenTofu configuration that matches your existing resources, importing those resources into state, and decommissioning the CloudFormation stacks. The key principle is to import without destroying - your running infrastructure should never be interrupted.

## Phase 1: Audit Your CloudFormation Stacks

Start by inventorying what you have.

```bash
# List CloudFormation stacks

aws cloudformation list-stacks \
  --query 'StackSummaries[?StackStatus!=`DELETE_COMPLETE`].[StackName,StackStatus]' \
  --output table

# Get detailed resources for a specific stack
aws cloudformation list-stack-resources \
  --stack-name my-app-stack \
  --query 'StackResourceSummaries[*].[ResourceType,LogicalResourceId,PhysicalResourceId]' \
  --output table

# Export the template for reference
aws cloudformation get-template \
  --stack-name my-app-stack \
  --query 'TemplateBody' > my-app-stack-template.json
```

## Phase 2: Write OpenTofu Configuration

Translate CloudFormation resources into HCL. Use the AWS provider documentation for the correct resource types and arguments.

```hcl
# CloudFormation (original)
# Type: AWS::S3::Bucket
# Properties:
#   BucketName: my-app-data
#   VersioningConfiguration:
#     Status: Enabled

# OpenTofu equivalent
resource "aws_s3_bucket" "app_data" {
  bucket = "my-app-data"
}

resource "aws_s3_bucket_versioning" "app_data" {
  bucket = aws_s3_bucket.app_data.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

## Phase 3: Import Existing Resources

Use import blocks to bring existing resources into OpenTofu state.

```hcl
# imports.tf
import {
  id = "my-app-data"
  to = aws_s3_bucket.app_data
}

import {
  id = "my-app-data"
  to = aws_s3_bucket_versioning.app_data
}

import {
  id = "vpc-0abc12345def67890"
  to = aws_vpc.main
}

import {
  id = "sg-0abc12345def67890"
  to = aws_security_group.app
}
```

```bash
# Preview the import
tofu plan

# If the plan shows no unexpected changes, apply the imports
tofu apply

# You can remove the import blocks after successful import
# or keep them as a record of the resource origin
```

## Phase 4: Handle CloudFormation-Specific Constructs

Some CloudFormation features need translation.

```text
CloudFormation → OpenTofu equivalents:

Fn::GetAtt      → resource attribute references (resource.name.attribute)
Ref             → variable values or resource-specific attributes (often resource.name.id)
Parameters      → variable blocks
Outputs         → output blocks
Conditions      → count/for_each or conditional expressions
DependsOn       → depends_on meta-argument
Mappings        → local maps or variables
AWS::NoValue    → null
```

```hcl
# CloudFormation Fn::Sub substitution
# "arn:aws:s3:::${BucketName}/*"

# OpenTofu equivalent
"${aws_s3_bucket.app_data.arn}/*"
```

## Phase 5: Validate and Decommission

Verify OpenTofu manages the resources correctly before removing CloudFormation.

```bash
# Run plan - should show no changes if config matches reality
tofu plan

# If plan is clean, disable stack termination protection
aws cloudformation update-termination-protection \
  --stack-name my-app-stack \
  --no-enable-termination-protection

# CloudFormation deletes resources by default.
# If the stack template does not already use DeletionPolicy: Retain,
# update it first for any resources you need to keep, then delete the stack.
aws cloudformation delete-stack \
  --stack-name my-app-stack
```

## Handling Nested Stacks

For stacks with nested stacks, migrate leaf stacks first.

```bash
# List nested stacks
aws cloudformation list-stack-resources \
  --stack-name parent-stack \
  --query 'StackResourceSummaries[?ResourceType==`AWS::CloudFormation::Stack`]'

# Migrate child stacks first, then the parent
# Decommission from leaf to root
```

## Summary

Migrating from CloudFormation to OpenTofu requires careful planning but does not require any downtime. The process: audit all stacks, write HCL configuration that matches the existing resources, use import blocks to pull them into state, validate with `tofu plan` (should show no changes), then delete CloudFormation stacks after configuring `DeletionPolicy: Retain` for resources you need to keep. OpenTofu's experimental `tofu plan -generate-config-out=generated.tf` workflow can significantly accelerate the initial configuration writing step.
