# How to Create an ECS Fargate Service with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, ECS, Fargate, Containers

Description: Learn how to define and deploy an ECS Fargate service using AWS CDK with TypeScript, including task definitions, load balancers, and auto-scaling.

---

Running containers on AWS doesn't have to feel like wading through dozens of console screens. With the AWS Cloud Development Kit (CDK), you can define an entire ECS Fargate service in code - version-controlled, repeatable, and far less error-prone than clicking around in the console.

In this guide, we'll build a fully working Fargate service from scratch using CDK with TypeScript. We'll cover the VPC, cluster, task definition, service, load balancer, and auto-scaling. By the end, you'll have a production-ready template you can customize for your own workloads.

## Why Fargate?

ECS Fargate is serverless compute for containers. You don't manage EC2 instances, patch operating systems, or worry about capacity planning at the instance level. You define your container, tell AWS how much CPU and memory it needs, and Fargate handles the rest.

The tradeoff is cost - Fargate is more expensive per unit of compute than running your own EC2 fleet. But for most teams, the operational simplicity is worth it, especially when you're starting out or running variable workloads.

## Prerequisites

Before diving in, make sure you have the CDK CLI installed and your AWS account bootstrapped.

```bash
# Install CDK globally
npm install -g aws-cdk

# Bootstrap your account (one-time setup per account/region)
cdk bootstrap aws://ACCOUNT_ID/REGION
```

If you haven't bootstrapped yet, check out our guide on [CDK Bootstrap for Account Preparation](https://oneuptime.com/blog/post/2026-02-12-use-cdk-bootstrap-for-account-preparation/view).

## Setting Up the Project

Create a new CDK project and install the required dependencies.

```bash
# Create a new CDK TypeScript project
mkdir fargate-service && cd fargate-service
cdk init app --language typescript

# Install the ECS patterns library
npm install aws-cdk-lib constructs
```

The `aws-cdk-lib` package includes everything we need - ECS, EC2 (for VPC), Elastic Load Balancing, and more.

## Defining the Stack

Let's start with the full stack definition and then break it down piece by piece. Open `lib/fargate-service-stack.ts` and replace its contents.

Here's the VPC and cluster definition:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import { Construct } from 'constructs';

export class FargateServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC with 2 AZs for high availability
    const vpc = new ec2.Vpc(this, 'ServiceVpc', {
      maxAzs: 2,
      natGateways: 1, // Keep costs down with a single NAT gateway
    });

    // Create the ECS cluster inside our VPC
    const cluster = new ecs.Cluster(this, 'ServiceCluster', {
      vpc,
      containerInsights: true, // Enable CloudWatch Container Insights
    });
  }
}
```

A couple of things to note. We're using 2 availability zones for redundancy, but only one NAT gateway to keep costs down in non-production environments. For production, you'd want a NAT gateway per AZ.

## Adding the Fargate Service with a Load Balancer

CDK's higher-level constructs make this surprisingly simple. The `ApplicationLoadBalancedFargateService` pattern bundles together an ALB, target group, Fargate service, and task definition.

```typescript
// Add this inside the constructor, after the cluster definition

// Define the Fargate service with an Application Load Balancer
const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(
  this,
  'MyFargateService',
  {
    cluster,
    cpu: 256,          // 0.25 vCPU
    memoryLimitMiB: 512, // 512 MB RAM
    desiredCount: 2,     // Run 2 tasks for availability
    taskImageOptions: {
      // Use a simple nginx image for demonstration
      image: ecs.ContainerImage.fromRegistry('nginx:alpine'),
      containerPort: 80,
      environment: {
        NODE_ENV: 'production',
        APP_NAME: 'my-fargate-service',
      },
    },
    publicLoadBalancer: true, // Internet-facing ALB
  }
);
```

This single construct creates about 15 CloudFormation resources under the hood - the ALB, listener, target group, security groups, IAM roles, task definition, and the service itself.

## Configuring Health Checks

The default health check is fine for simple cases, but you'll almost always want to customize it.

```typescript
// Configure the health check on the target group
fargateService.targetGroup.configureHealthCheck({
  path: '/health',        // Your app's health endpoint
  healthyHttpCodes: '200', // What counts as healthy
  interval: cdk.Duration.seconds(30),
  timeout: cdk.Duration.seconds(5),
  healthyThresholdCount: 2,
  unhealthyThresholdCount: 3,
});
```

## Adding Auto-Scaling

Static task counts work for predictable workloads, but most services need to scale with demand. Here's how to add CPU-based auto-scaling.

```typescript
// Set up auto-scaling based on CPU utilization
const scaling = fargateService.service.autoScaleTaskCount({
  minCapacity: 2,   // Never drop below 2 tasks
  maxCapacity: 10,  // Cap at 10 tasks
});

