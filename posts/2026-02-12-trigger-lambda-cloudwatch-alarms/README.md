# How to Trigger Lambda Functions from CloudWatch Alarms

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, CloudWatch, Monitoring, Alerting

Description: Learn how to trigger Lambda functions from CloudWatch Alarms for automated incident response, auto-remediation, and custom notification workflows.

---

CloudWatch Alarms are usually associated with sending notifications to SNS topics or scaling Auto Scaling groups. But you can also trigger Lambda functions directly from alarm state changes through EventBridge. This opens up powerful auto-remediation workflows - when a metric crosses a threshold, your Lambda function can take immediate action to fix the problem before a human even sees the alert.

Let's set up CloudWatch Alarms that trigger Lambda functions for automated incident response.

## Two Approaches: SNS or EventBridge

There are two ways to trigger Lambda from CloudWatch Alarms:

**Via SNS (traditional)**: The alarm sends to an SNS topic, which triggers the Lambda function. Simple and widely used.

**Via EventBridge (modern)**: CloudWatch Alarms emit state change events to EventBridge. You create a rule that matches alarm events and routes to Lambda. More flexible, better filtering.

We'll cover both approaches.

## Approach 1: CloudWatch Alarm to SNS to Lambda

This is the most common pattern. The alarm fires, sends a notification to an SNS topic, and the topic triggers your Lambda function.

This CDK stack creates a CloudWatch alarm that triggers a Lambda remediation function via SNS:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cw_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class AlarmLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The remediation Lambda function
    const remediator = new lambda.Function(this, 'Remediator', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/remediator'),
      timeout: cdk.Duration.minutes(2),
    });

    // SNS topic for alarm notifications
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: 'high-cpu-alarm',
    });

    // Subscribe Lambda to the topic
    alarmTopic.addSubscription(
      new subs.LambdaSubscription(remediator)
    );

    // Create the CloudWatch alarm
    const cpuAlarm = new cloudwatch.Alarm(this, 'HighCpuAlarm', {
      alarmName: 'EC2-High-CPU',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          InstanceId: 'i-1234567890abcdef0',
        },
        period: cdk.Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 90,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'CPU utilization exceeds 90% for 15 minutes',
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });

    // Add the SNS action to the alarm
    cpuAlarm.addAlarmAction(new cw_actions.SnsAction(alarmTopic));
    cpuAlarm.addOkAction(new cw_actions.SnsAction(alarmTopic));
  }
}
```

## Approach 2: CloudWatch Alarm via EventBridge

EventBridge receives alarm state change events automatically. You just need to create a rule.

This CDK configuration triggers Lambda based on CloudWatch alarm state changes via EventBridge:

```typescript
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

// Rule to catch any alarm transitioning to ALARM state
new events.Rule(this, 'AlarmStateRule', {
  ruleName: 'alarm-state-changes',
  eventPattern: {
    source: ['aws.cloudwatch'],
    detailType: ['CloudWatch Alarm State Change'],
    detail: {
      state: {
        value: ['ALARM'],
      },
    },
  },
  targets: [new targets.LambdaFunction(remediator)],
});

// Rule for specific alarms only
new events.Rule(this, 'SpecificAlarmRule', {
  ruleName: 'cpu-alarm-remediation',
  eventPattern: {
    source: ['aws.cloudwatch'],
    detailType: ['CloudWatch Alarm State Change'],
    detail: {
      alarmName: [{ prefix: 'EC2-High-CPU' }],
      state: {
        value: ['ALARM'],
      },
    },
  },
  targets: [new targets.LambdaFunction(remediator)],
});
```

The EventBridge approach is better when you want to match patterns across multiple alarms or when you need the richer event payload.

## Writing the Remediation Handler

The payload differs depending on whether you're using SNS or EventBridge. Let's handle both.

This handler processes alarm events from both SNS and EventBridge and takes remediation action:

```javascript
const { EC2Client, RebootInstancesCommand } = require('@aws-sdk/client-ec2');
const { AutoScalingClient, SetDesiredCapacityCommand } = require('@aws-sdk/client-auto-scaling');

const ec2 = new EC2Client({});
const autoscaling = new AutoScalingClient({});

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  let alarmData;

  // Determine the source - SNS or EventBridge
  if (event.Records && event.Records[0]?.EventSource === 'aws:sns') {
    // SNS path - parse the alarm message
    alarmData = JSON.parse(event.Records[0].Sns.Message);
    console.log('Alarm via SNS:', alarmData.AlarmName);
  } else if (event.source === 'aws.cloudwatch') {
    // EventBridge path - data is in detail
    alarmData = {
      AlarmName: event.detail.alarmName,
      NewStateValue: event.detail.state.value,
      NewStateReason: event.detail.state.reason,
      OldStateValue: event.detail.previousState.value,
      Trigger: event.detail.configuration,
    };
    console.log('Alarm via EventBridge:', alarmData.AlarmName);
  }

  // Only remediate on ALARM state
  if (alarmData.NewStateValue !== 'ALARM') {
    console.log(`Alarm is ${alarmData.NewStateValue}, no remediation needed`);
    return;
  }

  // Route to appropriate remediation based on alarm name
  const alarmName = alarmData.AlarmName;

  if (alarmName.startsWith('EC2-High-CPU')) {
    await handleHighCpu(alarmData);
  } else if (alarmName.startsWith('DiskSpace')) {
    await handleLowDisk(alarmData);
  } else if (alarmName.startsWith('HealthCheck')) {
    await handleHealthCheckFailure(alarmData);
  } else {
    console.log(`No remediation defined for alarm: ${alarmName}`);
  }
};

