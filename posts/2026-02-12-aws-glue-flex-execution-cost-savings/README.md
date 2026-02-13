# How to Use AWS Glue Flex Execution for Cost Savings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Glue, ETL, Cost Optimization

Description: Learn how to use AWS Glue Flex execution to reduce ETL job costs by up to 34% using spare compute capacity for non-time-critical data processing workloads.

---

Not every ETL job needs to run immediately. If your nightly batch processing can handle a few extra minutes of startup delay, AWS Glue Flex execution lets you tap into spare compute capacity at a significant discount. It's similar in concept to EC2 Spot Instances but specifically for Glue jobs.

Flex execution can save you up to 34% compared to standard Glue pricing. The tradeoff is that your job might take a bit longer to start (because it waits for spare capacity), but once it's running, it executes at the same speed as standard execution.

## How Flex Execution Works

When you run a Glue job in standard mode, AWS allocates dedicated compute resources immediately. With Flex execution, Glue uses spare capacity that's available in the service. This means:

- **Startup might be delayed** - Your job waits until enough spare capacity is available. This could be seconds or several minutes.
- **Execution speed is the same** - Once your job starts, it runs on the same hardware at the same speed.
- **No preemption** - Unlike EC2 Spot, Glue Flex jobs won't be interrupted mid-execution. Once started, they run to completion.
- **Same features** - All Glue features work identically, including bookmarks, connections, and data catalog access.

That "no preemption" part is important. With EC2 Spot, your instance can be taken away at any time. With Glue Flex, once your workers are allocated, they're yours until the job finishes.

## Enabling Flex Execution

Enabling Flex is straightforward - you just change the execution class when creating or updating a job:

```bash
# Create a Glue job with Flex execution
aws glue create-job \
    --name "daily-sales-etl-flex" \
    --role "arn:aws:iam::123456789012:role/GlueJobRole" \
    --command '{
        "Name": "glueetl",
        "ScriptLocation": "s3://my-glue-scripts/daily-sales-etl.py",
        "PythonVersion": "3"
    }' \
    --glue-version "4.0" \
    --execution-class "FLEX" \
    --worker-type "G.1X" \
    --number-of-workers 10 \
    --default-arguments '{
        "--job-bookmark-option": "job-bookmark-enable",
        "--TempDir": "s3://my-glue-temp/",
        "--enable-metrics": "true",
        "--enable-continuous-cloudwatch-log": "true"
    }'
```

The key parameter is `--execution-class "FLEX"`. Everything else stays the same as a standard job.

## Updating an Existing Job to Flex

If you already have a standard job that's a good candidate for Flex:

```bash
# Update an existing job to use Flex execution
aws glue update-job \
    --job-name "daily-sales-etl" \
    --job-update '{
        "ExecutionClass": "FLEX"
    }'
```

That's literally it. One parameter change.

## Which Jobs Are Good Candidates for Flex?

Flex works best for jobs that:

- **Run on a schedule with some time buffer.** If your nightly job needs to finish by 6 AM and normally takes 2 hours, scheduling it at midnight gives plenty of buffer for a delayed start.
- **Process batch data** - not real-time. Jobs triggered by event-based schedules where latency matters aren't great fits.
- **Run for more than a few minutes.** The startup delay is a fixed cost, so it's more impactful on short jobs.
- **Don't have strict SLA requirements.** If your downstream systems break when the ETL is late, stick with standard.

Jobs that are NOT good candidates:
- Time-critical jobs with tight SLAs
- Jobs triggered by real-time events that need immediate processing
- Very short jobs (under 5 minutes) where the startup delay is proportionally large

## Cost Comparison Example

Let's do the math on a real example:

```
Job: Daily sales data ETL
Worker type: G.1X (4 vCPU, 16 GB)
Number of workers: 10
Job duration: 30 minutes
Runs: Once per day

Standard pricing (example rates):
  10 workers x 0.5 hours x $0.44/DPU-hour = $2.20 per run
  $2.20 x 30 days = $66.00 per month

Flex pricing (34% discount):
  10 workers x 0.5 hours x $0.29/DPU-hour = $1.45 per run
  $1.45 x 30 days = $43.50 per month

Monthly savings: $22.50 (34%)
```

That's one job. If you have 20 batch jobs, the savings add up to $450/month just by changing one parameter. Over a year, that's $5,400 for essentially zero effort.

## Running Flex Jobs on a Schedule

Schedule Flex jobs with some extra buffer time. Here's how to set up a schedule using Glue triggers:

