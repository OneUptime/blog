# How to Use CDK Nag for Security and Best Practice Checks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Security, DevOps

Description: Learn how to integrate CDK Nag into your AWS CDK projects to automatically catch security misconfigurations and enforce best practices before deployment.

---

Deploying infrastructure that works is one thing. Deploying infrastructure that's secure and follows best practices is another. CDK Nag is a tool that checks your CDK code against a set of rules - similar to a linter, but for cloud security. It catches issues like unencrypted S3 buckets, overly permissive IAM policies, and public databases before they ever reach production.

Think of it as a code review that never gets tired and never misses a security checklist item.

## What is CDK Nag?

CDK Nag is an open-source library that runs "aspects" against your CDK constructs. An aspect is basically a visitor that walks through your CloudFormation template and checks each resource against a rule pack. If a resource violates a rule, CDK Nag can either warn you or throw an error that blocks deployment.

The library comes with several rule packs:

- **AwsSolutions** - AWS's own best practices
- **HIPAA Security** - Rules for HIPAA compliance
- **NIST 800-53** - Federal security standards
- **PCI DSS 3.2.1** - Payment card industry requirements

You can use one or combine multiple packs depending on your compliance needs.

## Installation

Add CDK Nag to your existing CDK project.

```bash
# Install cdk-nag
npm install cdk-nag
```

That's it. No additional CLI tools or plugins needed.

## Basic Setup

The simplest way to use CDK Nag is to add it as an aspect to your app. Open your `bin/app.ts` (or wherever your CDK app is defined).

```typescript
import { App, Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { MyStack } from '../lib/my-stack';

const app = new App();
const stack = new MyStack(app, 'MyStack');

// Add AWS Solutions checks to the entire app
Aspects.of(app).add(new AwsSolutionsChecks({
  verbose: true, // Show detailed messages for each finding
}));

app.synth();
```

Now when you run `cdk synth`, CDK Nag will analyze every resource and report any violations. If there are errors (not just warnings), the synthesis will fail, preventing deployment.

## What CDK Nag Catches

Let's look at some common issues CDK Nag flags. Here's a stack that looks innocent but has several problems.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class InsecureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Problem 1: S3 bucket without encryption or logging
    const bucket = new s3.Bucket(this, 'DataBucket', {
      bucketName: 'my-data-bucket',
    });

    // Problem 2: RDS without encryption, in a public subnet
    const vpc = new ec2.Vpc(this, 'Vpc');

    // Problem 3: Security group with wide-open ingress
    const sg = new ec2.SecurityGroup(this, 'WebSg', {
      vpc,
      allowAllOutbound: true,
    });
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic());
  }
}
```

CDK Nag would flag this stack with findings like:

- **AwsSolutions-S1**: The S3 Bucket does not have server access logging enabled
- **AwsSolutions-S10**: The S3 Bucket does not require requests to use SSL
- **AwsSolutions-EC23**: The Security Group allows unrestricted inbound traffic
- **AwsSolutions-RDS2**: The RDS instance does not have storage encryption enabled (if we added one)

Each finding includes a rule ID, severity, and a description of what's wrong and why it matters.

## Fixing Common Findings

Here's the fixed version of that stack.

```typescript
export class SecureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Fixed: S3 bucket with encryption, logging, and SSL enforcement
    const logBucket = new s3.Bucket(this, 'LogBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const bucket = new s3.Bucket(this, 'DataBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      serverAccessLogsBucket: logBucket, // Enable access logging
      serverAccessLogsPrefix: 'data-bucket-logs/',
      versioned: true, // Enable versioning for data protection
    });

    const vpc = new ec2.Vpc(this, 'Vpc');

    // Fixed: Security group with specific port and CIDR
    const sg = new ec2.SecurityGroup(this, 'WebSg', {
      vpc,
      allowAllOutbound: false, // Restrict outbound too
    });
    sg.addIngressRule(
      ec2.Peer.ipv4('10.0.0.0/16'), // Only from internal network
      ec2.Port.tcp(443),              // Only HTTPS
      'Allow HTTPS from internal'
    );
  }
}
```

## Suppressing Findings

Sometimes CDK Nag flags something that you've intentionally configured. Maybe you need a public S3 bucket for a static website, or a wide-open security group for a specific use case. You can suppress findings with a reason.

```typescript
import { NagSuppressions } from 'cdk-nag';

