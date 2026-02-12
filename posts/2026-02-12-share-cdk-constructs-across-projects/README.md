# How to Share CDK Constructs Across Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, TypeScript, Infrastructure as Code

Description: Learn patterns for sharing reusable AWS CDK constructs across multiple projects using npm packages, monorepos, and construct libraries.

---

Once you've built a few CDK projects, you'll notice the same patterns showing up everywhere. The same VPC configuration, the same Lambda alarm setup, the same S3 bucket with encryption and lifecycle rules. Copy-pasting these between projects works at first, but it quickly becomes a maintenance nightmare. When you find a bug or want to update a configuration, you've got to chase it across every project.

The solution is packaging your constructs into reusable libraries that multiple projects can consume. Let's walk through the different approaches, from simple shared packages to full construct libraries.

## The Construct Library Pattern

A construct library is just an npm package that exports CDK constructs. Here's how to set one up:

```bash
# Create the construct library project
mkdir company-cdk-constructs && cd company-cdk-constructs
npx cdk init lib --language typescript
```

Or if you prefer to set it up manually:

```bash
# Manual setup for more control
mkdir company-cdk-constructs && cd company-cdk-constructs
npm init -y
npm install aws-cdk-lib constructs
npm install -D typescript jest ts-jest @types/jest
```

Your `package.json` should look something like this:

```json
{
  "name": "@company/cdk-constructs",
  "version": "1.0.0",
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "test": "jest"
  },
  "peerDependencies": {
    "aws-cdk-lib": "^2.100.0",
    "constructs": "^10.0.0"
  },
  "devDependencies": {
    "aws-cdk-lib": "^2.100.0",
    "constructs": "^10.0.0",
    "typescript": "^5.3.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "@types/jest": "^29.5.0"
  }
}
```

Notice that `aws-cdk-lib` and `constructs` are peer dependencies, not regular dependencies. This prevents version conflicts when consumers use a different CDK version.

## Building Reusable Constructs

Let's build some constructs that you'd actually want to share. Here's a secure S3 bucket with all the settings your security team requires:

```typescript
// lib/secure-bucket.ts - Reusable S3 bucket with security defaults
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface SecureBucketProps {
  bucketName?: string;
  versioned?: boolean;
  lifecycleRules?: s3.LifecycleRule[];
  encryptionKey?: kms.IKey;
  expirationDays?: number;
}

export class SecureBucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: SecureBucketProps = {}) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: props.bucketName,
      versioned: props.versioned ?? true,
      encryption: props.encryptionKey
        ? s3.BucketEncryption.KMS
        : s3.BucketEncryption.S3_MANAGED,
      encryptionKey: props.encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      minimumTLSVersion: 1.2,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: props.lifecycleRules ?? [
        {
          id: 'transition-to-ia',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
          expiration: props.expirationDays
            ? cdk.Duration.days(props.expirationDays)
            : undefined,
        },
      ],
      serverAccessLogsPrefix: 'access-logs/',
    });
  }
}
```

And a standardized VPC:

```typescript
// lib/standard-vpc.ts - Company-standard VPC configuration
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface StandardVpcProps {
  maxAzs?: number;
  natGateways?: number;
  cidr?: string;
  enableFlowLogs?: boolean;
}

export class StandardVpc extends Construct {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: StandardVpcProps = {}) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: props.maxAzs ?? 3,
      natGateways: props.natGateways ?? 2,
      ipAddresses: props.cidr
        ? ec2.IpAddresses.cidr(props.cidr)
        : ec2.IpAddresses.cidr('10.0.0.0/16'),
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 22,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // Add flow logs if enabled
    if (props.enableFlowLogs !== false) {
      this.vpc.addFlowLog('FlowLog', {
        destination: ec2.FlowLogDestination.toCloudWatchLogs(),
        trafficType: ec2.FlowLogTrafficType.ALL,
      });
    }

    // Tag all subnets for Kubernetes
    cdk.Tags.of(this.vpc).add('kubernetes.io/role/internal-elb', '1');
  }
}
```

## Export Everything Through an Index File

Create a clean public API for your library:

```typescript
// lib/index.ts - Public API of the construct library
export { SecureBucket, SecureBucketProps } from './secure-bucket';
export { StandardVpc, StandardVpcProps } from './standard-vpc';
export { LambdaAlarms, LambdaAlarmProps } from './lambda-alarms';
export { StandardQueue, StandardQueueProps } from './standard-queue';
```

## Distribution Strategies

### Private npm Registry

The most common approach for company-internal constructs. Publish to a private registry like AWS CodeArtifact, GitHub Packages, or npm's private packages:

```bash
# Publish to AWS CodeArtifact
aws codeartifact login --tool npm --domain company --repository internal
npm publish

# Publish to GitHub Packages
npm publish --registry https://npm.pkg.github.com

# Publish to npm private registry
npm publish --access restricted
```

In consuming projects:

```bash
# Install the shared constructs
npm install @company/cdk-constructs
```

Then use them:

```typescript
// Consuming project - using shared constructs
import { SecureBucket, StandardVpc } from '@company/cdk-constructs';

const vpc = new StandardVpc(this, 'Vpc', {
  maxAzs: 2,
  enableFlowLogs: true,
});

const dataBucket = new SecureBucket(this, 'DataBucket', {
  bucketName: 'my-project-data',
  expirationDays: 365,
});
```

### Monorepo Approach

If your projects live in a monorepo, you can use workspace references:

```json
{
  "workspaces": [
    "packages/cdk-constructs",
    "packages/api-stack",
    "packages/frontend-stack"
  ]
}
```

Each stack package references the constructs package directly:

```json
{
  "name": "@company/api-stack",
  "dependencies": {
    "@company/cdk-constructs": "workspace:*"
  }
}
```

### Git Submodules or Subtrees

For smaller teams, git submodules work but have their own headaches. I'd generally recommend the npm package approach instead.

## Testing Your Constructs

Shared constructs need solid tests since many projects depend on them:

```typescript
// test/secure-bucket.test.ts - Unit tests for the construct
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SecureBucket } from '../lib/secure-bucket';

describe('SecureBucket', () => {
  test('creates a bucket with encryption enabled', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    new SecureBucket(stack, 'TestBucket');

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
            },
          },
        ],
      },
    });
  });

  test('blocks public access', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    new SecureBucket(stack, 'TestBucket');

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('enables versioning by default', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');

    new SecureBucket(stack, 'TestBucket');

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    });
  });
});
```

## Versioning Strategy

Use semantic versioning and be disciplined about it:

- **Patch** (1.0.1): Bug fixes, no API changes
- **Minor** (1.1.0): New constructs or optional properties
- **Major** (2.0.0): Breaking changes to existing construct APIs

For more on publishing your constructs publicly, see our post on [publishing CDK constructs to Construct Hub](https://oneuptime.com/blog/post/publish-cdk-constructs-construct-hub/view). If you're using Projen to manage your construct library project, check out [CDK with Projen](https://oneuptime.com/blog/post/cdk-projen-project-management/view).

## Wrapping Up

Sharing CDK constructs across projects pays dividends as your organization grows. It enforces consistency, reduces duplication, and lets infrastructure changes propagate to all projects through a version bump. Start by identifying the patterns you repeat most often, package them into a construct library with good tests, and publish to a private registry. Your future self will thank you.