```bash
# Create a scheduled trigger that runs the Flex job at midnight
aws glue create-trigger \
    --name "nightly-sales-etl-trigger" \
    --type "SCHEDULED" \
    --schedule "cron(0 0 * * ? *)" \
    --actions '[
        {
            "JobName": "daily-sales-etl-flex",
            "Arguments": {
                "--processing_date": "yesterday"
            }
        }
    ]' \
    --start-on-creation

# Create a workflow for multiple Flex jobs that run in sequence
aws glue create-workflow --name "nightly-batch-workflow"

# Add a schedule trigger
aws glue create-trigger \
    --name "workflow-start" \
    --type "SCHEDULED" \
    --schedule "cron(0 0 * * ? *)" \
    --workflow-name "nightly-batch-workflow" \
    --actions '[{"JobName": "extract-raw-data-flex"}]' \
    --start-on-creation

# Add a conditional trigger for the next job in the chain
aws glue create-trigger \
    --name "after-extract" \
    --type "CONDITIONAL" \
    --workflow-name "nightly-batch-workflow" \
    --predicate '{
        "Conditions": [
            {
                "LogicalOperator": "EQUALS",
                "JobName": "extract-raw-data-flex",
                "State": "SUCCEEDED"
            }
        ]
    }' \
    --actions '[{"JobName": "transform-and-load-flex"}]' \
    --start-on-creation
```

## Monitoring Flex Job Performance

Track how Flex execution affects your job metrics:

```bash
# Get job run history with start times to measure startup delay
aws glue get-job-runs \
    --job-name "daily-sales-etl-flex" \
    --max-results 10 \
    --query "JobRuns[*].{RunId:Id,StartTime:StartedOn,CompletedTime:CompletedOn,ExecutionTime:ExecutionTime,State:JobRunState}"
```

Compare the time between `trigger_time` and `StartedOn` to understand the typical Flex startup delay.

You can also set up a CloudWatch alarm for delayed starts:

```bash
# Alarm if job hasn't started within 30 minutes of scheduled time
aws cloudwatch put-metric-alarm \
    --alarm-name "flex-job-delayed-start" \
    --alarm-description "Flex ETL job has not started within expected window" \
    --namespace "AWS/Glue" \
    --metric-name "glue.driver.aggregate.elapsedTime" \
    --dimensions Name=JobName,Value=daily-sales-etl-flex \
    --statistic Sum \
    --period 1800 \
    --evaluation-periods 1 \
    --threshold 0 \
    --comparison-operator LessThanOrEqualToThreshold \
    --treat-missing-data "breaching" \
    --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-alerts"
```

## Mixing Standard and Flex in a Workflow

Not every job in your pipeline needs to be Flex. You can mix standard and Flex execution within the same workflow:

```python
# Example workflow: time-critical extract (standard) followed by
# non-critical transform and load (flex)

# Job 1: Extract from production database (standard - needs to be fast)
# ExecutionClass: STANDARD

# Job 2: Transform and enrich data (flex - can wait for capacity)
# ExecutionClass: FLEX

# Job 3: Load into data warehouse (flex - can wait)
# ExecutionClass: FLEX

# Job 4: Generate reports and send notifications (standard - time-critical)
# ExecutionClass: STANDARD
```

## CloudFormation Template

Here's a complete CloudFormation setup for a Flex job:

```yaml
Resources:
  FlexETLJob:
    Type: AWS::Glue::Job
    Properties:
      Name: daily-sales-etl-flex
      Role: !GetAtt GlueJobRole.Arn
      GlueVersion: "4.0"
      ExecutionClass: FLEX
      WorkerType: G.1X
      NumberOfWorkers: 10
      Command:
        Name: glueetl
        ScriptLocation: !Sub "s3://${ScriptsBucket}/daily-sales-etl.py"
        PythonVersion: "3"
      DefaultArguments:
        "--job-bookmark-option": "job-bookmark-enable"
        "--TempDir": !Sub "s3://${TempBucket}/"
        "--enable-metrics": "true"
        "--enable-continuous-cloudwatch-log": "true"

  NightlyTrigger:
    Type: AWS::Glue::Trigger
    Properties:
      Name: nightly-flex-trigger
      Type: SCHEDULED
      Schedule: "cron(0 0 * * ? *)"
      StartOnCreation: true
      Actions:
        - JobName: !Ref FlexETLJob
```

Flex execution is one of the simplest cost optimizations you can make in your Glue pipeline. Zero code changes, zero performance impact once running, and consistent savings. For faster development of these jobs, check out [Glue interactive sessions](https://oneuptime.com/blog/post/2026-02-12-aws-glue-interactive-sessions-development/view).