// Scale up when average CPU exceeds 70%
scaling.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 70,
  scaleInCooldown: cdk.Duration.seconds(60),
  scaleOutCooldown: cdk.Duration.seconds(60),
});

// Also scale based on request count per target
scaling.scaleOnRequestCount('RequestScaling', {
  requestsPerTarget: 1000,
  targetGroup: fargateService.targetGroup,
});
```

The cooldown periods prevent the service from thrashing - scaling up and down too rapidly in response to short traffic spikes.

## Using a Custom Docker Image

In a real project, you'll want to build from your own Dockerfile rather than pulling from a public registry. CDK can build Docker images directly from your source.

```typescript
// Build from a local Dockerfile instead of a registry image
taskImageOptions: {
  image: ecs.ContainerImage.fromAsset('./app'), // Path to your Dockerfile
  containerPort: 3000,
  environment: {
    DATABASE_URL: 'your-connection-string',
  },
  logDriver: ecs.LogDrivers.awsLogs({
    streamPrefix: 'my-fargate-service',
  }),
},
```

The `fromAsset` method builds the Docker image during `cdk deploy` and pushes it to ECR automatically. No need to set up a separate CI pipeline for the image.

## Outputting Useful Information

Add stack outputs so you can easily find your service's URL after deployment.

```typescript
// Output the load balancer URL
new cdk.CfnOutput(this, 'LoadBalancerDNS', {
  value: fargateService.loadBalancer.loadBalancerDnsName,
  description: 'The DNS name of the load balancer',
});

// Output the service name for monitoring reference
new cdk.CfnOutput(this, 'ServiceName', {
  value: fargateService.service.serviceName,
  description: 'The ECS service name',
});
```

## Deploying the Stack

Before deploying, it's a good practice to synthesize and diff your changes. See our post on [synthesizing and diffing CDK changes](https://oneuptime.com/blog/post/2026-02-12-synthesize-and-diff-cdk-changes-before-deployment/view) for more detail.

```bash
# Preview the CloudFormation template
cdk synth

# See what will change
cdk diff

# Deploy the stack
cdk deploy
```

The deployment typically takes 5-8 minutes, mostly waiting for the ALB to provision and health checks to pass.

## Monitoring Your Service

Once deployed, you'll want visibility into your service's health. Container Insights (which we enabled earlier) gives you CPU, memory, and network metrics out of the box. For deeper observability, consider setting up monitoring with a tool like [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) that can alert you when things go sideways.

## Common Pitfalls

There are a few things that trip people up regularly. First, Fargate tasks need to pull their container image from somewhere accessible. If you're using a private ECR repo in a different account, make sure the task execution role has the right permissions.

Second, watch your security groups. The CDK pattern creates them automatically, but if your container needs to talk to an RDS database or other AWS service, you'll need to explicitly allow that traffic.

Third, memory limits are hard limits in Fargate. If your container exceeds its memory allocation, it gets killed immediately. Set your limits with some headroom above your typical usage.

## Cleanup

Don't forget to tear down resources when you're done testing.

```bash
# Destroy all resources created by this stack
cdk destroy
```

## Wrapping Up

CDK makes it straightforward to define ECS Fargate services as code. The high-level patterns handle the boilerplate, while still giving you access to every knob when you need to customize. Start with the `ApplicationLoadBalancedFargateService` pattern, add auto-scaling, and build from there.

If you're managing the underlying infrastructure with CDK too, check out our guide on [creating a VPC with CDK](https://oneuptime.com/blog/post/2026-02-12-terraform-aws-vpc-module/view) and [creating an RDS database with CDK](https://oneuptime.com/blog/post/2026-02-12-create-rds-database-with-cdk/view) to round out your stack.
