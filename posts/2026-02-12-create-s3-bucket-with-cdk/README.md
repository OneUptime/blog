# How to Create an S3 Bucket with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, S3, TypeScript

Description: A comprehensive guide to creating S3 buckets with CDK covering encryption, lifecycle rules, CORS, event notifications, access logging, and common bucket patterns.

---

S3 buckets are one of the most common resources in any AWS deployment. Whether you're storing application data, hosting static websites, managing logs, or serving as a data lake, you'll create a lot of buckets. CDK's L2 Bucket construct makes this easy while setting secure defaults out of the box.

Let's cover everything from the basics to advanced bucket configurations.

## The Basic Bucket

Creating an S3 bucket with CDK is one line of code. CDK sets secure defaults - public access is blocked, encryption is enabled with S3-managed keys.

```typescript
// The simplest bucket creation - CDK sets secure defaults
import * as s3 from 'aws-cdk-lib/aws-s3';

const bucket = new s3.Bucket(this, 'MyBucket');
```

That's it. Public access is blocked, server-side encryption is enabled, and the bucket name is auto-generated with a unique suffix. But you'll usually want more configuration.

## Production Data Bucket

Here's a bucket configured for production data storage.

```typescript
// Production data bucket with encryption, versioning, and lifecycle rules
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';

// Create a KMS key for encryption
const encryptionKey = new kms.Key(this, 'BucketKey', {
  alias: 'data-bucket-key',
  enableKeyRotation: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

const dataBucket = new s3.Bucket(this, 'DataBucket', {
  // Bucket naming
  bucketName: `mycompany-data-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,

  // Encryption with KMS
  encryption: s3.BucketEncryption.KMS,
  encryptionKey: encryptionKey,
  bucketKeyEnabled: true,  // Reduces KMS costs

  // Versioning for data protection
  versioned: true,

  // Block all public access
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

  // Enforce SSL for all requests
  enforceSSL: true,

  // Don't delete bucket when stack is destroyed
  removalPolicy: cdk.RemovalPolicy.RETAIN,

  // Object ownership
  objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,

  // Lifecycle rules
  lifecycleRules: [
    {
      id: 'TransitionToIA',
      transitions: [
        {
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: cdk.Duration.days(30),
        },
        {
          storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
          transitionAfter: cdk.Duration.days(90),
        },
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(365),
        },
      ],
    },
    {
      id: 'CleanupOldVersions',
      noncurrentVersionExpiration: cdk.Duration.days(90),
      noncurrentVersionsToRetain: 3,
    },
    {
      id: 'AbortIncompleteUploads',
      abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
    },
  ],
});
```

## Access Logging Bucket

S3 access logs should go to a dedicated logging bucket.

```typescript
// Create a logging bucket and configure access logging
const logsBucket = new s3.Bucket(this, 'LogsBucket', {
  bucketName: `mycompany-logs-${cdk.Aws.ACCOUNT_ID}`,
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  enforceSSL: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  lifecycleRules: [
    {
      expiration: cdk.Duration.days(90),
    },
  ],
  // Logging buckets should not log to themselves
  objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
});

// Configure the data bucket to log to the logging bucket
const dataBucket = new s3.Bucket(this, 'DataBucket', {
  serverAccessLogsBucket: logsBucket,
  serverAccessLogsPrefix: 'data-bucket-logs/',
  // ... other configuration
});
```

## Static Website Hosting

For hosting static websites or single-page applications.

```typescript
// S3 bucket configured for static website hosting with CloudFront
const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
  // Static website hosting doesn't use the S3 REST API
  websiteIndexDocument: 'index.html',
  websiteErrorDocument: 'error.html',

  // Block direct public access - serve through CloudFront instead
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

  // Allow cleanup for non-production
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,

  // CORS for API calls from the frontend
  cors: [
    {
      allowedMethods: [
        s3.HttpMethods.GET,
        s3.HttpMethods.HEAD,
      ],
      allowedOrigins: ['https://myapp.example.com'],
      allowedHeaders: ['*'],
      maxAge: 3600,
    },
  ],
});
```

## S3 Event Notifications

Trigger Lambda functions, SQS queues, or SNS topics when objects are created, deleted, or modified.

```typescript
// Set up S3 event notifications to Lambda and SQS
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';

