# How to Monitor Lambda Function Performance with CloudWatch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, CloudWatch, Monitoring, Observability

Description: Set up comprehensive monitoring for AWS Lambda functions using CloudWatch metrics, alarms, dashboards, and logs to track performance, errors, and costs.

---

Shipping Lambda functions without monitoring is like driving with your eyes closed. Things might work fine for a while, but when they break, you won't know until users start complaining. CloudWatch is the default monitoring tool for Lambda, and it provides a solid set of metrics out of the box. With some additional configuration, you can build a complete observability setup that catches problems before they impact users.

Let's go through what CloudWatch gives you for free, what you should add, and how to set up alarms and dashboards that actually help.

## Built-in Lambda Metrics

Lambda automatically sends these metrics to CloudWatch - no configuration needed:

| Metric | What It Measures |
|---|---|
| Invocations | Number of times the function was called |
| Errors | Number of invocations that resulted in an error |
| Duration | Execution time in milliseconds |
| Throttles | Invocations that were throttled due to concurrency limits |
| ConcurrentExecutions | Number of function instances running simultaneously |
| UnreservedConcurrentExecutions | Concurrent executions using the unreserved pool |
| IteratorAge | (Streams) Age of the last record processed |

These metrics are available at both the function level and alias/version level.

## Essential CloudWatch Alarms

At minimum, set up alarms for errors and throttles:

```yaml
# CloudFormation: Essential Lambda alarms
Resources:
  # Alert when errors exceed threshold
  ErrorAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "${FunctionName}-errors"
      AlarmDescription: Lambda function error rate is too high
      MetricName: Errors
      Namespace: AWS/Lambda
      Statistic: Sum
      Period: 300        # 5 minutes
      EvaluationPeriods: 1
      Threshold: 10
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: FunctionName
          Value: !Ref MyFunction
      AlarmActions:
        - !Ref AlertTopic
      OKActions:
        - !Ref AlertTopic
      TreatMissingData: notBreaching

  # Alert when function is being throttled
  ThrottleAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "${FunctionName}-throttles"
      AlarmDescription: Lambda function is being throttled
      MetricName: Throttles
      Namespace: AWS/Lambda
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      Dimensions:
        - Name: FunctionName
          Value: !Ref MyFunction
      AlarmActions:
        - !Ref AlertTopic

  # Alert on high latency (p99)
  LatencyAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "${FunctionName}-high-latency"
      AlarmDescription: Lambda function p99 latency is too high
      MetricName: Duration
      Namespace: AWS/Lambda
      ExtendedStatistic: p99
      Period: 300
      EvaluationPeriods: 2
      Threshold: 5000    # 5 seconds
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: FunctionName
          Value: !Ref MyFunction
      AlarmActions:
        - !Ref AlertTopic

  # SNS topic for alarm notifications
  AlertTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: lambda-alerts
      Subscription:
        - Protocol: email
          Endpoint: ops-team@yourcompany.com
```

## Creating Alarms with the CLI

Quick alarm setup for an existing function:

```bash
# Error alarm - fires when more than 5 errors in 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name "my-function-errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions "Name=FunctionName,Value=my-function" \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:lambda-alerts"

# Duration alarm - fires when p99 exceeds 3 seconds
aws cloudwatch put-metric-alarm \
  --alarm-name "my-function-latency" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --extended-statistic p99 \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 3000 \
  --comparison-operator GreaterThanThreshold \
  --dimensions "Name=FunctionName,Value=my-function" \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:lambda-alerts"
```

## Building a Dashboard

A good Lambda dashboard shows all the key metrics at a glance. Here's a CloudFormation template for a comprehensive dashboard:

```yaml
# CloudWatch dashboard for Lambda monitoring
LambdaDashboard:
  Type: AWS::CloudWatch::Dashboard
  Properties:
    DashboardName: lambda-monitoring
    DashboardBody: !Sub |
      {
        "widgets": [
          {
            "type": "metric",
            "x": 0, "y": 0, "width": 12, "height": 6,
            "properties": {
              "title": "Invocations & Errors",
              "metrics": [
                ["AWS/Lambda", "Invocations", "FunctionName", "${MyFunction}", {"stat": "Sum"}],
                ["AWS/Lambda", "Errors", "FunctionName", "${MyFunction}", {"stat": "Sum", "color": "#d62728"}]
              ],
              "period": 60,
              "view": "timeSeries"
            }
          },
          {
            "type": "metric",
            "x": 12, "y": 0, "width": 12, "height": 6,
            "properties": {
              "title": "Duration (ms)",
              "metrics": [
                ["AWS/Lambda", "Duration", "FunctionName", "${MyFunction}", {"stat": "Average", "label": "Average"}],
                ["...", {"stat": "p50", "label": "p50"}],
                ["...", {"stat": "p99", "label": "p99", "color": "#d62728"}]
              ],
              "period": 60,
              "view": "timeSeries"
            }
          },
          {
            "type": "metric",
            "x": 0, "y": 6, "width": 12, "height": 6,
            "properties": {
              "title": "Concurrent Executions",
              "metrics": [
                ["AWS/Lambda", "ConcurrentExecutions", "FunctionName", "${MyFunction}", {"stat": "Maximum"}]
              ],
              "period": 60
            }
          },
          {
            "type": "metric",
            "x": 12, "y": 6, "width": 12, "height": 6,
            "properties": {
              "title": "Throttles",
              "metrics": [
                ["AWS/Lambda", "Throttles", "FunctionName", "${MyFunction}", {"stat": "Sum", "color": "#ff7f0e"}]
              ],
              "period": 60
            }
          },
          {
            "type": "log",
            "x": 0, "y": 12, "width": 24, "height": 6,
            "properties": {
              "title": "Recent Errors",
              "query": "SOURCE '/aws/lambda/${MyFunction}' | filter @message like /ERROR/ | sort @timestamp desc | limit 20",
              "region": "${AWS::Region}",
              "view": "table"
            }
          }
        ]
      }
```

