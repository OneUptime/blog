# How to Create Your First CDK App with TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, TypeScript, Infrastructure as Code

Description: Step-by-step tutorial for building your first AWS CDK application using TypeScript, covering project setup, resource creation, and deployment to AWS.

---

TypeScript is the most popular language for AWS CDK, and for good reason. The type system catches mistakes at compile time, the IDE support is excellent, and most CDK examples you'll find online are written in TypeScript. If you're new to CDK, starting with TypeScript is the path of least resistance.

This guide walks you through creating a real CDK app from scratch - not just a hello world, but something you'd actually deploy: an S3 bucket with a Lambda function that processes uploads.

## Setting Up the Project

First, make sure you have the prerequisites installed.

```bash
# Verify Node.js (14.x or later required)
node --version

# Install the CDK CLI if you haven't already
npm install -g aws-cdk

# Verify CDK is installed
cdk --version
```

Now create a new project.

```bash
# Create and enter a project directory
mkdir s3-processor && cd s3-processor

# Initialize a CDK TypeScript app
cdk init app --language typescript
```

CDK generates a clean project structure for you.

```
s3-processor/
  bin/
    s3-processor.ts          # App entry point - defines which stacks to deploy
  lib/
    s3-processor-stack.ts    # Stack definition - where your resources live
  test/
    s3-processor.test.ts     # Test file
  cdk.json                    # CDK configuration and context
  package.json                # Dependencies
  tsconfig.json               # TypeScript compiler options
```

## Understanding the Entry Point

Let's look at what CDK generated in the entry point file.

```typescript
// bin/s3-processor.ts
// This is where the CDK app is instantiated and stacks are added
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { S3ProcessorStack } from '../lib/s3-processor-stack';

const app = new cdk.App();

new S3ProcessorStack(app, 'S3ProcessorStack', {
  // You can specify the account and region here
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
```

The app object is the root. You add stacks to it, and each stack becomes a CloudFormation stack when deployed.

## Building the Stack

Now let's build something useful. We'll create an S3 bucket, a Lambda function that processes uploaded files, and wire them together with an event notification.

```typescript
// lib/s3-processor-stack.ts
// Stack that creates an S3 bucket with a Lambda processor
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class S3ProcessorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the S3 bucket for file uploads
    const uploadBucket = new s3.Bucket(this, 'UploadBucket', {
      // Allow auto-deletion for dev environments
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,

      // Enable versioning to keep file history
      versioned: true,

      // Block all public access
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      // Set lifecycle rules to manage storage costs
      lifecycleRules: [
        {
          // Move to Infrequent Access after 30 days
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
          // Delete objects after 365 days
          expiration: cdk.Duration.days(365),
        },
      ],
    });

    // Create the Lambda function that processes uploads
    const processorFunction = new lambda.Function(this, 'ProcessorFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          for (const record of event.Records) {
            const bucket = record.s3.bucket.name;
            const key = decodeURIComponent(record.s3.object.key.replace(/\\+/g, ' '));
            const size = record.s3.object.size;

            console.log('New file uploaded:');
            console.log('  Bucket:', bucket);
            console.log('  Key:', key);
            console.log('  Size:', size, 'bytes');

            // Add your processing logic here
            // For example: thumbnail generation, virus scanning, metadata extraction
          }

          return { statusCode: 200, body: 'Processed successfully' };
        };
      `),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      // Set log retention to avoid indefinite log storage
      logRetention: logs.RetentionDays.TWO_WEEKS,
      environment: {
        BUCKET_NAME: uploadBucket.bucketName,
      },
    });

    // Grant the Lambda function read access to the bucket
    uploadBucket.grantRead(processorFunction);

    // Trigger the Lambda when new objects are created
    uploadBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(processorFunction),
      // Only trigger for files in the 'uploads/' prefix
      { prefix: 'uploads/' },
    );

    // Output the bucket name and Lambda ARN
    new cdk.CfnOutput(this, 'BucketName', {
      value: uploadBucket.bucketName,
      description: 'Upload bucket name',
    });

    new cdk.CfnOutput(this, 'FunctionArn', {
      value: processorFunction.functionArn,
      description: 'Processor function ARN',
    });
  }
}
```

Notice how CDK handles the permissions automatically. The `grantRead` method creates the right IAM policy and attaches it to the Lambda's execution role. No hand-written IAM policies needed.

## Adding Type-Safe Configuration

One of TypeScript's strengths is its type system. Let's add typed props to make the stack configurable.

```typescript
// lib/s3-processor-stack.ts
// Define a typed interface for stack configuration
interface S3ProcessorStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'production';
  retentionDays: number;
  enableVersioning: boolean;
}

