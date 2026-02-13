# How to Schedule Non-Production Resources to Save Costs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cost Optimization, Automation, Scheduling, Lambda

Description: Save 65-75% on non-production AWS resources by automatically stopping them outside business hours using Lambda, EventBridge, and Instance Scheduler.

---

Your dev and staging environments don't need to run at 3 AM on a Sunday. But in most organizations, they do - costing the same as production while nobody's using them. Running non-production resources only during business hours (say, 8 AM to 8 PM on weekdays) cuts their cost by roughly 70%.

For a company with $30K/month in non-production EC2 and RDS costs, that's $21K/month in savings. Let's set this up.

## The Math

A typical business-hours schedule runs 12 hours/day, 5 days/week. That's 60 hours out of 168 hours in a week, or about 36% of the time. Your non-production resources cost 36% of what they'd cost running 24/7 - a 64% reduction.

If you extend to 14 hours/day (7 AM to 9 PM) and include Saturday mornings for testing, you still save about 55%.

## Option 1: AWS Instance Scheduler

AWS provides an official solution called Instance Scheduler. It's a CloudFormation stack that deploys Lambda functions to start and stop EC2 and RDS instances on a schedule.

Deploy it from the AWS Solutions Library:

```bash
# Download and deploy the Instance Scheduler CloudFormation template
aws cloudformation create-stack \
  --stack-name instance-scheduler \
  --template-url https://s3.amazonaws.com/solutions-reference/instance-scheduler-on-aws/latest/instance-scheduler-on-aws.template \
  --capabilities CAPABILITY_IAM \
  --parameters \
    ParameterKey=SchedulingActive,ParameterValue=Yes \
    ParameterKey=DefaultTimezone,ParameterValue=America/New_York \
    ParameterKey=Regions,ParameterValue=us-east-1 \
    ParameterKey=ScheduleLambdaMemory,ParameterValue=128
```

Then create a schedule and tag your instances:

```bash
# Create a business-hours schedule using the scheduler CLI
# (After installing the scheduler CLI tool)
scheduler-cli create-schedule \
  --name business-hours \
  --periods office-hours \
  --timezone America/New_York

scheduler-cli create-period \
  --name office-hours \
  --begintime 08:00 \
  --endtime 20:00 \
  --weekdays mon-fri
```

Tag instances to assign them to the schedule:

```bash
# Tag EC2 instances with the schedule
aws ec2 create-tags \
  --resources i-0a1b2c3d4e5f67890 i-0b2c3d4e5f6789012 \
  --tags Key=Schedule,Value=business-hours

# Tag RDS instances
aws rds add-tags-to-resource \
  --resource-name arn:aws:rds:us-east-1:123456789012:db:dev-database \
  --tags Key=Schedule,Value=business-hours
```

## Option 2: Custom Lambda Scheduler

If you want more control or don't want the overhead of the full Instance Scheduler solution, build a simple one with Lambda:

```python
import boto3
from datetime import datetime
import pytz

ec2 = boto3.client('ec2')
rds = boto3.client('rds')

TIMEZONE = pytz.timezone('America/New_York')
SCHEDULE_TAG = 'AutoSchedule'

def start_resources(event, context):
    """Start all resources tagged for scheduling"""

    # Start EC2 instances
    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'tag:' + SCHEDULE_TAG, 'Values': ['business-hours']},
            {'Name': 'instance-state-name', 'Values': ['stopped']}
        ]
    )

    ec2_started = []
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            ec2_started.append(instance['InstanceId'])

    if ec2_started:
        ec2.start_instances(InstanceIds=ec2_started)
        print(f"Started {len(ec2_started)} EC2 instances: {ec2_started}")

    # Start RDS instances
    rds_instances = rds.describe_db_instances()
    rds_started = []

    for db in rds_instances['DBInstances']:
        tags = rds.list_tags_for_resource(
            ResourceName=db['DBInstanceArn']
        )['TagList']
        tag_dict = {t['Key']: t['Value'] for t in tags}

        if tag_dict.get(SCHEDULE_TAG) == 'business-hours' and db['DBInstanceStatus'] == 'stopped':
            rds.start_db_instance(DBInstanceIdentifier=db['DBInstanceIdentifier'])
            rds_started.append(db['DBInstanceIdentifier'])
            print(f"Started RDS: {db['DBInstanceIdentifier']}")

    return {
        'ec2_started': len(ec2_started),
        'rds_started': len(rds_started)
    }


def stop_resources(event, context):
    """Stop all resources tagged for scheduling"""

    # Stop EC2 instances
    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'tag:' + SCHEDULE_TAG, 'Values': ['business-hours']},
            {'Name': 'instance-state-name', 'Values': ['running']}
        ]
    )

    ec2_stopped = []
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            ec2_stopped.append(instance['InstanceId'])

    if ec2_stopped:
        ec2.stop_instances(InstanceIds=ec2_stopped)
        print(f"Stopped {len(ec2_stopped)} EC2 instances: {ec2_stopped}")

    # Stop RDS instances
    rds_instances = rds.describe_db_instances()
    rds_stopped = []

    for db in rds_instances['DBInstances']:
        tags = rds.list_tags_for_resource(
            ResourceName=db['DBInstanceArn']
        )['TagList']
        tag_dict = {t['Key']: t['Value'] for t in tags}

        if tag_dict.get(SCHEDULE_TAG) == 'business-hours' and db['DBInstanceStatus'] == 'available':
            rds.stop_db_instance(DBInstanceIdentifier=db['DBInstanceIdentifier'])
            rds_stopped.append(db['DBInstanceIdentifier'])
            print(f"Stopped RDS: {db['DBInstanceIdentifier']}")

    return {
        'ec2_stopped': len(ec2_stopped),
        'rds_stopped': len(rds_stopped)
    }
```

