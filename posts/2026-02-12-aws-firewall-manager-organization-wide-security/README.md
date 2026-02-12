# How to Use AWS Firewall Manager for Organization-Wide Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Security, Firewall Manager, AWS Organizations

Description: Learn how to use AWS Firewall Manager to centrally manage firewall rules, WAF policies, and security groups across all accounts in your AWS Organization.

---

Managing security across a single AWS account is hard enough. When you've got dozens or hundreds of accounts under an AWS Organization, it turns into a full-time job. That's exactly the problem AWS Firewall Manager solves. It lets you define security policies once and have them automatically applied across every account and resource in your organization.

In this post, we'll walk through setting up Firewall Manager from scratch, creating policies for different use cases, and making sure your organization stays secure without chasing individual accounts.

## Prerequisites

Before diving in, you need a few things in place:

- An AWS Organization with "All Features" enabled (not just consolidated billing)
- AWS Config enabled in every account and region you want to protect
- A designated Firewall Manager administrator account

That last point is important. You don't have to use your management account as the Firewall Manager admin. In fact, AWS recommends delegating to a separate security account.

## Setting Up the Firewall Manager Administrator

First, designate your admin account from the Organizations management account.

This AWS CLI command designates an account as the Firewall Manager administrator:

```bash
# Run this from your management account
aws fms associate-admin-account \
  --admin-account 123456789012
```

You can verify the association worked:

```bash
# Confirm which account is the FM admin
aws fms get-admin-account
```

The output should show your designated account ID. Once this is done, all Firewall Manager operations happen from that admin account.

## Enabling AWS Config Across Your Organization

Firewall Manager relies heavily on AWS Config to track resources and compliance. If Config isn't running in a member account, Firewall Manager can't protect it.

The easiest approach is to use an AWS CloudFormation StackSet to deploy Config across all accounts.

Here's a minimal CloudFormation template that enables AWS Config in an account:

```yaml
# cloudformation/enable-config.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Enable AWS Config recording

Resources:
  ConfigRecorder:
    Type: AWS::Config::ConfigurationRecorder
    Properties:
      Name: default
      RecordingGroup:
        AllSupported: true
        IncludeGlobalResourceTypes: true
      RoleARN: !GetAtt ConfigRole.Arn

  DeliveryChannel:
    Type: AWS::Config::DeliveryChannel
    Properties:
      S3BucketName: !Ref ConfigBucket

  ConfigBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'config-bucket-${AWS::AccountId}-${AWS::Region}'

  ConfigRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: config.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWS_ConfigRole
```

Deploy this as a StackSet to hit every account and region at once.

## Creating a WAF Policy

The most common Firewall Manager use case is deploying AWS WAF rules across all your web-facing resources. Let's create a policy that blocks common attack patterns.

This policy creates a WAF rule group and applies it to all ALBs across your organization:

```json
{
  "PolicyName": "OrgWideWAFPolicy",
  "RemediationEnabled": true,
  "ResourceType": "AWS::ElasticLoadBalancingV2::LoadBalancer",
  "ResourceTypeList": [
    "AWS::ElasticLoadBalancingV2::LoadBalancer"
  ],
  "SecurityServicePolicyData": {
    "Type": "WAF",
    "ManagedServiceData": "{\"type\":\"WAF\",\"ruleGroups\":[{\"id\":\"aws-managed-rules-common-rule-set\",\"overrideAction\":{\"type\":\"COUNT\"}}],\"defaultAction\":{\"type\":\"ALLOW\"}}"
  },
  "IncludeMap": {
    "ORGUNIT": ["ou-abc1-23456789"]
  }
}
```

Notice we're starting with COUNT mode rather than BLOCK. This is critical. You should always deploy WAF rules in count mode first, monitor for false positives, and then switch to blocking after you're confident the rules won't break legitimate traffic.

You can create this policy via the CLI:

```bash
# Create the WAF policy from a JSON file
aws fms put-policy --policy file://waf-policy.json
```

## Creating a Security Group Policy

Firewall Manager can also manage security groups. There are three types of security group policies:

1. **Common security groups** - Apply specific security groups to all matching resources
2. **Content audit** - Check that existing security groups meet your rules
3. **Usage audit** - Find unused or redundant security groups

Here's how to create a content audit policy that flags any security group allowing SSH from 0.0.0.0/0:

