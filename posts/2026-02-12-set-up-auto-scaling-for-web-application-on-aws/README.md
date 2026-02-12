# How to Set Up Auto Scaling for a Web Application on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Auto Scaling, EC2, ECS, Load Balancing

Description: Complete guide to setting up auto scaling for web applications on AWS, covering EC2 Auto Scaling Groups, ECS Service Auto Scaling, and scaling policies.

---

Provisioning servers for peak traffic means wasting money during off-hours. Provisioning for average traffic means your site falls over during spikes. Auto scaling solves both problems - it adds capacity when demand increases and removes it when demand drops. On AWS, you have several auto scaling options depending on your compute platform.

Let's set up auto scaling for the most common scenarios: EC2 instances behind a load balancer, and ECS services running containers.

## EC2 Auto Scaling

The classic setup is an Auto Scaling Group (ASG) of EC2 instances behind an Application Load Balancer.

### Launch Template

Start with a launch template that defines what your instances look like.

```typescript
// CDK stack for EC2 auto scaling
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export class AutoScalingStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, 'AppVpc', {
      maxAzs: 3,
      natGateways: 1,
    });

    // Auto Scaling Group
    const asg = new autoscaling.AutoScalingGroup(this, 'AppASG', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      minCapacity: 2,
      maxCapacity: 20,
      desiredCapacity: 2,
      healthCheck: autoscaling.HealthCheck.elb({
        grace: cdk.Duration.minutes(5),
      }),
      updatePolicy: autoscaling.UpdatePolicy.rollingUpdate({
        maxBatchSize: 2,
        minInstancesInService: 1,
        pauseTime: cdk.Duration.minutes(5),
      }),
    });

    // User data to set up the application
    asg.addUserData(
      '#!/bin/bash',
      'yum update -y',
      'yum install -y docker',
      'systemctl start docker',
      'docker run -d -p 80:3000 your-app:latest',
    );

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'AppALB', {
      vpc,
      internetFacing: true,
    });

    const listener = alb.addListener('HttpListener', {
      port: 80,
    });

    listener.addTargets('AppTarget', {
      port: 80,
      targets: [asg],
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });
  }
}
```

### Scaling Policies

Now the important part - when should it scale? There are three types of scaling policies.

**Target Tracking** is the simplest and usually the best starting point. You set a target value for a metric, and AWS adjusts capacity to maintain it.

```typescript
// Target tracking: maintain 60% average CPU utilization
asg.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 60,
  cooldown: cdk.Duration.minutes(3),
  estimatedInstanceWarmup: cdk.Duration.minutes(5),
});

// Target tracking: maintain 1000 requests per target
asg.scaleOnRequestCount('RequestScaling', {
  targetRequestsPerMinute: 1000,
});
```

**Step Scaling** gives you more control with different scaling actions at different thresholds.

```typescript
// Step scaling: scale based on custom CloudWatch metric
const scalingMetric = new cloudwatch.Metric({
  namespace: 'MyApp',
  metricName: 'QueueDepth',
  statistic: 'Average',
  period: cdk.Duration.minutes(1),
});

asg.scaleOnMetric('QueueDepthScaling', {
  metric: scalingMetric,
  scalingSteps: [
    { upper: 100, change: 0 },     // 0-100 messages: no scaling
    { lower: 100, change: +2 },    // 100+ messages: add 2 instances
    { lower: 500, change: +5 },    // 500+ messages: add 5 instances
  ],
  adjustmentType: autoscaling.AdjustmentType.CHANGE_IN_CAPACITY,
});
```

**Scheduled Scaling** is for predictable traffic patterns - scale up before the morning rush, scale down at night.

```typescript
// Scheduled scaling: scale up for business hours
asg.scaleOnSchedule('ScaleUpMorning', {
  schedule: autoscaling.Schedule.cron({ hour: '8', minute: '0' }),
  minCapacity: 5,
});

asg.scaleOnSchedule('ScaleDownEvening', {
  schedule: autoscaling.Schedule.cron({ hour: '20', minute: '0' }),
  minCapacity: 2,
});
```

## ECS Service Auto Scaling

If you're running containers on ECS (with Fargate or EC2), auto scaling works at the service level.

