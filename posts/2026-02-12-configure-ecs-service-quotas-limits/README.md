# How to Configure ECS Service Quotas and Limits

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Service Quotas, Limits, Scaling, Capacity Planning

Description: Understand and configure Amazon ECS service quotas and limits to prevent deployment failures and plan for scale effectively

---

There is nothing worse than a production deployment failing because you hit a service limit you did not know existed. Amazon ECS has dozens of quotas and limits - some adjustable, some hard limits - and hitting any of them during a critical scaling event or deployment can cause real problems.

This guide covers the most important ECS quotas, how to check your current usage, and how to request increases before you need them.

## Understanding ECS Quotas

ECS quotas fall into two categories:

- **Adjustable quotas**: These can be increased by submitting a request through AWS Service Quotas. Examples include the number of clusters per account and tasks per service.
- **Hard limits**: These cannot be changed. They are architectural constraints of the service. Examples include the number of containers per task definition.

## Key ECS Quotas

Here are the default quotas that most teams bump into first:

| Resource | Default Limit | Adjustable? |
|----------|-------------|-------------|
| Clusters per region | 10,000 | Yes |
| Services per cluster | 5,000 | Yes |
| Tasks per service | 5,000 | Yes |
| Container instances per cluster | 5,000 | Yes |
| Tasks launched per run-task | 10 | Yes |
| Task definitions (revisions) | No limit | N/A |
| Containers per task definition | 10 | No |
| Subnets per awsvpc configuration | 16 | No |
| Security groups per awsvpc configuration | 5 | No |
| Target groups per service | 5 | No |
| Tags per resource | 50 | No |

## Checking Current Quotas

Use the AWS CLI to check your current quota values.

```bash
# List all ECS service quotas
aws service-quotas list-service-quotas \
  --service-code ecs \
  --query 'Quotas[].{Name:QuotaName,Value:Value,Adjustable:Adjustable}' \
  --output table
```

To check a specific quota:

```bash
# Check the tasks-per-service quota
aws service-quotas get-service-quota \
  --service-code ecs \
  --quota-code L-4637F321 \
  --query 'Quota.{Name:QuotaName,Value:Value}'
```

## Checking Current Usage

Knowing your limits is only half the battle. You also need to know your current usage so you can plan ahead.

```bash
# Count clusters in the region
aws ecs list-clusters --query 'clusterArns | length(@)'

# Count services in a specific cluster
aws ecs list-services \
  --cluster my-cluster \
  --query 'serviceArns | length(@)'

# Count running tasks in a cluster
aws ecs list-tasks \
  --cluster my-cluster \
  --desired-status RUNNING \
  --query 'taskArns | length(@)'

# Count container instances in a cluster
aws ecs list-container-instances \
  --cluster my-cluster \
  --query 'containerInstanceArns | length(@)'
```

## Requesting Quota Increases

When you need more capacity, request an increase through Service Quotas.

```bash
# Request an increase for tasks per service (quota code L-4637F321)
aws service-quotas request-service-quota-increase \
  --service-code ecs \
  --quota-code L-4637F321 \
  --desired-value 10000
```

You can check the status of your request:

```bash
# Check pending quota increase requests
aws service-quotas list-requested-service-quota-changes-by-status \
  --status PENDING \
  --query 'RequestedQuotas[?ServiceCode==`ecs`].{Quota:QuotaName,Requested:DesiredValue,Status:Status}'
```

Some tips for quota increase requests:

- **Request early**: Quota increases can take hours to days to process
- **Provide a business justification**: Especially for large increases, a clear explanation speeds up approval
- **Request incrementally**: Jumping from 5,000 to 100,000 may require additional review. Stepping up gradually is often faster.

## Fargate-Specific Quotas

If you use Fargate, there are additional quotas to watch.

| Resource | Default Limit | Adjustable? |
|----------|-------------|-------------|
| Fargate on-demand tasks per region | 1,000 | Yes |
| Fargate Spot tasks per region | 1,000 | Yes |
| Fargate task CPU/memory combinations | Fixed set | No |

The Fargate on-demand task limit is the one most teams hit first. It counts all running Fargate tasks across all clusters in a region.

```bash
# Check Fargate on-demand task quota
aws service-quotas get-service-quota \
  --service-code fargate \
  --quota-code L-790AF391 \
  --query 'Quota.{Name:QuotaName,Value:Value}'

# Count current running Fargate tasks across all clusters
CLUSTERS=$(aws ecs list-clusters --query 'clusterArns[]' --output text)
TOTAL=0
for CLUSTER in $CLUSTERS; do
  COUNT=$(aws ecs list-tasks --cluster "$CLUSTER" --launch-type FARGATE \
    --desired-status RUNNING --query 'taskArns | length(@)')
  TOTAL=$((TOTAL + COUNT))
done
echo "Total Fargate tasks: $TOTAL"
```

## Setting Up Quota Monitoring

Set up CloudWatch alarms to alert you when you are approaching your limits.