```bash
# Create a security group audit policy
aws fms put-policy --policy '{
  "PolicyName": "NoOpenSSH",
  "RemediationEnabled": false,
  "ResourceType": "AWS::EC2::SecurityGroup",
  "SecurityServicePolicyData": {
    "Type": "SECURITY_GROUPS_CONTENT_AUDIT",
    "ManagedServiceData": "{\"type\":\"SECURITY_GROUPS_CONTENT_AUDIT\",\"securityGroupAction\":{\"type\":\"ALLOW\"},\"securityRules\":[{\"ipProtocol\":\"tcp\",\"fromPort\":22,\"toPort\":22,\"prefixListIds\":[],\"ipRanges\":[\"10.0.0.0/8\",\"172.16.0.0/12\",\"192.168.0.0/16\"]}]}"
  },
  "IncludeMap": {
    "ORGUNIT": ["ou-abc1-23456789"]
  }
}'
```

This policy allows SSH only from RFC 1918 private ranges. Any security group that allows SSH from public IPs will be flagged as non-compliant.

## Creating a Shield Advanced Policy

If your organization uses AWS Shield Advanced for DDoS protection, Firewall Manager can ensure it's applied consistently.

This policy subscribes resources to Shield Advanced across all accounts:

```bash
# Apply Shield Advanced to all Elastic IPs and ALBs
aws fms put-policy --policy '{
  "PolicyName": "ShieldAdvancedAll",
  "RemediationEnabled": true,
  "ResourceTypeList": [
    "AWS::ElasticLoadBalancingV2::LoadBalancer",
    "AWS::EC2::EIP"
  ],
  "SecurityServicePolicyData": {
    "Type": "SHIELD_ADVANCED"
  },
  "ExcludeResourceTags": false,
  "IncludeMap": {
    "ORGUNIT": ["ou-abc1-23456789"]
  }
}'
```

## Monitoring Compliance

Once policies are in place, you need to keep track of compliance. Firewall Manager integrates with AWS Security Hub, which gives you a single dashboard view.

You can also query compliance programmatically:

```bash
# Check compliance status for a specific policy
aws fms get-compliance-detail \
  --policy-id "policy-abc123" \
  --member-account "987654321098"
```

For a broader view, list all non-compliant resources:

```bash
# List all policies and their compliance status
aws fms list-compliance-status \
  --policy-id "policy-abc123" \
  --max-results 100
```

## Scope and Resource Targeting

One powerful feature is how granularly you can target policies. You're not stuck applying everything everywhere.

You can scope policies by:

- **Organizational Units** - Apply only to specific OUs
- **Resource tags** - Include or exclude resources based on tags
- **Account lists** - Explicitly include or exclude specific accounts
- **Resource types** - Target specific AWS resource types

Here's an example targeting only production resources:

```json
{
  "PolicyName": "ProdOnlyWAF",
  "ResourceTags": [
    {
      "Key": "Environment",
      "Value": "production"
    }
  ],
  "ExcludeResourceTags": false
}
```

Setting `ExcludeResourceTags` to false means "only include resources with these tags." If you flip it to true, it means "apply to everything except resources with these tags."

## Automatic Remediation

When you set `RemediationEnabled` to true, Firewall Manager doesn't just report problems - it fixes them. For WAF policies, it automatically associates your WAF web ACL with new resources. For security group policies, it can remove non-compliant rules.

Be careful with automatic remediation though. Start with `RemediationEnabled: false`, review the findings, and only enable auto-remediation once you're comfortable with what changes it would make.

## Cost Considerations

Firewall Manager itself costs $100 per policy per region per month. That adds up fast if you've got many policies across many regions. The resources it manages (WAF web ACLs, Shield Advanced subscriptions, etc.) have their own costs on top of that.

A good approach is to consolidate related rules into fewer policies and only deploy to regions where you actually have resources.

## Wrapping Up

AWS Firewall Manager takes the pain out of managing security at scale. Instead of hoping every team in every account follows the rules, you can define policies centrally and have them enforced automatically. Start with audit-only policies, get comfortable with the findings, and then gradually enable auto-remediation.

If you're also monitoring your infrastructure, consider pairing Firewall Manager with a comprehensive monitoring solution. For more on securing your AWS environment, check out our post on [VPC Flow Logs](https://oneuptime.com/blog/post/enable-configure-vpc-flow-logs/view) and [network ACLs](https://oneuptime.com/blog/post/network-acls-subnet-level-security/view).
