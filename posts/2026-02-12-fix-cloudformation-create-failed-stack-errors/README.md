# How to Fix CloudFormation 'CREATE_FAILED' Stack Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, DevOps, Infrastructure as Code

Description: Diagnose and fix AWS CloudFormation CREATE_FAILED errors covering IAM permissions, resource limits, dependency failures, and template validation issues.

---

You've written your CloudFormation template, hit deploy, and watched the stack creation roll through the events. Then the status flips to `CREATE_FAILED` and everything starts rolling back. It's one of the most frustrating experiences in AWS because the root cause isn't always obvious from the top-level status alone.

Let's dig into how to find out what went wrong and how to fix it.

## Finding the Root Cause

The first thing to do when a stack fails is look at the stack events. The top-level `CREATE_FAILED` is just a symptom. The real error is buried in the individual resource events.

```bash
# Get stack events showing the failure reasons
aws cloudformation describe-stack-events \
    --stack-name my-failed-stack \
    --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`].[LogicalResourceId,ResourceStatusReason]' \
    --output table
```

This shows you which specific resource failed and why. That's your starting point.

If the stack has already rolled back and been deleted (which happens with the default rollback behavior), you won't be able to see the events. To prevent this, disable rollback on failure during development:

```bash
# Deploy with rollback disabled so you can inspect failures
aws cloudformation create-stack \
    --stack-name my-stack \
    --template-body file://template.yaml \
    --disable-rollback
```

## IAM Permission Errors

The most common cause of `CREATE_FAILED` is insufficient IAM permissions. CloudFormation runs with the permissions of whoever (or whatever role) is creating the stack. If that identity doesn't have permission to create the resources in the template, those resources fail.

The error message usually looks like: `API: ec2:CreateSecurityGroup You are not authorized to perform this action`.

You have two options. Either add the required permissions to the deploying identity, or use a CloudFormation service role:

```yaml
# Using a service role gives CloudFormation its own permissions
# separate from the deploying user
Resources:
  CloudFormationRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: cloudformation.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AdministratorAccess  # Scope this down for production
```

Then deploy using that role:

```bash
aws cloudformation create-stack \
    --stack-name my-stack \
    --template-body file://template.yaml \
    --role-arn arn:aws:iam::123456789012:role/CloudFormationRole \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

Speaking of capabilities - forgetting `--capabilities CAPABILITY_IAM` when your template creates IAM resources is another common mistake. CloudFormation requires you to explicitly acknowledge that.

## Resource Limit Exceeded

Every AWS account has service limits (now called service quotas). If your stack tries to create a VPC but you've already hit the VPC limit in that region, creation fails.

```bash
# Check your current VPC limit
aws service-quotas get-service-quota \
    --service-code vpc \
    --quota-code L-F678F1CE
```

Common limits that catch people:
- 5 VPCs per region (default)
- 5 Elastic IPs per region
- 200 CloudFormation stacks per region
- 500 security groups per VPC

Request an increase through the Service Quotas console or CLI:

```bash
# Request a quota increase
aws service-quotas request-service-quota-increase \
    --service-code vpc \
    --quota-code L-F678F1CE \
    --desired-value 10
```

## Template Validation Errors

Sometimes the template itself has issues that only surface during creation. Validate your template before deploying:

```bash
# Validate template syntax and basic structure
aws cloudformation validate-template \
    --template-body file://template.yaml
```

But keep in mind - this only catches syntax errors and basic structural problems. It won't catch things like invalid property values or missing required properties.

Common template issues include:

Wrong resource property types:

```yaml
# Wrong - Timeout expects an integer, not a string
Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      Timeout: "30"  # Should be 30 (no quotes)
```

Missing required properties:

```yaml
# This will fail because Runtime is required for Lambda
Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: my-function
      Handler: index.handler
      Code:
        ZipFile: |
          def handler(event, context):
              return "hello"
      # Missing: Runtime
```

## Dependency Failures

When one resource fails, all resources that depend on it also fail. This cascade can make it hard to find the real problem. Look for the first resource that failed chronologically - that's usually the root cause.

```bash
# Sort events by time to find the first failure
aws cloudformation describe-stack-events \
    --stack-name my-failed-stack \
    --query 'sort_by(StackEvents[?ResourceStatus==`CREATE_FAILED`], &Timestamp)[0]'
```

You can also run into issues with implicit dependencies. CloudFormation creates resources in parallel unless you define explicit dependencies. If resource B needs resource A to exist first but you haven't declared that dependency, the creation might fail intermittently.

```yaml
# Explicit dependency ensures creation order
Resources:
  MySubnet:
    Type: AWS::EC2::Subnet
    DependsOn: MyVPC  # Wait for VPC first
    Properties:
      VpcId: !Ref MyVPC
      CidrBlock: 10.0.1.0/24
```

Note that `!Ref` and `!GetAtt` create implicit dependencies, so you usually don't need `DependsOn` when you're already referencing the other resource. But if the dependency isn't expressed through a reference, you need to be explicit.

## Resource Already Exists

If you specify a physical name for a resource (like a specific S3 bucket name or Lambda function name), and that resource already exists in the account, creation fails.

```yaml
# This fails if a bucket named 'my-unique-bucket' already exists
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-unique-bucket  # Specifying names can cause conflicts
```

The solution is either to not specify physical names (let CloudFormation generate them) or to use unique naming:

```yaml
# Let CloudFormation generate a unique name
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    # No BucketName property - CloudFormation will generate one
```

## Nested Stack Failures

If you're using nested stacks, a failure in a child stack causes the parent to fail too. You need to drill into the child stack's events to find the real error:

```bash
# Find nested stack resource and get its events
aws cloudformation describe-stack-events \
    --stack-name arn:aws:cloudformation:us-east-1:123456789012:stack/my-nested-stack/guid \
    --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]'
```

## Prevention and Monitoring

Use change sets to preview what CloudFormation will do before it does it:

```bash
# Create a change set to preview
aws cloudformation create-change-set \
    --stack-name my-stack \
    --template-body file://template.yaml \
    --change-set-name preview-changes

# Review the changes
aws cloudformation describe-change-set \
    --stack-name my-stack \
    --change-set-name preview-changes
```

And integrate your stack deployments with [monitoring and alerting](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-alerting-best-practices/view) so you're notified immediately when deployments fail rather than discovering it hours later.

## Summary

`CREATE_FAILED` is a wrapper around the real error. Always inspect individual resource events to find the root cause. The most common issues are IAM permissions, service limits, template errors, and resource naming conflicts. Use `--disable-rollback` during development to keep the stack around for inspection, and validate your templates before deploying.
