# How to Deploy CloudFormation Templates with the AWS CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, AWS CLI, DevOps, Infrastructure as Code

Description: Learn how to deploy, update, and manage AWS CloudFormation stacks using the AWS CLI with practical commands and automation tips.

---

The AWS Console is fine for learning, but real CloudFormation work happens on the command line. The AWS CLI gives you scriptable, repeatable deployments that you can integrate into CI/CD pipelines, run from Makefiles, or wrap in shell scripts.

This guide covers everything you need to deploy and manage CloudFormation stacks from the CLI - from basic creates to advanced techniques like waiting for completion and handling failures.

## Setting Up the AWS CLI

If you haven't installed the CLI yet, grab version 2:

```bash
# Install AWS CLI v2 on macOS
brew install awscli

# Or on Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify the installation
aws --version
```

Configure your credentials:

```bash
# Set up your AWS credentials and default region
aws configure
# AWS Access Key ID: your-key
# AWS Secret Access Key: your-secret
# Default region name: us-east-1
# Default output format: json
```

## Creating a Stack

The basic command to create a stack:

```bash
# Create a stack from a local template file
aws cloudformation create-stack \
  --stack-name my-app-stack \
  --template-body file://template.yaml
```

The `file://` prefix is important - it tells the CLI to read from a local file. Without it, you'll get errors.

For templates with parameters:

```bash
# Create a stack with parameter values
aws cloudformation create-stack \
  --stack-name my-app-prod \
  --template-body file://template.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=prod \
    ParameterKey=InstanceType,ParameterValue=t3.medium
```

If your template creates IAM resources, you need to explicitly acknowledge that:

```bash
# Create a stack that includes IAM resources
aws cloudformation create-stack \
  --stack-name my-app-stack \
  --template-body file://template.yaml \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

## Waiting for Completion

`create-stack` returns immediately - it doesn't wait for the stack to finish. Use the wait command:

```bash
# Wait for stack creation to complete (blocks until done)
aws cloudformation wait stack-create-complete \
  --stack-name my-app-stack

# Check the exit code to know if it succeeded
echo $?
# 0 = success, non-zero = failure
```

For a script that creates and waits:

```bash
#!/bin/bash
# Script to create a stack and report the result

STACK_NAME="my-app-stack"

echo "Creating stack: $STACK_NAME"
aws cloudformation create-stack \
  --stack-name "$STACK_NAME" \
  --template-body file://template.yaml \
  --parameters ParameterKey=Environment,ParameterValue=prod

echo "Waiting for stack creation to complete..."
if aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME"; then
  echo "Stack created successfully!"
  # Show outputs
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs'
else
  echo "Stack creation failed. Checking events..."
  aws cloudformation describe-stack-events \
    --stack-name "$STACK_NAME" \
    --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`].[LogicalResourceId,ResourceStatusReason]' \
    --output table
fi
```

## Using deploy Instead of create-stack

The `deploy` command is actually more practical for most workflows. It handles both creates and updates, and it waits for completion by default:

```bash
# Deploy a stack (creates if new, updates if existing)
aws cloudformation deploy \
  --stack-name my-app-stack \
  --template-file template.yaml \
  --parameter-overrides \
    Environment=prod \
    InstanceType=t3.medium \
  --capabilities CAPABILITY_IAM

# Note: deploy uses --template-file (no file:// prefix)
# and --parameter-overrides uses Key=Value format
```

Key differences between `create-stack` and `deploy`:

| Feature | create-stack | deploy |
|---|---|---|
| Waits for completion | No | Yes |
| Creates and updates | Create only | Both |
| Parameter format | `ParameterKey=K,ParameterValue=V` | `K=V` |
| Template argument | `--template-body file://` | `--template-file` |
| Change set preview | No | Creates change set internally |

## Updating a Stack

If you're using `create-stack` / `update-stack` separately:

