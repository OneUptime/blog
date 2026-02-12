# How to Delete CloudFormation Stacks Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, Infrastructure as Code, DevOps

Description: Learn how to safely delete CloudFormation stacks without losing important resources, including pre-deletion checks and retention strategies.

---

Deleting a CloudFormation stack removes every resource it manages. That includes databases, S3 buckets with data, encryption keys, and DNS records. Done carelessly, a stack deletion can wipe out production data in seconds. This guide covers how to delete stacks safely, with checks and safeguards to prevent disasters.

## The Basics of Stack Deletion

```bash
# Delete a stack and all its resources
aws cloudformation delete-stack \
  --stack-name my-app-dev

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete \
  --stack-name my-app-dev
```

When you delete a stack, CloudFormation:

1. Determines the deletion order (reverse of creation order, respecting dependencies)
2. Deletes each resource
3. If any resource fails to delete, the entire deletion stops

## Pre-Deletion Checklist

Before deleting any stack, run through this checklist:

### 1. Verify you're deleting the right stack

It sounds obvious, but accidentally deleting `my-app-prod` instead of `my-app-dev` happens more often than anyone admits.

```bash
# Double-check the stack name, status, and when it was created
aws cloudformation describe-stacks \
  --stack-name my-app-dev \
  --query 'Stacks[0].{Name:StackName,Status:StackStatus,Created:CreationTime,Description:Description}' \
  --output table
```

### 2. Check what resources will be deleted

```bash
# List all resources managed by the stack
aws cloudformation list-stack-resources \
  --stack-name my-app-dev \
  --query 'StackResourceSummaries[*].{Type:ResourceType,LogicalId:LogicalResourceId,PhysicalId:PhysicalResourceId,Status:ResourceStatus}' \
  --output table
```

Look for resources that contain data: RDS instances, S3 buckets, DynamoDB tables, EFS file systems, Elasticsearch domains.

### 3. Check for cross-stack dependencies

If other stacks import values from this stack, deletion will fail:

```bash
# List all exports from this stack
aws cloudformation list-exports \
  --query "Exports[?ExportingStackId!=null && contains(ExportingStackId,'my-app-dev')]"

# Check if any exports are imported by other stacks
aws cloudformation list-imports \
  --export-name my-app-dev-VpcId 2>/dev/null || echo "No imports found"
```

### 4. Check for termination protection

```bash
# Check if termination protection is enabled
aws cloudformation describe-stacks \
  --stack-name my-app-dev \
  --query 'Stacks[0].EnableTerminationProtection'
```

If it's `true`, you'll need to disable it first:

```bash
# Disable termination protection (only if you're sure)
aws cloudformation update-termination-protection \
  --no-enable-termination-protection \
  --stack-name my-app-dev
```

## Protecting Resources from Deletion

### DeletionPolicy

The `DeletionPolicy` attribute on a resource controls what happens when the stack is deleted:

```yaml
# Protect critical resources from stack deletion
Resources:
  # This database will be retained even if the stack is deleted
  ProductionDatabase:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Retain
    Properties:
      DBInstanceClass: db.r5.large
      Engine: postgres

  # This database will create a final snapshot before deletion
  StagingDatabase:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Snapshot
    Properties:
      DBInstanceClass: db.t3.micro
      Engine: postgres

  # This bucket will be deleted with the stack (default behavior)
  TempBucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Delete
    Properties:
      BucketName: temp-processing-bucket
```

The three options:

| Policy | Behavior | Use For |
|---|---|---|
| `Delete` | Resource is deleted (default) | Temporary or recreatable resources |
| `Retain` | Resource is kept, just detached from the stack | Databases, encryption keys, critical data |
| `Snapshot` | Creates a final snapshot, then deletes | RDS, ElastiCache, Redshift |