## CloudWatch Logs Insights

Lambda sends all `console.log` output to CloudWatch Logs. Use Logs Insights to query and analyze your logs.

Find the slowest invocations:

```
# Find the 10 slowest invocations in the last hour
filter @type = "REPORT"
| fields @requestId, @duration, @maxMemoryUsed, @memorySize
| sort @duration desc
| limit 10
```

Find cold starts:

```
# Identify cold starts and their duration
filter @type = "REPORT"
| fields @requestId, @duration, @initDuration
| filter ispresent(@initDuration)
| sort @initDuration desc
| limit 20
```

Calculate error rate:

```
# Calculate error rate over time
filter @type = "REPORT"
| stats
    count(*) as total,
    sum(strcontains(@message, 'ERROR')) as errors,
    (sum(strcontains(@message, 'ERROR')) / count(*)) * 100 as errorRate
  by bin(5m)
```

Analyze memory usage:

```
# Find functions using most of their allocated memory
filter @type = "REPORT"
| fields @maxMemoryUsed / 1000000 as memUsedMB, @memorySize as memAllocated
| fields (memUsedMB / memAllocated) * 100 as memoryUtilization
| filter memoryUtilization > 80
| sort memoryUtilization desc
| limit 10
```

## Structured Logging for Better Insights

Structured JSON logs make querying much easier:

```javascript
// Structured logging helper for Lambda
const log = (level, message, data = {}) => {
  console.log(JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  }));
};

exports.handler = async (event) => {
  const startTime = Date.now();

  log('INFO', 'Processing request', {
    path: event.path,
    method: event.httpMethod,
    userId: event.requestContext?.authorizer?.userId,
  });

  try {
    const result = await processRequest(event);

    log('INFO', 'Request completed', {
      statusCode: result.statusCode,
      durationMs: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    log('ERROR', 'Request failed', {
      error: error.message,
      stack: error.stack,
      durationMs: Date.now() - startTime,
    });

    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
```

Then query with Logs Insights:

```
# Query structured logs for slow operations
filter level = "INFO" and message = "Request completed"
| stats avg(durationMs) as avgDuration, max(durationMs) as maxDuration, count(*) as requests
  by bin(5m)
```

## Cost Monitoring

Lambda costs are based on invocations, duration, and memory. Track them:

```
# Estimate Lambda cost from REPORT logs
filter @type = "REPORT"
| stats
    count(*) as invocations,
    sum(@billedDuration) / 1000 as totalBilledSeconds,
    avg(@memorySize) as avgMemoryMB
  by bin(1h)
```

You can also set up a CloudWatch alarm on the AWS/Billing namespace to alert when Lambda spending exceeds a threshold.

## Setting Up Log Retention

Lambda logs are retained forever by default, which gets expensive. Set a retention policy:

```bash
# Set log retention to 30 days
aws logs put-retention-policy \
  --log-group-name /aws/lambda/my-function \
  --retention-in-days 30
```

Or in CloudFormation:

```yaml
# Set log retention for the Lambda function
LogGroup:
  Type: AWS::Logs::LogGroup
  Properties:
    LogGroupName: !Sub "/aws/lambda/${MyFunction}"
    RetentionInDays: 30
```

For custom metrics beyond what CloudWatch provides, see our guide on [creating custom CloudWatch metrics from Lambda](https://oneuptime.com/blog/post/create-custom-cloudwatch-metrics-from-lambda/view). For enhanced monitoring with Lambda-specific insights, check out [using Lambda Insights for enhanced monitoring](https://oneuptime.com/blog/post/use-lambda-insights-for-enhanced-monitoring/view).

## Wrapping Up

CloudWatch provides a solid monitoring foundation for Lambda functions out of the box. The key is to go beyond the defaults: set up alarms for errors, throttles, and latency; build dashboards that show your function's health at a glance; use structured logging for effective troubleshooting; and leverage Logs Insights for deep analysis. Good monitoring means you catch problems before users do, and when something does break, you have the data to fix it fast.
