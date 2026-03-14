# How to Publish CDKTF Constructs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Infrastructure as Code, Constructs, Npm, Open Source

Description: Step-by-step guide to building, packaging, and publishing your own CDKTF constructs to npm and other package registries so others can reuse your infrastructure patterns.

---

After you have been using CDKTF for a while, you will notice patterns repeating across projects. Maybe you always set up VPCs the same way, or your RDS clusters follow the same security baseline. Instead of copying code between repositories, you can package those patterns as constructs and publish them. This guide covers the full lifecycle from building a construct to publishing it on npm.

## What Makes a Good Construct

Before writing code, think about what your construct should do. A good construct solves a specific, well-defined problem. It should have sensible defaults so most users can get started quickly, but expose enough configuration to handle edge cases.

Here are some guidelines:

- A construct should create a logical group of related resources, not just wrap a single resource
- It should encode best practices and security defaults
- The API should be simple for the common case and extensible for advanced use
- It should be well-documented with usage examples

## Project Setup

Start by creating a new project for your construct:

```bash
# Create project directory
mkdir cdktf-aws-secure-bucket
cd cdktf-aws-secure-bucket

# Initialize with projen (recommended for construct projects)
npx projen new --from @cdktf/provider-project

# Or initialize manually
npm init -y
```

If you are setting up manually, install the necessary dependencies:

```bash
# Core dependencies
npm install constructs cdktf

# Provider dependencies (as peer deps)
npm install @cdktf/provider-aws

# Development dependencies
npm install -D typescript jest ts-jest @types/jest
```

Set up your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Writing the Construct

Create your construct in the `src` directory. Here is a real-world example of a secure S3 bucket construct:

```typescript
// src/secure-bucket.ts
import { Construct } from "constructs";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { S3BucketVersioningA } from "@cdktf/provider-aws/lib/s3-bucket-versioning";
import { S3BucketServerSideEncryptionConfigurationA } from "@cdktf/provider-aws/lib/s3-bucket-server-side-encryption-configuration";
import { S3BucketPublicAccessBlock } from "@cdktf/provider-aws/lib/s3-bucket-public-access-block";
import { S3BucketLifecycleConfiguration } from "@cdktf/provider-aws/lib/s3-bucket-lifecycle-configuration";

// Define the configuration interface
export interface SecureBucketConfig {
  /** The name of the S3 bucket */
  readonly bucketName: string;

  /** Enable versioning (default: true) */
  readonly versioning?: boolean;

  /** KMS key ARN for encryption (uses AES256 if not provided) */
  readonly kmsKeyArn?: string;

  /** Number of days before transitioning to Glacier (default: 90) */
  readonly glacierTransitionDays?: number;

  /** Number of days before expiring objects (default: none) */
  readonly expirationDays?: number;

  /** Additional tags to apply */
  readonly tags?: { [key: string]: string };
}

export class SecureBucket extends Construct {
  public readonly bucket: S3Bucket;
  public readonly bucketArn: string;
  public readonly bucketName: string;

  constructor(scope: Construct, id: string, config: SecureBucketConfig) {
    super(scope, id);

    // Create the bucket
    this.bucket = new S3Bucket(this, "bucket", {
      bucket: config.bucketName,
      tags: {
        ManagedBy: "cdktf",
        ...config.tags,
      },
    });

    this.bucketArn = this.bucket.arn;
    this.bucketName = this.bucket.bucket;

    // Enable versioning by default
    if (config.versioning !== false) {
      new S3BucketVersioningA(this, "versioning", {
        bucket: this.bucket.id,
        versioningConfiguration: {
          status: "Enabled",
        },
      });
    }

    // Configure server-side encryption
    new S3BucketServerSideEncryptionConfigurationA(this, "encryption", {
      bucket: this.bucket.id,
      rule: [
        {
          applyServerSideEncryptionByDefault: config.kmsKeyArn
            ? {
                sseAlgorithm: "aws:kms",
                kmsMasterKeyId: config.kmsKeyArn,
              }
            : {
                sseAlgorithm: "AES256",
              },
          bucketKeyEnabled: true,
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

    // Add lifecycle rules if configured
    const rules: any[] = [];
    if (config.glacierTransitionDays) {
      rules.push({
        id: "glacier-transition",
        status: "Enabled",
        transition: [
          {
            days: config.glacierTransitionDays,
            storageClass: "GLACIER",
          },
        ],
      });
    }
    if (config.expirationDays) {
      rules.push({
        id: "expiration",
        status: "Enabled",
        expiration: {
          days: config.expirationDays,
        },
      });
    }
    if (rules.length > 0) {
      new S3BucketLifecycleConfiguration(this, "lifecycle", {
        bucket: this.bucket.id,
        rule: rules,
      });
    }
  }
}
```

