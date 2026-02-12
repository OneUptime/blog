# How to Fix CloudFormation 'UPDATE_ROLLBACK_FAILED' Stack Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, DevOps, Infrastructure as Code

Description: Step-by-step guide to recovering from the dreaded CloudFormation UPDATE_ROLLBACK_FAILED state, including continue-update-rollback and manual resource fixes.

---

`UPDATE_ROLLBACK_FAILED` is probably the worst state a CloudFormation stack can be in. It means your stack update failed, CloudFormation tried to roll back to the previous state, and the rollback itself also failed. Your stack is now stuck and you can't update it, delete it, or really do anything with it through normal operations.

Don't panic. There's a way out.

## Understanding How You Got Here

Here's the typical chain of events:

1. You pushed a stack update
2. Something in the update failed (maybe a resource couldn't be created or modified)
3. CloudFormation tried to roll back to the previous working state
4. The rollback failed because something changed outside of CloudFormation, or a resource was manually deleted, or a dependency is broken

```mermaid
flowchart LR
    A[UPDATE_IN_PROGRESS] --> B[UPDATE_FAILED]
    B --> C[UPDATE_ROLLBACK_IN_PROGRESS]
    C --> D[UPDATE_ROLLBACK_FAILED]
    D --> E[continue-update-rollback]
    E --> F[UPDATE_ROLLBACK_COMPLETE]
    F --> G[Stack is usable again]
```

## Step 1: Find Out What Went Wrong

First, look at the stack events to understand exactly which resource caused the rollback to fail:

```bash
# Get the resources that failed during rollback
aws cloudformation describe-stack-events \
    --stack-name my-stuck-stack \
    --query 'StackEvents[?ResourceStatus==`UPDATE_ROLLBACK_FAILED` || ResourceStatus==`UPDATE_FAILED`].[Timestamp,LogicalResourceId,ResourceStatusReason]' \
    --output table
```

Common reasons the rollback fails:

- A resource was manually deleted outside CloudFormation
- An IAM role that CloudFormation needs was removed
- A security group has dependencies that prevent modification
- An RDS instance was modified outside the stack
- The previous resource configuration is no longer valid

## Step 2: Try continue-update-rollback

The primary tool for fixing this is `continue-update-rollback`. This tells CloudFormation to try the rollback again, and optionally skip certain resources that can't be rolled back:

```bash
# First, try without skipping anything
aws cloudformation continue-update-rollback \
    --stack-name my-stuck-stack
```

If that fails because specific resources can't be rolled back, skip them:

```bash
# Skip the problematic resources
aws cloudformation continue-update-rollback \
    --stack-name my-stuck-stack \
    --resources-to-skip MySecurityGroup MyLambdaFunction
```

The `--resources-to-skip` parameter takes the logical resource IDs (the names from your template, not the physical AWS resource IDs). You can find these in the stack events output from Step 1.

## Step 3: Fix the Underlying Issues

Before running `continue-update-rollback`, you might need to fix things manually. Here are the most common scenarios:

### Manually Deleted Resources

If someone deleted a resource that CloudFormation is trying to roll back, you can either recreate it manually or skip it in the rollback.

```bash
# Check if the resource still exists
# Example: checking if a security group exists
aws ec2 describe-security-groups \
    --group-ids sg-12345678 2>/dev/null

# If it doesn't exist, you'll need to skip this resource in rollback
```

### IAM Role Issues

If the CloudFormation service role was deleted or modified:

```bash
# Check if the role still exists
aws iam get-role --role-name CloudFormationServiceRole

# If it was deleted, recreate it with the necessary permissions
# Then retry the rollback
```

You can also use a different role for the continue-update-rollback:

```bash
# Use a different role for the rollback
aws cloudformation continue-update-rollback \
    --stack-name my-stuck-stack \
    --role-arn arn:aws:iam::123456789012:role/AdminRole
```

### Resources With Dependencies

Sometimes the rollback fails because a resource has acquired dependencies since the update started. For example, a security group might have new rules added by another stack or process.

```bash
# Check what's using the security group
aws ec2 describe-network-interfaces \
    --filters Name=group-id,Values=sg-12345678 \
    --query 'NetworkInterfaces[].{Id:NetworkInterfaceId,Description:Description}'
```

You may need to remove those dependencies before the rollback can succeed.

## Step 4: Verify Recovery

After `continue-update-rollback` succeeds, your stack should be in `UPDATE_ROLLBACK_COMPLETE` state:

```bash
# Verify the stack status
aws cloudformation describe-stacks \
    --stack-name my-stuck-stack \
    --query 'Stacks[0].StackStatus'
```

At this point, the stack is usable again. You can make new updates or delete the stack normally.

## Handling Skipped Resources

If you skipped resources during the rollback, those resources are now out of CloudFormation's control. You have a few options:

1. Import them back using `resource import`
2. Delete them manually and remove them from the template
3. Leave them as-is and manage them outside CloudFormation

Here's how to import a resource back:

```bash
# Create an import change set
aws cloudformation create-change-set \
    --stack-name my-stuck-stack \
    --change-set-name import-resources \
    --change-set-type IMPORT \
    --resources-to-import "[{\"ResourceType\":\"AWS::EC2::SecurityGroup\",\"LogicalResourceId\":\"MySecurityGroup\",\"ResourceIdentifier\":{\"GroupId\":\"sg-12345678\"}}]" \
    --template-body file://template.yaml

# Execute the import
aws cloudformation execute-change-set \
    --stack-name my-stuck-stack \
    --change-set-name import-resources
```

## When Nothing Else Works

In rare cases, `continue-update-rollback` keeps failing no matter what you skip. At this point, your options are limited:

1. Contact AWS Support - they have internal tools that can help
2. Create a new stack and migrate your resources to it
3. If you don't need the resources, try deleting the stack with `--retain-resources` to release CloudFormation's hold

```bash
# Delete the stack but keep the actual resources
aws cloudformation delete-stack \
    --stack-name my-stuck-stack \
    --retain-resources MyDatabase MyBucket
```

This deletes the CloudFormation stack record but leaves the actual AWS resources intact. You can then create a new stack and import those resources.

## Prevention

The best fix is to avoid getting into this state. A few practices that help:

Use drift detection regularly to catch out-of-band changes:

```bash
# Detect drift on your stack
aws cloudformation detect-stack-drift \
    --stack-name my-stack

# Check the results
aws cloudformation describe-stack-drift-detection-status \
    --stack-drift-detection-id <detection-id>
```

Avoid making manual changes to resources managed by CloudFormation. If someone modifies a resource outside the stack, the next update or rollback might fail because the actual state doesn't match what CloudFormation expects.

Use stack policies to prevent accidental modifications to critical resources:

```json
{
    "Statement": [
        {
            "Effect": "Deny",
            "Action": "Update:Replace",
            "Principal": "*",
            "Resource": "LogicalResourceId/ProductionDatabase"
        },
        {
            "Effect": "Allow",
            "Action": "Update:*",
            "Principal": "*",
            "Resource": "*"
        }
    ]
}
```

Set up [monitoring for your CloudFormation stack statuses](https://oneuptime.com/blog/post/aws-cloudwatch-alerting-best-practices/view) so you catch `UPDATE_ROLLBACK_FAILED` states immediately rather than discovering them during the next deployment.

## Summary

`UPDATE_ROLLBACK_FAILED` is scary but recoverable. Use `continue-update-rollback` with `--resources-to-skip` for any resources that can't be rolled back. Fix the underlying issues first if possible. And prevent it by avoiding manual changes to CloudFormation-managed resources and running drift detection regularly.