export class S3ProcessorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: S3ProcessorStackProps) {
    super(scope, id, props);

    const uploadBucket = new s3.Bucket(this, 'UploadBucket', {
      versioned: props.enableVersioning,
      removalPolicy: props.environment === 'production'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.environment !== 'production',
    });

    // ... rest of the stack
  }
}
```

Then update the entry point to use these props.

```typescript
// bin/s3-processor.ts
// Pass environment-specific configuration to the stack
const app = new cdk.App();

const environment = app.node.tryGetContext('environment') || 'dev';

new S3ProcessorStack(app, `S3Processor-${environment}`, {
  environment: environment,
  retentionDays: environment === 'production' ? 365 : 30,
  enableVersioning: environment === 'production',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
```

Deploy with different environments using context values.

```bash
# Deploy the dev environment
cdk deploy -c environment=dev

# Deploy production
cdk deploy -c environment=production
```

## Synthesizing and Reviewing

Before deploying, always check what CDK will generate.

```bash
# Compile TypeScript (CDK does this automatically, but explicit is fine)
npm run build

# Synthesize the CloudFormation template
cdk synth

# Review the diff against what's currently deployed
cdk diff
```

The `cdk synth` command outputs the full CloudFormation template. It's worth reading it the first few times to understand what CDK creates on your behalf - especially the IAM roles and policies.

## Deploying

Time to deploy.

```bash
# Deploy the stack (will prompt for confirmation if IAM changes are detected)
cdk deploy

# Deploy without the approval prompt
cdk deploy --require-approval never
```

CDK shows a progress bar with each resource being created. When it's done, you'll see the CfnOutput values printed in the terminal.

## Testing the Setup

After deployment, test by uploading a file to the S3 bucket.

```bash
# Upload a test file to the uploads prefix
aws s3 cp test-file.txt s3://YOUR_BUCKET_NAME/uploads/test-file.txt

# Check the Lambda logs to verify processing
aws logs tail /aws/lambda/S3ProcessorStack-ProcessorFunction-XXXXX --follow
```

## Cleaning Up

When you're done experimenting, tear down the stack.

```bash
# Destroy the stack and all its resources
cdk destroy
```

Since we set `removalPolicy: DESTROY` and `autoDeleteObjects: true`, the bucket and its contents will be cleaned up automatically.

## Project Maintenance Tips

Keep your CDK library up to date. AWS releases new features and fixes regularly.

```bash
# Check for outdated CDK packages
npm outdated

# Update to the latest CDK version
npm install aws-cdk-lib@latest
```

All `aws-cdk-lib` submodules are versioned together, so you only need to update one package. This was a huge improvement over CDK v1, where each module had its own version and keeping them in sync was painful.

For more on CDK's construct abstraction levels, see the post about [understanding CDK constructs](https://oneuptime.com/blog/post/2026-02-12-understand-cdk-constructs-l1-l2-l3/view). If you prefer Python, check out [creating your first CDK app with Python](https://oneuptime.com/blog/post/2026-02-12-create-first-cdk-app-with-python/view) instead. And when you're ready to test your stacks properly, the guide on [writing unit tests for CDK stacks](https://oneuptime.com/blog/post/2026-02-12-write-unit-tests-for-cdk-stacks/view) covers everything you need.
