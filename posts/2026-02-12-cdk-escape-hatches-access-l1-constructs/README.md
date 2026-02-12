# How to Use CDK Escape Hatches to Access L1 Constructs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, TypeScript, CloudFormation

Description: Learn how to use CDK escape hatches to access and modify underlying L1 CloudFormation resources when L2 constructs don't expose the properties you need.

---

CDK's L2 constructs are convenient, but they don't expose every CloudFormation property. Sometimes you need to set a property that the L2 API simply doesn't have a parameter for. That's where escape hatches come in - they let you reach through the L2 abstraction and modify the underlying L1 (CloudFormation) resource directly.

Escape hatches are not a code smell. They're a deliberate design feature of CDK. The CDK team can't wrap every property of every AWS resource in a nice API, and new CloudFormation properties often land before CDK adds L2 support. Escape hatches bridge that gap.

## The Basic Pattern

Every L2 construct has an underlying L1 construct (the `CfnXxx` class). You access it through the `node.defaultChild` property.

```typescript
// Access the L1 CfnBucket from an L2 Bucket
import * as s3 from 'aws-cdk-lib/aws-s3';

const bucket = new s3.Bucket(this, 'MyBucket', {
  versioned: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
});

// Get the underlying CloudFormation resource
const cfnBucket = bucket.node.defaultChild as s3.CfnBucket;

// Now you can set any CloudFormation property directly
cfnBucket.analyticsConfigurations = [
  {
    id: 'FullBucketAnalytics',
    storageClassAnalysis: {
      dataExport: {
        destination: {
          bucketArn: 'arn:aws:s3:::analytics-destination',
          format: 'CSV',
          prefix: 'analytics/',
        },
        outputSchemaVersion: 'V_1',
      },
    },
  },
];
```

The `as s3.CfnBucket` cast tells TypeScript what type to expect. This gives you full autocomplete for all CloudFormation properties.

## Adding Properties Not Exposed by L2

Here's a real scenario. You want to add intelligent tiering to an S3 bucket, but the L2 `Bucket` construct doesn't have a direct property for it.

```typescript
// Add intelligent tiering configuration via escape hatch
const bucket = new s3.Bucket(this, 'DataBucket', {
  versioned: true,
});

const cfnBucket = bucket.node.defaultChild as s3.CfnBucket;

// Set intelligent tiering - not directly available in L2
cfnBucket.intelligentTieringConfigurations = [
  {
    id: 'MoveToArchive',
    status: 'Enabled',
    tierings: [
      {
        accessTier: 'ARCHIVE_ACCESS',
        days: 90,
      },
      {
        accessTier: 'DEEP_ARCHIVE_ACCESS',
        days: 180,
      },
    ],
  },
];
```

## Overriding Generated Properties

Sometimes the L2 construct sets a property, but you want a different value. You can override it.

```typescript
// Override a property that the L2 construct sets
import * as lambda from 'aws-cdk-lib/aws-lambda';

const myFunction = new lambda.Function(this, 'MyFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda'),
});

const cfnFunction = myFunction.node.defaultChild as lambda.CfnFunction;

// Override the runtime with a specific value (maybe a custom runtime)
cfnFunction.runtime = 'nodejs20.x';

// Add a property that the L2 doesn't support
cfnFunction.addPropertyOverride('SnapStart', {
  ApplyOn: 'PublishedVersions',
});
```

## Using addPropertyOverride

The `addPropertyOverride` method is a more surgical approach. It uses dot-notation paths to modify specific properties.

```typescript
// Use addPropertyOverride for precise modifications
const table = new dynamodb.Table(this, 'Table', {
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
});

const cfnTable = table.node.defaultChild as dynamodb.CfnTable;

// Override a nested property
cfnTable.addPropertyOverride('SSESpecification.SSEEnabled', true);
cfnTable.addPropertyOverride('SSESpecification.SSEType', 'KMS');
cfnTable.addPropertyOverride('SSESpecification.KMSMasterKeyId', keyArn);

// Override array elements by index
cfnTable.addPropertyOverride(
  'GlobalSecondaryIndexes.0.ProvisionedThroughput',
  { ReadCapacityUnits: 100, WriteCapacityUnits: 100 },
);
```