// Suppress a specific finding on a specific resource
NagSuppressions.addResourceSuppressions(bucket, [
  {
    id: 'AwsSolutions-S1',
    reason: 'Access logging is handled by a separate centralized logging service',
  },
]);

// Suppress a finding on an entire stack
NagSuppressions.addStackSuppressions(this, [
  {
    id: 'AwsSolutions-IAM4',
    reason: 'Using AWS managed policies is acceptable for this non-production stack',
  },
]);

// Suppress with a path pattern (useful for CDK-generated resources)
NagSuppressions.addResourceSuppressionsByPath(this,
  '/MyStack/MyApi/CloudWatchRole/Resource',
  [
    {
      id: 'AwsSolutions-IAM4',
      reason: 'CDK-generated CloudWatch role uses managed policies by design',
    },
  ]
);
```

Always include a meaningful reason. "Not applicable" isn't good enough - explain why the rule doesn't apply to your specific case. Your future self (and your security team) will thank you.

## Using Multiple Rule Packs

You can apply multiple rule packs simultaneously for stricter compliance.

```typescript
import { AwsSolutionsChecks, HIPAASecurityChecks, NIST80053R5Checks } from 'cdk-nag';

// Apply multiple compliance checks
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
Aspects.of(app).add(new HIPAASecurityChecks({ verbose: true }));
Aspects.of(app).add(new NIST80053R5Checks({ verbose: true }));
```

Be prepared for a lot of findings if you turn on HIPAA or NIST checks. These are strict, and many of the rules require specific configurations that go beyond typical best practices.

## Integrating with CI/CD

CDK Nag is most valuable when it runs in your CI/CD pipeline. If synthesis fails due to nag errors, the deployment is blocked.

```yaml
# GitHub Actions example
name: CDK Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci

      # CDK Nag runs during synth - if checks fail, synth fails
      - run: npx cdk synth
        env:
          AWS_ACCOUNT_ID: ${{ secrets.AWS_ACCOUNT_ID }}
          AWS_REGION: us-east-1

      # Only deploy if synth (and therefore nag checks) passed
      - run: npx cdk deploy --require-approval never
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

For more on CDK CI/CD, check out our guide on [setting up Terraform CI/CD with GitHub Actions](https://oneuptime.com/blog/post/terraform-cicd-github-actions-for-aws/view) - the pipeline patterns are similar.

## Generating Reports

CDK Nag can output findings as structured data for tracking and auditing.

```typescript
import { NagReportFormat } from 'cdk-nag';

Aspects.of(app).add(new AwsSolutionsChecks({
  verbose: true,
  reports: true,                           // Enable reports
  reportFormats: [NagReportFormat.CSV],    // Output as CSV
}));
```

This generates a CSV file in your `cdk.out` directory that you can import into spreadsheets or compliance tracking tools.

## Writing Custom Rules

If the built-in packs don't cover your organization's specific requirements, you can write custom rules.

```typescript
import { CfnResource } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { NagRuleCompliance, NagRules } from 'cdk-nag';

// Custom rule: Ensure all S3 buckets have a specific tag
export class S3BucketTagRule {
  static check(node: IConstruct): NagRuleCompliance {
    if (node instanceof CfnResource && node.cfnResourceType === 'AWS::S3::Bucket') {
      const tags = node.tags?.renderTags();
      const hasTeamTag = tags?.some((tag: any) => tag.key === 'Team');
      return hasTeamTag
        ? NagRuleCompliance.COMPLIANT
        : NagRuleCompliance.NON_COMPLIANT;
    }
    return NagRuleCompliance.NOT_APPLICABLE;
  }
}
```

## Wrapping Up

CDK Nag is one of those tools that pays for itself immediately. It takes five minutes to set up and catches the kind of security misconfigurations that cause real incidents. Start with the AwsSolutions pack, fix the critical findings, suppress the ones that don't apply (with good reasons), and integrate it into your CI/CD pipeline.

The goal isn't to have zero findings - it's to have zero unintentional security gaps. Every suppression should be a conscious decision, not a shortcut.

For more on CDK tooling, check out our guide on [using Projen to manage CDK project configuration](https://oneuptime.com/blog/post/use-projen-to-manage-cdk-project-configuration/view).
