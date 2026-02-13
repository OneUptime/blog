# How to Set Up CloudWatch Container Insights for ECS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, ECS, Container Insights, Docker

Description: Step-by-step guide to enabling CloudWatch Container Insights for Amazon ECS to monitor cluster, service, and task-level container metrics.

---

Running containers on ECS without proper monitoring is like driving at night with the headlights off. You know something is out there, but you can't see it until you hit it. CloudWatch Container Insights fixes that by giving you visibility into your ECS clusters at every level - from the cluster down to individual containers.

Container Insights collects, aggregates, and summarizes metrics and logs from your containerized applications. It provides pre-built dashboards showing CPU, memory, network, and disk usage for your clusters, services, and tasks. It also captures performance log events that you can query with CloudWatch Logs Insights.

## What You Get with Container Insights

When you enable Container Insights for ECS, you get metrics at three levels:

**Cluster level** - overall CPU and memory utilization, running task count, service count, and container instance count (for EC2 launch type).

**Service level** - CPU and memory usage per service, running task count, desired task count, and network I/O.

**Task level** - per-task CPU and memory consumption, network traffic, and storage I/O.

These metrics go beyond what standard ECS metrics provide. Standard ECS metrics give you service-level CPU and memory reservation and utilization. Container Insights adds network metrics, disk metrics, and task-level granularity.

## Enabling Container Insights for a New Cluster

The easiest approach is enabling it when you create the cluster:

```bash
# Create an ECS cluster with Container Insights enabled
aws ecs create-cluster \
  --cluster-name production-cluster \
  --settings name=containerInsights,value=enabled
```

That's it for the cluster side. Container Insights starts collecting metrics automatically for any tasks launched in this cluster.

## Enabling Container Insights for an Existing Cluster

If you already have a cluster running, you can enable it without downtime:

```bash
# Enable Container Insights on an existing ECS cluster
aws ecs update-cluster-settings \
  --cluster production-cluster \
  --settings name=containerInsights,value=enabled
```

Verify it's enabled:

```bash
# Check Container Insights setting on the cluster
aws ecs describe-clusters \
  --clusters production-cluster \
  --include SETTINGS
```

You should see `containerInsights` set to `enabled` in the response.

## Enabling at the Account Level

If you want Container Insights on by default for all new clusters in your account:

```bash
# Enable Container Insights as the default for all new ECS clusters
aws ecs put-account-setting-default \
  --name containerInsights \
  --value enabled
```

This doesn't retroactively enable it on existing clusters - you'll still need to update those individually.

## Setup for Fargate Launch Type

If you're using Fargate, Container Insights works out of the box once you enable it on the cluster. No agents to install, no sidecar containers to deploy. Fargate handles the metric collection internally.

Your task definitions don't need any changes either. Just make sure the task execution role has the right permissions:

```json
// Task execution role permissions for Container Insights with Fargate
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:CreateLogGroup"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## Setup for EC2 Launch Type

For the EC2 launch type, you need the CloudWatch agent running on your container instances. The recommended approach is deploying it as a daemon service.

First, create a task definition for the CloudWatch agent:

```json
// Task definition for CloudWatch agent daemon service
{
  "family": "cloudwatch-agent",
  "taskRoleArn": "arn:aws:iam::123456789012:role/CWAgentECSTaskRole",
  "executionRoleArn": "arn:aws:iam::123456789012:role/CWAgentECSExecutionRole",
  "networkMode": "bridge",
  "containerDefinitions": [
    {
      "name": "cloudwatch-agent",
      "image": "amazon/cloudwatch-agent:latest",
      "essential": true,
      "mountPoints": [
        {
          "sourceVolume": "proc",
          "containerPath": "/rootfs/proc",
          "readOnly": true
        },
        {
          "sourceVolume": "dev",
          "containerPath": "/rootfs/dev",
          "readOnly": true
        },
        {
          "sourceVolume": "al2_cgroup",
          "containerPath": "/sys/fs/cgroup",
          "readOnly": true
        }
      ],
      "environment": [
        {
          "name": "USE_DEFAULT_CONFIG",
          "value": "true"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/cloudwatch-agent",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "true"
        }
      }
    }
  ],
  "volumes": [
    {"name": "proc", "host": {"sourcePath": "/proc"}},
    {"name": "dev", "host": {"sourcePath": "/dev"}},
    {"name": "al2_cgroup", "host": {"sourcePath": "/sys/fs/cgroup"}}
  ],
  "requiresCompatibilities": ["EC2"]
}
```

Register the task definition and create a daemon service:

```bash
# Register the CloudWatch agent task definition
aws ecs register-task-definition \
  --cli-input-json file://cw-agent-task-def.json

# Create a daemon service so it runs on every container instance
aws ecs create-service \
  --cluster production-cluster \
  --service-name cloudwatch-agent \
  --task-definition cloudwatch-agent \
  --scheduling-strategy DAEMON \
  --launch-type EC2
