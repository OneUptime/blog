# How to Set Up CloudWatch Container Insights for ECS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, ECS, Container Insights, Docker

Description: Step-by-step guide to enabling CloudWatch Container Insights for Amazon ECS to monitor cluster, service, and task-level container metrics.

---

Running containers on ECS without proper monitoring is like driving at night with the headlights off. You know something is out there, but you can't see it until you hit it. CloudWatch Container Insights fixes that by giving you visibility into your ECS clusters at every level - from the cluster down to individual containers.

Container Insights collects, aggregates, and summarizes metrics and logs from your containerized applications. Container Insights with enhanced observability provides pre-built dashboards showing CPU, memory, network, and disk usage for your clusters, services, tasks, and containers. It also captures performance log events that you can query with CloudWatch Logs Insights.

## What You Get with Container Insights

When you enable Container Insights with enhanced observability for ECS, you get metrics at four levels:

**Cluster level** - overall CPU and memory utilization, running task count, service count, and container instance count (for EC2 launch type).

**Service level** - CPU and memory usage per service, running task count, desired task count, and network I/O.

**Task level** - per-task CPU and memory consumption, network traffic, and storage I/O.

**Container level** - per-container CPU, memory, network, storage, restart, and health metrics.

These metrics go beyond what standard ECS metrics provide. Standard ECS metrics give you cluster and service CPU and memory utilization, plus cluster-level reservation metrics. Container Insights adds network metrics, disk metrics, and task-level granularity.

## Enabling Container Insights for a New Cluster

The easiest approach is enabling it when you create the cluster:

```bash
# Create an ECS cluster with Container Insights enabled

aws ecs create-cluster \
  --cluster-name production-cluster \
  --settings name=containerInsights,value=enhanced
```

That's it for the cluster side. Container Insights starts collecting metrics automatically for any tasks launched in this cluster.

## Enabling Container Insights for an Existing Cluster

If you already have a cluster running, you can enable it without downtime:

```bash
# Enable Container Insights on an existing ECS cluster
aws ecs update-cluster-settings \
  --cluster production-cluster \
  --settings name=containerInsights,value=enhanced
```

Verify it's enabled:

```bash
# Check Container Insights setting on the cluster
aws ecs describe-clusters \
  --clusters production-cluster \
  --include SETTINGS
```

You should see `containerInsights` set to `enhanced` in the response.

## Enabling at the Account Level

If you want Container Insights on by default for all new clusters in your account:

```bash
# Enable Container Insights as the default for all new ECS clusters
aws ecs put-account-setting-default \
  --name containerInsights \
  --value enhanced
```

This doesn't retroactively enable it on existing clusters - you'll still need to update those individually.

## Setup for Fargate Launch Type

If you're using Fargate, Container Insights works out of the box once you enable it on the cluster. No agents to install, no sidecar containers to deploy. Fargate handles the metric collection internally.

Your task definitions don't need any changes either. The task execution role only needs CloudWatch Logs permissions if your application containers use the `awslogs` log driver for application logs.

## Setup for EC2 Launch Type

For the EC2 launch type, enabling Container Insights with enhanced observability on the cluster is enough for cluster, service, task, and container metrics. If you also want EC2 instance-level metrics, deploy the CloudWatch agent as a daemon service.

First, create a task definition for the CloudWatch agent:

```json
{
  "family": "ecs-cwagent-daemon-service",
  "taskRoleArn": "arn:aws:iam::123456789012:role/CWAgentECSTaskRole",
  "executionRoleArn": "arn:aws:iam::123456789012:role/CWAgentECSExecutionRole",
  "networkMode": "bridge",
  "containerDefinitions": [
    {
      "name": "cloudwatch-agent",
      "image": "public.ecr.aws/cloudwatch-agent/cloudwatch-agent:1.300066.1b1374",
      "essential": false,
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
          "sourceVolume": "al1_cgroup",
          "containerPath": "/cgroup",
          "readOnly": true
        },
        {
          "sourceVolume": "al2_cgroup",
          "containerPath": "/rootfs/sys/fs/cgroup",
          "readOnly": true
        },
        {
          "sourceVolume": "al1_cgroup",
          "containerPath": "/rootfs/cgroup",
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
          "value": "True"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ecs-cwagent-daemon-service",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "True"
        }
      }
    }
  ],
  "volumes": [
    {"name": "proc", "host": {"sourcePath": "/proc"}},
    {"name": "dev", "host": {"sourcePath": "/dev"}},
    {"name": "al1_cgroup", "host": {"sourcePath": "/cgroup"}},
    {"name": "al2_cgroup", "host": {"sourcePath": "/sys/fs/cgroup"}}
  ],
  "requiresCompatibilities": ["EC2"],
  "cpu": "128",
  "memory": "64"
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
  --service-name cwagent-daemon-service \
  --task-definition ecs-cwagent-daemon-service \
  --scheduling-strategy DAEMON
```

