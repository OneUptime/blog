# How to Set Up ECS with AWS CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, CDK, Infrastructure as Code, TypeScript

Description: Learn how to define and deploy Amazon ECS clusters, services, and supporting infrastructure using the AWS CDK with TypeScript examples.

---

CloudFormation templates work, but writing hundreds of lines of YAML gets old fast. The AWS CDK (Cloud Development Kit) lets you define your infrastructure using programming languages like TypeScript, Python, or Java. You get loops, conditionals, type checking, and IDE autocomplete. For ECS deployments, the CDK also has high-level constructs that handle a lot of the boilerplate for you.

Let's build a complete ECS Fargate deployment with the CDK, starting from scratch.

## Setting Up a CDK Project

If you haven't already, install the CDK CLI and create a new project:

```bash
# Install the CDK CLI globally
npm install -g aws-cdk

# Create a new CDK project with TypeScript
mkdir ecs-app && cd ecs-app
cdk init app --language typescript

# Install the ECS-related CDK packages
npm install aws-cdk-lib constructs
```

The CDK generates a project structure with a `lib/` directory for your stack definitions and a `bin/` directory for the app entry point.

## The ECS Patterns Library

The CDK includes a module called `aws-ecs-patterns` that provides high-level constructs for common ECS architectures. The most popular one is `ApplicationLoadBalancedFargateService`, which creates an ECS service behind an ALB with a single function call.

Here's the simplest possible ECS deployment:

```typescript
// lib/ecs-app-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import { Construct } from 'constructs';

export class EcsAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // This single construct creates: VPC, ECS Cluster, ALB,
    // Target Group, Task Definition, Service, and Security Groups
    new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'WebApp', {
      memoryLimitMiB: 1024,
      cpu: 512,
      desiredCount: 2,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('my-registry/webapp:latest'),
        containerPort: 8080,
        environment: {
          NODE_ENV: 'production',
        },
      },
      publicLoadBalancer: true,
    });
  }
}
```

That's it. Deploy with `cdk deploy` and you've got a production-ready ECS service with a load balancer, health checks, and proper networking. The CDK creates roughly 30 CloudFormation resources from those few lines.

## A More Realistic Setup

The simple version is great for demos, but real applications need more control. Let's build something production-worthy with explicit VPC configuration, ECR images, secrets, logging, and autoscaling.

```typescript
// lib/ecs-production-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import { Construct } from 'constructs';

interface EcsProductionStackProps extends cdk.StackProps {
  environment: string;
  imageTag: string;
}

export class EcsProductionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsProductionStackProps) {
    super(scope, id, props);

    // Use an existing VPC or create one
    const vpc = new ec2.Vpc(this, 'AppVpc', {
      maxAzs: 3,
      natGateways: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Create the ECS cluster with Container Insights
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: `${props.environment}-cluster`,
      containerInsights: true,
    });

    // Reference the ECR repository
    const repository = ecr.Repository.fromRepositoryName(
      this, 'AppRepo', 'webapp'
    );

    // Get database credentials from Secrets Manager
    const dbSecret = secretsmanager.Secret.fromSecretNameV2(
      this, 'DbSecret', `${props.environment}/database-url`
    );

    // Create a log group with retention
    const logGroup = new logs.LogGroup(this, 'AppLogGroup', {
      logGroupName: `/ecs/${props.environment}/app`,
      retention: logs.RetentionDays.THIRTY_DAYS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Build the Fargate service with an ALB
    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this, 'AppService', {
        cluster,
        serviceName: `${props.environment}-app`,
        cpu: 1024,
        memoryLimitMiB: 2048,
        desiredCount: 3,
        taskImageOptions: {
          image: ecs.ContainerImage.fromEcrRepository(repository, props.imageTag),
          containerPort: 8080,
          environment: {
            NODE_ENV: props.environment,
            PORT: '8080',
          },
          secrets: {
            DATABASE_URL: ecs.Secret.fromSecretsManager(dbSecret),
          },
          logDriver: ecs.LogDrivers.awsLogs({
            logGroup,
            streamPrefix: 'app',
          }),
        },
        publicLoadBalancer: true,
        healthCheckGracePeriod: cdk.Duration.seconds(60),
        circuitBreaker: { rollback: true },
        assignPublicIp: false,
      }
    );

    // Configure the health check
    fargateService.targetGroup.configureHealthCheck({
      path: '/health',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    // Set up autoscaling
    const scaling = fargateService.service.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 20,
    });

    // Scale based on CPU utilization
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Scale based on memory utilization
    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Output the service URL
    new cdk.CfnOutput(this, 'ServiceURL', {
      value: `http://${fargateService.loadBalancer.loadBalancerDnsName}`,
    });
  }
}
```

And the app entry point:

```typescript
// bin/ecs-app.ts
import * as cdk from 'aws-cdk-lib';
import { EcsProductionStack } from '../lib/ecs-production-stack';