```bash
# Update an existing stack with a modified template
aws cloudformation update-stack \
  --stack-name my-app-stack \
  --template-body file://template.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=prod \
    ParameterKey=InstanceType,ParameterValue=t3.large \
  --capabilities CAPABILITY_IAM

# Wait for the update
aws cloudformation wait stack-update-complete \
  --stack-name my-app-stack
```

## Using Templates from S3

For templates larger than 51,200 bytes (the direct upload limit), you need to upload to S3 first:

```bash
# Upload the template to S3
aws s3 cp template.yaml s3://my-templates-bucket/template.yaml

# Create a stack using the S3 URL
aws cloudformation create-stack \
  --stack-name my-app-stack \
  --template-url https://s3.amazonaws.com/my-templates-bucket/template.yaml
```

Or package it automatically:

```bash
# Package transforms local references and uploads artifacts to S3
aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket my-templates-bucket \
  --output-template-file packaged.yaml

# Then deploy the packaged template
aws cloudformation deploy \
  --stack-name my-app-stack \
  --template-file packaged.yaml \
  --capabilities CAPABILITY_IAM
```

## Checking Stack Status

Several commands help you understand what's going on:

```bash
# Get the current status of a stack
aws cloudformation describe-stacks \
  --stack-name my-app-stack \
  --query 'Stacks[0].StackStatus'

# List all resources in a stack
aws cloudformation list-stack-resources \
  --stack-name my-app-stack

# Get stack events (useful for debugging)
aws cloudformation describe-stack-events \
  --stack-name my-app-stack \
  --query 'StackEvents[:10].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
  --output table

# Get output values
aws cloudformation describe-stacks \
  --stack-name my-app-stack \
  --query 'Stacks[0].Outputs' \
  --output table
```

## Deleting a Stack

```bash
# Delete a stack and all its resources
aws cloudformation delete-stack \
  --stack-name my-app-stack

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete \
  --stack-name my-app-stack
```

For more nuance around safe deletion, see our guide on [deleting CloudFormation stacks safely](https://oneuptime.com/blog/post/delete-cloudformation-stacks-safely/view).

## A Complete Deployment Script

Here's a production-ready deployment script:

```bash
#!/bin/bash
# deploy.sh - Deploy or update a CloudFormation stack
set -euo pipefail

STACK_NAME="${1:?Usage: deploy.sh STACK_NAME ENVIRONMENT}"
ENVIRONMENT="${2:?Usage: deploy.sh STACK_NAME ENVIRONMENT}"
TEMPLATE_FILE="template.yaml"
REGION="us-east-1"

echo "Deploying $STACK_NAME to $ENVIRONMENT in $REGION"

# Validate the template first
aws cloudformation validate-template \
  --template-body "file://$TEMPLATE_FILE" \
  --region "$REGION" > /dev/null

echo "Template validation passed"

# Deploy (handles both create and update)
aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMPLATE_FILE" \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region "$REGION" \
  --tags \
    Environment="$ENVIRONMENT" \
    ManagedBy=CloudFormation \
    DeployedAt="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "Deployment complete. Stack outputs:"
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[*].{Key:OutputKey,Value:OutputValue}' \
  --output table
```

Run it like:

```bash
# Deploy to dev
./deploy.sh my-app-dev dev

# Deploy to production
./deploy.sh my-app-prod prod
```

## Useful CLI Flags

A few flags worth knowing:

- `--no-fail-on-empty-changeset`: Prevents `deploy` from returning an error when there's nothing to update
- `--disable-rollback`: Keeps failed resources around for debugging (don't use in production)
- `--role-arn`: Specify an IAM role for CloudFormation to assume
- `--notification-arns`: Send stack events to an SNS topic
- `--tags`: Apply tags to all resources in the stack

The CLI gives you full control over CloudFormation. Combined with shell scripts or CI/CD tools, it's the foundation for automated infrastructure deployment. For the next step, look into [CloudFormation parameters](https://oneuptime.com/blog/post/cloudformation-parameters-reusable-templates/view) to make your templates work across environments without modification.
