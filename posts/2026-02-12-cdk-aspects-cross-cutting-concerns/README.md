# How to Use CDK Aspects for Cross-Cutting Concerns

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, TypeScript, Compliance

Description: Learn how to use CDK Aspects to enforce tagging policies, compliance rules, security standards, and other cross-cutting concerns across all resources in your CDK stacks.

---

CDK Aspects let you apply a visitor pattern across your entire construct tree. They run after synthesis and can inspect, modify, or validate every resource in your stack. This makes them perfect for cross-cutting concerns - things like tagging policies, encryption enforcement, or compliance checks that apply to every resource regardless of where it's defined.

Think of Aspects as middleware for your infrastructure. They intercept every resource and apply rules consistently.

## How Aspects Work

An Aspect is a class that implements the `IAspect` interface with a single `visit` method. CDK calls this method once for every construct in the tree where the Aspect is applied.

```typescript
// A simple Aspect that logs every resource it visits
import { IAspect, CfnResource } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

class ResourceLogger implements IAspect {
  public visit(node: IConstruct): void {
    // Check if this node is a CloudFormation resource
    if (CfnResource.isCfnResource(node)) {
      console.log(`Found resource: ${node.cfnResourceType} - ${node.node.path}`);
    }
  }
}
```

Apply an Aspect to a stack, construct, or the entire app.

```typescript
// Apply to a single stack
cdk.Aspects.of(myStack).add(new ResourceLogger());

// Apply to the entire app (all stacks)
cdk.Aspects.of(app).add(new ResourceLogger());

// Apply to a specific construct
cdk.Aspects.of(myVpc).add(new ResourceLogger());
```

## Enforcing Tags

The most common use case for Aspects is ensuring all resources have required tags.

```typescript
// Aspect that enforces required tags on all taggable resources
import { IAspect, CfnResource, Annotations, Tags } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

class RequiredTags implements IAspect {
  private readonly requiredTags: Record<string, string>;

  constructor(requiredTags: Record<string, string>) {
    this.requiredTags = requiredTags;
  }

  public visit(node: IConstruct): void {
    if (CfnResource.isCfnResource(node)) {
      // Check if the resource supports tags
      if ('tags' in node) {
        const cfnTags = (node as any).tags;

        for (const [key, value] of Object.entries(this.requiredTags)) {
          // Add the tag if it isn't already present
          if (cfnTags && typeof cfnTags.setTag === 'function') {
            cfnTags.setTag(key, value, undefined, true);
          }
        }
      }
    }
  }
}

// Usage: apply required tags to all resources in the stack
cdk.Aspects.of(myStack).add(new RequiredTags({
  'Environment': 'production',
  'Team': 'platform',
  'CostCenter': 'eng-42',
  'ManagedBy': 'cdk',
}));
```

## Enforcing Encryption

Security teams often require that all storage resources use encryption. An Aspect can enforce this.

```typescript
// Aspect that validates encryption is enabled on all storage resources
import { IAspect, CfnResource, Annotations } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { IConstruct } from 'constructs';

class EnforceEncryption implements IAspect {
  public visit(node: IConstruct): void {
    // Check S3 buckets
    if (node instanceof s3.CfnBucket) {
      const encryption = node.bucketEncryption;
      if (!encryption) {
        Annotations.of(node).addError(
          'S3 bucket must have encryption enabled. ' +
          'Set the encryption property on the Bucket construct.'
        );
      }
    }

    // Check RDS instances
    if (node instanceof rds.CfnDBInstance) {
      if (node.storageEncrypted !== true) {
        Annotations.of(node).addError(
          'RDS instances must have storage encryption enabled.'
        );
      }
    }

    // Check DynamoDB tables
    if (node instanceof dynamodb.CfnTable) {
      const sse = node.sseSpecification;
      if (!sse || sse.sseEnabled !== true) {
        Annotations.of(node).addWarning(
          'DynamoDB table should have SSE enabled for compliance.'
        );
      }
    }
  }
}
```

When you use `Annotations.of(node).addError()`, CDK synthesis fails with an error message. Use `addWarning()` for non-blocking warnings and `addInfo()` for informational messages.