Set up the EventBridge schedules:

```bash
# Start resources at 8 AM ET on weekdays
aws events put-rule \
  --name "start-non-prod" \
  --schedule-expression "cron(0 13 ? * MON-FRI *)" \
  --description "Start non-prod resources at 8 AM ET"

aws events put-targets \
  --rule start-non-prod \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:start-resources"

# Stop resources at 8 PM ET on weekdays
aws events put-rule \
  --name "stop-non-prod" \
  --schedule-expression "cron(0 1 ? * TUE-SAT *)" \
  --description "Stop non-prod resources at 8 PM ET"

aws events put-targets \
  --rule stop-non-prod \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:stop-resources"
```

Note the cron expressions use UTC. 8 AM ET = 1 PM UTC (during EST) and 8 PM ET = 1 AM UTC the next day.

## Scheduling ECS Services

For containerized workloads on ECS, scale services to zero instead of stopping them:

```python
import boto3

ecs = boto3.client('ecs')

def scale_ecs_services(event, context):
    """Scale ECS services based on schedule"""
    action = event.get('action', 'stop')  # 'start' or 'stop'

    # Define services and their normal desired counts
    scheduled_services = [
        {'cluster': 'dev-cluster', 'service': 'web-app', 'desired': 2},
        {'cluster': 'dev-cluster', 'service': 'api', 'desired': 3},
        {'cluster': 'staging-cluster', 'service': 'web-app', 'desired': 2},
    ]

    for svc in scheduled_services:
        desired_count = svc['desired'] if action == 'start' else 0

        ecs.update_service(
            cluster=svc['cluster'],
            service=svc['service'],
            desiredCount=desired_count
        )
        print(f"Set {svc['cluster']}/{svc['service']} to {desired_count} tasks")

    return {'action': action, 'services_updated': len(scheduled_services)}
```

## Handling Exceptions

Sometimes someone needs to work late or on a weekend. Build in an override mechanism:

```python
import boto3
from datetime import datetime, timezone

ec2 = boto3.client('ec2')

def check_override_before_stopping(event, context):
    """Check for override tags before stopping instances"""

    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'tag:AutoSchedule', 'Values': ['business-hours']},
            {'Name': 'instance-state-name', 'Values': ['running']}
        ]
    )

    to_stop = []
    skipped = []

    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            tags = {t['Key']: t['Value'] for t in instance.get('Tags', [])}

            # Check for override
            override_until = tags.get('ScheduleOverrideUntil', '')
            if override_until:
                try:
                    override_time = datetime.fromisoformat(override_until).replace(tzinfo=timezone.utc)
                    if datetime.now(timezone.utc) < override_time:
                        skipped.append(instance['InstanceId'])
                        print(f"Skipping {instance['InstanceId']} - override until {override_until}")
                        continue
                except ValueError:
                    pass

            to_stop.append(instance['InstanceId'])

    if to_stop:
        ec2.stop_instances(InstanceIds=to_stop)

    return {'stopped': len(to_stop), 'skipped': len(skipped)}
```

Engineers can set the override tag when they need resources to stay running:

```bash
# Keep instance running until midnight tonight
aws ec2 create-tags \
  --resources i-0a1b2c3d4e5f67890 \
  --tags Key=ScheduleOverrideUntil,Value=$(date -u -v+6H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "+6 hours" +%Y-%m-%dT%H:%M:%SZ)
```

## Monitoring Savings

Track how much you're actually saving:

```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client('ce')

def calculate_scheduling_savings():
    """Compare current costs to what they'd be running 24/7"""
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

    # Get actual non-prod costs
    response = ce.get_cost_and_usage(
        TimePeriod={'Start': start_date, 'End': end_date},
        Granularity='MONTHLY',
        Metrics=['UnblendedCost'],
        Filter={
            'Tags': {
                'Key': 'Environment',
                'Values': ['dev', 'staging', 'test']
            }
        }
    )

    actual_cost = float(response['ResultsByTime'][0]['Total']['UnblendedCost']['Amount'])
    # If running ~36% of the time, full cost would be actual / 0.36
    estimated_full_cost = actual_cost / 0.36
    savings = estimated_full_cost - actual_cost

    print(f"Non-prod actual cost (last 30 days): ${actual_cost:.2f}")
    print(f"Estimated cost without scheduling:    ${estimated_full_cost:.2f}")
    print(f"Estimated savings:                    ${savings:.2f}")
    print(f"Savings percentage:                   {(savings/estimated_full_cost)*100:.0f}%")

calculate_scheduling_savings()
```

## What to Schedule

Not everything should be scheduled. Here's a guide:

| Resource | Schedule? | Notes |
|---|---|---|
| Dev EC2 instances | Yes | Primary scheduling target |
| Dev RDS instances | Yes | Takes 5-10 min to start |
| Staging environments | Yes (with longer hours) | May need weekend availability |
| CI/CD runners | Maybe | Only if on EC2, not on-demand |
| ElastiCache dev clusters | Yes | Delete/recreate or use serverless |
| NAT Gateways (dev VPC) | Consider | Can't stop, but can delete/recreate |
| Load Balancers (dev) | Consider | Can't stop, but can delete/recreate |

For ElastiCache scheduling strategies, check out our guide on [reducing ElastiCache costs](https://oneuptime.com/blog/post/2026-02-12-reduce-elasticache-costs/view).

## Key Takeaways

Scheduling non-production resources is one of the highest-impact, lowest-risk cost optimizations available. Start with EC2 and RDS since they're the easiest to schedule. Use tags to identify schedulable resources, build in an override mechanism for after-hours work, and monitor your savings to justify the effort. Most teams see 60-70% cost reduction on their non-production environments within the first month.
