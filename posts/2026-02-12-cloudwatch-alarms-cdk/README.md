# How to Create CloudWatch Alarms with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, CloudWatch, Monitoring

Description: Step-by-step guide to creating CloudWatch alarms using AWS CDK with TypeScript, including metric alarms, composite alarms, and SNS notifications.

---

CloudWatch alarms are the backbone of AWS monitoring. They watch your metrics and trigger when something goes wrong - high CPU, elevated error rates, latency spikes. Setting them up through the console is tedious, especially when you've got dozens of services to monitor. AWS CDK makes it much better by letting you define alarms as code, version them, and deploy them consistently across environments.

Let's build out a comprehensive alarm setup using CDK with TypeScript. We'll cover simple metric alarms, math expression alarms, composite alarms, and wiring everything up to SNS for notifications.

## Project Setup

If you don't already have a CDK project, spin one up quickly:

```bash
# Initialize a new CDK project with TypeScript
mkdir cloudwatch-alarms && cd cloudwatch-alarms
npx cdk init app --language typescript
npm install @aws-cdk/aws-cloudwatch @aws-cdk/aws-cloudwatch-actions @aws-cdk/aws-sns @aws-cdk/aws-sns-subscriptions
```

If you're using CDK v2 (which you should be), the constructs are already included in `aws-cdk-lib`.

## Basic Metric Alarm

Let's start simple - an alarm that fires when an EC2 instance's CPU exceeds 80% for 5 minutes.

```typescript
// lib/alarms-stack.ts - Basic CloudWatch alarm setup
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';

export class AlarmsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an SNS topic for alarm notifications
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: 'cloudwatch-alarms',
      displayName: 'CloudWatch Alarm Notifications',
    });

    // Subscribe an email to the topic
    alarmTopic.addSubscription(
      new subscriptions.EmailSubscription('ops-team@company.com')
    );

    // Create a CPU utilization alarm for an EC2 instance
    const cpuAlarm = new cloudwatch.Alarm(this, 'HighCpuAlarm', {
      alarmName: 'EC2-HighCPU-Production',
      alarmDescription: 'CPU utilization exceeded 80% for 5 minutes',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          InstanceId: 'i-0123456789abcdef0',
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(1),
      }),
      threshold: 80,
      evaluationPeriods: 5,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });

    // Wire the alarm to SNS
    cpuAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
    cpuAlarm.addOkAction(new actions.SnsAction(alarmTopic));
  }
}
```

A few things to note here. The `treatMissingData` setting matters more than you'd think. Setting it to `BREACHING` means the alarm triggers if data stops flowing - which might indicate the instance is down. For some metrics, `NOT_BREACHING` or `IGNORE` is more appropriate.

## Alarms from Existing Resources

Most of the time you're creating alarms for resources that already exist in your stack. CDK makes this really clean because most L2 constructs have built-in metric methods.

```typescript
// Creating alarms directly from CDK resource constructs
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';

// Lambda error alarm - uses the metric method on the function construct
const myFunction = new lambda.Function(this, 'MyFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda'),
  functionName: 'my-api-handler',
});

const lambdaErrorAlarm = myFunction.metricErrors({
  period: cdk.Duration.minutes(5),
}).createAlarm(this, 'LambdaErrorAlarm', {
  alarmName: 'Lambda-Errors-MyApiHandler',
  threshold: 5,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
});

lambdaErrorAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));

// DynamoDB throttle alarm
const table = new dynamodb.Table(this, 'MyTable', {
  tableName: 'orders',
  partitionKey: { name: 'orderId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PROVISIONED,
  readCapacity: 5,
  writeCapacity: 5,
});

const throttleAlarm = table.metricThrottledRequestsForOperation('PutItem', {
  period: cdk.Duration.minutes(1),
}).createAlarm(this, 'DDBThrottleAlarm', {
  alarmName: 'DDB-Throttled-Orders',
  threshold: 10,
  evaluationPeriods: 3,
});

throttleAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));

// SQS dead letter queue alarm
const dlq = new sqs.Queue(this, 'DeadLetterQueue', {
  queueName: 'orders-dlq',
});

const dlqAlarm = dlq.metricApproximateNumberOfMessagesVisible({
  period: cdk.Duration.minutes(5),
}).createAlarm(this, 'DLQAlarm', {
  alarmName: 'SQS-DLQ-Messages',
  threshold: 1,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
});
```

This approach is much cleaner than manually constructing `Metric` objects because the construct already knows the namespace, metric name, and dimensions.

## Math Expression Alarms

Sometimes you need to alarm on a calculation rather than a raw metric. For example, alerting when the error rate (errors divided by total invocations) exceeds a threshold.

