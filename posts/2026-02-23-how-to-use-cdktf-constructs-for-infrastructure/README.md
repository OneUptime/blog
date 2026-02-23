# How to Use CDKTF Constructs for Infrastructure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Infrastructure as Code, TypeScript, DevOps

Description: Learn how to use CDKTF constructs to build reusable, composable infrastructure components using familiar programming languages like TypeScript and Python.

---

If you have been working with Terraform for a while, you know that HCL gets the job done but can feel limiting when you want to build truly reusable infrastructure components. CDK for Terraform (CDKTF) changes that by letting you use general-purpose programming languages to define your infrastructure. At the heart of CDKTF sits the concept of constructs - the fundamental building blocks for everything you create.

In this post, we will walk through what CDKTF constructs are, how they work, and how you can use them to build clean, composable infrastructure.

## What Are Constructs in CDKTF?

Constructs are the basic building blocks of every CDKTF application. They come from the AWS CDK construct library and represent a single cloud resource, a group of resources, or even an entire architecture pattern. Every resource you define in CDKTF is a construct, and you can compose constructs together to build higher-level abstractions.

There are three levels of constructs:

- **L1 Constructs**: These map directly to a single Terraform resource. When you create an `S3Bucket` or `VirtualNetwork`, that is an L1 construct.
- **L2 Constructs**: These bundle multiple L1 constructs together with sensible defaults. For example, a construct that creates an S3 bucket with encryption enabled and public access blocked.
- **L3 Constructs**: These represent entire architecture patterns. Think of a construct that creates a full VPC with subnets, route tables, NAT gateways, and security groups.

## Setting Up a CDKTF Project

Before working with constructs, let us set up a basic CDKTF project using TypeScript.

```bash
# Install CDKTF CLI globally
npm install -g cdktf-cli

# Initialize a new CDKTF project with TypeScript
cdktf init --template=typescript --local

# This creates a project structure like:
# main.ts       - Your main application entry point
# cdktf.json    - CDKTF configuration file
# package.json  - Node.js dependencies
```

Your `main.ts` file will look something like this after initialization:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";

// Every CDKTF app starts with a stack, which is itself a construct
class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Define resources here
  }
}

// The App is the root construct that contains all stacks
const app = new App();
new MyStack(app, "my-stack");
app.synth();
```

## Creating Your First L1 Construct

L1 constructs are the most basic type. They wrap a single Terraform resource directly. Here is how you use them:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure the AWS provider
    new AwsProvider(this, "aws", {
      region: "us-east-1",
    });

    // Create an S3 bucket - this is an L1 construct
    new S3Bucket(this, "my-bucket", {
      bucket: "my-cdktf-demo-bucket",
      tags: {
        Environment: "development",
        ManagedBy: "cdktf",
      },
    });
  }
}

const app = new App();
new MyStack(app, "my-stack");
app.synth();
```

Every construct takes three arguments: the scope (its parent construct), an id (unique within the scope), and a configuration object.

## Building Custom L2 Constructs

This is where CDKTF starts to shine. You can create custom constructs that bundle multiple resources together. Let us build a construct that creates a secure S3 bucket with versioning, encryption, and public access blocking.

```typescript
import { Construct } from "constructs";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { S3BucketVersioningA } from "@cdktf/provider-aws/lib/s3-bucket-versioning";
import { S3BucketServerSideEncryptionConfigurationA } from "@cdktf/provider-aws/lib/s3-bucket-server-side-encryption-configuration";
import { S3BucketPublicAccessBlock } from "@cdktf/provider-aws/lib/s3-bucket-public-access-block";

// Define the configuration interface for our construct
interface SecureBucketConfig {
  bucketName: string;
  environment: string;
}

// Custom L2 construct that creates a secure S3 bucket
class SecureBucket extends Construct {
  // Expose the bucket so other constructs can reference it
  public readonly bucket: S3Bucket;

  constructor(scope: Construct, id: string, config: SecureBucketConfig) {
    super(scope, id);

    // Create the base S3 bucket
    this.bucket = new S3Bucket(this, "bucket", {
      bucket: config.bucketName,
      tags: {
        Environment: config.environment,
        ManagedBy: "cdktf",
      },
    });

    // Enable versioning
    new S3BucketVersioningA(this, "versioning", {
      bucket: this.bucket.id,
      versioningConfiguration: {
        status: "Enabled",
      },
    });

    // Enable server-side encryption
    new S3BucketServerSideEncryptionConfigurationA(this, "encryption", {
      bucket: this.bucket.id,
      rule: [
        {
          applyServerSideEncryptionByDefault: {
            sseAlgorithm: "aws:kms",
          },
        },
      ],
    });

    // Block all public access
    new S3BucketPublicAccessBlock(this, "public-access-block", {
      bucket: this.bucket.id,
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });
  }
}
```

