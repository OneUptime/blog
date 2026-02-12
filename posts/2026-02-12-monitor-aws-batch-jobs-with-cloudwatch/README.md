# How to Monitor AWS Batch Jobs with CloudWatch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Batch, CloudWatch, Monitoring, Observability, Logging, Alerts

Description: Comprehensive guide to monitoring AWS Batch jobs using CloudWatch metrics, logs, alarms, and dashboards for full visibility into your batch processing pipelines.

---

Running batch jobs without proper monitoring is flying blind. You do not know if jobs are failing silently, running longer than expected, or if your compute environment is undersized. AWS Batch integrates natively with CloudWatch for metrics, logs, and alarms. Setting up comprehensive monitoring takes some effort, but it pays for itself the first time you catch a problem before it becomes a crisis.

This guide covers everything from basic log collection to advanced dashboards and alerting.

## What AWS Batch Sends to CloudWatch by Default

Out of the box, Batch does not push detailed metrics to CloudWatch. You get container logs (if configured) and some basic service-level information. For full visibility, you need to set up:

1. Container log collection
2. Custom metrics from your job code
3. CloudWatch alarms for failure detection
4. Dashboards for operational visibility

## Step 1: Configure Container Logging

Every Batch job should send its output to CloudWatch Logs. Configure this in the job definition.

```bash
# Create the log group first
aws logs create-log-group \
  --log-group-name /aws/batch/jobs \
  --retention-in-days 30

# Register a job definition with CloudWatch logging
aws batch register-job-definition \
  --job-definition-name monitored-job \
  --type container \
  --container-properties '{
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest",
    "resourceRequirements": [
      {"type": "VCPU", "value": "2"},
      {"type": "MEMORY", "value": "4096"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/aws/batch/jobs",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "my-app"
      }
    }
  }'
```

The log stream name will be: `my-app/<container-name>/<ecs-task-id>`

## Step 2: Emit Custom Metrics from Job Code

Push custom metrics from within your job to track business-level KPIs.

```python
# metrics.py - Custom CloudWatch metrics from Batch jobs
import boto3
import os
import time
from datetime import datetime

cloudwatch = boto3.client('cloudwatch')

def put_metric(metric_name, value, unit='Count', dimensions=None):
    """Publish a custom metric to CloudWatch"""
    metric_data = {
        'MetricName': metric_name,
        'Value': value,
        'Unit': unit,
        'Timestamp': datetime.utcnow(),
    }

    if dimensions:
        metric_data['Dimensions'] = [
            {'Name': k, 'Value': v} for k, v in dimensions.items()
        ]

    cloudwatch.put_metric_data(
        Namespace='BatchJobs',
        MetricData=[metric_data]
    )


def main():
    job_name = os.environ.get('AWS_BATCH_JOB_ID', 'unknown')
    job_queue = os.environ.get('AWS_BATCH_JQ_NAME', 'unknown')

    dimensions = {
        'JobQueue': job_queue,
        'JobDefinition': 'my-data-processor'
    }

    start_time = time.time()
    records_processed = 0
    errors = 0

    try:
        # Your actual processing logic
        for batch in get_data_batches():
            processed = process_batch(batch)
            records_processed += processed

            # Emit progress metrics every batch
            put_metric('RecordsProcessed', processed, 'Count', dimensions)

    except Exception as e:
        errors += 1
        put_metric('JobErrors', 1, 'Count', dimensions)
        raise

    finally:
        # Emit completion metrics
        duration = time.time() - start_time
        put_metric('JobDurationSeconds', duration, 'Seconds', dimensions)
        put_metric('TotalRecordsProcessed', records_processed, 'Count', dimensions)
        put_metric('ProcessingErrors', errors, 'Count', dimensions)

        print(f"Job complete: {records_processed} records in {duration:.1f}s, {errors} errors")
```

## Step 3: Monitor Job State Transitions with EventBridge

AWS Batch sends job state change events to EventBridge. Use these to track job lifecycle.

```bash
# Create an EventBridge rule for Batch job state changes
aws events put-rule \
  --name batch-job-state-changes \
  --event-pattern '{
    "source": ["aws.batch"],
    "detail-type": ["Batch Job State Change"],
    "detail": {
      "status": ["FAILED", "SUCCEEDED", "RUNNING"]
    }
  }'

# Send events to a CloudWatch log group for analysis
aws logs create-log-group --log-group-name /aws/events/batch-jobs

aws events put-targets \
  --rule batch-job-state-changes \
  --targets '[
    {
      "Id": "cloudwatch-logs",
      "Arn": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/events/batch-jobs"
    }
  ]'
```

## Step 4: Create CloudWatch Alarms

Set up alarms to catch problems early.

```bash
# Alarm: Too many failed jobs
aws cloudwatch put-metric-alarm \
  --alarm-name batch-high-failure-rate \
  --alarm-description "More than 10 Batch jobs failed in 1 hour" \
  --namespace BatchJobs \
  --metric-name JobErrors \
  --statistic Sum \
  --period 3600 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:batch-alerts \
  --treat-missing-data notBreaching

# Alarm: Jobs running too long
aws cloudwatch put-metric-alarm \
  --alarm-name batch-long-running-jobs \
  --alarm-description "Batch job taking longer than 2 hours" \
  --namespace BatchJobs \
  --metric-name JobDurationSeconds \
  --statistic Maximum \
  --period 300 \
  --threshold 7200 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:batch-alerts

# Alarm: Processing throughput dropped
aws cloudwatch put-metric-alarm \
  --alarm-name batch-low-throughput \
  --alarm-description "Record processing throughput below threshold" \
  --namespace BatchJobs \
  --metric-name RecordsProcessed \
  --statistic Sum \
  --period 3600 \
  --threshold 1000 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:batch-alerts \
  --treat-missing-data breaching
```

