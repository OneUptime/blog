# How to Configure Fargate Ephemeral Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Fargate, Storage, Containers

Description: Learn how to configure and manage ephemeral storage for AWS Fargate tasks, including sizing, monitoring, and best practices for storage-intensive workloads.

---

Every Fargate task gets some ephemeral storage by default - 20 GB of it. For many workloads, that's plenty. But if you're processing large files, building artifacts, caching datasets, or running applications that write significant temporary data, 20 GB fills up fast. When it does, your task crashes with a storage error and ECS starts it over, only for the same thing to happen again.

Fargate now lets you configure ephemeral storage up to 200 GB per task. Let's look at when you need more, how to configure it, and how to keep tabs on usage.

## Default Ephemeral Storage

Every Fargate task gets 20 GB of ephemeral storage. This storage is shared between:

- The Docker image layers (read-only)
- Each container's writable layer
- Any volumes defined in the task (non-EFS volumes)

So if your Docker image is 2 GB, you have about 18 GB left for writable data. If you're running multiple containers in a task, they share that 18 GB.

The storage is tied to the task's lifecycle. When the task stops, the storage and all its data are gone. This is truly ephemeral - there's no recovery.

## When You Need More Storage

Common scenarios that require more than 20 GB:

- **Data processing** - ETL jobs that download, transform, and upload large datasets
- **Machine learning** - Model training or inference with large model files
- **Video/image processing** - Transcoding or rendering that creates temporary files
- **Build systems** - CI/CD agents that build large projects with many dependencies
- **Caching** - Applications that cache data locally for performance

## Configuring Ephemeral Storage

You configure ephemeral storage in the task definition at the task level:

```json
{
  "family": "data-processor",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "ephemeralStorage": {
    "sizeInGiB": 100
  },
  "containerDefinitions": [
    {
      "name": "processor",
      "image": "my-registry/data-processor:latest",
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/data-processor",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "processor"
        }
      }
    }
  ]
}
```

The `ephemeralStorage.sizeInGiB` field accepts values from 21 to 200. You can't set it lower than 21 because the default 20 GB is the minimum. Setting it to 21 GB gives you 1 GB more than the default.

Register the task definition:

```bash
# Register the task definition with extra storage
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json
```

With CloudFormation:

```yaml
TaskDefinition:
  Type: AWS::ECS::TaskDefinition
  Properties:
    Family: data-processor
    NetworkMode: awsvpc
    RequiresCompatibilities:
      - FARGATE
    Cpu: "2048"
    Memory: "4096"
    EphemeralStorage:
      SizeInGiB: 100
    ContainerDefinitions:
      - Name: processor
        Image: my-registry/data-processor:latest
        Essential: true
```

With AWS CDK:

```typescript
// Configure ephemeral storage in CDK
const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
  cpu: 2048,
  memoryLimitMiB: 4096,
  ephemeralStorageGiB: 100,
});
```

## Sharing Storage Between Containers

When you have multiple containers in a task and they need to share data through ephemeral storage, use Docker volumes:

```json
{
  "family": "multi-container",
  "ephemeralStorage": {
    "sizeInGiB": 50
  },
  "volumes": [
    {
      "name": "shared-data"
    }
  ],
  "containerDefinitions": [
    {
      "name": "downloader",
      "image": "my-registry/downloader:latest",
      "essential": false,
      "mountPoints": [
        {
          "sourceVolume": "shared-data",
          "containerPath": "/data"
        }
      ]
    },
    {
      "name": "processor",
      "image": "my-registry/processor:latest",
      "essential": true,
      "mountPoints": [
        {
          "sourceVolume": "shared-data",
          "containerPath": "/data",
          "readOnly": true
        }
      ],
      "dependsOn": [
        {
          "containerName": "downloader",
          "condition": "SUCCESS"
        }
      ]
    }
  ]
}
```

The downloader writes data to `/data`, completes, and then the processor reads from `/data`. Both containers share the same ephemeral storage pool.

## Monitoring Storage Usage

Ephemeral storage usage isn't directly available as a CloudWatch metric, but you can monitor it from within your containers.

Add a simple monitoring script to your container:

```bash
#!/bin/bash
# storage-monitor.sh - runs alongside your application
while true; do
  # Get disk usage of the writable layer
  USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
  AVAILABLE=$(df -h / | awk 'NR==2 {print $4}')

  # Log it so CloudWatch picks it up
  echo "STORAGE_MONITOR: usage=${USAGE}% available=${AVAILABLE}"

  # Exit if storage is critically low
  if [ "$USAGE" -gt 90 ]; then
    echo "STORAGE_CRITICAL: usage=${USAGE}% - storage nearly full"
  fi

  sleep 60
done
```

