# How to Implement AWS Config Auto Remediation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, AWS Config, Compliance, Automation, Security

Description: Learn how to set up AWS Config auto remediation to automatically fix non-compliant resources and keep your AWS environment secure and compliant.

---

If you've spent any time managing AWS infrastructure at scale, you know how quickly things drift out of compliance. Someone spins up an S3 bucket without encryption, another team opens a security group too wide, and before you know it your compliance dashboard is a sea of red. AWS Config rules catch these violations, but what if they could also fix them - automatically?

That's exactly what AWS Config auto remediation does. It pairs Config rules with Systems Manager (SSM) automation documents to fix issues the moment they're detected. No more chasing teams to fix their resources days after a finding shows up.

## Why Auto Remediation Matters

Manual remediation doesn't scale. Even in a moderately sized AWS account, you might have hundreds of Config rules evaluating thousands of resources. If your security team has to manually address each violation, they'll never keep up. Auto remediation shifts this from a reactive process to a proactive one.

There are two types of remediation in AWS Config: manual and automatic. Manual remediation requires a human to click a button or run a command. Automatic remediation triggers the fix as soon as the rule evaluates a resource as non-compliant.

## Setting Up a Config Rule with Auto Remediation

Let's walk through a practical example. We'll create a Config rule that checks whether S3 buckets have server-side encryption enabled, and automatically enable it if they don't.

First, enable AWS Config in your account if you haven't already. You'll need a configuration recorder and a delivery channel.

Here's a CloudFormation template that sets up the Config rule and auto remediation together:

```yaml
# CloudFormation template for S3 encryption auto remediation
AWSTemplateFormatVersion: '2010-09-09'
Description: Auto-remediate S3 buckets without encryption

Resources:
  S3BucketEncryptionRule:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: s3-bucket-server-side-encryption-enabled
      Description: Checks if S3 buckets have server-side encryption enabled
      Source:
        Owner: AWS
        SourceIdentifier: S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED
      Scope:
        ComplianceResourceTypes:
          - AWS::S3::Bucket

  S3EncryptionRemediation:
    Type: AWS::Config::RemediationConfiguration
    Properties:
      ConfigRuleName: !Ref S3BucketEncryptionRule
      TargetType: SSM_DOCUMENT
      TargetId: AWS-EnableS3BucketEncryption
      TargetVersion: '1'
      Parameters:
        BucketName:
          ResourceValue:
            Value: RESOURCE_ID
        SSEAlgorithm:
          StaticValue:
            Values:
              - AES256
        AutomationAssumeRole:
          StaticValue:
            Values:
              - !GetAtt RemediationRole.Arn
      Automatic: true
      MaximumAutomaticAttempts: 3
      RetryAttemptSeconds: 60

  RemediationRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: ConfigRemediationRole
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ssm.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonS3FullAccess
```

There's a lot happening here, so let me break it down. The `ConfigRule` resource defines what we're checking. The `RemediationConfiguration` resource tells Config what to do when a resource fails the check. The `Automatic: true` flag is the key - it enables auto remediation instead of just manual.

## Using the AWS CLI for Remediation

If you prefer the CLI over CloudFormation, you can set up auto remediation with a couple of commands.

First, create the Config rule:

```bash
# Create the Config rule for S3 encryption checks
aws configservice put-config-rule --config-rule '{
  "ConfigRuleName": "s3-encryption-check",
  "Source": {
    "Owner": "AWS",
    "SourceIdentifier": "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  },
  "Scope": {
    "ComplianceResourceTypes": ["AWS::S3::Bucket"]
  }
}'
```

Then attach the remediation configuration:

```bash
# Attach auto remediation to the Config rule
aws configservice put-remediation-configurations --remediation-configurations '[{
  "ConfigRuleName": "s3-encryption-check",
  "TargetType": "SSM_DOCUMENT",
  "TargetId": "AWS-EnableS3BucketEncryption",
  "Parameters": {
    "BucketName": {
      "ResourceValue": {"Value": "RESOURCE_ID"}
    },
    "SSEAlgorithm": {
      "StaticValue": {"Values": ["AES256"]}
    },
    "AutomationAssumeRole": {
      "StaticValue": {"Values": ["arn:aws:iam::123456789012:role/ConfigRemediationRole"]}
    }
  },
  "Automatic": true,
  "MaximumAutomaticAttempts": 3,
  "RetryAttemptSeconds": 60
}]'
```