async function handleHighCpu(alarmData) {
  console.log('Handling high CPU alarm');

  // Option 1: Scale up the ASG
  try {
    await autoscaling.send(new SetDesiredCapacityCommand({
      AutoScalingGroupName: 'my-asg',
      DesiredCapacity: 4, // increase capacity
    }));
    console.log('Scaled up ASG to 4 instances');
  } catch (error) {
    console.error('Failed to scale ASG:', error);
    throw error;
  }
}

async function handleLowDisk(alarmData) {
  console.log('Handling low disk space alarm');
  // Could trigger log rotation, delete temp files, expand EBS volume, etc.
}

async function handleHealthCheckFailure(alarmData) {
  console.log('Handling health check failure');

  // Reboot the unhealthy instance
  const instanceId = extractInstanceId(alarmData);
  if (instanceId) {
    await ec2.send(new RebootInstancesCommand({
      InstanceIds: [instanceId],
    }));
    console.log(`Rebooted instance ${instanceId}`);
  }
}
```

## The EventBridge Alarm Event Format

When using the EventBridge approach, here's what the event looks like:

```json
{
  "version": "0",
  "id": "abc-123",
  "detail-type": "CloudWatch Alarm State Change",
  "source": "aws.cloudwatch",
  "account": "123456789012",
  "time": "2026-02-12T10:00:00Z",
  "region": "us-east-1",
  "detail": {
    "alarmName": "EC2-High-CPU-i-1234567890",
    "state": {
      "value": "ALARM",
      "reason": "Threshold Crossed: 3 out of 3 datapoints were greater than the threshold (90.0)",
      "timestamp": "2026-02-12T10:00:00.000+0000"
    },
    "previousState": {
      "value": "OK",
      "reason": "Threshold Crossed: 1 out of 3 datapoints were not greater than the threshold",
      "timestamp": "2026-02-12T09:45:00.000+0000"
    },
    "configuration": {
      "metrics": [
        {
          "id": "metric1",
          "metricStat": {
            "metric": {
              "namespace": "AWS/EC2",
              "name": "CPUUtilization",
              "dimensions": {
                "InstanceId": "i-1234567890abcdef0"
              }
            },
            "period": 300,
            "stat": "Average"
          }
        }
      ]
    }
  }
}
```

## Common Auto-Remediation Patterns

### Scale Based on Queue Depth

```typescript
const queueDepthAlarm = new cloudwatch.Alarm(this, 'QueueDepthAlarm', {
  alarmName: 'SQS-Queue-Depth-High',
  metric: new cloudwatch.Metric({
    namespace: 'AWS/SQS',
    metricName: 'ApproximateNumberOfMessagesVisible',
    dimensionsMap: { QueueName: 'order-processing' },
    period: cdk.Duration.minutes(1),
    statistic: 'Average',
  }),
  threshold: 1000,
  evaluationPeriods: 2,
});
```

### Alert on Lambda Errors

```typescript
const lambdaErrorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
  alarmName: 'Lambda-Error-Rate-High',
  metric: new cloudwatch.MathExpression({
    expression: 'errors / invocations * 100',
    usingMetrics: {
      errors: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        dimensionsMap: { FunctionName: 'order-processor' },
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      invocations: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Invocations',
        dimensionsMap: { FunctionName: 'order-processor' },
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
    },
  }),
  threshold: 5, // 5% error rate
  evaluationPeriods: 3,
});
```

### Restart Unhealthy ECS Tasks

```javascript
async function restartEcsTasks(clusterName, serviceName) {
  const { ECSClient, UpdateServiceCommand } = require('@aws-sdk/client-ecs');
  const ecs = new ECSClient({});

  // Force a new deployment to restart all tasks
  await ecs.send(new UpdateServiceCommand({
    cluster: clusterName,
    service: serviceName,
    forceNewDeployment: true,
  }));

  console.log(`Forced new deployment for ${serviceName}`);
}
```

## Safety Guardrails

Auto-remediation is powerful but dangerous without guardrails. Always implement these:

1. **Rate limiting**: Don't let your remediation function run more than N times per hour. Use DynamoDB to track recent actions.
2. **Escalation**: If remediation fails or keeps triggering, escalate to a human via PagerDuty or Slack.
3. **Dry run mode**: Start with logging what would happen before enabling actual remediation.
4. **Scope limits**: Don't auto-remediate production-critical resources without additional approval.

```javascript
async function shouldRemediate(alarmName) {
  // Check how many times we've remediated in the last hour
  const recentActions = await getRecentActions(alarmName, 60);

  if (recentActions >= 3) {
    console.warn(`Remediation limit reached for ${alarmName}, escalating to human`);
    await escalateToHuman(alarmName);
    return false;
  }

  return true;
}
```

For comprehensive monitoring of your Lambda remediation functions, see our guide on [debugging Lambda with CloudWatch Logs](https://oneuptime.com/blog/post/debug-lambda-functions-cloudwatch-logs/view).

## Wrapping Up

Triggering Lambda from CloudWatch Alarms turns passive monitoring into active remediation. Start with simple, safe actions like scaling up or sending enriched notifications. As you build confidence, add more sophisticated remediation logic. The EventBridge approach gives you better filtering and a richer event payload, but the SNS approach is simpler for straightforward alarm-to-function pipelines. Either way, always include safety guardrails - you don't want your auto-remediation to make things worse.
