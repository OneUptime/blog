# How to Handle CloudFormation Stack Deletion Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, Troubleshooting, Infrastructure as Code

Description: Learn how to diagnose and resolve CloudFormation stack deletion failures, from non-empty S3 buckets to dependency issues and stuck resources.

---

You try to delete a CloudFormation stack, and it gets stuck on `DELETE_FAILED`. The stack won't go away, and now you've got zombie infrastructure. This happens more often than you'd think, and each failure type has a different fix. Let's walk through the most common ones.

## Why Deletions Fail

CloudFormation deletes resources in reverse dependency order. If any resource can't be deleted, the whole operation stops. Common blockers include:

- S3 buckets that contain objects
- Security groups referenced by resources in other stacks
- ENIs (Elastic Network Interfaces) attached to active resources
- IAM roles still in use
- VPCs with active dependencies
- Resources protected by `DeletionPolicy: Retain`
- Resources manually deleted but still in CloudFormation's state

## Diagnosing the Failure

```bash
# Find which resources failed to delete and why
aws cloudformation describe-stack-events \
  --stack-name my-stuck-stack \
  --query 'StackEvents[?ResourceStatus==`DELETE_FAILED`].[LogicalResourceId,ResourceType,ResourceStatusReason]' \
  --output table
```

The `ResourceStatusReason` field tells you exactly what went wrong. Let's address each scenario.

## Non-Empty S3 Buckets

This is the most common deletion failure. CloudFormation won't delete a bucket that has objects in it.

**Error message**: "The bucket you tried to delete is not empty"

**Fix**: Empty the bucket first, then retry:

```bash
# Remove all objects from the bucket
aws s3 rm s3://my-app-bucket --recursive

# If versioning is enabled, you also need to delete version markers
aws s3api list-object-versions \
  --bucket my-app-bucket \
  --query 'Versions[*].{Key:Key,VersionId:VersionId}' \
  --output json > versions.json

# Delete all versions
aws s3api delete-objects \
  --bucket my-app-bucket \
  --delete '{"Objects": '"$(cat versions.json)"'}'

# Also delete any delete markers
aws s3api list-object-versions \
  --bucket my-app-bucket \
  --query 'DeleteMarkers[*].{Key:Key,VersionId:VersionId}' \
  --output json > markers.json

aws s3api delete-objects \
  --bucket my-app-bucket \
  --delete '{"Objects": '"$(cat markers.json)"'}'

# Now retry the stack deletion
aws cloudformation delete-stack --stack-name my-stuck-stack
```

**Prevention**: Add a Lambda-backed custom resource that empties the bucket during deletion, or use a third-party construct that handles this automatically.

## Security Group Dependencies

CloudFormation can't delete a security group that's referenced by another resource - even if that resource is in a different stack.

**Error message**: "resource sg-xxx has a dependent object"

**Fix**: Find and remove the dependency:

```bash
# Find what's using the security group
aws ec2 describe-network-interfaces \
  --filters Name=group-id,Values=sg-0abc123 \
  --query 'NetworkInterfaces[*].{Id:NetworkInterfaceId,Description:Description,Status:Status}'
```

Common culprits:
- ENIs from Lambda functions in a VPC
- Load balancer ENIs
- RDS instances
- ElastiCache clusters

Remove or reassign the dependent resources, then retry deletion.

## Stuck ENIs (Elastic Network Interfaces)

Lambda functions in VPCs create ENIs that can linger after the function is deleted. CloudFormation tries to delete the subnet or security group but can't because of the orphaned ENI.

**Error message**: "The subnet has dependencies and cannot be deleted" or "DependencyViolation"

**Fix**:

```bash
# Find orphaned ENIs in the subnet
aws ec2 describe-network-interfaces \
  --filters Name=subnet-id,Values=subnet-0abc123 \
  --query 'NetworkInterfaces[*].{Id:NetworkInterfaceId,Status:Status,Description:Description}'

# Detach and delete orphaned ENIs
aws ec2 detach-network-interface \
  --attachment-id eni-attach-0abc123 \
  --force

aws ec2 delete-network-interface \
  --network-interface-id eni-0abc123
```

Wait a few minutes after cleaning up ENIs, then retry the stack deletion.

## VPC Dependencies

VPCs can't be deleted if they still contain subnets, internet gateways, NAT gateways, or other resources.

**Error message**: "The vpc has dependencies and cannot be deleted"

**Fix**: CloudFormation usually handles the dependency order, but if manual resources were added to the VPC, you need to clean them up:

```bash
# Find what's still in the VPC
aws ec2 describe-subnets \
  --filters Name=vpc-id,Values=vpc-0abc123 \
  --query 'Subnets[*].SubnetId'

aws ec2 describe-internet-gateways \
  --filters Name=attachment.vpc-id,Values=vpc-0abc123

aws ec2 describe-nat-gateways \
  --filter Name=vpc-id,Values=vpc-0abc123

aws ec2 describe-network-interfaces \
  --filters Name=vpc-id,Values=vpc-0abc123
```

Remove any manually created resources from the VPC, then retry.

## IAM Roles Still in Use

**Error message**: "Cannot delete entity, must detach all policies first" or "Role is in use"

**Fix**:

```bash
# List attached policies
aws iam list-attached-role-policies --role-name MyAppRole

# Detach managed policies
aws iam detach-role-policy \
  --role-name MyAppRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Delete inline policies
aws iam list-role-policies --role-name MyAppRole
aws iam delete-role-policy --role-name MyAppRole --policy-name MyInlinePolicy
```