const app = new cdk.App();

// Deploy to different environments with different parameters
new EcsProductionStack(app, 'EcsProduction', {
  environment: 'production',
  imageTag: process.env.IMAGE_TAG || 'latest',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
});

new EcsProductionStack(app, 'EcsStaging', {
  environment: 'staging',
  imageTag: process.env.IMAGE_TAG || 'latest',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
});
```

## Adding Multiple Services

For microservice architectures, you can define each service separately within the same stack or in separate stacks:

```typescript
// A reusable construct for ECS services
class MicroService extends Construct {
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: {
    cluster: ecs.Cluster;
    serviceName: string;
    image: ecs.ContainerImage;
    port: number;
    cpu?: number;
    memory?: number;
    environment?: Record<string, string>;
    secrets?: Record<string, ecs.Secret>;
  }) {
    super(scope, id);

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: props.cpu || 256,
      memoryLimitMiB: props.memory || 512,
    });

    taskDefinition.addContainer('main', {
      image: props.image,
      portMappings: [{ containerPort: props.port }],
      environment: props.environment,
      secrets: props.secrets,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: props.serviceName,
      }),
      healthCheck: {
        command: ['CMD-SHELL', `curl -f http://localhost:${props.port}/health || exit 1`],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    this.service = new ecs.FargateService(this, 'Service', {
      cluster: props.cluster,
      taskDefinition,
      serviceName: props.serviceName,
      desiredCount: 2,
      circuitBreaker: { rollback: true },
    });

    // Enable Cloud Map service discovery
    this.service.enableCloudMap({
      name: props.serviceName,
    });
  }
}
```

Use the construct for each microservice:

```typescript
// Create services
const apiService = new MicroService(this, 'ApiService', {
  cluster,
  serviceName: 'api',
  image: ecs.ContainerImage.fromEcrRepository(apiRepo, imageTag),
  port: 8080,
  cpu: 512,
  memory: 1024,
});

const workerService = new MicroService(this, 'WorkerService', {
  cluster,
  serviceName: 'worker',
  image: ecs.ContainerImage.fromEcrRepository(workerRepo, imageTag),
  port: 8081,
  cpu: 256,
  memory: 512,
});
```

## Deploying and Managing

```bash
# Synthesize the CloudFormation template to review it
cdk synth

# Show what will change
cdk diff

# Deploy the stack
cdk deploy EcsProduction --parameters imageTag=v1.2.3

# Deploy all stacks at once
cdk deploy --all
```

The `cdk diff` command is invaluable. It shows you exactly what CloudFormation resources will be created, updated, or destroyed before you commit to the deployment.

## CI/CD Integration

Here's how a typical CI/CD pipeline uses CDK:

```bash
# In your CI/CD pipeline
# 1. Build and push the Docker image
docker build -t $ECR_REPO:$GIT_SHA .
docker push $ECR_REPO:$GIT_SHA

# 2. Deploy with CDK using the new image tag
export IMAGE_TAG=$GIT_SHA
cdk deploy EcsProduction --require-approval never
```

The `--require-approval never` flag skips the manual confirmation prompt, which is what you want in automated pipelines.

## CDK vs CloudFormation

When should you use CDK over raw CloudFormation? CDK shines when:

- You have repeating patterns (multiple similar services)
- You want type safety and IDE support
- Your team is more comfortable with TypeScript/Python than YAML
- You need complex logic (conditionals, loops) in your infrastructure

CloudFormation might still be better when:
- Your team already has extensive CloudFormation templates
- You want maximum transparency into the generated resources
- You're in a heavily regulated environment that requires template auditing

## Wrapping Up

The AWS CDK makes ECS infrastructure management feel like writing application code. The high-level patterns handle the boilerplate, while the lower-level constructs give you full control when you need it. Combined with TypeScript's type system, you catch configuration errors at compile time rather than during deployment.

Start with the `ApplicationLoadBalancedFargateService` pattern to get running quickly, then extract reusable constructs as your architecture grows. For monitoring the infrastructure you've deployed, check out our guide on [monitoring ECS with Container Insights](https://oneuptime.com/blog/post/2026-02-12-monitor-ecs-container-insights/view).
