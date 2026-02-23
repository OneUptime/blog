# How to Use CDKTF Aspects for Cross-Cutting Concerns

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Aspects, Infrastructure as Code, Best Practices

Description: Learn how to use CDKTF aspects to apply cross-cutting concerns like tagging, validation, and compliance rules across all resources in your infrastructure.

---

Some infrastructure requirements apply to every resource in your project. Every resource needs tags. Every S3 bucket needs encryption. Every security group needs logging. Implementing these one resource at a time is tedious and error-prone. CDKTF aspects give you a way to apply these cross-cutting concerns automatically to every resource in a stack or even across your entire application. This guide shows you how to build and use aspects effectively.

## What Are Aspects?

Aspects in CDKTF are a pattern borrowed from the AWS CDK. An aspect is a class that implements the `IAspect` interface and has a `visit` method. CDKTF calls this method for every construct in the tree, giving you a chance to inspect, modify, or validate each one.

Think of aspects as visitors that walk through your entire construct tree. They can:
- Add tags to every resource
- Validate that resources meet compliance requirements
- Modify resource properties based on rules
- Generate warnings or errors for misconfigured resources

## The IAspect Interface

An aspect implements a single method:

```typescript
import { IAspect } from "cdktf";
import { Construct, IConstruct } from "constructs";

// Every aspect must implement the visit method
class MyAspect implements IAspect {
  visit(node: IConstruct): void {
    // This is called for every construct in the tree
    // including the stack itself, nested constructs, and individual resources
  }
}
```

## Applying Aspects to Constructs

You apply aspects using the `Aspects.of()` method:

```typescript
import { Aspects } from "cdktf";

// Apply to a specific stack
const stack = new MyStack(app, "production");
Aspects.of(stack).add(new MyAspect());

// Apply to the entire app (all stacks)
const app = new App();
Aspects.of(app).add(new MyAspect());

// Apply to a specific construct within a stack
const myConstruct = new MyConstruct(stack, "my-construct");
Aspects.of(myConstruct).add(new MyAspect());
```

## Building a Tagging Aspect

The most common use case for aspects is adding tags to all resources:

```typescript
import { IAspect } from "cdktf";
import { IConstruct } from "constructs";

// Aspect that adds tags to every resource that supports tagging
class TaggingAspect implements IAspect {
  private tags: Record<string, string>;

  constructor(tags: Record<string, string>) {
    this.tags = tags;
  }

  visit(node: IConstruct): void {
    // Check if the node has a tagsInput property (most AWS resources do)
    if (this.isTaggable(node)) {
      const resource = node as any;
      // Merge our tags with any existing tags
      const existingTags = resource.tagsInput || {};
      resource.tags = { ...existingTags, ...this.tags };
    }
  }

  private isTaggable(node: IConstruct): boolean {
    // Check if the construct has tags support
    return "tagsInput" in (node as any);
  }
}

// Usage
const app = new App();
const stack = new MyStack(app, "production");

// Apply standard tags to all resources in the stack
Aspects.of(stack).add(
  new TaggingAspect({
    Environment: "production",
    Team: "platform",
    CostCenter: "engineering",
    ManagedBy: "cdktf",
  })
);

app.synth();
```

## Building a Validation Aspect

Aspects can validate resources and produce warnings or errors:

```typescript
import { IAspect, Annotations } from "cdktf";
import { IConstruct } from "constructs";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { Instance } from "@cdktf/provider-aws/lib/instance";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";

// Aspect that validates security best practices
class SecurityValidationAspect implements IAspect {
  visit(node: IConstruct): void {
    // Check that no instances use t2.micro (old generation)
    if (node instanceof Instance) {
      if (node.instanceType === "t2.micro") {
        Annotations.of(node).addWarning(
          "Consider using t3.micro instead of t2.micro for better performance"
        );
      }
    }

    // Check that security groups do not allow unrestricted SSH
    if (node instanceof SecurityGroup) {
      const ingress = node.ingress;
      if (Array.isArray(ingress)) {
        for (const rule of ingress) {
          if (
            rule.fromPort === 22 &&
            rule.cidrBlocks?.includes("0.0.0.0/0")
          ) {
            Annotations.of(node).addError(
              "Security group allows SSH from 0.0.0.0/0. Restrict to specific IPs."
            );
          }
        }
      }
    }
  }
}

// Usage
Aspects.of(stack).add(new SecurityValidationAspect());
```

The difference between `addWarning` and `addError` is important:
- `addWarning` produces a warning message but does not prevent synthesis
- `addError` produces an error and prevents deployment

## Building an Encryption Enforcement Aspect