## Step 5: Create a Monitoring Dashboard

```bash
# Create a comprehensive Batch monitoring dashboard
aws cloudwatch put-dashboard \
  --dashboard-name BatchMonitoring \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "x": 0, "y": 0, "width": 12, "height": 6,
        "properties": {
          "title": "Job Completion Rate",
          "metrics": [
            ["BatchJobs", "TotalRecordsProcessed", "JobQueue", "data-pipeline-queue", {"stat": "Sum", "period": 3600}]
          ],
          "view": "timeSeries"
        }
      },
      {
        "type": "metric",
        "x": 12, "y": 0, "width": 12, "height": 6,
        "properties": {
          "title": "Job Errors",
          "metrics": [
            ["BatchJobs", "JobErrors", "JobQueue", "data-pipeline-queue", {"stat": "Sum", "period": 300, "color": "#d62728"}]
          ],
          "view": "timeSeries"
        }
      },
      {
        "type": "metric",
        "x": 0, "y": 6, "width": 12, "height": 6,
        "properties": {
          "title": "Job Duration",
          "metrics": [
            ["BatchJobs", "JobDurationSeconds", "JobDefinition", "my-data-processor", {"stat": "Average", "period": 300}],
            ["BatchJobs", "JobDurationSeconds", "JobDefinition", "my-data-processor", {"stat": "p99", "period": 300}]
          ],
          "view": "timeSeries"
        }
      },
      {
        "type": "log",
        "x": 12, "y": 6, "width": 12, "height": 6,
        "properties": {
          "title": "Recent Job Failures",
          "query": "SOURCE '\''/aws/events/batch-jobs'\'' | fields @timestamp, detail.jobName, detail.status, detail.statusReason | filter detail.status = '\''FAILED'\'' | sort @timestamp desc | limit 20",
          "region": "us-east-1",
          "view": "table"
        }
      }
    ]
  }'
```

## Step 6: Log Insights Queries

CloudWatch Log Insights lets you query across all your job logs.

```
# Find all failed jobs in the last 24 hours
fields @timestamp, @message
| filter @message like /ERROR|Exception|FATAL/
| sort @timestamp desc
| limit 50

# Calculate job success rate
filter @message like /Job complete/
| stats count() as total,
  sum(case when @message like /0 errors/ then 1 else 0 end) as succeeded
| display total, succeeded, (succeeded * 100.0 / total) as success_rate

# Find the slowest jobs
filter @message like /Job complete.*records in/
| parse @message "* records in *s" as records, duration
| sort duration desc
| limit 20
```

## Step 7: Automated Job Status Reporting

Create a Lambda function that runs periodically to report on Batch job health.

```python
# lambda_function.py - Batch health reporter
import boto3
import json
from datetime import datetime, timedelta

batch = boto3.client('batch')
sns = boto3.client('sns')

def lambda_handler(event, context):
    """Generate a daily Batch job health report"""
    now = datetime.utcnow()
    yesterday = now - timedelta(days=1)

    queues = ['data-pipeline-queue', 'ml-training-queue', 'analytics-queue']
    report_lines = [f"AWS Batch Daily Report - {now.strftime('%Y-%m-%d')}"]
    report_lines.append("=" * 50)

    for queue in queues:
        succeeded = count_jobs(queue, 'SUCCEEDED', yesterday)
        failed = count_jobs(queue, 'FAILED', yesterday)
        total = succeeded + failed
        success_rate = (succeeded / total * 100) if total > 0 else 0

        report_lines.append(f"\nQueue: {queue}")
        report_lines.append(f"  Total jobs: {total}")
        report_lines.append(f"  Succeeded: {succeeded}")
        report_lines.append(f"  Failed: {failed}")
        report_lines.append(f"  Success rate: {success_rate:.1f}%")

    report = "\n".join(report_lines)

    # Send via SNS
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789012:batch-daily-report',
        Subject=f'Batch Daily Report - {now.strftime("%Y-%m-%d")}',
        Message=report
    )

    return {'statusCode': 200, 'body': report}

def count_jobs(queue, status, since):
    count = 0
    paginator = batch.get_paginator('list_jobs')
    for page in paginator.paginate(jobQueue=queue, jobStatus=status):
        for job in page['jobSummaryList']:
            if job.get('createdAt', 0) / 1000 >= since.timestamp():
                count += 1
    return count
```

## Structured Logging Best Practices

Make your job logs machine-readable for better querying.

```python
import json
import sys
from datetime import datetime

def log_structured(level, message, **kwargs):
    """Emit structured JSON logs for CloudWatch"""
    entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'level': level,
        'message': message,
        'job_id': os.environ.get('AWS_BATCH_JOB_ID'),
        'job_name': os.environ.get('AWS_BATCH_JOB_NAME'),
        **kwargs
    }
    print(json.dumps(entry), flush=True)

# Usage
log_structured('INFO', 'Processing started', batch_size=100, input_file='data.csv')
log_structured('ERROR', 'Record processing failed', record_id='abc123', error='Invalid format')
log_structured('INFO', 'Processing complete', records_processed=5000, duration_seconds=142.5)
```

## Wrapping Up

Monitoring AWS Batch requires a combination of container logging, custom metrics, event tracking, and alerting. The default out-of-the-box visibility is limited, so investing in a proper monitoring setup is essential for any production Batch workload. Start with container logging and failure alarms, then build up to custom metrics and dashboards as your workloads mature. The goal is to know about problems before your users do, and to have enough data to diagnose issues quickly when they happen. For more on troubleshooting when things go wrong, see our guide on [troubleshooting AWS Batch job failures](https://oneuptime.com/blog/post/troubleshoot-aws-batch-job-failures/view).