Create your entry point:

```typescript
// src/index.ts
export { SecureBucket, SecureBucketConfig } from "./secure-bucket";
```

## Writing Tests

Write tests to validate your construct generates the expected resources:

```typescript
// src/__tests__/secure-bucket.test.ts
import { Testing } from "cdktf";
import { TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { SecureBucket } from "../secure-bucket";

describe("SecureBucket", () => {
  let stack: TerraformStack;

  beforeEach(() => {
    const app = Testing.app();
    stack = new TerraformStack(app, "test");
    new AwsProvider(stack, "aws", { region: "us-east-1" });
  });

  it("creates a bucket with encryption and public access block", () => {
    new SecureBucket(stack, "test-bucket", {
      bucketName: "my-test-bucket",
    });

    const synth = Testing.synth(stack);
    expect(synth).toHaveResource("aws_s3_bucket");
    expect(synth).toHaveResource(
      "aws_s3_bucket_server_side_encryption_configuration"
    );
    expect(synth).toHaveResource("aws_s3_bucket_public_access_block");
  });

  it("enables versioning by default", () => {
    new SecureBucket(stack, "test-bucket", {
      bucketName: "my-test-bucket",
    });

    const synth = Testing.synth(stack);
    expect(synth).toHaveResource("aws_s3_bucket_versioning");
  });

  it("disables versioning when configured", () => {
    new SecureBucket(stack, "test-bucket", {
      bucketName: "my-test-bucket",
      versioning: false,
    });

    const synth = Testing.synth(stack);
    expect(synth).not.toHaveResource("aws_s3_bucket_versioning");
  });
});
```

## Configuring package.json for Publishing

Update your `package.json` with the right metadata:

```json
{
  "name": "@yourorg/cdktf-aws-secure-bucket",
  "version": "1.0.0",
  "description": "A CDKTF construct for creating secure S3 buckets with encryption, versioning, and public access blocking",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": ["cdktf", "terraform", "aws", "s3", "construct"],
  "license": "Apache-2.0",
  "peerDependencies": {
    "cdktf": ">=0.20.0",
    "constructs": ">=10.0.0",
    "@cdktf/provider-aws": ">=19.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/yourorg/cdktf-aws-secure-bucket"
  }
}
```

## Publishing to npm

Build, test, and publish:

```bash
# Build the TypeScript
npm run build

# Run tests
npm test

# Login to npm
npm login

# Publish (use --access public for scoped packages)
npm publish --access public
```

For automated publishing, set up a GitHub Actions workflow:

```yaml
# .github/workflows/publish.yml
name: Publish
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Publishing for Multiple Languages with jsii

If you want your construct available in Python, Java, and Go (not just TypeScript), use jsii. jsii compiles TypeScript to packages for other languages.

```bash
# Install jsii
npm install -D jsii jsii-pacmak jsii-rosetta
```

Add jsii configuration to `package.json`:

```json
{
  "jsii": {
    "outdir": "dist",
    "targets": {
      "python": {
        "distName": "cdktf-aws-secure-bucket",
        "module": "cdktf_aws_secure_bucket"
      },
      "java": {
        "package": "com.yourorg.cdktf.aws.securebucket",
        "maven": {
          "groupId": "com.yourorg",
          "artifactId": "cdktf-aws-secure-bucket"
        }
      }
    }
  }
}
```

```bash
# Build packages for all languages
npx jsii-pacmak

# Packages are generated in dist/
ls dist/
# python/  java/  js/
```

## Documentation Tips

Good documentation makes the difference between a construct people use and one they ignore. Include:

1. A clear README with installation and basic usage
2. API documentation (generated from TypeScript doc comments)
3. At least one complete example showing a real-world use case
4. Information about what resources the construct creates
5. Notes on IAM permissions required

Publishing CDKTF constructs is the best way to share infrastructure patterns across your organization or with the community. Start with constructs that solve problems you face repeatedly, and expand from there.

For related reading, check out [How to Handle CDKTF Version Upgrades](https://oneuptime.com/blog/post/2026-02-23-handle-cdktf-version-upgrades/view).