```typescript
import { IAspect, Annotations } from "cdktf";
import { IConstruct } from "constructs";
import { DbInstance } from "@cdktf/provider-aws/lib/db-instance";
import { EbsVolume } from "@cdktf/provider-aws/lib/ebs-volume";

// Ensure all databases and volumes are encrypted
class EncryptionEnforcementAspect implements IAspect {
  visit(node: IConstruct): void {
    // Check RDS instances
    if (node instanceof DbInstance) {
      if (!node.storageEncrypted) {
        Annotations.of(node).addError(
          "RDS instance must have storage encryption enabled. " +
          "Set storageEncrypted: true"
        );
      }
    }

    // Check EBS volumes
    if (node instanceof EbsVolume) {
      if (!node.encrypted) {
        Annotations.of(node).addError(
          "EBS volume must be encrypted. Set encrypted: true"
        );
      }
    }
  }
}
```

## Building a Cost Control Aspect

```typescript
import { IAspect, Annotations } from "cdktf";
import { IConstruct } from "constructs";
import { Instance } from "@cdktf/provider-aws/lib/instance";
import { DbInstance } from "@cdktf/provider-aws/lib/db-instance";

// Prevent creation of expensive resources in non-production environments
class CostControlAspect implements IAspect {
  private environment: string;
  private allowedInstanceTypes: string[];

  constructor(environment: string) {
    this.environment = environment;
    // Define allowed instance types per environment
    this.allowedInstanceTypes =
      environment === "production"
        ? ["t3.micro", "t3.small", "t3.medium", "t3.large", "t3.xlarge"]
        : ["t3.micro", "t3.small"];
  }

  visit(node: IConstruct): void {
    if (node instanceof Instance) {
      if (!this.allowedInstanceTypes.includes(node.instanceType || "")) {
        Annotations.of(node).addError(
          `Instance type ${node.instanceType} is not allowed in ` +
          `${this.environment}. Allowed types: ${this.allowedInstanceTypes.join(", ")}`
        );
      }
    }

    if (node instanceof DbInstance) {
      if (this.environment !== "production" && node.multiAz) {
        Annotations.of(node).addWarning(
          "Multi-AZ is enabled in a non-production environment. " +
          "This doubles the cost of the database."
        );
      }
    }
  }
}

// Usage
const devStack = new AppStack(app, "dev", { environment: "development" });
Aspects.of(devStack).add(new CostControlAspect("development"));

const prodStack = new AppStack(app, "prod", { environment: "production" });
Aspects.of(prodStack).add(new CostControlAspect("production"));
```

## Combining Multiple Aspects

You can apply multiple aspects to the same stack. They run in the order they are added:

```typescript
const stack = new ProductionStack(app, "production");

// Apply aspects in order
Aspects.of(stack).add(
  new TaggingAspect({
    Environment: "production",
    ManagedBy: "cdktf",
  })
);

Aspects.of(stack).add(new SecurityValidationAspect());
Aspects.of(stack).add(new EncryptionEnforcementAspect());
Aspects.of(stack).add(new CostControlAspect("production"));
```

## Testing Aspects

You can unit test aspects like any other code:

```typescript
import { Testing } from "cdktf";
import { TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Instance } from "@cdktf/provider-aws/lib/instance";
import { Aspects, Annotations } from "cdktf";

describe("CostControlAspect", () => {
  it("should reject large instances in development", () => {
    const app = Testing.app();
    const stack = new TerraformStack(app, "test");
    new AwsProvider(stack, "aws", { region: "us-east-1" });

    new Instance(stack, "big-server", {
      ami: "ami-12345",
      instanceType: "t3.xlarge",
    });

    Aspects.of(stack).add(new CostControlAspect("development"));

    // Synthesize triggers the aspects
    const synthesized = Testing.synth(stack);

    // Check for validation errors
    // The synth should produce errors about the instance type
    expect(Annotations.of(stack).hasError()).toBeTruthy();
  });
});
```

## Best Practices

1. **Keep aspects focused**. Each aspect should handle one concern: tagging, security validation, cost control, etc.

2. **Use type checking**. Use `instanceof` to check the type of each node before modifying or validating it.

3. **Prefer errors over silent modifications**. It is better to fail loudly when a resource violates policy than to silently change it.

4. **Document your aspects**. Each aspect is a policy. Make sure the team knows what policies are enforced.

5. **Test aspects separately**. Write unit tests for your aspects to verify they catch the right issues.

Aspects are one of the most powerful features of CDKTF. They let you enforce organizational standards consistently across all your infrastructure without relying on code reviews to catch every issue. For more on CDKTF patterns, check out our guide on [CDKTF constructs](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-constructs-for-infrastructure/view).
