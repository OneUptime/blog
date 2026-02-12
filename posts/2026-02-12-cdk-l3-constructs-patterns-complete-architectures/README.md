# How to Use CDK L3 Constructs (Patterns) for Complete Architectures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, TypeScript, Architecture

Description: Learn how to use CDK L3 construct patterns to deploy complete architectures like load-balanced Fargate services, scheduled Lambda tasks, and queue processing workers.

---

CDK L3 constructs, also called Patterns, are pre-built architectural blueprints. They combine multiple L2 constructs into complete, production-ready architectures. Instead of assembling a VPC, load balancer, ECS cluster, task definition, and service individually, you use a single L3 construct that wires everything together.

If L2 constructs are Lego bricks, L3 constructs are pre-assembled Lego sets. You get a working architecture fast, and you can still customize the individual pieces.

## The ECS Patterns Library

The most popular L3 constructs live in `aws-cdk-lib/aws-ecs-patterns`. This module provides patterns for common ECS and Fargate deployment topologies.

### Application Load Balanced Fargate Service

This is probably the most-used L3 construct. It creates everything you need to run a containerized web application behind an ALB.

```typescript
// Deploy a containerized web app with ALB, Fargate, and auto-scaling
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';

// You can provide a VPC or let the pattern create one
const vpc = new ec2.Vpc(this, 'Vpc', {
  maxAzs: 2,
  natGateways: 1,
});

const webService = new ecsPatterns.ApplicationLoadBalancedFargateService(
  this, 'WebService',
  {
    vpc,
    taskImageOptions: {
      // Build and deploy from a local Dockerfile
      image: ecs.ContainerImage.fromAsset('./docker/web'),
      containerPort: 8080,
      environment: {
        NODE_ENV: 'production',
        DATABASE_URL: dbUrl,
        REDIS_URL: redisUrl,
      },
      // Secrets from Secrets Manager or SSM
      secrets: {
        API_KEY: ecs.Secret.fromSecretsManager(apiKeySecret),
      },
    },
    desiredCount: 3,
    cpu: 512,
    memoryLimitMiB: 1024,
    publicLoadBalancer: true,

    // Health check configuration
    healthCheck: {
      command: ['CMD-SHELL', 'curl -f http://localhost:8080/health || exit 1'],
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      retries: 3,
    },

    // Circuit breaker for deployment safety
    circuitBreaker: { rollback: true },
  },
);

// Customize the auto-scaling behavior
const scaling = webService.service.autoScaleTaskCount({
  minCapacity: 2,
  maxCapacity: 10,
});

scaling.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 70,
  scaleInCooldown: cdk.Duration.seconds(60),
  scaleOutCooldown: cdk.Duration.seconds(60),
});

scaling.scaleOnMemoryUtilization('MemoryScaling', {
  targetUtilizationPercent: 80,
});

// Customize the health check on the target group
webService.targetGroup.configureHealthCheck({
  path: '/health',
  interval: cdk.Duration.seconds(30),
  healthyThresholdCount: 2,
  unhealthyThresholdCount: 3,
});
```

That single `ApplicationLoadBalancedFargateService` construct creates an ECS cluster, a Fargate service, a task definition, an ALB, an ALB listener, a target group, security groups, IAM roles, CloudWatch log groups, and all the wiring between them. Building this from scratch with L2 constructs would take 100+ lines.

### Network Load Balanced Fargate Service

For services that need TCP/UDP load balancing or ultra-low latency, there's a Network Load Balancer variant.

```typescript
// Deploy a TCP service behind an NLB
const tcpService = new ecsPatterns.NetworkLoadBalancedFargateService(
  this, 'TcpService',
  {
    vpc,
    taskImageOptions: {
      image: ecs.ContainerImage.fromRegistry('my-tcp-server:latest'),
      containerPort: 9090,
    },
    desiredCount: 2,
    publicLoadBalancer: false,  // Internal NLB
    listenerPort: 9090,
  },
);
```

### Queue Processing Fargate Service

This pattern creates a Fargate service that processes messages from an SQS queue. It handles the scaling based on queue depth automatically.