Now you can use this construct anywhere in your codebase with a single line:

```typescript
// Using the custom construct is clean and simple
const dataBucket = new SecureBucket(this, "data-bucket", {
  bucketName: "my-secure-data-bucket",
  environment: "production",
});

// You can reference the underlying bucket through the exposed property
console.log(dataBucket.bucket.arn);
```

## Building L3 Constructs for Architecture Patterns

L3 constructs represent entire architecture patterns. Here is an example that creates a complete static website hosting setup:

```typescript
import { Construct } from "constructs";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { S3BucketWebsiteConfiguration } from "@cdktf/provider-aws/lib/s3-bucket-website-configuration";
import { CloudfrontDistribution } from "@cdktf/provider-aws/lib/cloudfront-distribution";

interface StaticWebsiteConfig {
  domainName: string;
  environment: string;
}

// L3 construct that creates a full static website hosting setup
class StaticWebsite extends Construct {
  public readonly bucket: S3Bucket;
  public readonly distribution: CloudfrontDistribution;

  constructor(scope: Construct, id: string, config: StaticWebsiteConfig) {
    super(scope, id);

    // Create the S3 bucket for website content
    this.bucket = new S3Bucket(this, "website-bucket", {
      bucket: `${config.domainName}-website`,
      tags: {
        Environment: config.environment,
      },
    });

    // Configure the bucket for static website hosting
    new S3BucketWebsiteConfiguration(this, "website-config", {
      bucket: this.bucket.id,
      indexDocument: { suffix: "index.html" },
      errorDocument: { key: "error.html" },
    });

    // Create a CloudFront distribution in front of the bucket
    this.distribution = new CloudfrontDistribution(this, "cdn", {
      enabled: true,
      defaultRootObject: "index.html",
      origin: [
        {
          domainName: this.bucket.bucketRegionalDomainName,
          originId: "s3-origin",
        },
      ],
      defaultCacheBehavior: {
        allowedMethods: ["GET", "HEAD"],
        cachedMethods: ["GET", "HEAD"],
        targetOriginId: "s3-origin",
        viewerProtocolPolicy: "redirect-to-https",
        forwardedValues: {
          queryString: false,
          cookies: { forward: "none" },
        },
      },
      restrictions: {
        geoRestriction: { restrictionType: "none" },
      },
      viewerCertificate: {
        cloudfrontDefaultCertificate: true,
      },
    });
  }
}
```

## Composing Constructs Together

The real power of constructs comes from composition. You can combine multiple custom constructs to build complete environments:

```typescript
class ProductionEnvironment extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Compose multiple constructs to build a production environment
    const dataBucket = new SecureBucket(this, "data-storage", {
      bucketName: "prod-data-store",
      environment: "production",
    });

    const website = new StaticWebsite(this, "marketing-site", {
      domainName: "example.com",
      environment: "production",
    });

    // Constructs can reference each other's properties
    // This is where the composability really pays off
  }
}
```

## Best Practices for CDKTF Constructs

When building constructs, keep these principles in mind:

1. **Keep L2 constructs focused**. Each L2 construct should represent a single logical resource with its supporting configuration. Do not try to do too much in one construct.

2. **Expose important properties**. Use public readonly properties to let other constructs reference the resources you create. This enables composition.

3. **Use interfaces for configuration**. Define TypeScript interfaces for your construct configuration. This gives you type safety and makes the API clear.

4. **Default to secure configurations**. When creating L2 constructs, bake in security best practices as defaults. Encryption should be on, public access should be off, and logging should be enabled.

5. **Organize constructs in separate files**. Keep your custom constructs in their own files or even publish them as separate npm packages for reuse across teams.

## Wrapping Up

CDKTF constructs give you the ability to build infrastructure the same way you build application code - with composition, abstraction, and reuse. Start with L1 constructs for simple resources, build L2 constructs for common patterns with sensible defaults, and create L3 constructs for complete architecture patterns.

The combination of Terraform's provider ecosystem with the expressiveness of a real programming language makes CDKTF constructs one of the most powerful ways to manage infrastructure at scale. If you are already familiar with Terraform, the transition is smooth, and the benefits of using constructs will become obvious as your infrastructure grows.

For more on infrastructure as code and DevOps practices, check out our other posts on [Terraform best practices](https://oneuptime.com/blog/post/2026-02-23-how-to-define-resources-in-cdktf/view) and [CDKTF providers](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-providers/view).
