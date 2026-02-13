# How to Create S3 Buckets with AWS CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, CDK, Infrastructure as Code, TypeScript

Description: Learn how to create and configure Amazon S3 buckets using the AWS Cloud Development Kit with TypeScript, including encryption, lifecycle rules, and event notifications.

---

The AWS Cloud Development Kit (CDK) lets you define cloud infrastructure using real programming languages instead of JSON or YAML templates. If you're already comfortable with TypeScript, Python, or Java, CDK feels natural - you get type safety, IDE autocomplete, loops, conditionals, and all the abstractions you're used to.

Let's build S3 bucket configurations with CDK using TypeScript, starting simple and working up to production-ready setups.

## Setting Up a CDK Project

If you don't have CDK installed yet, grab it globally:

```bash
# Install the AWS CDK CLI globally
npm install -g aws-cdk
```

Create a new CDK project:

```bash
# Bootstrap a new CDK project with TypeScript
mkdir my-s3-project && cd my-s3-project
cdk init app --language typescript
```

This generates a project structure with a `lib/` directory where your stack definitions live. The main stack file is where we'll add our S3 resources.

## Creating a Basic Bucket

Open your stack file and add a bucket:

```typescript
// lib/my-s3-project-stack.ts - basic S3 bucket creation
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class MyS3ProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a basic S3 bucket
    const bucket = new s3.Bucket(this, 'MyAppBucket', {
      bucketName: 'my-company-app-data-2026',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }
}
```

The `removalPolicy` is important. `RETAIN` means the bucket won't be deleted when you destroy the stack - usually what you want for production data. For dev environments, you might use `DESTROY` instead, but the bucket has to be empty first.

## Adding Encryption and Versioning

Production buckets need encryption and versioning. CDK makes this straightforward with constructor properties:

```typescript
// Create a production-ready bucket with encryption and versioning
const productionBucket = new s3.Bucket(this, 'ProductionBucket', {
  bucketName: 'my-company-prod-data-2026',
  versioned: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
  enforceSSL: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
});
```

`enforceSSL: true` automatically adds a bucket policy that denies any requests made over plain HTTP. `blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL` does exactly what it says - no public access, period.

If you want KMS encryption instead of S3-managed encryption:

```typescript
// Use a custom KMS key for encryption
import * as kms from 'aws-cdk-lib/aws-kms';

const encryptionKey = new kms.Key(this, 'BucketKey', {
  alias: 'my-bucket-key',
  enableKeyRotation: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

const encryptedBucket = new s3.Bucket(this, 'EncryptedBucket', {
  encryption: s3.BucketEncryption.KMS,
  encryptionKey: encryptionKey,
  bucketKeyEnabled: true,
  versioned: true,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
});
```

## Lifecycle Rules

Lifecycle rules move objects between storage tiers or delete them based on age. Here's how to set up a typical tiered storage pattern:

```typescript
// Configure lifecycle rules for cost optimization
const dataLakeBucket = new s3.Bucket(this, 'DataLakeBucket', {
  versioned: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  lifecycleRules: [
    {
      id: 'TransitionToIA',
      transitions: [
        {
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: cdk.Duration.days(30),
        },
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(90),
        },
        {
          storageClass: s3.StorageClass.DEEP_ARCHIVE,
          transitionAfter: cdk.Duration.days(180),
        },
      ],
    },
    {
      id: 'CleanupOldVersions',
      noncurrentVersionExpiration: cdk.Duration.days(30),
    },
    {
      id: 'AbortIncompleteUploads',
      abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
    },
  ],
});
```

Notice how CDK uses `cdk.Duration.days()` instead of raw numbers. This makes the code self-documenting and prevents mistakes with unit confusion.

## Event Notifications

One of CDK's strengths is how easily it wires up services. Here's how to trigger a Lambda function when objects are created:

```typescript
// Set up event notifications to trigger Lambda on upload
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

const processorFunction = new lambda.Function(this, 'ProcessorFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda'),
});

const uploadBucket = new s3.Bucket(this, 'UploadBucket', {
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
});

// Trigger the Lambda when a new object is created
uploadBucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(processorFunction),
  { prefix: 'uploads/', suffix: '.csv' }
);
```

CDK handles all the IAM permissions automatically. The Lambda function gets invoked whenever a CSV file is uploaded to the `uploads/` prefix. No manual policy writing needed.

## CORS Configuration

If your bucket serves assets to a web application, you'll need CORS:

```typescript
// Configure CORS for browser-based access
const assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  cors: [
    {
      allowedMethods: [s3.HttpMethods.GET],
      allowedOrigins: ['https://myapp.com', 'https://staging.myapp.com'],
      allowedHeaders: ['*'],
      maxAge: 3600,
    },
  ],
});
```

For more details on S3 CORS troubleshooting, see our guide on [fixing S3 CORS errors in browser applications](https://oneuptime.com/blog/post/2026-02-12-fix-s3-cors-errors-in-browser-applications/view).

## Granting Permissions

CDK's grant methods are one of its best features. Instead of writing IAM policies by hand, you tell CDK what access pattern you need:

```typescript
// Grant read access to an IAM role or Lambda function
uploadBucket.grantRead(processorFunction);

// Grant read/write access
uploadBucket.grantReadWrite(someOtherRole);

// Grant only put access for a specific prefix
uploadBucket.grantPut(uploadRole, 'uploads/*');
```

Behind the scenes, CDK generates the minimal IAM policy needed. It's less error-prone than writing policies manually and easier to review in code review.

## Creating a Reusable Construct

When you have a standard bucket configuration that multiple teams should use, wrap it in a custom construct:

```typescript
// lib/constructs/standard-bucket.ts - reusable bucket construct
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface StandardBucketProps {
  bucketName?: string;
  versioned?: boolean;
  expirationDays?: number;
}

export class StandardBucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StandardBucketProps = {}) {
    super(scope, id);

    const lifecycleRules: s3.LifecycleRule[] = [];

    if (props.expirationDays) {
      lifecycleRules.push({
        expiration: cdk.Duration.days(props.expirationDays),
      });
    }

    // Always include cleanup for incomplete multipart uploads
    lifecycleRules.push({
      abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
    });

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: props.bucketName,
      versioned: props.versioned ?? true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules,
    });
  }
}
```

Now creating standardized buckets across your stacks is a one-liner:

```typescript
// Using the custom construct in a stack
import { StandardBucket } from './constructs/standard-bucket';

const logsBucket = new StandardBucket(this, 'Logs', {
  bucketName: 'my-company-logs-2026',
  expirationDays: 90,
});

const dataBucket = new StandardBucket(this, 'Data', {
  bucketName: 'my-company-data-2026',
});
```

## Deploying and Diffing

Deploy your stack with:

```bash
# Preview changes before deploying
cdk diff

# Deploy the stack
cdk deploy
```

Always run `cdk diff` first. It shows you exactly what CloudFormation changes will be made. This is your safety net - review the diff before applying anything to production.

## Wrapping Up

CDK brings real programming power to S3 bucket management. You get type checking, IDE support, and the ability to build abstractions that enforce your organization's standards. The grant methods alone save significant time compared to writing IAM policies by hand. Start with simple buckets, add encryption and lifecycle rules, and build reusable constructs as your patterns stabilize. If you're also managing buckets with Terraform, check out our guide on [managing S3 buckets with Terraform](https://oneuptime.com/blog/post/2026-02-12-manage-s3-buckets-with-terraform/view) for a comparison.