```typescript
// Deploy a worker service that processes SQS messages
import * as sqs from 'aws-cdk-lib/aws-sqs';

const processingQueue = new sqs.Queue(this, 'ProcessingQueue', {
  visibilityTimeout: cdk.Duration.seconds(300),
});

const worker = new ecsPatterns.QueueProcessingFargateService(
  this, 'Worker',
  {
    vpc,
    queue: processingQueue,
    image: ecs.ContainerImage.fromAsset('./docker/worker'),
    cpu: 1024,
    memoryLimitMiB: 2048,
    // Min and max scaling bounds
    minScalingCapacity: 1,
    maxScalingCapacity: 20,
    // Scale based on messages in the queue
    scalingSteps: [
      { upper: 0, change: -1 },    // Scale to 0 when queue is empty
      { lower: 1, change: +1 },    // Add 1 task per message
      { lower: 100, change: +5 },  // Scale faster when queue is deep
      { lower: 500, change: +10 }, // Scale aggressively for large backlogs
    ],
    environment: {
      WORKER_TYPE: 'image-processor',
    },
  },
);
```

### Scheduled Fargate Task

Need a cron job on Fargate? There's a pattern for that.

```typescript
// Run a Fargate task on a schedule (like a cron job)
import * as events from 'aws-cdk-lib/aws-events';

const scheduledTask = new ecsPatterns.ScheduledFargateTask(
  this, 'DailyReport',
  {
    vpc,
    scheduledFargateTaskImageOptions: {
      image: ecs.ContainerImage.fromAsset('./docker/report-generator'),
      memoryLimitMiB: 512,
      cpu: 256,
      environment: {
        REPORT_TYPE: 'daily-summary',
        OUTPUT_BUCKET: reportBucket.bucketName,
      },
    },
    // Run at 6 AM UTC every day
    schedule: events.Schedule.cron({
      minute: '0',
      hour: '6',
    }),
    // Run in private subnets
    subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  },
);

// Grant the task access to the output bucket
reportBucket.grantWrite(scheduledTask.taskDefinition.taskRole);
```

## API Gateway Patterns

The API Gateway module includes its own L3 constructs.

```typescript
// LambdaRestApi - creates a full REST API backed by a Lambda function
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

const handler = new lambda.Function(this, 'ApiHandler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/api'),
});

// This creates the API Gateway, integration, permissions, and deployment
const api = new apigw.LambdaRestApi(this, 'Api', {
  handler,
  proxy: true,  // All requests proxied to Lambda
  deployOptions: {
    stageName: 'v1',
    throttlingRateLimit: 1000,
    throttlingBurstLimit: 2000,
  },
});
```

## Customizing L3 Constructs

L3 constructs aren't black boxes. You can access and modify their internal components after creation.

```typescript
// Access internal components of an L3 construct
const service = new ecsPatterns.ApplicationLoadBalancedFargateService(
  this, 'Service', { /* config */ },
);

// Modify the ALB
service.loadBalancer.setAttribute('idle_timeout.timeout_seconds', '120');

// Modify the Fargate service
service.service.connections.allowFromAnyIpv4(ec2.Port.tcp(8080));

// Access the task definition
service.taskDefinition.addContainer('sidecar', {
  image: ecs.ContainerImage.fromRegistry('datadog/agent:latest'),
  memoryLimitMiB: 256,
  environment: {
    DD_API_KEY: 'your-key',
  },
});

// Access the target group
service.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');
```

## When Not to Use L3 Constructs

L3 constructs encode opinions. When those opinions don't match your needs, fighting the pattern is worse than building from L2 constructs.

Don't use L3 constructs when:

- Your architecture deviates significantly from the pattern (e.g., you need multiple containers with different scaling rules)
- You need fine-grained control over every resource attribute
- The pattern creates resources you don't want (e.g., a new VPC when you have an existing one)

In these cases, build your architecture from L2 constructs. You might even wrap your custom architecture in your own L3-style construct for reuse across projects. See the post on [creating custom CDK constructs](https://oneuptime.com/blog/post/create-custom-cdk-constructs/view) for how to do that.

L3 constructs are a productivity multiplier when they fit. Check what's available in the `aws-ecs-patterns`, `aws-apigateway`, and `aws-route53-patterns` modules before building from scratch. For a deeper understanding of construct levels, read about [CDK constructs L1, L2, and L3](https://oneuptime.com/blog/post/understand-cdk-constructs-l1-l2-l3/view).
