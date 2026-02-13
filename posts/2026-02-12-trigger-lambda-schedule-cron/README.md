# How to Trigger Lambda Functions on a Schedule (Cron)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, EventBridge, Cron, Scheduling

Description: Complete guide to running Lambda functions on a schedule using EventBridge cron and rate expressions for automated tasks, reports, and maintenance jobs.

---

Cron jobs have been around forever, and serverless doesn't change the need for them. You still need to generate nightly reports, clean up stale data, check for expiring certificates, and send summary emails. The difference is that instead of maintaining a cron server, you use EventBridge (formerly CloudWatch Events) to trigger Lambda functions on a schedule. No servers to manage, no crontab to edit, and you only pay for the execution time.

Let's set up scheduled Lambda functions using both rate expressions and cron expressions.

## Rate Expressions vs. Cron Expressions

AWS supports two scheduling formats:

**Rate expressions** run at a fixed interval:
- `rate(1 minute)` - every minute
- `rate(5 minutes)` - every 5 minutes
- `rate(1 hour)` - every hour
- `rate(1 day)` - once a day

**Cron expressions** run at specific times:
- `cron(0 8 * * ? *)` - every day at 8:00 AM UTC
- `cron(0 12 ? * MON-FRI *)` - weekdays at noon UTC
- `cron(0 0 1 * ? *)` - first day of every month at midnight UTC

The cron format is: `cron(minutes hours day-of-month month day-of-week year)`

Note that AWS cron expressions are in UTC and use a slightly different syntax than standard Unix cron. The `?` character is required in either the day-of-month or day-of-week field (but not both).

## Setting Up with AWS CDK

CDK makes scheduled Lambda functions clean and declarative.

This CDK stack creates Lambda functions triggered on different schedules:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';

export class ScheduledLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Daily report generator
    const reportGenerator = new lambda.Function(this, 'ReportGenerator', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/reports'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        REPORT_BUCKET: 'daily-reports-bucket',
        NOTIFICATION_EMAIL: 'team@example.com',
      },
    });

    // Run every day at 6:00 AM UTC
    new events.Rule(this, 'DailyReportRule', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '6',
        day: '*',
        month: '*',
        year: '*',
      }),
      targets: [new targets.LambdaFunction(reportGenerator)],
    });

    // Data cleanup function
    const cleanupFn = new lambda.Function(this, 'DataCleanup', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/cleanup'),
      timeout: cdk.Duration.minutes(10),
    });

    // Run every 4 hours
    new events.Rule(this, 'CleanupRule', {
      schedule: events.Schedule.rate(cdk.Duration.hours(4)),
      targets: [new targets.LambdaFunction(cleanupFn)],
    });

    // Health check function
    const healthChecker = new lambda.Function(this, 'HealthChecker', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/health-check'),
      timeout: cdk.Duration.seconds(30),
    });

    // Run every 5 minutes
    new events.Rule(this, 'HealthCheckRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      targets: [new targets.LambdaFunction(healthChecker)],
    });
  }
}
```

## Setting Up with the AWS CLI

For quick setup without Infrastructure as Code.

These commands create an EventBridge rule and connect it to a Lambda function:

```bash
# Create a scheduled rule (daily at 8 AM UTC)
aws events put-rule \
  --name daily-report \
  --schedule-expression "cron(0 8 * * ? *)" \
  --description "Generate daily report"

# Grant EventBridge permission to invoke Lambda
aws lambda add-permission \
  --function-name report-generator \
  --statement-id eventbridge-daily \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:123456789012:rule/daily-report

# Add the Lambda function as a target
aws events put-targets \
  --rule daily-report \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:report-generator"
```

## Writing Scheduled Lambda Handlers

Scheduled events have a specific format. The event payload tells you which rule triggered the invocation.

This handler generates a daily report when triggered by the schedule:

```javascript
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

const s3 = new S3Client({});
const dynamodb = new DynamoDBClient({});

exports.handler = async (event) => {
  console.log('Scheduled event:', JSON.stringify(event, null, 2));

  // event.source === 'aws.events'
  // event['detail-type'] === 'Scheduled Event'
  // event.resources contains the rule ARN

  const today = new Date().toISOString().split('T')[0];
  console.log(`Generating report for ${today}`);

  try {
    // Gather report data
    const orderData = await getOrderSummary(today);
    const errorData = await getErrorSummary(today);

    // Build the report
    const report = {
      date: today,
      generatedAt: new Date().toISOString(),
      orders: orderData,
      errors: errorData,
    };

    // Save to S3
    await s3.send(new PutObjectCommand({
      Bucket: process.env.REPORT_BUCKET,
      Key: `reports/${today}/daily-summary.json`,
      Body: JSON.stringify(report, null, 2),
      ContentType: 'application/json',
    }));

    console.log(`Report saved: reports/${today}/daily-summary.json`);

    // Optionally send notification
    if (report.errors.count > 0) {
      await sendErrorAlert(report);
    }

    return { statusCode: 200, report: `reports/${today}/daily-summary.json` };
  } catch (error) {
    console.error('Report generation failed:', error);
    throw error; // Lambda will retry
  }
};
```

## Common Scheduling Patterns

### Weekday-Only Schedules

Run only on business days:

```typescript
new events.Rule(this, 'WeekdayRule', {
  schedule: events.Schedule.cron({
    minute: '0',
    hour: '9',
    weekDay: 'MON-FRI',
    month: '*',
    year: '*',
  }),
  targets: [new targets.LambdaFunction(handler)],
});
```

### Multiple Times Per Day

Run at 9 AM and 5 PM UTC:

```typescript
// 9 AM rule
new events.Rule(this, 'MorningRule', {
  schedule: events.Schedule.cron({ minute: '0', hour: '9' }),
  targets: [new targets.LambdaFunction(handler)],
});