The daemon scheduling strategy ensures the agent runs on every EC2 instance in the cluster. When new instances join, they automatically get the agent.

## IAM Roles for the CloudWatch Agent

The agent needs permissions to publish metrics and logs. Here's the task role policy:

```json
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
          Value: enhanced

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
          Image: public.ecr.aws/cloudwatch-agent/cloudwatch-agent:1.300066.1b1374
          Essential: false
          MountPoints:
            - SourceVolume: proc
              ContainerPath: /rootfs/proc
              ReadOnly: true
            - SourceVolume: dev
              ContainerPath: /rootfs/dev
              ReadOnly: true
            - SourceVolume: al1_cgroup
              ContainerPath: /cgroup
              ReadOnly: true
            - SourceVolume: al2_cgroup
              ContainerPath: /sys/fs/cgroup
              ReadOnly: true
            - SourceVolume: al2_cgroup
              ContainerPath: /rootfs/sys/fs/cgroup
              ReadOnly: true
            - SourceVolume: al1_cgroup
              ContainerPath: /rootfs/cgroup
              ReadOnly: true
          Environment:
            - Name: USE_DEFAULT_CONFIG
              Value: "True"
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: /ecs/ecs-cwagent-daemon-service
              awslogs-region: us-east-1
              awslogs-stream-prefix: ecs
              awslogs-create-group: "True"
      Volumes:
        - Name: proc
          Host:
            SourcePath: /proc
        - Name: dev
          Host:
            SourcePath: /dev
        - Name: al1_cgroup
          Host:
            SourcePath: /cgroup
        - Name: al2_cgroup
          Host:
            SourcePath: /sys/fs/cgroup
      Cpu: "128"
      Memory: "64"

  CloudWatchAgentService:
    Type: AWS::ECS::Service
    Properties:
      Cluster: !Ref ECSCluster
      ServiceName: cwagent-daemon-service
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
  --metric-name "TaskCpuUtilization" \
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
2. **CloudWatch agent not running** (EC2 instance-level metrics) - check if the daemon service has running tasks
3. **IAM permissions** - the agent needs `cloudwatch:PutMetricData` and related permissions for EC2 instance-level metrics
4. **Log group not created** - check if `/aws/ecs/containerinsights/{cluster}/performance` exists

For Fargate tasks that show zero network metrics, make sure you're running platform version 1.4.0 or later. Older platform versions don't report all metric types.

## Cost Considerations

Container Insights does add to your CloudWatch bill. The main costs come from:

- Custom metrics published to CloudWatch (per metric per month)
- Performance log events stored in CloudWatch Logs
- Any alarms you create on Container Insights metrics

Costs vary by Region, launch type, task definitions, running task IDs, containers, alarms, and log volume. As a reference point, the AWS pricing example for Container Insights with enhanced observability on ECS estimates 2,264 CloudWatch metrics, or $158.48/month in US East (N. Virginia), for 1 cluster, 5 services, 10 task definitions, 20 task IDs, and 50 average running containers before application log charges. For strategies to keep these costs in check, see our post on [reducing CloudWatch costs](https://oneuptime.com/blog/post/2026-02-12-reduce-cloudwatch-costs/view).

## Wrapping Up

Container Insights transforms ECS from a "launch and hope" platform into something you can properly observe. The setup is straightforward - enable the setting on your cluster, and for EC2 instance-level metrics, deploy the CloudWatch agent as a daemon. From there, you get automatic dashboards, queryable performance data, and the ability to alarm on container-level metrics.

If you're running anything beyond a hobby project on ECS, Container Insights should be one of the first things you enable. The visibility it provides pays for itself the first time you need to debug a performance issue or capacity problem.
