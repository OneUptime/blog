# How to Use AWS CDK with the CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Infrastructure as Code, TypeScript

Description: Learn how to use the AWS CDK CLI to define, deploy, and manage cloud infrastructure using TypeScript with practical examples for common AWS architectures.

---

The AWS Cloud Development Kit (CDK) lets you define infrastructure using real programming languages instead of YAML or JSON templates. If you've ever struggled with CloudFormation's verbose syntax, CDK is a breath of fresh air. You write TypeScript (or Python, Java, Go, C#), and CDK synthesizes it into CloudFormation templates behind the scenes. The CLI is your main tool for bootstrapping, synthesizing, deploying, and managing CDK stacks.

## Getting Started

Install the CDK CLI globally:

```bash
# Install CDK CLI
npm install -g aws-cdk

# Verify the installation
cdk --version
```

### Bootstrap Your Account

Before your first deployment, you need to bootstrap your AWS account. This creates the resources CDK needs (like an S3 bucket for assets and IAM roles):

```bash
# Bootstrap the default account and region
cdk bootstrap aws://ACCOUNT_ID/us-east-1

# Bootstrap with a specific profile
cdk bootstrap --profile my-aws-profile
```

You only need to do this once per account per region.

### Create a New CDK Project

Initialize a new project using the CLI:

```bash
# Create a new directory and initialize a CDK app
mkdir my-cdk-app
cd my-cdk-app

# Initialize with TypeScript (recommended)
cdk init app --language typescript

# The project structure looks like this:
# my-cdk-app/
#   bin/
#     my-cdk-app.ts        # Entry point
#   lib/
#     my-cdk-app-stack.ts  # Your stack definition
#   test/
#   cdk.json               # CDK configuration
#   package.json
#   tsconfig.json
```

## Defining Infrastructure

Here's a practical example that creates a VPC, an ECS Fargate service, and an RDS database.

First, install the required construct libraries:

```bash
npm install @aws-cdk/aws-ec2 @aws-cdk/aws-ecs @aws-cdk/aws-ecs-patterns @aws-cdk/aws-rds
```

Or with CDK v2 (where everything is in one package):

```bash
npm install aws-cdk-lib constructs
```

Define a web application stack:

```typescript
// lib/web-app-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export class WebAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC with public and private subnets
    const vpc = new ec2.Vpc(this, 'AppVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // Create an RDS PostgreSQL instance
    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      databaseName: 'appdb',
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      backupRetention: cdk.Duration.days(7),
    });

    // Create a Fargate service behind an Application Load Balancer
    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'WebService',
      {
        vpc,
        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 2,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry('nginx:latest'),
          containerPort: 80,
          environment: {
            DATABASE_HOST: database.dbInstanceEndpointAddress,
            DATABASE_PORT: database.dbInstanceEndpointPort,
            NODE_ENV: 'production',
          },
        },
        publicLoadBalancer: true,
      }
    );

    // Allow the Fargate service to connect to the database
    database.connections.allowFrom(
      service.service,
      ec2.Port.tcp(5432),
      'Allow Fargate service to access database'
    );

    // Auto-scaling based on CPU
    const scaling = service.service.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 10,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Output the load balancer URL
    new cdk.CfnOutput(this, 'LoadBalancerUrl', {
      value: service.loadBalancer.loadBalancerDnsName,
      description: 'URL of the load balancer',
    });

    // Output the database endpoint
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.dbInstanceEndpointAddress,
      description: 'RDS database endpoint',
    });
  }
}
```

Wire it up in the entry point:

```typescript
// bin/my-cdk-app.ts
import * as cdk from 'aws-cdk-lib';
import { WebAppStack } from '../lib/web-app-stack';

const app = new cdk.App();

new WebAppStack(app, 'WebAppStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});
```

## Essential CLI Commands

Here are the commands you'll use most often:

### Synthesize (Preview)

Generate the CloudFormation template without deploying. This is great for reviewing what CDK will create:

```bash
# Synthesize the CloudFormation template
cdk synth

# Synthesize a specific stack
cdk synth WebAppStack

# Output as JSON instead of YAML
cdk synth --json
```

### Diff (Compare Changes)

See what will change before deploying:

```bash
# Compare your code with what's currently deployed
cdk diff

# Diff a specific stack
cdk diff WebAppStack
```

The output highlights additions in green, deletions in red, and modifications in yellow. Always run diff before deploy.

### Deploy

Push your infrastructure to AWS:

```bash
# Deploy all stacks
cdk deploy --all

# Deploy a specific stack
cdk deploy WebAppStack

# Deploy with auto-approval (no confirmation prompt)
cdk deploy --require-approval never

# Deploy with specific parameters
cdk deploy --parameters WebAppStack:InstanceType=t3.large
```

### Destroy

Remove all resources created by a stack:

```bash
# Destroy a stack
cdk destroy WebAppStack

# Destroy without confirmation
cdk destroy WebAppStack --force
```

### List Stacks

See all stacks defined in your CDK app:

```bash
cdk list
```

## Using Context and Configuration

CDK uses context values for configuration. You can set them in `cdk.json` or pass them via the CLI.

Configure different environments in `cdk.json`:

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/my-cdk-app.ts",
  "context": {
    "environments": {
      "dev": {
        "account": "111111111111",
        "region": "us-east-1",
        "instanceType": "t3.micro"
      },
      "production": {
        "account": "222222222222",
        "region": "us-east-1",
        "instanceType": "t3.large"
      }
    }
  }
}
```

Access context in your code:

```typescript
// Read context values in your stack
const envConfig = this.node.tryGetContext('environments');
const targetEnv = envConfig[props?.stage || 'dev'];
```

Override context from the CLI:

```bash
# Pass context values at deploy time
cdk deploy -c stage=production
```

## Testing CDK Stacks

CDK has built-in testing support. Write assertions to verify your infrastructure:

```typescript
// test/web-app-stack.test.ts
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { WebAppStack } from '../lib/web-app-stack';

test('Creates a VPC', () => {
  const app = new cdk.App();
  const stack = new WebAppStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::EC2::VPC', 1);
});

test('Creates a Fargate service with correct CPU', () => {
  const app = new cdk.App();
  const stack = new WebAppStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ECS::TaskDefinition', {
    Cpu: '512',
    Memory: '1024',
  });
});

test('Database has backups enabled', () => {
  const app = new cdk.App();
  const stack = new WebAppStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::RDS::DBInstance', {
    BackupRetentionPeriod: 7,
  });
});
```

Run the tests:

```bash
npm test
```

## CI/CD Integration

Integrate CDK deployments into your pipeline:

```yaml
# .github/workflows/deploy-infra.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]
    paths:
      - 'infra/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm test

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: CDK Diff
        run: npx cdk diff

      - name: CDK Deploy
        run: npx cdk deploy --all --require-approval never
```

## Summary

CDK brings the full power of programming languages to infrastructure definition. You get type checking, IDE autocomplete, loops, conditionals, and testing - all the things you're used to in application development. The CLI makes it easy to iterate: write code, synth to preview, diff to compare, and deploy to ship. If you're coming from CloudFormation, CDK is a significant productivity upgrade. For more on CloudFormation fundamentals, check out our guide on [using CloudFormation with the CLI](https://oneuptime.com/blog/post/use-aws-cloudformation-with-the-aws-cli/view).