const uploadBucket = new s3.Bucket(this, 'UploadBucket', {
  versioned: true,
});

// Trigger Lambda when images are uploaded
uploadBucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(imageProcessorFunction),
  {
    prefix: 'images/',
    suffix: '.jpg',
  },
);

// Also trigger for PNG files
uploadBucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(imageProcessorFunction),
  {
    prefix: 'images/',
    suffix: '.png',
  },
);

// Send delete events to SQS for audit logging
uploadBucket.addEventNotification(
  s3.EventType.OBJECT_REMOVED,
  new s3n.SqsDestination(auditQueue),
);

// Send all events to SNS for fanout
uploadBucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.SnsDestination(notificationTopic),
);
```

## Granting Access

CDK's grant methods are the easiest way to manage bucket permissions.

```typescript
// Grant different levels of access to different principals
const bucket = new s3.Bucket(this, 'Bucket');

// Read-only access for a Lambda function
bucket.grantRead(readOnlyFunction);

// Write-only access for an uploader function
bucket.grantWrite(uploaderFunction);

// Full read/write access for an admin function
bucket.grantReadWrite(adminFunction);

// Specific object path access
bucket.grantRead(reportFunction, 'reports/*');

// Grant put (upload) access
bucket.grantPut(uploadFunction);

// Grant delete access
bucket.grantDelete(cleanupFunction);
```

## Bucket Policies

For more complex access control, add bucket policies directly.

```typescript
// Add a bucket policy for cross-account access
import * as iam from 'aws-cdk-lib/aws-iam';

const sharedBucket = new s3.Bucket(this, 'SharedBucket');

// Allow another account to read from this bucket
sharedBucket.addToResourcePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  principals: [
    new iam.AccountPrincipal('222222222222'),
  ],
  actions: [
    's3:GetObject',
    's3:ListBucket',
  ],
  resources: [
    sharedBucket.bucketArn,
    `${sharedBucket.bucketArn}/*`,
  ],
}));

// Deny unencrypted uploads
sharedBucket.addToResourcePolicy(new iam.PolicyStatement({
  effect: iam.Effect.DENY,
  principals: [new iam.AnyPrincipal()],
  actions: ['s3:PutObject'],
  resources: [`${sharedBucket.bucketArn}/*`],
  conditions: {
    StringNotEquals: {
      's3:x-amz-server-side-encryption': 'aws:kms',
    },
  },
}));
```

## Importing Existing Buckets

Reference buckets created outside of CDK.

```typescript
// Import an existing bucket by name
const existingBucket = s3.Bucket.fromBucketName(
  this, 'ExistingBucket', 'my-existing-bucket-name',
);

// Import by ARN (includes the bucket name and allows cross-account references)
const crossAccountBucket = s3.Bucket.fromBucketArn(
  this, 'CrossAccountBucket',
  'arn:aws:s3:::other-account-bucket',
);

// Import with full attributes
const importedBucket = s3.Bucket.fromBucketAttributes(this, 'ImportedBucket', {
  bucketArn: 'arn:aws:s3:::my-bucket',
  region: 'us-west-2',
});

// Use imported buckets like any other bucket
existingBucket.grantRead(myFunction);
```

## Dev vs Production Bucket

Use stack props to configure buckets differently per environment.

```typescript
// Environment-aware bucket configuration
const isProduction = props.environment === 'production';

const bucket = new s3.Bucket(this, 'AppBucket', {
  versioned: isProduction,
  removalPolicy: isProduction
    ? cdk.RemovalPolicy.RETAIN
    : cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: !isProduction,
  encryption: isProduction
    ? s3.BucketEncryption.KMS
    : s3.BucketEncryption.S3_MANAGED,
  enforceSSL: true,  // Always enforce SSL regardless of environment
});
```

S3 buckets are straightforward with CDK, but the secure defaults and grant methods save you from a lot of common mistakes. For using S3 with Lambda event processing, see the post on [creating a Lambda function with CDK](https://oneuptime.com/blog/post/create-lambda-function-with-cdk/view). For understanding how CDK L2 constructs set these defaults, check out [CDK L2 constructs for common AWS resources](https://oneuptime.com/blog/post/cdk-l2-constructs-common-aws-resources/view).
