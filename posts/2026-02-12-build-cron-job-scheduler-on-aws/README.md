# How to Build a Cron Job Scheduler on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, EventBridge, CloudWatch, Serverless

Description: A complete guide to building reliable cron job schedulers on AWS using EventBridge rules, Lambda functions, and Step Functions for complex workflows.

---

Every application needs scheduled tasks. Sending daily reports, cleaning up old data, syncing between services, running health checks - these are the bread and butter of backend operations. On traditional servers, you'd throw these in crontab and call it a day. On AWS, you have better options that don't involve babysitting an EC2 instance.

Let's look at how to build a proper cron job scheduler on AWS that's reliable, observable, and doesn't cost much to run.

## The Options

AWS gives you several ways to run scheduled tasks:

- **EventBridge Scheduler** - The newest and most feature-rich option
- **EventBridge Rules** - The classic approach with cron/rate expressions
- **Step Functions** - For complex workflows with retries and branching
- **ECS Scheduled Tasks** - When you need Docker containers

For most use cases, EventBridge Scheduler combined with Lambda is the best starting point. Let's build it out.

## Basic Setup: EventBridge + Lambda

The simplest cron job on AWS is an EventBridge rule that triggers a Lambda function on a schedule. Here's a CDK stack that sets up a nightly cleanup job.

```typescript
// lib/cron-scheduler-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export class CronSchedulerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // Lambda function that runs the cleanup
    const cleanupFunction = new lambda.Function(this, 'CleanupFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'cleanup.handler',
      code: lambda.Code.fromAsset('lambda'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      environment: {
        RETENTION_DAYS: '30',
      },
    });

    // Schedule: run every day at 2 AM UTC
    new events.Rule(this, 'DailyCleanupRule', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '2',
        day: '*',
        month: '*',
        year: '*',
      }),
      targets: [new targets.LambdaFunction(cleanupFunction)],
    });
  }
}
```

The Lambda function itself can do whatever you need.

```javascript
// lambda/cleanup.js
const { DynamoDBClient, ScanCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({});
const retentionDays = parseInt(process.env.RETENTION_DAYS || '30');

exports.handler = async (event) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  console.log(`Cleaning up records older than ${cutoffDate.toISOString()}`);

  // Scan for expired records
  const { Items } = await client.send(new ScanCommand({
    TableName: 'SessionData',
    FilterExpression: 'expiresAt < :cutoff',
    ExpressionAttributeValues: {
      ':cutoff': { S: cutoffDate.toISOString() },
    },
  }));

  console.log(`Found ${Items.length} records to delete`);

  // Delete in batches
  for (const item of Items) {
    await client.send(new DeleteItemCommand({
      TableName: 'SessionData',
      Key: { id: item.id },
    }));
  }

  return {
    deleted: Items.length,
    cutoffDate: cutoffDate.toISOString(),
  };
};
```

## EventBridge Scheduler - The Better Way

EventBridge Scheduler is newer and more powerful than EventBridge Rules. It supports one-time schedules, built-in retries, dead-letter queues, and time zones. If you're starting fresh, use this instead.

```typescript
// Using EventBridge Scheduler with CDK
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import * as iam from 'aws-cdk-lib/aws-iam';

// Create a role for the scheduler
const schedulerRole = new iam.Role(this, 'SchedulerRole', {
  assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
});

// Allow the scheduler to invoke the Lambda function
cleanupFunction.grantInvoke(schedulerRole);

// Create the schedule with timezone support and retry policy
new scheduler.CfnSchedule(this, 'DailyCleanupSchedule', {
  scheduleExpression: 'cron(0 2 * * ? *)',
  scheduleExpressionTimezone: 'America/New_York',
  flexibleTimeWindow: {
    mode: 'FLEXIBLE',
    maximumWindowInMinutes: 15, // Run within a 15-minute window
  },
  target: {
    arn: cleanupFunction.functionArn,
    roleArn: schedulerRole.roleArn,
    retryPolicy: {
      maximumRetryAttempts: 3,
      maximumEventAgeInSeconds: 3600,
    },
    deadLetterConfig: {
      arn: deadLetterQueue.queueArn, // Capture failed invocations
    },
  },
});
```

The flexible time window is a nice touch. Instead of all your scheduled tasks firing at exactly the same second, AWS spreads them across a window. This smooths out load and reduces the chance of throttling.

## Cron Expression Reference