For a more robust approach, push custom metrics to CloudWatch:

```python
import boto3
import shutil
import os

# Check storage usage and publish to CloudWatch
def publish_storage_metric(service_name):
    total, used, free = shutil.disk_usage('/')

    cloudwatch = boto3.client('cloudwatch', region_name='us-east-1')
    cloudwatch.put_metric_data(
        Namespace='Custom/ECS',
        MetricData=[
            {
                'MetricName': 'EphemeralStorageUsedPercent',
                'Dimensions': [
                    {'Name': 'ServiceName', 'Value': service_name}
                ],
                'Value': (used / total) * 100,
                'Unit': 'Percent'
            },
            {
                'MetricName': 'EphemeralStorageFreeGB',
                'Dimensions': [
                    {'Name': 'ServiceName', 'Value': service_name}
                ],
                'Value': free / (1024 ** 3),
                'Unit': 'Gigabytes'
            }
        ]
    )
```

Then set up a CloudWatch alarm:

```bash
# Alarm when ephemeral storage usage exceeds 85%
aws cloudwatch put-metric-alarm \
  --alarm-name "ecs-storage-high-usage" \
  --namespace "Custom/ECS" \
  --metric-name EphemeralStorageUsedPercent \
  --dimensions Name=ServiceName,Value=data-processor \
  --statistic Maximum \
  --period 300 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-alerts"
```

## Cost Considerations

Ephemeral storage beyond the default 20 GB has an additional cost. The pricing is per GB per hour of task runtime.

A quick calculation: if a task uses 100 GB of ephemeral storage (80 GB above the free tier) and runs for 24 hours, the additional storage cost depends on the current per-GB-hour rate in your region. Check the Fargate pricing page for current rates, but it's generally a small fraction of the compute cost.

For batch processing jobs that run for short periods, the cost is minimal. For long-running services, it adds up, so right-size your storage allocation instead of just requesting the maximum.

## Ephemeral vs EFS

When should you use ephemeral storage vs Amazon EFS?

**Use ephemeral storage when:**
- Data doesn't need to survive task restarts
- You need fast local I/O performance
- You're processing temporary files
- Cost optimization matters (ephemeral is cheaper per GB)

**Use EFS when:**
- Data must persist across task restarts
- Multiple tasks need to share the same data simultaneously
- You need virtually unlimited storage (EFS has no practical limit)
- You need data durability

You can also combine both. Use EFS for persistent data and ephemeral storage for scratch space:

```json
{
  "volumes": [
    {
      "name": "persistent",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-abc123",
        "transitEncryption": "ENABLED"
      }
    },
    {
      "name": "scratch"
    }
  ],
  "containerDefinitions": [
    {
      "name": "app",
      "mountPoints": [
        {"sourceVolume": "persistent", "containerPath": "/data/persistent"},
        {"sourceVolume": "scratch", "containerPath": "/data/scratch"}
      ]
    }
  ]
}
```

## Best Practices

1. **Clean up temporary files.** Don't let temp files accumulate. Delete them when they're no longer needed.

2. **Right-size your allocation.** Monitor actual usage and set the storage to what you need plus 20-30% headroom. Don't request 200 GB if you only use 30.

3. **Use streaming where possible.** Instead of downloading a 10 GB file to disk and then processing it, stream the data through your application to reduce storage requirements.

4. **Monitor storage proactively.** By the time a task crashes from full storage, it's too late. Set up monitoring and alerting at 80-85% usage.

5. **Consider your Docker image size.** Large images eat into your available storage. Use multi-stage builds and Alpine-based images to keep images lean.

## Wrapping Up

Fargate ephemeral storage is straightforward to configure and solves a real problem for storage-intensive workloads. Just set the `ephemeralStorage` field in your task definition and you're done. The key is to monitor usage, clean up temporary files, and right-size your allocation to balance performance and cost.

For workloads that need persistent storage, combine ephemeral storage with EFS. And for everything else, the default 20 GB is usually plenty. For more on ECS task configuration, see our guide on [deploying multi-container applications on ECS](https://oneuptime.com/blog/post/2026-02-12-deploy-multi-container-applications-ecs/view).
