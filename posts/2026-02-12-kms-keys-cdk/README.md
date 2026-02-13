# How to Create KMS Keys with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, KMS, Security, Encryption

Description: Provision and manage AWS KMS encryption keys using CDK, including key policies, aliases, automatic rotation, and grants for cross-service encryption.

---

AWS KMS keys are the foundation of encryption across AWS services. Whether you're encrypting S3 buckets, EBS volumes, RDS databases, or Secrets Manager secrets, there's a KMS key behind the scenes. The default AWS managed keys work fine for basic use cases, but customer managed keys give you control over key policies, rotation schedules, and cross-account access.

CDK makes KMS key management clean and repeatable. Let's go through creating keys, defining policies, setting up aliases, and integrating them with other services.

## Creating a Basic KMS Key

The simplest KMS key with sensible defaults:

```typescript
// lib/kms-stack.ts - KMS key management with CDK
import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class KmsStack extends cdk.Stack {
  public readonly encryptionKey: kms.Key;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a symmetric encryption key with automatic rotation
    this.encryptionKey = new kms.Key(this, 'EncryptionKey', {
      description: 'Encryption key for production data',
      enableKeyRotation: true,
      rotationPeriod: cdk.Duration.days(365),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pendingWindow: cdk.Duration.days(30),
    });

    // Add an alias for easier reference
    this.encryptionKey.addAlias('alias/production-data-key');
  }
}
```

Let me explain the important properties. `enableKeyRotation` creates a new key material annually while keeping the old material available for decrypting existing data. `removalPolicy: RETAIN` prevents accidental deletion - if you delete the CloudFormation stack, the key stays. This is critical because deleting a KMS key means any data encrypted with it becomes permanently unreadable. The `pendingWindow` sets how long to wait before actually deleting a key that's been scheduled for deletion.

## Key Policies

Key policies determine who can use and manage the key. CDK creates a default policy that gives the account root full access, but you'll want to be more specific:

```typescript
// KMS key with explicit key policy
const restrictedKey = new kms.Key(this, 'RestrictedKey', {
  description: 'Key with restricted access',
  enableKeyRotation: true,
  policy: new iam.PolicyDocument({
    statements: [
      // Allow key administration by a specific role
      new iam.PolicyStatement({
        sid: 'AllowKeyAdministration',
        effect: iam.Effect.ALLOW,
        principals: [
          new iam.ArnPrincipal('arn:aws:iam::123456789012:role/KeyAdminRole'),
        ],
        actions: [
          'kms:Create*',
          'kms:Describe*',
          'kms:Enable*',
          'kms:List*',
          'kms:Put*',
          'kms:Update*',
          'kms:Revoke*',
          'kms:Disable*',
          'kms:Get*',
          'kms:Delete*',
          'kms:TagResource',
          'kms:UntagResource',
          'kms:ScheduleKeyDeletion',
          'kms:CancelKeyDeletion',
        ],
        resources: ['*'],
      }),
      // Allow key usage by application roles
      new iam.PolicyStatement({
        sid: 'AllowKeyUsage',
        effect: iam.Effect.ALLOW,
        principals: [
          new iam.ArnPrincipal('arn:aws:iam::123456789012:role/AppRole'),
        ],
        actions: [
          'kms:Encrypt',
          'kms:Decrypt',
          'kms:ReEncrypt*',
          'kms:GenerateDataKey*',
          'kms:DescribeKey',
        ],
        resources: ['*'],
      }),
      // Root account always needs access (for management)
      new iam.PolicyStatement({
        sid: 'AllowRootAccount',
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountRootPrincipal()],
        actions: ['kms:*'],
        resources: ['*'],
      }),
    ],
  }),
});
```

The separation between administration actions and usage actions is important. Your security team manages the key (rotate, disable, delete), while your application roles can only encrypt and decrypt.

## Using Grant Methods

CDK's grant methods are a cleaner alternative to writing key policies manually:

```typescript
// Use grant methods for cleaner permission management
import * as lambda from 'aws-cdk-lib/aws-lambda';

const encryptionKey = new kms.Key(this, 'AppKey', {
  description: 'Application encryption key',
  enableKeyRotation: true,
});

const processorFn = new lambda.Function(this, 'Processor', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/processor'),
});

// Grant the Lambda function permission to encrypt and decrypt
encryptionKey.grantEncryptDecrypt(processorFn);

// Or grant only specific operations
encryptionKey.grantDecrypt(processorFn);  // Read-only access
encryptionKey.grantEncrypt(processorFn);  // Write-only access
```

Grant methods update both the key policy and the IAM role policy, so you don't need to manage permissions in two places.

## Encrypting AWS Resources

Use your KMS key with various AWS services:

