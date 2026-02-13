# How to Fix CloudFormation 'DELETE_FAILED' Stack Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, DevOps, Infrastructure as Code

Description: Learn how to resolve CloudFormation DELETE_FAILED errors caused by non-empty S3 buckets, resource dependencies, and other common issues that prevent stack deletion.

---

You try to delete a CloudFormation stack and it just won't die. The status sits at `DELETE_FAILED` and the stack stubbornly remains. This happens when CloudFormation can't remove one or more resources in the stack. The good news is that the causes are predictable and the fixes are straightforward.

## Identifying the Problem

Start by finding out which resource is blocking deletion:

```bash
# Find which resources failed to delete
aws cloudformation describe-stack-events \
    --stack-name my-stack \
    --query 'StackEvents[?ResourceStatus==`DELETE_FAILED`].[LogicalResourceId,ResourceType,ResourceStatusReason]' \
    --output table
```

The `ResourceStatusReason` column tells you exactly why the resource couldn't be deleted. Let's go through the most common ones.

## Non-Empty S3 Buckets

This is the number one reason stacks fail to delete. CloudFormation won't delete an S3 bucket that contains objects. It's a safety measure, but it catches people off guard.

```bash
# Check if the bucket has objects
aws s3 ls s3://my-bucket-name --summarize

# Empty the bucket (including versioned objects)
aws s3 rm s3://my-bucket-name --recursive

# If versioning is enabled, you also need to delete version markers
aws s3api list-object-versions \
    --bucket my-bucket-name \
    --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
    --output json | \
    aws s3api delete-objects --bucket my-bucket-name --delete file:///dev/stdin
```

To prevent this in the future, you can add a custom resource that empties the bucket before deletion:

```yaml
Resources:
  EmptyBucketFunction:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: python3.12
      Handler: index.handler
      Timeout: 300
      Code:
        ZipFile: |
          import boto3
          import cfnresponse
          def handler(event, context):
              if event['RequestType'] == 'Delete':
                  bucket = event['ResourceProperties']['BucketName']
                  s3 = boto3.resource('s3')
                  bucket_resource = s3.Bucket(bucket)
                  bucket_resource.object_versions.all().delete()
                  bucket_resource.objects.all().delete()
              cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
      Role: !GetAtt EmptyBucketRole.Arn

  EmptyBucketTrigger:
    Type: Custom::EmptyBucket
    Properties:
      ServiceToken: !GetAtt EmptyBucketFunction.Arn
      BucketName: !Ref MyBucket
```

## Security Groups With Dependencies

A security group can't be deleted if it's referenced by other security groups, network interfaces, or resources in other stacks. CloudFormation will fail to delete it.

```bash
# Find what's referencing the security group
aws ec2 describe-network-interfaces \
    --filters Name=group-id,Values=sg-12345678 \
    --query 'NetworkInterfaces[].{Id:NetworkInterfaceId,Type:InterfaceType,Description:Description}'

# Check for security group rules that reference this group
aws ec2 describe-security-groups \
    --filters Name=ip-permission.group-id,Values=sg-12345678
```

You need to remove those references before the security group can be deleted. If the referencing resources are in another stack, delete or update that stack first.

## ENIs Attached to Resources

Elastic Network Interfaces created by Lambda functions, ECS tasks, or other services can linger after the service stops using them. If they're still attached when CloudFormation tries to delete the VPC or subnet, deletion fails.

```bash
# Find lingering ENIs in a subnet
aws ec2 describe-network-interfaces \
    --filters Name=subnet-id,Values=subnet-12345 \
    --query 'NetworkInterfaces[].{Id:NetworkInterfaceId,Status:Status,Description:Description}'
```

For Lambda-created ENIs, they're usually cleaned up automatically, but it can take time. Wait 15-20 minutes and retry.

For stuck ENIs, detach and delete them:

```bash
# Detach the ENI first
aws ec2 detach-network-interface \
    --attachment-id eni-attach-12345 \
    --force

# Then delete it
aws ec2 delete-network-interface \
    --network-interface-id eni-12345
```

## IAM Roles With Extra Policies

If someone attached additional managed policies or inline policies to an IAM role after CloudFormation created it, CloudFormation may not be able to delete the role because it only knows about the policies it created.

```bash
# List all policies attached to the role
aws iam list-attached-role-policies --role-name MyRole
aws iam list-role-policies --role-name MyRole

# Detach any extra policies
aws iam detach-role-policy \
    --role-name MyRole \
    --policy-arn arn:aws:iam::123456789012:policy/ExtraPolicy
```

## RDS Instances With Deletion Protection

If you enabled deletion protection on an RDS instance (either in the template or manually), CloudFormation can't delete it.

```bash
# Check deletion protection status
aws rds describe-db-instances \
    --db-instance-identifier my-database \
    --query 'DBInstances[0].DeletionProtection'

# Disable deletion protection
aws rds modify-db-instance \
    --db-instance-identifier my-database \
    --no-deletion-protection
```

The same applies to other resources with deletion protection, like DynamoDB tables with deletion protection enabled.

## The Nuclear Option: Skip Resources

If you can't fix the underlying issue, or if the resource was already deleted manually and CloudFormation just doesn't know about it, you can retry the deletion and skip the problematic resources:

```bash
# Retry deletion, skipping resources that can't be deleted
aws cloudformation delete-stack \
    --stack-name my-stack \
    --retain-resources MyBucket MySecurityGroup
```

The `--retain-resources` flag tells CloudFormation to leave those resources alone and delete everything else. The specified resources will continue to exist in your AWS account but will no longer be managed by CloudFormation.

## CloudFormation Stack Stuck in DELETE_IN_PROGRESS

Sometimes the deletion doesn't fail outright but just hangs. This usually happens when a custom resource's Lambda function isn't responding to CloudFormation's callback.

If you're using custom resources and deletion hangs, check the Lambda function's logs:

```bash
# Check the custom resource Lambda logs
aws logs filter-log-events \
    --log-group-name /aws/lambda/my-custom-resource \
    --start-time $(date -d '1 hour ago' +%s000)
```

The Lambda function must send a response to CloudFormation's callback URL, even on failure. If it crashes without sending a response, CloudFormation waits for the timeout (up to 1 hour by default).

## Preventing DELETE_FAILED

A few practices that help prevent this issue:

Add `DeletionPolicy: Delete` explicitly to resources you want cleaned up, and `DeletionPolicy: Retain` to resources you want to keep. This makes your intentions clear.

For S3 buckets, always include a bucket cleanup mechanism if you want the stack to be cleanly deletable.

Set up [infrastructure monitoring](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-alerting-best-practices/view) to catch stack state changes. Getting an alert when a stack enters `DELETE_FAILED` lets you respond quickly instead of discovering it days later when someone tries to redeploy.

## Summary

`DELETE_FAILED` stacks usually come down to a handful of causes: non-empty S3 buckets, security group dependencies, lingering ENIs, extra IAM policies, or deletion protection. Identify the blocking resource from the stack events, fix the issue, and retry the deletion. When all else fails, use `--retain-resources` to skip the problematic resources and clean them up manually.