AWS cron expressions have six fields, which is slightly different from the standard Unix five-field format.

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12 or JAN-DEC)
│ │ │ │ ┌───────────── day of week (1-7 or SUN-SAT)
│ │ │ │ │ ┌───────────── year
│ │ │ │ │ │
* * * * ? *
```

Some common patterns:

```
cron(0 9 * * ? *)       - Every day at 9 AM UTC
cron(0 */4 * * ? *)     - Every 4 hours
cron(0 9 ? * MON-FRI *) - Weekdays at 9 AM UTC
cron(0 0 1 * ? *)       - First day of every month at midnight
cron(30 10 ? * 2 *)     - Every Monday at 10:30 AM UTC
```

One gotcha: you can't specify both day-of-month and day-of-week. One of them must be a question mark (`?`).

## Complex Workflows with Step Functions

Sometimes a cron job isn't just one Lambda function. Maybe you need to extract data, transform it, load it somewhere, then send a notification. Step Functions let you chain tasks together with built-in error handling.

```json
{
  "Comment": "Nightly data processing pipeline",
  "StartAt": "ExtractData",
  "States": {
    "ExtractData": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:ExtractData",
      "Retry": [
        {
          "ErrorEquals": ["States.TaskFailed"],
          "IntervalSeconds": 60,
          "MaxAttempts": 3,
          "BackoffRate": 2
        }
      ],
      "Next": "TransformData"
    },
    "TransformData": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:TransformData",
      "Next": "LoadData"
    },
    "LoadData": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789:function:LoadData",
      "Next": "SendNotification"
    },
    "SendNotification": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:us-east-1:123456789:pipeline-notifications",
        "Message.$": "$.result"
      },
      "End": true
    }
  }
}
```

You trigger the Step Function from EventBridge just like you'd trigger Lambda.

## Monitoring Your Cron Jobs

The biggest problem with cron jobs is silent failures. The job crashes at 2 AM, nobody notices until Monday morning. You need monitoring.

Set up CloudWatch alarms for your scheduled Lambda functions.

```typescript
// Alert if the cleanup function fails
new cloudwatch.Alarm(this, 'CleanupFailureAlarm', {
  metric: cleanupFunction.metricErrors({
    period: cdk.Duration.hours(1),
  }),
  threshold: 1,
  evaluationPeriods: 1,
  alarmDescription: 'Cleanup cron job failed',
  actionsEnabled: true,
});

// Alert if the cleanup function doesn't run at all
new cloudwatch.Alarm(this, 'CleanupMissingAlarm', {
  metric: cleanupFunction.metricInvocations({
    period: cdk.Duration.hours(25), // Check over 25 hours to catch daily jobs
  }),
  threshold: 1,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
  alarmDescription: 'Cleanup cron job did not run in the last 25 hours',
});
```

For more comprehensive monitoring, take a look at our guide on [building a logging and monitoring stack on AWS](https://oneuptime.com/blog/post/build-logging-and-monitoring-stack-on-aws/view) which covers CloudWatch dashboards and alerting.

## Handling Long-Running Jobs

Lambda has a 15-minute timeout limit. If your cron job needs more time, you have a few options:

1. **Break it into chunks** - Process data in pages, passing a continuation token between invocations
2. **Use ECS Scheduled Tasks** - Run a Docker container that can run for hours
3. **Use Step Functions with Map state** - Fan out work across multiple Lambda invocations

Here's the ECS approach for jobs that need more than 15 minutes.

```typescript
// ECS Scheduled Task for long-running jobs
const taskDefinition = new ecs.FargateTaskDefinition(this, 'LongJobTask', {
  memoryLimitMiB: 512,
  cpu: 256,
});

taskDefinition.addContainer('JobContainer', {
  image: ecs.ContainerImage.fromRegistry('your-ecr-repo/long-job:latest'),
  logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'long-job' }),
});

new events.Rule(this, 'WeeklyLongJobRule', {
  schedule: events.Schedule.cron({ minute: '0', hour: '3', weekDay: 'SUN' }),
  targets: [new targets.EcsTask({
    cluster,
    taskDefinition,
    subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  })],
});
```

## Cost Considerations

The beauty of EventBridge + Lambda for cron jobs is cost. EventBridge Scheduler is free for most use cases (14 million free invocations per month). Lambda charges only for execution time. A daily job running for 10 seconds costs almost nothing.

Compare that to keeping an EC2 instance running 24/7 just for crontab - you're saving real money, especially if you have jobs that run infrequently.

## Final Thoughts

Building cron jobs on AWS is about picking the right tool for the complexity of your workflow. Start simple with EventBridge + Lambda, add Step Functions when you need multi-step orchestration, and reach for ECS when you hit Lambda's time limits. Whatever you choose, make sure you have monitoring in place. A cron job that fails silently is worse than no cron job at all.