## Enforcing Deletion Protection

For production stacks, you might want to ensure critical resources have deletion protection.

```typescript
// Aspect that enforces deletion protection on production resources
class DeletionProtection implements IAspect {
  public visit(node: IConstruct): void {
    // Protect RDS instances
    if (node instanceof rds.CfnDBInstance) {
      node.deletionProtection = true;
    }

    // Protect RDS clusters
    if (node instanceof rds.CfnDBCluster) {
      node.deletionProtection = true;
    }

    // Protect DynamoDB tables
    if (node instanceof dynamodb.CfnTable) {
      node.deletionProtectionEnabled = true;
    }

    // Set S3 buckets to RETAIN
    if (node instanceof s3.CfnBucket) {
      node.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.RETAIN;
      node.cfnOptions.updateReplacePolicy = cdk.CfnDeletionPolicy.RETAIN;
    }
  }
}

// Only apply to production stacks
if (environment === 'production') {
  cdk.Aspects.of(stack).add(new DeletionProtection());
}
```

## Enforcing Security Group Rules

Aspects can validate that security groups don't have overly permissive rules.

```typescript
// Aspect that blocks overly permissive security group rules
class NoOpenSecurityGroups implements IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof ec2.CfnSecurityGroup) {
      const ingress = node.securityGroupIngress;

      if (Array.isArray(ingress)) {
        for (const rule of ingress) {
          const cidr = (rule as any).cidrIp;
          if (cidr === '0.0.0.0/0') {
            const port = (rule as any).fromPort;
            // Allow 80 and 443, block everything else
            if (port !== 80 && port !== 443) {
              Annotations.of(node).addError(
                `Security group allows 0.0.0.0/0 on port ${port}. ` +
                'Only ports 80 and 443 can be open to the internet.'
              );
            }
          }
        }
      }
    }
  }
}
```

## Using cdk-nag for Pre-Built Aspects

The `cdk-nag` library provides hundreds of pre-built Aspects that check against common compliance frameworks like AWS Solutions, HIPAA, NIST, and PCI DSS.

```bash
# Install cdk-nag
npm install cdk-nag
```

```typescript
// Apply AWS Solutions checks to your stack
import { AwsSolutionsChecks } from 'cdk-nag';

// Apply to a specific stack
cdk.Aspects.of(myStack).add(new AwsSolutionsChecks());

// Or apply to the entire app
cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
```

cdk-nag checks things like S3 bucket logging, VPC flow logs, Lambda function timeouts, and dozens of other best practices. It saves you from writing most compliance Aspects from scratch.

```typescript
// Suppress specific cdk-nag warnings when you have a valid reason
import { NagSuppressions } from 'cdk-nag';

NagSuppressions.addResourceSuppressions(
  myBucket,
  [
    {
      id: 'AwsSolutions-S1',
      reason: 'Access logging is handled by the centralized logging stack',
    },
  ],
);
```

## Composing Multiple Aspects

You can apply multiple Aspects to the same scope. They run in the order they're added.

```typescript
// Apply multiple Aspects for comprehensive governance
const stack = new MyStack(app, 'Production');

// Tagging
cdk.Aspects.of(stack).add(new RequiredTags({
  Environment: 'production',
  Team: 'platform',
}));

// Security
cdk.Aspects.of(stack).add(new EnforceEncryption());
cdk.Aspects.of(stack).add(new NoOpenSecurityGroups());

// Production safeguards
cdk.Aspects.of(stack).add(new DeletionProtection());

// Compliance
cdk.Aspects.of(stack).add(new AwsSolutionsChecks());
```

Aspects are one of CDK's most powerful features for maintaining consistency across large organizations. They let you enforce rules without relying on every developer to remember every policy. For related techniques, check out [CDK escape hatches](https://oneuptime.com/blog/post/cdk-escape-hatches-access-l1-constructs/view) for when you need to work around Aspect restrictions, and [custom CDK constructs](https://oneuptime.com/blog/post/create-custom-cdk-constructs/view) for building reusable components that are compliant by default.