## Custom SSM Documents for Remediation

AWS provides a bunch of managed SSM automation documents for common remediations like enabling encryption, restricting security groups, and enabling logging. But sometimes you need something custom.

Here's an SSM document that tags non-compliant resources with a "Remediation-Required" tag so your team can track them:

```yaml
# Custom SSM Automation document for tagging non-compliant resources
schemaVersion: '0.3'
description: Tag non-compliant resources for tracking
assumeRole: '{{ AutomationAssumeRole }}'
parameters:
  ResourceId:
    type: String
    description: The resource ID to tag
  AutomationAssumeRole:
    type: String
    description: The ARN of the role to assume
mainSteps:
  - name: TagResource
    action: aws:executeAwsApi
    inputs:
      Service: resourcegroupstaggingapi
      Api: TagResources
      ResourceARNList:
        - '{{ ResourceId }}'
      Tags:
        Remediation-Required: 'true'
        Detected-Date: '{{ global:DATE }}'
```

## Common Auto Remediation Patterns

Here are some of the most useful Config rules paired with their remediation actions:

**Security Group Too Permissive**: Use the `AWS-DisablePublicAccessForSecurityGroup` SSM document to automatically revoke overly permissive ingress rules.

**EBS Volumes Unencrypted**: While you can't encrypt an existing EBS volume in place, you can trigger a Lambda function to snapshot it, create an encrypted copy, and swap it.

**CloudTrail Not Enabled**: Use `AWS-EnableCloudTrail` to turn on CloudTrail logging for the account.

**RDS Public Access**: Use a custom SSM document that calls `modify-db-instance` to disable public accessibility.

## Handling Remediation Failures

Auto remediation won't always work on the first try. Resources might be in a state that prevents modification, or there could be permission issues. That's why the `MaximumAutomaticAttempts` and `RetryAttemptSeconds` parameters exist.

You should also set up monitoring for remediation failures. Here's a quick EventBridge rule that catches failed remediations:

```json
{
  "source": ["aws.ssm"],
  "detail-type": ["EC2 Automation Execution Status-change Notification"],
  "detail": {
    "Status": ["Failed", "TimedOut"]
  }
}
```

Route this to an SNS topic so your team gets notified when something can't be fixed automatically. For more on this pattern, check out our post on [security alerting with EventBridge and SNS](https://oneuptime.com/blog/post/security-alerting-eventbridge-sns/view).

## Best Practices

**Start with detection only**. Before enabling auto remediation, run your Config rules in detection mode for a week or two. This helps you understand the scope of non-compliance and avoid surprise remediations that might break production.

**Use exclusions wisely**. Some resources might be intentionally non-compliant for valid reasons. Use resource exclusions or tagging-based exceptions to prevent unwanted remediation.

**Scope your IAM roles tightly**. The remediation role needs permission to modify resources, but don't give it more access than necessary. If you're only remediating S3 encryption, the role shouldn't have EC2 permissions.

**Test in a sandbox first**. Deploy your remediation configurations in a non-production account and deliberately create non-compliant resources to verify the remediation works correctly.

**Monitor costs**. Each Config rule evaluation costs money, and SSM automation executions count against your Systems Manager limits. At scale, this can add up.

## Monitoring Your Remediation Pipeline

You'll want visibility into what's being remediated and how often. AWS Config provides a compliance timeline for each resource, which shows you when it went non-compliant and when it was remediated. For broader monitoring of your AWS infrastructure, consider setting up [CloudWatch alarms](https://oneuptime.com/blog/post/cloudwatch-alarms-cdk/view) to track remediation metrics.

CloudWatch metrics like `RemediationExecutionSuccessful` and `RemediationExecutionFailed` give you aggregate data across all your rules. Build a dashboard from these metrics so your security team has a single pane of glass.

## Wrapping Up

AWS Config auto remediation is one of those features that pays for itself almost immediately. Instead of treating compliance as an audit exercise you do quarterly, it becomes a continuous process. Resources get fixed minutes after they drift, and your team can focus on building instead of firefighting.

Start small with a few critical rules - S3 encryption, security group restrictions, and logging requirements are great candidates. Once you're comfortable with how it works, expand to cover more of your compliance requirements. The goal isn't to remediate everything automatically, but to handle the common, well-understood violations so your team can focus on the complex ones.