```

The daemon scheduling strategy ensures the agent runs on every EC2 instance in the cluster. When new instances join, they automatically get the agent.

## IAM Roles for the CloudWatch Agent

The agent needs permissions to publish metrics and logs. Here's the task role policy:

```json
// IAM policy for the CloudWatch agent task role
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "ec2:DescribeVolumes",
        "ec2:DescribeTags",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams",
        "logs:DescribeLogGroups",
        "logs:CreateLogStream",
        "logs:CreateLogGroup",
        "ecs:ListTasks",
        "ecs:ListServices",
        "ecs:DescribeContainerInstances",
        "ecs:DescribeServices",
        "ecs:DescribeTasks",
        "ecs:DescribeTaskDefinition"
      ],
      "Resource": "*"
    }
  ]
}
```

## CloudFormation Template

Here's a CloudFormation snippet for a production setup:

```yaml
# CloudFormation for ECS cluster with Container Insights
Resources:
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: production-cluster
      ClusterSettings:
        - Name: containerInsights
          Value: enabled

  CloudWatchAgentTaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: cloudwatch-agent
      TaskRoleArn: !GetAtt CWAgentTaskRole.Arn
      ExecutionRoleArn: !GetAtt CWAgentExecutionRole.Arn
      NetworkMode: bridge
      RequiresCompatibilities:
        - EC2
      ContainerDefinitions:
        - Name: cloudwatch-agent
          Image: amazon/cloudwatch-agent:latest
          Essential: true
          Environment:
            - Name: USE_DEFAULT_CONFIG
              Value: "true"

  CloudWatchAgentService:
    Type: AWS::ECS::Service
    Properties:
      Cluster: !Ref ECSCluster
      ServiceName: cloudwatch-agent
      TaskDefinition: !Ref CloudWatchAgentTaskDefinition
      SchedulingStrategy: DAEMON
      LaunchType: EC2
```

## Querying Container Insights Metrics

Container Insights stores performance data as structured log events in the `/aws/ecs/containerinsights/{cluster-name}/performance` log group. You can query these with CloudWatch Logs Insights.

Here are some useful queries:

```sql
-- Find the top 5 tasks by CPU utilization in the last hour
stats max(CpuUtilized) as max_cpu by TaskId
| sort max_cpu desc
| limit 5
```

```sql
-- Check memory utilization trends per service
stats avg(MemoryUtilized) as avg_mem, max(MemoryUtilized) as peak_mem by ServiceName
| sort peak_mem desc
```

```sql
-- Find tasks that are running close to their memory limits
stats max(MemoryUtilized) as used, max(MemoryReserved) as reserved by TaskId
| filter used / reserved > 0.85
| sort used desc
```

```sql
-- Network traffic per service over time
stats sum(NetworkRxBytes) as rx_bytes, sum(NetworkTxBytes) as tx_bytes by bin(5m), ServiceName
```

## Building Custom Dashboards

While Container Insights comes with automatic dashboards, you can build custom ones:

```bash
# Query Container Insights metrics from the custom namespace
aws cloudwatch get-metric-data \
  --metric-data-queries '[
    {
      "Id": "cpu",
      "MetricStat": {
        "Metric": {
          "Namespace": "ECS/ContainerInsights",
          "MetricName": "CpuUtilized",
          "Dimensions": [
            {"Name": "ClusterName", "Value": "production-cluster"},
            {"Name": "ServiceName", "Value": "web-api"}
          ]
        },
        "Period": 300,
        "Stat": "Average"
      }
    }
  ]' \
  --start-time 2026-02-12T00:00:00Z \
  --end-time 2026-02-12T12:00:00Z
```

## Setting Up Alarms on Container Metrics

Create alarms on Container Insights metrics to catch problems early:

```bash
# Alarm when a service's CPU usage exceeds 80%
aws cloudwatch put-metric-alarm \
  --alarm-name "ECS-HighCPU-WebAPI" \
  --namespace "ECS/ContainerInsights" \
  --metric-name "CpuUtilized" \
  --dimensions Name=ClusterName,Value=production-cluster Name=ServiceName,Value=web-api \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ecs-alerts
```

```bash
# Alarm when running task count drops below desired
aws cloudwatch put-metric-alarm \
  --alarm-name "ECS-TaskCount-WebAPI" \
  --namespace "ECS/ContainerInsights" \
  --metric-name "RunningTaskCount" \
  --dimensions Name=ClusterName,Value=production-cluster Name=ServiceName,Value=web-api \
  --statistic Average \
  --period 60 \
  --threshold 2 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ecs-alerts
```

## Troubleshooting

If metrics aren't showing up, check these common issues:

1. **Container Insights not enabled on the cluster** - verify with `aws ecs describe-clusters --clusters your-cluster --include SETTINGS`
2. **CloudWatch agent not running** (EC2 launch type) - check if the daemon service has running tasks
3. **IAM permissions** - the agent needs `cloudwatch:PutMetricData` and related permissions
4. **Log group not created** - check if `/aws/ecs/containerinsights/{cluster}/performance` exists

For Fargate tasks that show zero network metrics, make sure you're running platform version 1.4.0 or later. Older platform versions don't report all metric types.

## Cost Considerations

Container Insights does add to your CloudWatch bill. The main costs come from:

- Custom metrics published to CloudWatch (per metric per month)
- Performance log events stored in CloudWatch Logs
- Any alarms you create on Container Insights metrics

For a cluster with 50 tasks across 5 services, expect roughly $15-30/month in additional CloudWatch costs. For strategies to keep these costs in check, see our post on [reducing CloudWatch costs](https://oneuptime.com/blog/post/2026-02-12-reduce-cloudwatch-costs/view).

## Wrapping Up

Container Insights transforms ECS from a "launch and hope" platform into something you can properly observe. The setup is straightforward - enable the setting on your cluster, and for EC2 launch type, deploy the CloudWatch agent as a daemon. From there, you get automatic dashboards, queryable performance data, and the ability to alarm on container-level metrics.

If you're running anything beyond a hobby project on ECS, Container Insights should be one of the first things you enable. The visibility it provides pays for itself the first time you need to debug a performance issue or capacity problem.