// 5 PM rule
new events.Rule(this, 'EveningRule', {
  schedule: events.Schedule.cron({ minute: '0', hour: '17' }),
  targets: [new targets.LambdaFunction(handler)],
});
```

### Last Day of the Month

AWS cron doesn't support "last day of month" directly, but you can work around it in your Lambda code:

```javascript
exports.handler = async (event) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if tomorrow is a different month
  if (today.getMonth() !== tomorrow.getMonth()) {
    console.log('Last day of the month - running report');
    await generateMonthlyReport();
  } else {
    console.log('Not the last day, skipping');
  }
};
```

Schedule this to run daily, and it'll only do real work on the last day.

## Passing Input to Scheduled Functions

You can pass custom input to your Lambda function instead of the default EventBridge event.

This CDK configuration passes custom JSON input to the scheduled Lambda:

```typescript
new events.Rule(this, 'CustomInputRule', {
  schedule: events.Schedule.rate(cdk.Duration.hours(1)),
  targets: [
    new targets.LambdaFunction(handler, {
      event: events.RuleTargetInput.fromObject({
        action: 'cleanup',
        maxAge: 24,
        dryRun: false,
      }),
    }),
  ],
});
```

Your Lambda receives `{ action: 'cleanup', maxAge: 24, dryRun: false }` as the event payload.

## Handling Long-Running Jobs

Lambda has a 15-minute timeout. For jobs that take longer, you have options:

1. **Break the work into chunks** and process incrementally across invocations
2. **Use Step Functions** to orchestrate multi-step workflows
3. **Fan out to SQS** and process items in parallel

Here's the fan-out pattern for processing large datasets:

```javascript
const { SQSClient, SendMessageBatchCommand } = require('@aws-sdk/client-sqs');
const sqs = new SQSClient({});

exports.handler = async (event) => {
  // Get the list of items to process
  const items = await getItemsToProcess();
  console.log(`Found ${items.length} items to process`);

  // Fan out to SQS for parallel processing
  const batches = [];
  for (let i = 0; i < items.length; i += 10) {
    const batch = items.slice(i, i + 10).map((item, idx) => ({
      Id: String(idx),
      MessageBody: JSON.stringify(item),
    }));

    batches.push(
      sqs.send(new SendMessageBatchCommand({
        QueueUrl: process.env.PROCESSING_QUEUE_URL,
        Entries: batch,
      }))
    );
  }

  await Promise.all(batches);
  console.log(`Enqueued ${items.length} items for processing`);
};
```

For more on the SQS processing pattern, see [triggering Lambda from SQS queues](https://oneuptime.com/blog/post/2026-02-12-trigger-lambda-sqs-queues/view).

## Monitoring Scheduled Functions

Scheduled functions are easy to forget about until they stop working. Set up monitoring:

1. Create a CloudWatch alarm on the `Invocations` metric. If it drops to zero, your schedule stopped firing.
2. Create an alarm on `Errors`. Scheduled functions should have a near-zero error rate.
3. Monitor `Duration` to catch performance degradation before it becomes a timeout.

For more detailed monitoring approaches, see our guide on [debugging Lambda with CloudWatch Logs](https://oneuptime.com/blog/post/2026-02-12-debug-lambda-functions-cloudwatch-logs/view).

## Timezone Considerations

EventBridge cron expressions use UTC. If you need a job to run at 9 AM Eastern time, you need to account for daylight saving time. During EST (UTC-5), schedule it for 14:00 UTC. During EDT (UTC-4), it should be 13:00 UTC.

There's no automatic timezone adjustment. The simplest approach is to schedule the job for the earlier time and check the local time in your Lambda code:

```javascript
function isBusinessHours() {
  const easternTime = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York'
  });
  const hour = new Date(easternTime).getHours();
  return hour >= 9 && hour < 17;
}
```

## Wrapping Up

Scheduled Lambda functions replace cron servers with zero maintenance overhead. Use rate expressions for simple intervals and cron expressions for specific times. Remember that all schedules are in UTC, the minimum resolution is one minute, and you should always monitor your scheduled functions to make sure they're actually running. For anything beyond 15 minutes of execution time, fan out the work to SQS or orchestrate with Step Functions.