```bash
# Create a CloudWatch alarm for service count approaching limit
aws cloudwatch put-metric-alarm \
  --alarm-name ecs-service-count-high \
  --alarm-description "ECS service count approaching quota limit" \
  --metric-name ServiceCount \
  --namespace AWS/ECS \
  --statistic Maximum \
  --period 300 \
  --threshold 4000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:ops-alerts
```

You can also use AWS Config to monitor quota utilization.

```bash
# Enable AWS Config rule for service quota monitoring
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "ecs-quota-monitor",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "SERVICE_QUOTA_CHECK"
    },
    "InputParameters": "{\"serviceCode\":\"ecs\"}"
  }'
```

## Automating Quota Checks with a Script

Here is a script that checks your most critical ECS quotas and warns you if you are above 80% utilization.

```bash
#!/bin/bash
# ECS quota utilization checker

REGION="us-east-1"
THRESHOLD=80  # Alert when usage exceeds this percentage

echo "=== ECS Quota Utilization Check ==="

# Check clusters
CLUSTER_QUOTA=$(aws service-quotas get-service-quota \
  --service-code ecs --quota-code L-21C621EB \
  --query 'Quota.Value' --output text 2>/dev/null || echo "10000")
CLUSTER_COUNT=$(aws ecs list-clusters --query 'clusterArns | length(@)' --output text)
CLUSTER_PCT=$((CLUSTER_COUNT * 100 / ${CLUSTER_QUOTA%.*}))
echo "Clusters: $CLUSTER_COUNT / ${CLUSTER_QUOTA%.*} ($CLUSTER_PCT%)"
[ $CLUSTER_PCT -gt $THRESHOLD ] && echo "  WARNING: Cluster count above ${THRESHOLD}%"

# Check services per cluster
for CLUSTER_ARN in $(aws ecs list-clusters --query 'clusterArns[]' --output text); do
  CLUSTER_NAME=$(basename $CLUSTER_ARN)
  SERVICE_COUNT=$(aws ecs list-services --cluster "$CLUSTER_NAME" \
    --query 'serviceArns | length(@)' --output text)
  SERVICE_QUOTA=5000
  SERVICE_PCT=$((SERVICE_COUNT * 100 / SERVICE_QUOTA))
  echo "Services in $CLUSTER_NAME: $SERVICE_COUNT / $SERVICE_QUOTA ($SERVICE_PCT%)"
  [ $SERVICE_PCT -gt $THRESHOLD ] && echo "  WARNING: Service count above ${THRESHOLD}%"
done

echo "=== Check Complete ==="
```

## Task Definition Limits

Task definitions have their own set of hard limits that you cannot change.

**Containers per task**: Maximum 10 containers per task definition. If you need more, consider splitting into multiple tasks.

**Environment variables per container**: Maximum 100 environment variables. Use Secrets Manager or Parameter Store for configuration-heavy applications. See our guide on [using Parameter Store with ECS](https://oneuptime.com/blog/post/ecs-parameter-store-configuration/view).

**Task definition size**: The JSON payload cannot exceed 64KB. This limit is rarely hit unless you have many containers with extensive environment variable lists.

**Volumes per task**: Maximum 10 volumes per task definition.

## Rate Limits

Beyond resource quotas, ECS also has API rate limits (throttling).

| API Action | Default Rate | Burst |
|-----------|-------------|-------|
| RegisterTaskDefinition | 1 TPS | 1 |
| RunTask | 1 TPS | 1 |
| StartTask | 1 TPS | 1 |
| CreateService | 1 TPS | 1 |
| UpdateService | 1 TPS | 1 |
| DescribeTasks | 20 TPS | 40 |
| ListTasks | 20 TPS | 40 |

If you are automating deployments across many services, you might hit these rate limits. Use exponential backoff and jitter in your deployment scripts.

```python
# Python example: ECS API call with exponential backoff
import boto3
import time
import random

ecs = boto3.client('ecs')

def update_service_with_retry(cluster, service, task_def, max_retries=5):
    for attempt in range(max_retries):
        try:
            return ecs.update_service(
                cluster=cluster,
                service=service,
                taskDefinition=task_def
            )
        except ecs.exceptions.ClientError as e:
            if 'ThrottlingException' in str(e):
                # Exponential backoff with jitter
                wait = (2 ** attempt) + random.uniform(0, 1)
                print(f"Throttled, waiting {wait:.1f}s before retry")
                time.sleep(wait)
            else:
                raise
    raise Exception("Max retries exceeded")
```

## Planning for Scale

As a rule of thumb, review your ECS quotas when:

- Your running task count exceeds 50% of any quota
- You are planning a new workload that will significantly increase resource usage
- You are expanding to a new region (quotas are per-region)
- You are preparing for a traffic event (Black Friday, product launch, etc.)

Request increases proactively - do not wait until your deployment fails at 2 AM because you ran out of Fargate tasks.

## Wrapping Up

ECS quotas exist to protect both you and AWS from runaway resource consumption, but they can trip you up if you are not paying attention. The key is visibility - know your limits, monitor your usage, and request increases before you need them. Set up automated quota checking as part of your operational runbook, and you will never be caught off guard by a limit again.

For more on scaling ECS, see our guide on [ECS service auto scaling](https://oneuptime.com/blog/post/ecs-service-auto-scaling/view).