For a deeper dive, see our post on [DeletionPolicy to retain resources](https://oneuptime.com/blog/post/cloudformation-deletionpolicy-retain-resources/view).

### Termination Protection

Enable this on any stack you don't want accidentally deleted:

```bash
# Enable termination protection
aws cloudformation update-termination-protection \
  --enable-termination-protection \
  --stack-name my-app-prod
```

Or set it at creation time:

```bash
# Create a stack with termination protection enabled
aws cloudformation create-stack \
  --stack-name my-app-prod \
  --template-body file://template.yaml \
  --enable-termination-protection
```

## Safe Deletion Script

Here's a script that adds safety checks before deletion:

```bash
#!/bin/bash
# safe-delete-stack.sh - Delete a stack with safety checks
set -euo pipefail

STACK_NAME="${1:?Usage: safe-delete-stack.sh STACK_NAME}"

echo "=== Pre-deletion checks for stack: $STACK_NAME ==="

# Check if stack exists
STACK_STATUS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].StackStatus' \
  --output text 2>/dev/null) || {
  echo "Stack $STACK_NAME does not exist."
  exit 1
}

echo "Stack status: $STACK_STATUS"

# Check termination protection
TERM_PROTECTION=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].EnableTerminationProtection' \
  --output text)

if [ "$TERM_PROTECTION" = "True" ]; then
  echo "ERROR: Termination protection is ENABLED. Disable it first if you really want to delete."
  exit 1
fi

# List data-bearing resources
echo ""
echo "=== Data-bearing resources that will be DELETED ==="
aws cloudformation list-stack-resources \
  --stack-name "$STACK_NAME" \
  --query 'StackResourceSummaries[?ResourceType==`AWS::RDS::DBInstance` || ResourceType==`AWS::S3::Bucket` || ResourceType==`AWS::DynamoDB::Table` || ResourceType==`AWS::EFS::FileSystem`].{Type:ResourceType,Id:LogicalResourceId,Physical:PhysicalResourceId}' \
  --output table

# Check for exports
echo ""
echo "=== Exports from this stack ==="
EXPORTS=$(aws cloudformation list-exports \
  --query "Exports[?contains(ExportingStackId,'$STACK_NAME')].Name" \
  --output text)

if [ -n "$EXPORTS" ]; then
  echo "WARNING: This stack has exports. Other stacks may depend on them:"
  echo "$EXPORTS"
else
  echo "No exports found."
fi

echo ""
read -p "Are you sure you want to delete $STACK_NAME? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Deletion cancelled."
  exit 0
fi

echo "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name "$STACK_NAME"

echo "Waiting for deletion to complete..."
if aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME"; then
  echo "Stack $STACK_NAME deleted successfully."
else
  echo "Deletion may have failed. Check the console for details."
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].StackStatus' 2>/dev/null || echo "Stack no longer exists."
fi
```

## Deleting Stacks with Non-Empty S3 Buckets

CloudFormation can't delete S3 buckets that contain objects. You need to empty them first:

```bash
# Empty an S3 bucket before stack deletion
aws s3 rm s3://my-bucket-name --recursive

# If versioning is enabled, also delete version markers
aws s3api list-object-versions \
  --bucket my-bucket-name \
  --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
  --output json | \
aws s3api delete-objects --bucket my-bucket-name --delete file:///dev/stdin
```

Alternatively, add a custom resource to your template that empties the bucket during deletion. But that adds complexity - sometimes the manual approach is simpler.

## Deleting Stacks with Retained Resources

If resources have `DeletionPolicy: Retain`, they'll be kept but disconnected from CloudFormation. After stack deletion, you're responsible for managing them manually.

To track retained resources:

```bash
# Check for retained resources after deletion
aws cloudformation list-stack-resources \
  --stack-name my-app-dev \
  --query 'StackResourceSummaries[?ResourceStatus==`DELETE_SKIPPED`]'
```

## Handling Deletion Failures

If a stack gets stuck in `DELETE_FAILED`:

```bash
# Retry deletion, skipping the problematic resource
aws cloudformation delete-stack \
  --stack-name my-app-dev \
  --retain-resources MyProblematicBucket MyStuckResource
```

The `--retain-resources` flag skips those resources during deletion. The stack will be deleted, but those resources will remain in your account, unmanaged. Clean them up manually afterward.

For more details, see our post on [handling stack deletion failures](https://oneuptime.com/blog/post/cloudformation-stack-deletion-failures/view).

## Best Practices

**Enable termination protection on production stacks.** It's the easiest safeguard against accidental deletion.

**Set DeletionPolicy: Retain on databases and encryption keys.** Losing data is worse than having an orphaned resource.

**Use DeletionPolicy: Snapshot for RDS.** Get a final backup before the database is destroyed.

**Check for cross-stack dependencies before deleting.** Imports from other stacks will block deletion.

**Script your deletion process.** Manual CLI commands are error-prone. A script with safety checks catches mistakes before they happen.

**Audit before deleting.** Always list the stack's resources and understand what will be removed. Five minutes of review prevents hours of recovery.

Deleting stacks is a permanent action for most resources. Take it seriously, add safeguards, and always know what you're deleting before you hit enter.
