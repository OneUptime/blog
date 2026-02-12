# How to Create Custom CDK Constructs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, TypeScript, Infrastructure as Code

Description: Learn how to build reusable custom CDK constructs that encapsulate your organization's infrastructure patterns and share them across teams and projects.

---

One of CDK's biggest advantages over raw CloudFormation is composition. You can build custom constructs that package your organization's infrastructure patterns into reusable, tested, shareable components. Instead of copying and pasting the same VPC-Lambda-DynamoDB setup across ten projects, you build it once as a construct and import it everywhere.

Custom constructs are how CDK scales across teams. Let's build some.

## The Basics of a Custom Construct

A custom construct is a class that extends `Construct` and creates resources in its constructor. It's the same pattern you've seen in stacks, but at a smaller, composable level.

```typescript
// A simple custom construct that creates an S3 bucket with standard settings
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';

export interface SecureBucketProps {
  bucketName?: string;
  versioned?: boolean;
  expirationDays?: number;
}

export class SecureBucket extends Construct {
  // Expose the bucket so consumers can reference it
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: SecureBucketProps = {}) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: props.bucketName,
      versioned: props.versioned ?? true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: props.expirationDays ? [
        {
          expiration: cdk.Duration.days(props.expirationDays),
        },
      ] : [],
      // Enable access logging
      serverAccessLogsPrefix: 'access-logs/',
    });
  }
}
```

Using this construct is just like using any built-in CDK construct.

```typescript
// Using the custom SecureBucket construct in a stack
import { SecureBucket } from './constructs/secure-bucket';

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dataBucket = new SecureBucket(this, 'DataBucket', {
      versioned: true,
      expirationDays: 365,
    });

    // Access the underlying bucket through the public property
    dataBucket.bucket.grantRead(myLambda);
  }
}
```

## Building a More Complex Construct

Let's build something more realistic - a construct that creates a Lambda function with monitoring, alarms, and proper logging built in.

```typescript
// A monitored Lambda construct with alarms and dashboards included
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';

export interface MonitoredFunctionProps {
  // Lambda configuration
  runtime: lambda.Runtime;
  handler: string;
  code: lambda.Code;
  timeout?: cdk.Duration;
  memorySize?: number;
  environment?: Record<string, string>;

  // Monitoring configuration
  errorRateThreshold?: number;  // Percentage
  durationThresholdMs?: number;
  alarmAction?: cloudwatch.IAlarmAction;
}

export class MonitoredFunction extends Construct {
  public readonly function: lambda.Function;
  public readonly errorAlarm: cloudwatch.Alarm;
  public readonly durationAlarm: cloudwatch.Alarm;

  constructor(scope: Construct, id: string, props: MonitoredFunctionProps) {
    super(scope, id);

    // Create the Lambda function
    this.function = new lambda.Function(this, 'Function', {
      runtime: props.runtime,
      handler: props.handler,
      code: props.code,
      timeout: props.timeout ?? cdk.Duration.seconds(30),
      memorySize: props.memorySize ?? 256,
      environment: props.environment,
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.TWO_WEEKS,
    });

    // Create error rate alarm
    this.errorAlarm = new cloudwatch.Alarm(this, 'ErrorAlarm', {
      metric: this.function.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: props.errorRateThreshold ?? 5,
      evaluationPeriods: 2,
      alarmDescription: `High error rate for ${id}`,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Create duration alarm
    this.durationAlarm = new cloudwatch.Alarm(this, 'DurationAlarm', {
      metric: this.function.metricDuration({
        period: cdk.Duration.minutes(5),
        statistic: 'p95',
      }),
      threshold: props.durationThresholdMs ?? 5000,
      evaluationPeriods: 3,
      alarmDescription: `High p95 latency for ${id}`,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Wire up alarm actions if provided
    if (props.alarmAction) {
      this.errorAlarm.addAlarmAction(props.alarmAction);
      this.durationAlarm.addAlarmAction(props.alarmAction);
    }
  }

  // Convenience method to grant invoke permissions
  public grantInvoke(grantee: cdk.aws_iam.IGrantable): cdk.aws_iam.Grant {
    return this.function.grantInvoke(grantee);
  }
}
```

Now every Lambda function in your organization gets monitoring for free.