## The Nuclear Option: Retain and Skip

When you can't fix the underlying issue, you can force deletion by retaining the problematic resources:

```bash
# Delete the stack but skip resources that can't be deleted
aws cloudformation delete-stack \
  --stack-name my-stuck-stack \
  --retain-resources MyS3Bucket MySecurityGroup
```

The `--retain-resources` flag tells CloudFormation to leave those resources in your account and just remove them from the stack. The stack deletion will succeed, but you'll have orphaned resources to clean up manually.

```bash
# After stack deletion, clean up retained resources manually
aws s3 rb s3://my-app-bucket --force
aws ec2 delete-security-group --group-id sg-0abc123
```

## Deletion Failure Recovery Script

Here's a script that handles common deletion failures:

```bash
#!/bin/bash
# force-delete-stack.sh - Handle common deletion failures
set -euo pipefail

STACK_NAME="${1:?Usage: force-delete-stack.sh STACK_NAME}"

echo "Attempting to delete stack: $STACK_NAME"

# First attempt - normal deletion
aws cloudformation delete-stack --stack-name "$STACK_NAME"

echo "Waiting for deletion..."
if aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null; then
  echo "Stack deleted successfully."
  exit 0
fi

echo "Deletion failed. Checking for stuck resources..."

# Find failed resources
FAILED_RESOURCES=$(aws cloudformation describe-stack-events \
  --stack-name "$STACK_NAME" \
  --query 'StackEvents[?ResourceStatus==`DELETE_FAILED`].LogicalResourceId' \
  --output text | tr '\t' '\n' | sort -u)

echo "Failed resources:"
echo "$FAILED_RESOURCES"

# Check for non-empty S3 buckets
for RESOURCE in $FAILED_RESOURCES; do
  TYPE=$(aws cloudformation describe-stack-resource \
    --stack-name "$STACK_NAME" \
    --logical-resource-id "$RESOURCE" \
    --query 'StackResourceDetail.ResourceType' \
    --output text 2>/dev/null || echo "UNKNOWN")

  if [ "$TYPE" = "AWS::S3::Bucket" ]; then
    BUCKET=$(aws cloudformation describe-stack-resource \
      --stack-name "$STACK_NAME" \
      --logical-resource-id "$RESOURCE" \
      --query 'StackResourceDetail.PhysicalResourceId' \
      --output text)
    echo "Emptying S3 bucket: $BUCKET"
    aws s3 rm "s3://$BUCKET" --recursive 2>/dev/null || true
  fi
done

# Retry deletion
echo "Retrying deletion..."
aws cloudformation delete-stack --stack-name "$STACK_NAME"

if aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" 2>/dev/null; then
  echo "Stack deleted successfully on retry."
  exit 0
fi

# If still failing, offer to retain stuck resources
echo "Deletion still failing. Retaining stuck resources..."
RETAIN_LIST=$(echo "$FAILED_RESOURCES" | tr '\n' ' ')
aws cloudformation delete-stack \
  --stack-name "$STACK_NAME" \
  --retain-resources $RETAIN_LIST

aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME"
echo "Stack deleted. The following resources were retained and need manual cleanup:"
echo "$FAILED_RESOURCES"
```

## Preventing Deletion Failures

### Empty buckets automatically with a custom resource

```yaml
# Custom resource Lambda that empties the bucket on delete
Resources:
  BucketCleanup:
    Type: Custom::BucketCleanup
    Properties:
      ServiceToken: !GetAtt CleanupFunction.Arn
      BucketName: !Ref MyBucket

  CleanupFunction:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: python3.12
      Handler: index.handler
      Timeout: 300
      Role: !GetAtt CleanupRole.Arn
      Code:
        ZipFile: |
          import boto3
          import cfnresponse

          def handler(event, context):
              if event['RequestType'] == 'Delete':
                  bucket = event['ResourceProperties']['BucketName']
                  s3 = boto3.resource('s3')
                  try:
                      s3.Bucket(bucket).objects.all().delete()
                      s3.Bucket(bucket).object_versions.all().delete()
                  except Exception as e:
                      print(f"Error emptying bucket: {e}")
              cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
```

### Use DeletionPolicy wisely

Set `DeletionPolicy: Retain` on resources that shouldn't be deleted with the stack:

```yaml
# Retain the database, let CloudFormation delete everything else
Resources:
  Database:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Snapshot
    Properties:
      DBInstanceClass: db.t3.micro
      Engine: postgres
```

### Avoid manual modifications

Resources modified outside of CloudFormation are more likely to cause deletion issues. Use [drift detection](https://oneuptime.com/blog/post/detect-fix-cloudformation-drift/view) to catch manual changes before they become deletion blockers.

## Best Practices

**Test deletion in dev first.** If your dev stack won't delete cleanly, neither will production. Fix the template so deletion works reliably.

**Add bucket cleanup custom resources.** They save headaches every single time.

**Document retained resources.** If resources are retained after stack deletion, make sure someone knows they exist and who's responsible for them.

**Set DeletionPolicy on data resources.** Even if you plan to delete the data, having a Snapshot policy gives you a safety net.

**Check dependencies before deleting.** Run the pre-deletion checks from our guide on [deleting stacks safely](https://oneuptime.com/blog/post/delete-cloudformation-stacks-safely/view) to avoid surprises.

Stack deletion failures are annoying but solvable. The key is understanding what's blocking the deletion and having the right approach for each scenario.
