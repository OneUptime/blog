# How to Use CDK Stacks and Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, TypeScript, DevOps

Description: Master CDK stacks and environments to organize your infrastructure, manage multi-environment deployments, and control resource dependencies across your AWS accounts.

---

Stacks and environments are the organizational backbone of any CDK application. Stacks determine what gets deployed together, and environments determine where things get deployed. Getting these right early saves you from painful refactoring later.

Let's work through the concepts and patterns that actually matter in practice.

## What Is a Stack?

A CDK stack maps directly to a CloudFormation stack. It's a unit of deployment - all resources in a stack are created, updated, or deleted together. When you run `cdk deploy MyStack`, CDK synthesizes that stack into a CloudFormation template and deploys it.

```typescript
// A basic stack definition
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class StorageStack extends cdk.Stack {
  // Expose resources that other stacks might need
  public readonly dataBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.dataBucket = new s3.Bucket(this, 'DataBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });
  }
}
```

## What Is an Environment?

An environment is an account/region pair. It tells CDK exactly where to deploy a stack.

```typescript
// Defining environments explicitly
const devEnv: cdk.Environment = {
  account: '111111111111',
  region: 'us-east-1',
};

const prodEnv: cdk.Environment = {
  account: '222222222222',
  region: 'us-west-2',
};

// Assign environments to stacks
new StorageStack(app, 'DevStorage', { env: devEnv });
new StorageStack(app, 'ProdStorage', { env: prodEnv });
```

If you don't specify an environment, CDK uses environment-agnostic synthesis. This means it won't resolve things like `Fn::GetAZs` at synthesis time. For production use, always specify environments explicitly.

```typescript
// Use the CDK CLI's default account and region
const defaultEnv: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};
```

## Splitting Resources Across Stacks

The question of "how do I split my resources?" comes up in every CDK project. Here's the guiding principle: resources that change together should live in the same stack, and resources with different lifecycles should be in separate stacks.

A typical web application might split like this.

```typescript
// bin/app.ts - Defining multiple stacks for a web application
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { ApplicationStack } from '../lib/application-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Network layer - changes rarely
const network = new NetworkStack(app, 'Network', { env });

// Database layer - changes occasionally
const database = new DatabaseStack(app, 'Database', {
  env,
  vpc: network.vpc,
});

// Application layer - changes frequently
const application = new ApplicationStack(app, 'Application', {
  env,
  vpc: network.vpc,
  database: database.cluster,
});

// Monitoring layer - changes independently
new MonitoringStack(app, 'Monitoring', {
  env,
  service: application.service,
});
```

## Passing Data Between Stacks

When stacks need to share data, you pass it through constructor props. CDK handles the cross-stack references using CloudFormation exports under the hood.

```typescript
// Network stack exports a VPC
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 3,
      natGateways: 1,
    });
  }
}

// Database stack receives the VPC as a prop
interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly cluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    this.cluster = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      writer: rds.ClusterInstance.provisioned('Writer', {
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.R6G,
          ec2.InstanceSize.LARGE,
        ),
      }),
    });
  }
}
```

CDK automatically creates CloudFormation exports and imports. Be aware that this creates a dependency - you can't delete a stack that exports values used by another stack.

## Stack Dependencies

CDK infers dependencies from cross-stack references. When you pass a VPC from NetworkStack to DatabaseStack, CDK knows to deploy NetworkStack first. You can also add explicit dependencies.

```typescript
// Explicit dependency when there's no resource reference
const monitoring = new MonitoringStack(app, 'Monitoring', { env });
monitoring.addDependency(application, 'Monitoring depends on application resources');
```

## Multi-Environment Patterns

Here's a pattern for deploying the same stacks to multiple environments with different configurations.

```typescript
// bin/app.ts - Multi-environment deployment
interface EnvironmentConfig {
  name: string;
  env: cdk.Environment;
  instanceType: string;
  minCapacity: number;
  maxCapacity: number;
  enableDeletionProtection: boolean;
}

const environments: EnvironmentConfig[] = [
  {
    name: 'dev',
    env: { account: '111111111111', region: 'us-east-1' },
    instanceType: 't3.small',
    minCapacity: 1,
    maxCapacity: 2,
    enableDeletionProtection: false,
  },
  {
    name: 'staging',
    env: { account: '222222222222', region: 'us-east-1' },
    instanceType: 't3.medium',
    minCapacity: 2,
    maxCapacity: 4,
    enableDeletionProtection: false,
  },
  {
    name: 'production',
    env: { account: '333333333333', region: 'us-west-2' },
    instanceType: 'r6g.large',
    minCapacity: 3,
    maxCapacity: 20,
    enableDeletionProtection: true,
  },
];

const app = new cdk.App();

for (const config of environments) {
  const network = new NetworkStack(app, `${config.name}-Network`, {
    env: config.env,
  });

  new ApplicationStack(app, `${config.name}-Application`, {
    env: config.env,
    vpc: network.vpc,
    instanceType: config.instanceType,
    minCapacity: config.minCapacity,
    maxCapacity: config.maxCapacity,
    enableDeletionProtection: config.enableDeletionProtection,
  });
}
```

Deploy a specific environment by name.

```bash
# Deploy just the dev stacks
cdk deploy 'dev-*'

# Deploy everything
cdk deploy --all

# Deploy a specific stack
cdk deploy production-Application
```

## Stack Size Limits

CloudFormation has a 500-resource limit per stack. If you're approaching that, it's time to split. But even before hitting the hard limit, large stacks become slow to deploy and risky to update. Aim for stacks with related resources that change together, typically 50-150 resources.

```typescript
// Check stack resource count during synthesis
const app = new cdk.App();
const stack = new MyLargeStack(app, 'Large');

// After synthesis, check cdk.out for the template size
// cdk synth will warn if you're approaching limits
```

## Stack Tags

Apply tags at the stack level to tag all resources within it.

```typescript
// Apply tags to all resources in a stack
const stack = new ApplicationStack(app, 'Application', { env });
cdk.Tags.of(stack).add('Environment', 'production');
cdk.Tags.of(stack).add('Team', 'platform');
cdk.Tags.of(stack).add('CostCenter', 'eng-123');
```

Understanding stacks and environments is foundational for everything else in CDK. For deploying across multiple accounts, check out the guide on [deploying CDK apps to multiple accounts and regions](https://oneuptime.com/blog/post/deploy-cdk-apps-multiple-aws-accounts-regions/view). To learn about using CDK Pipelines for automated deployments across environments, see the post on [CDK Pipelines](https://oneuptime.com/blog/post/cdk-pipelines-automated-deployments/view).