```typescript
// Math expression alarm for Lambda error rate percentage
const errorRate = new cloudwatch.MathExpression({
  expression: '(errors / invocations) * 100',
  usingMetrics: {
    errors: myFunction.metricErrors({ period: cdk.Duration.minutes(5) }),
    invocations: myFunction.metricInvocations({ period: cdk.Duration.minutes(5) }),
  },
  label: 'Error Rate (%)',
  period: cdk.Duration.minutes(5),
});

const errorRateAlarm = errorRate.createAlarm(this, 'ErrorRateAlarm', {
  alarmName: 'Lambda-ErrorRate-MyApiHandler',
  alarmDescription: 'Error rate exceeded 5%',
  threshold: 5,
  evaluationPeriods: 3,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
```

You can nest math expressions too. Want to alarm on the rate of change of errors? That's just another math expression layer.

## Composite Alarms

Composite alarms combine multiple alarms using boolean logic. They're great for reducing noise - instead of getting three separate alerts, you get one when all conditions are met.

```typescript
// Composite alarm - only fires when both CPU and memory are high
const highCpuAlarm = new cloudwatch.Alarm(this, 'HighCpu', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/EC2',
    metricName: 'CPUUtilization',
    dimensionsMap: { InstanceId: 'i-0123456789abcdef0' },
    statistic: 'Average',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 80,
  evaluationPeriods: 3,
});

const highMemoryAlarm = new cloudwatch.Alarm(this, 'HighMemory', {
  metric: new cloudwatch.Metric({
    namespace: 'CWAgent',
    metricName: 'mem_used_percent',
    dimensionsMap: { InstanceId: 'i-0123456789abcdef0' },
    statistic: 'Average',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 85,
  evaluationPeriods: 3,
});

// Only alert when BOTH are in alarm state
const compositeAlarm = new cloudwatch.CompositeAlarm(this, 'ResourceExhaustion', {
  alarmRule: cloudwatch.AlarmRule.allOf(highCpuAlarm, highMemoryAlarm),
  alarmDescription: 'Both CPU and memory are critically high',
  compositeAlarmName: 'EC2-ResourceExhaustion',
});

compositeAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
```

You can also use `AlarmRule.anyOf()` for OR logic and `AlarmRule.not()` for negation.

## Alarm Factory Pattern

If you've got many services, you'll want a reusable pattern. Here's a construct that creates a standard set of alarms for any Lambda function:

```typescript
// lib/lambda-alarm-factory.ts - Reusable alarm construct for Lambda functions
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cdk from 'aws-cdk-lib';

interface LambdaAlarmProps {
  function: lambda.IFunction;
  alarmTopic: sns.ITopic;
  errorThreshold?: number;
  durationThresholdMs?: number;
  throttleThreshold?: number;
}

export class LambdaAlarms extends Construct {
  constructor(scope: Construct, id: string, props: LambdaAlarmProps) {
    super(scope, id);

    const prefix = props.function.functionName;

    // Error alarm
    const errorAlarm = props.function.metricErrors({
      period: cdk.Duration.minutes(5),
    }).createAlarm(this, 'Errors', {
      alarmName: `${prefix}-Errors`,
      threshold: props.errorThreshold ?? 5,
      evaluationPeriods: 1,
    });
    errorAlarm.addAlarmAction(new actions.SnsAction(props.alarmTopic));

    // Duration alarm
    const durationAlarm = props.function.metricDuration({
      period: cdk.Duration.minutes(5),
      statistic: 'p99',
    }).createAlarm(this, 'Duration', {
      alarmName: `${prefix}-HighDuration`,
      threshold: props.durationThresholdMs ?? 5000,
      evaluationPeriods: 3,
    });
    durationAlarm.addAlarmAction(new actions.SnsAction(props.alarmTopic));

    // Throttle alarm
    const throttleAlarm = props.function.metricThrottles({
      period: cdk.Duration.minutes(5),
    }).createAlarm(this, 'Throttles', {
      alarmName: `${prefix}-Throttles`,
      threshold: props.throttleThreshold ?? 1,
      evaluationPeriods: 1,
    });
    throttleAlarm.addAlarmAction(new actions.SnsAction(props.alarmTopic));
  }
}
```

Then use it like this:

```typescript
// Apply standard alarms to any Lambda function in one line
new LambdaAlarms(this, 'ApiHandlerAlarms', {
  function: myFunction,
  alarmTopic: alarmTopic,
  errorThreshold: 3,
  durationThresholdMs: 10000,
});
```

For more on creating SNS topics and subscriptions with CDK, check out our post on [SNS topics and subscriptions](https://oneuptime.com/blog/post/2026-02-12-sns-topics-subscriptions-cdk/view). If you're also interested in building event-driven architectures, have a look at [EventBridge rules with CDK](https://oneuptime.com/blog/post/2026-02-12-eventbridge-rules-cdk/view).

## Wrapping Up

CDK transforms CloudWatch alarm management from a manual chore into a repeatable, version-controlled process. The key patterns to remember are: use L2 construct metric methods when possible, create factory constructs for repeatable alarm sets, use composite alarms to reduce noise, and always wire alarms to SNS for notifications. Once you've got your alarm infrastructure in code, spinning up monitoring for new services takes minutes instead of hours.