```typescript
// S3 bucket with KMS encryption
import * as s3 from 'aws-cdk-lib/aws-s3';

const encryptedBucket = new s3.Bucket(this, 'EncryptedBucket', {
  bucketName: 'my-encrypted-data',
  encryption: s3.BucketEncryption.KMS,
  encryptionKey: encryptionKey,
  bucketKeyEnabled: true, // Reduces KMS API calls
});

// SQS queue with KMS encryption
import * as sqs from 'aws-cdk-lib/aws-sqs';

const encryptedQueue = new sqs.Queue(this, 'EncryptedQueue', {
  queueName: 'encrypted-messages',
  encryption: sqs.QueueEncryption.KMS,
  encryptionMasterKey: encryptionKey,
  dataKeyReuse: cdk.Duration.hours(1),
});

// SNS topic with KMS encryption
import * as sns from 'aws-cdk-lib/aws-sns';

const encryptedTopic = new sns.Topic(this, 'EncryptedTopic', {
  topicName: 'encrypted-notifications',
  masterKey: encryptionKey,
});

// DynamoDB table with KMS encryption
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

const encryptedTable = new dynamodb.Table(this, 'EncryptedTable', {
  tableName: 'sensitive-data',
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
  encryptionKey: encryptionKey,
});
```

The `bucketKeyEnabled` flag on S3 is worth noting. It uses an S3-managed bucket key derived from your KMS key, reducing the number of KMS API calls (and costs) when you have high object throughput.

## Cross-Account Key Access

Share a KMS key with another AWS account:

```typescript
// Allow another account to use the key
const sharedKey = new kms.Key(this, 'SharedKey', {
  description: 'Key shared across accounts',
  enableKeyRotation: true,
});

// Grant the other account permission to use the key
sharedKey.addToResourcePolicy(new iam.PolicyStatement({
  sid: 'AllowCrossAccountUsage',
  effect: iam.Effect.ALLOW,
  principals: [new iam.AccountPrincipal('987654321098')],
  actions: [
    'kms:Encrypt',
    'kms:Decrypt',
    'kms:ReEncrypt*',
    'kms:GenerateDataKey*',
    'kms:DescribeKey',
  ],
  resources: ['*'],
}));

// Also allow the other account to create grants
// (needed for services like EBS and RDS)
sharedKey.addToResourcePolicy(new iam.PolicyStatement({
  sid: 'AllowCrossAccountGrants',
  effect: iam.Effect.ALLOW,
  principals: [new iam.AccountPrincipal('987654321098')],
  actions: [
    'kms:CreateGrant',
    'kms:ListGrants',
    'kms:RevokeGrant',
  ],
  resources: ['*'],
  conditions: {
    Bool: { 'kms:GrantIsForAWSResource': 'true' },
  },
}));
```

The grant condition `kms:GrantIsForAWSResource` ensures that the cross-account party can only create grants for AWS services, not arbitrary principals. This is a security best practice.

## Asymmetric Keys

For use cases like digital signatures or asymmetric encryption:

```typescript
// Asymmetric key for digital signatures
const signingKey = new kms.Key(this, 'SigningKey', {
  description: 'Key for digital signatures',
  keySpec: kms.KeySpec.RSA_2048,
  keyUsage: kms.KeyUsage.SIGN_VERIFY,
});

// Asymmetric key for encryption
const asymmetricEncKey = new kms.Key(this, 'AsymmetricEncKey', {
  description: 'Asymmetric encryption key',
  keySpec: kms.KeySpec.RSA_2048,
  keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
});
```

Note that asymmetric keys don't support automatic rotation. You'd need to handle key rotation manually through your application.

## Key Aliases

Aliases provide human-readable names and make it easy to swap keys:

```typescript
// Multiple aliases for the same key
const dataKey = new kms.Key(this, 'DataKey', {
  description: 'Data encryption key',
  enableKeyRotation: true,
});

dataKey.addAlias('alias/data-encryption');
dataKey.addAlias('alias/production/data');

// Import a key by alias
const importedKey = kms.Key.fromLookup(this, 'ImportedKey', {
  aliasName: 'alias/production/data',
});
```

## Monitoring Key Usage

Track key usage with CloudWatch:

```typescript
// Alarm on unusual key usage patterns
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

const decryptAlarm = new cloudwatch.Alarm(this, 'HighDecryptRate', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/KMS',
    metricName: 'NumberOfDecryptAPICalls',
    dimensionsMap: { KeyId: encryptionKey.keyId },
    statistic: 'Sum',
    period: cdk.Duration.hours(1),
  }),
  threshold: 10000,
  evaluationPeriods: 1,
  alarmDescription: 'Unusually high KMS decrypt rate - possible data exfiltration',
});
```

For more on encrypting secrets stored in Secrets Manager, check out our post on [creating Secrets Manager secrets with CDK](https://oneuptime.com/blog/post/2026-02-12-secrets-manager-secrets-cdk/view).

## Wrapping Up

KMS keys with CDK give you full control over your encryption infrastructure while keeping it version-controlled and repeatable. The most important things: always enable key rotation, always set removal policy to RETAIN, use grant methods for permissions when possible, and separate admin and usage access. Customer managed keys cost $1/month each, so don't create one per resource - share keys across related resources within the same trust boundary.