You can also delete properties that the L2 construct sets.

```typescript
// Remove a property using addPropertyDeletionOverride
cfnTable.addPropertyDeletionOverride('SSESpecification');
```

## Modifying CloudFormation Metadata

Escape hatches also let you modify CloudFormation-level attributes like metadata, conditions, and dependencies.

```typescript
// Add CloudFormation metadata
const cfnResource = myResource.node.defaultChild as cdk.CfnResource;

// Add custom metadata
cfnResource.cfnOptions.metadata = {
  'AWS::CloudFormation::Interface': {
    ParameterGroups: [/* ... */],
  },
};

// Add a condition
cfnResource.cfnOptions.condition = myCondition;

// Override the deletion policy
cfnResource.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.RETAIN;
cfnResource.cfnOptions.updateReplacePolicy = cdk.CfnDeletionPolicy.RETAIN;

// Add explicit dependencies
cfnResource.addDependency(otherCfnResource);
```

## Accessing Child Constructs

Some L2 constructs create multiple L1 resources. You might need to access a child that isn't the default child.

```typescript
// Access non-default child constructs
const vpc = new ec2.Vpc(this, 'Vpc', {
  maxAzs: 2,
});

// The VPC construct creates many child resources
// Access specific children by navigating the construct tree
const children = vpc.node.children;

// Find a specific subnet
for (const child of vpc.node.findAll()) {
  if (child instanceof ec2.CfnSubnet) {
    const cfnSubnet = child as ec2.CfnSubnet;
    // Modify subnet properties
    cfnSubnet.addPropertyOverride('MapPublicIpOnLaunch', false);
  }
}
```

For a more targeted approach, you can find resources by their construct path.

```typescript
// Find a specific resource by path
const igw = vpc.node.findChild('IGW') as ec2.CfnInternetGateway;
const vpcGw = vpc.node.findChild('VPCGW') as ec2.CfnVPCGatewayAttachment;
```

## Adding Raw CloudFormation Resources

Sometimes you need a resource that CDK doesn't have any construct for. You can add raw CloudFormation resources.

```typescript
// Add a raw CloudFormation resource
const customResource = new cdk.CfnResource(this, 'MyCustomResource', {
  type: 'AWS::SomeService::SomeResource',
  properties: {
    PropertyA: 'value-a',
    PropertyB: 123,
    PropertyC: bucket.bucketArn,
  },
});
```

## Adding Overrides to Nested Stack Resources

When using nested stacks or L3 patterns, you sometimes need to reach multiple levels deep.

```typescript
// Modify resources inside an L3 pattern
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';

const service = new ecsPatterns.ApplicationLoadBalancedFargateService(
  this, 'Service', { /* config */ },
);

// Access the ALB's underlying resource
const cfnLoadBalancer = service.loadBalancer.node.defaultChild as cdk.CfnResource;
cfnLoadBalancer.addPropertyOverride('LoadBalancerAttributes', [
  { Key: 'idle_timeout.timeout_seconds', Value: '120' },
  { Key: 'routing.http.drop_invalid_header_fields.enabled', Value: 'true' },
]);

// Access the Fargate service's underlying resource
const cfnService = service.service.node.defaultChild as ecs.CfnService;
cfnService.addPropertyOverride('DeploymentConfiguration', {
  MaximumPercent: 200,
  MinimumHealthyPercent: 100,
});
```

## When to Use Escape Hatches vs. L1 Constructs

If you find yourself using escape hatches on more than a few properties, consider using the L1 construct directly instead. The tipping point is roughly when you're overriding more properties than the L2 construct is setting for you.

```typescript
// If you need extensive customization, L1 might be cleaner
// This avoids the L2 construct's defaults entirely
const cfnBucket = new s3.CfnBucket(this, 'Bucket', {
  bucketName: 'my-fully-custom-bucket',
  versioningConfiguration: { status: 'Enabled' },
  // ... full control over every property
});
```

But for most cases, L2 plus a few escape hatches gives you the best of both worlds - smart defaults and convenience methods from L2, with precision control where you need it. For understanding the different construct levels, see the post on [CDK constructs L1, L2, and L3](https://oneuptime.com/blog/post/understand-cdk-constructs-l1-l2-l3/view).