```typescript
// ECS Fargate service with auto scaling
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';

const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'AppService', {
  cluster,
  taskImageOptions: {
    image: ecs.ContainerImage.fromRegistry('your-app:latest'),
    containerPort: 3000,
    environment: {
      NODE_ENV: 'production',
    },
  },
  desiredCount: 2,
  cpu: 512,
  memoryLimitMiB: 1024,
  publicLoadBalancer: true,
});

// Configure auto scaling
const scaling = service.service.autoScaleTaskCount({
  minCapacity: 2,
  maxCapacity: 20,
});

// Scale based on CPU
scaling.scaleOnCpuUtilization('CpuScaling', {
  targetUtilizationPercent: 60,
  scaleInCooldown: cdk.Duration.minutes(5),
  scaleOutCooldown: cdk.Duration.minutes(2),
});

// Scale based on memory
scaling.scaleOnMemoryUtilization('MemoryScaling', {
  targetUtilizationPercent: 70,
  scaleInCooldown: cdk.Duration.minutes(5),
  scaleOutCooldown: cdk.Duration.minutes(2),
});

// Scale based on request count per target
scaling.scaleOnRequestCount('RequestScaling', {
  requestsPerTarget: 500,
  targetGroup: service.targetGroup,
});
```

## Predictive Scaling

For workloads with predictable patterns, predictive scaling uses ML to forecast demand and pre-provision capacity before traffic arrives.

```typescript
// Enable predictive scaling on an ASG
const cfnAsg = asg.node.defaultChild as autoscaling.CfnAutoScalingGroup;

new autoscaling.CfnScalingPolicy(this, 'PredictiveScaling', {
  autoScalingGroupName: asg.autoScalingGroupName,
  policyType: 'PredictiveScaling',
  predictiveScalingConfiguration: {
    metricSpecifications: [{
      targetValue: 60,
      predefinedMetricPairSpecification: {
        predefinedMetricType: 'ASGCPUUtilization',
      },
    }],
    mode: 'ForecastAndScale',
    schedulingBufferTime: 300, // Pre-provision 5 minutes early
  },
});
```

## Health Checks and Grace Periods

Auto scaling only works well if health checks are configured properly. A flawed health check can cause a scaling loop where instances are constantly being replaced.

```typescript
// ALB health check settings
const targetGroup = listener.addTargets('AppTarget', {
  port: 80,
  targets: [asg],
  healthCheck: {
    path: '/health',
    interval: cdk.Duration.seconds(30),
    timeout: cdk.Duration.seconds(5),
    healthyThresholdCount: 2,    // Must pass 2 checks to be healthy
    unhealthyThresholdCount: 3,  // Must fail 3 checks to be unhealthy
    healthyHttpCodes: '200',
  },
  deregistrationDelay: cdk.Duration.seconds(30),
});
```

The health check endpoint should verify that the application is actually ready to serve traffic, not just that the process is running.

```javascript
// A proper health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    // Check Redis connection
    await redis.ping();
    res.status(200).json({ status: 'healthy' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

## Monitoring Auto Scaling

You need visibility into scaling events and the metrics that drive them.

```typescript
// CloudWatch dashboard for auto scaling metrics
const dashboard = new cloudwatch.Dashboard(this, 'ScalingDashboard');

dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'Instance Count',
    left: [asg.metricGroupDesiredCapacity()],
  }),
  new cloudwatch.GraphWidget({
    title: 'CPU Utilization',
    left: [asg.metricCpuUtilization()],
  }),
  new cloudwatch.GraphWidget({
    title: 'Request Count',
    left: [alb.metricRequestCount()],
  }),
);
```

For comprehensive monitoring beyond scaling metrics, check out our guide on [building a logging and monitoring stack on AWS](https://oneuptime.com/blog/post/build-logging-and-monitoring-stack-on-aws/view).

## Common Pitfalls

A few things that trip people up with auto scaling:

- **Cooldown periods too short** - New instances haven't warmed up before the next scaling decision
- **No connection draining** - Terminating instances while they're handling requests
- **Scaling on the wrong metric** - CPU might look fine while your app is actually memory-bound
- **Min capacity too low** - A single instance failure takes your entire app down

## Summary

Auto scaling on AWS keeps your application responsive during traffic spikes while minimizing costs during quiet periods. Start with target tracking on CPU or request count, add scheduled scaling if your traffic is predictable, and layer on predictive scaling for the best results. The key is choosing the right metrics, setting reasonable cooldowns, and testing your scaling behavior before you need it in production.