```typescript
// Every function automatically gets error and duration alarms
const orderProcessor = new MonitoredFunction(this, 'OrderProcessor', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/order-processor'),
  timeout: cdk.Duration.seconds(60),
  errorRateThreshold: 3,
  durationThresholdMs: 10000,
  alarmAction: new cw_actions.SnsAction(alertsTopic),
  environment: {
    TABLE_NAME: ordersTable.tableName,
  },
});

ordersTable.grantReadWriteData(orderProcessor.function);
```

## Construct Patterns for Multi-Resource Architectures

The most valuable custom constructs combine multiple resources into a complete pattern. Here's a construct that creates a standard microservice setup.

```typescript
// A microservice construct that bundles Fargate, ALB, and monitoring
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';

export interface MicroserviceProps {
  vpc: ec2.IVpc;
  cluster: ecs.ICluster;
  serviceName: string;
  dockerDirectory: string;
  containerPort: number;
  cpu?: number;
  memoryMiB?: number;
  desiredCount?: number;
  healthCheckPath?: string;
  environment?: Record<string, string>;
}

export class Microservice extends Construct {
  public readonly service: ecsPatterns.ApplicationLoadBalancedFargateService;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MicroserviceProps) {
    super(scope, id);

    // Create the load-balanced Fargate service
    this.service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this, 'Service',
      {
        cluster: props.cluster,
        serviceName: props.serviceName,
        taskImageOptions: {
          image: ecs.ContainerImage.fromAsset(props.dockerDirectory),
          containerPort: props.containerPort,
          environment: props.environment,
        },
        desiredCount: props.desiredCount ?? 2,
        cpu: props.cpu ?? 512,
        memoryLimitMiB: props.memoryMiB ?? 1024,
        circuitBreaker: { rollback: true },
      },
    );

    // Configure health check
    this.service.targetGroup.configureHealthCheck({
      path: props.healthCheckPath ?? '/health',
      interval: cdk.Duration.seconds(30),
    });

    // Set up auto-scaling
    const scaling = this.service.service.autoScaleTaskCount({
      minCapacity: props.desiredCount ?? 2,
      maxCapacity: (props.desiredCount ?? 2) * 3,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
    });

    // Create a CloudWatch dashboard for this service
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${props.serviceName}-dashboard`,
    });

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Request Count',
        left: [this.service.loadBalancer.metricRequestCount()],
      }),
      new cloudwatch.GraphWidget({
        title: 'Response Time',
        left: [this.service.loadBalancer.metricTargetResponseTime()],
      }),
    );
  }
}
```

Using this construct, spinning up a new microservice takes just a few lines.

```typescript
// Deploy a new microservice with one construct
const userService = new Microservice(this, 'UserService', {
  vpc,
  cluster,
  serviceName: 'user-service',
  dockerDirectory: './services/user-service',
  containerPort: 8080,
  healthCheckPath: '/api/health',
  environment: {
    DB_HOST: database.instanceEndpoint.hostname,
  },
});
```

## Publishing Constructs as Libraries

To share constructs across projects, publish them as npm packages.

```bash
# Set up the construct library project
mkdir my-constructs && cd my-constructs
cdk init lib --language typescript
```

Update the `package.json` with your library details.

```json
{
  "name": "@mycompany/cdk-constructs",
  "version": "1.0.0",
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "peerDependencies": {
    "aws-cdk-lib": "^2.0.0",
    "constructs": "^10.0.0"
  }
}
```

Create an index file that exports all your constructs.

```typescript
// lib/index.ts - Export all constructs from the library
export { SecureBucket, SecureBucketProps } from './secure-bucket';
export { MonitoredFunction, MonitoredFunctionProps } from './monitored-function';
export { Microservice, MicroserviceProps } from './microservice';
```

Then consumers can install and use your constructs like any other CDK module.

```bash
# Install the construct library
npm install @mycompany/cdk-constructs
```

Custom constructs are what turn CDK from "CloudFormation with better syntax" into a real infrastructure platform for your organization. Start small with wrappers around individual resources, then build up to multi-resource patterns as you identify common architectures. For testing these constructs, check out the guide on [writing unit tests for CDK stacks](https://oneuptime.com/blog/post/write-unit-tests-for-cdk-stacks/view).
