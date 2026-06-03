# How to Use AWS Glue Flex Execution for Cost Savings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Glue, ETL, Cost Optimization

Description: Learn how to use AWS Glue Flex execution to reduce ETL job costs by up to 34% using spare compute capacity for non-time-critical data processing workloads.

---

Not every ETL job needs to run immediately. If your nightly batch processing can handle a few extra minutes of startup delay, AWS Glue Flex execution lets you tap into spare compute capacity at a significant discount. It's similar in concept to EC2 Spot Instances but specifically for Glue jobs.

Flex execution can save you up to 34% compared to standard Glue pricing. The tradeoff is that your job might take a bit longer to start (because it waits for spare capacity), and its total runtime can vary if non-dedicated capacity is reclaimed while it runs.

## How Flex Execution Works

When you run a Glue job in standard mode, AWS allocates dedicated compute resources immediately. With Flex execution, Glue uses spare capacity that's available in the service. This means:

- **Startup might be delayed** - Your job waits until enough spare capacity is available. This could be seconds or several minutes.
- **Runtime can vary** - Once your job starts, it runs with the same job capabilities, but non-dedicated capacity can be reclaimed during execution.
- **Retries matter** - If a Flex run is interrupted because AWS Glue no longer has enough workers to complete it, the run fails and Glue retries it according to the job's retry settings.
- **Same Spark job capabilities** - Supported Spark jobs can still use features like bookmarks, connections, and data catalog access.

That retry behavior is important. With EC2 Spot, your instance can be taken away at any time. With Glue Flex, AWS Glue handles the managed capacity, but you should still configure retries and avoid using Flex for jobs that cannot tolerate variable start or completion times.

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

The key parameter is `--execution-class "FLEX"`. Flex is supported for AWS Glue Spark jobs that use Glue version 3.0 or later and the `glueetl` command type.

## Updating an Existing Job to Flex

If you already have a standard job that's a good candidate for Flex:

```bash
# Get the current job settings, change ExecutionClass, then update the job.
# update-job overwrites omitted settings, so keep the existing fields you need.
aws glue get-job \
    --job-name "daily-sales-etl" \
    --query 'Job.{Role:Role,Command:Command,GlueVersion:GlueVersion,WorkerType:WorkerType,NumberOfWorkers:NumberOfWorkers,DefaultArguments:DefaultArguments,ExecutionClass:`FLEX`}' \
    > job-update.json

aws glue update-job \
    --job-name "daily-sales-etl" \
    --job-update file://job-update.json
```

The actual setting is one parameter, but the update request should preserve the rest of the job definition.

## Which Jobs Are Good Candidates for Flex?

Flex works best for jobs that:

- **Run on a schedule with some time buffer.** If your nightly job needs to finish by 6 AM and normally takes 2 hours, scheduling it at midnight gives plenty of buffer for a delayed start.
- **Process batch data** - not real-time. Jobs triggered by event-based schedules where latency matters aren't great fits.
- **Run for more than a few minutes.** The startup delay is a fixed cost, so it's more impactful on short jobs.
- **Don't have strict SLA requirements.** If your downstream systems break when the ETL is late or retried, stick with standard.

Jobs that are NOT good candidates:
- Time-critical jobs with tight SLAs
- Jobs triggered by real-time events that need immediate processing
- Jobs with downstream dependencies that cannot tolerate retries or variable completion times
- Very short jobs (under 5 minutes) where the startup delay is proportionally large

## Cost Comparison Example

Let's do the math on a real example:

```text
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

You can also use Glue's job delay notification threshold with EventBridge to alert when a run stays in `STARTING` or `RUNNING` longer than expected:

```bash
# Add a 30-minute delay notification threshold to a scheduled trigger action
aws glue update-trigger \
    --name "nightly-sales-etl-trigger" \
    --trigger-update '{
        "Name": "nightly-sales-etl-trigger",
        "Schedule": "cron(0 0 * * ? *)",
        "Actions": [
            {
                "JobName": "daily-sales-etl-flex",
                "NotificationProperty": {
                    "NotifyDelayAfter": 30
                }
            }
        ]
    }'

# Route delayed Glue job run status events to an SNS topic
aws events put-rule \
    --name "flex-job-delayed-start" \
    --event-pattern '{
        "source": ["aws.glue"],
        "detail-type": ["Glue Job Run Status"],
        "detail": {
            "jobName": ["daily-sales-etl-flex"],
            "state": ["STARTING", "RUNNING"]
        }
    }'

aws events put-targets \
    --rule "flex-job-delayed-start" \
    --targets "Id"="ops-alerts","Arn"="arn:aws:sns:us-east-1:123456789012:ops-alerts"
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

Flex execution is one of the simplest cost optimizations you can make in your Glue pipeline. Zero code changes, lower DPU-hour pricing, and useful savings for jobs that can tolerate variable timing. For faster development of these jobs, check out [Glue interactive sessions](https://oneuptime.com/blog/post/2026-02-12-aws-glue-interactive-sessions-development/view).
