# How to Set Up ECS Service Auto Scaling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Auto Scaling, Containers, Performance

Description: Learn how to configure auto scaling for ECS services using target tracking, step scaling, and scheduled scaling to handle traffic changes automatically and optimize costs.

---

Running a fixed number of containers works until it doesn't. Traffic spikes hit, your containers max out, and response times go through the roof. Or traffic drops, and you're paying for containers that aren't doing anything. Auto scaling solves both problems by automatically adjusting your service's task count based on demand.

ECS integrates with Application Auto Scaling, which supports three scaling approaches: target tracking (the easiest), step scaling (more control), and scheduled scaling (for predictable patterns). Let's set up each one.

## Prerequisites

Make sure you have:

- An ECS service running (see [creating an ECS service](https://oneuptime.com/blog/post/ecs-service-long-running-containers/view))
- Properly configured [health checks](https://oneuptime.com/blog/post/ecs-health-checks/view) so scaling decisions are based on healthy tasks
- CloudWatch metrics enabled (Container Insights recommended)

## Registering the Scaling Target

Before adding any scaling policies, you need to register your ECS service as a scalable target.

```bash
# Register the ECS service as a scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/my-cluster/api-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 20
```

The `min-capacity` is your floor - you'll always have at least this many tasks running. The `max-capacity` is your ceiling - auto scaling won't go beyond this. Set the max high enough to handle your peak traffic but low enough to prevent runaway costs if something goes wrong.

## Target Tracking Scaling

Target tracking is the simplest and most commonly used approach. You pick a metric, set a target value, and AWS figures out how many tasks you need to maintain that target.

### Scale Based on CPU Utilization

The most common scaling metric. ECS will add tasks when CPU goes above the target and remove them when it drops below.

```bash
# Scale to maintain 60% average CPU utilization
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/my-cluster/api-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 60.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'
```

The cooldown periods are important:

- **ScaleOutCooldown** (60 seconds) - how long to wait after scaling out before scaling out again. Keep this short so you respond quickly to traffic spikes.
- **ScaleInCooldown** (300 seconds) - how long to wait after scaling in before scaling in again. Keep this longer to avoid oscillation where you keep adding and removing tasks.

### Scale Based on Memory Utilization

For memory-intensive workloads, scale on memory instead of (or in addition to) CPU.

```bash
# Scale to maintain 70% average memory utilization
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/my-cluster/api-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name memory-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageMemoryUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'
```

### Scale Based on ALB Request Count

This is often the best metric for web services. It scales based on the number of requests per target (per container).

```bash
# Scale when each task handles more than 1000 requests per minute
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/my-cluster/api-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name requests-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 1000.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ALBRequestCountPerTarget",
      "ResourceLabel": "app/my-ecs-alb/abc123/targetgroup/api-tg/def456"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'
```

The `ResourceLabel` combines your ALB and target group identifiers. You can find it from the ARN of your target group.

### Scale Based on Custom Metrics

If the built-in metrics don't fit your needs, use a custom CloudWatch metric. For example, scale based on queue depth.

```bash
# Scale based on SQS queue depth per task
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/my-cluster/worker-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name queue-depth-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 100.0,
    "CustomizedMetricSpecification": {
      "MetricName": "ApproximateNumberOfMessagesVisible",
      "Namespace": "AWS/SQS",
      "Dimensions": [
        {
          "Name": "QueueName",
          "Value": "processing-queue"
        }
      ],
      "Statistic": "Average"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 30
  }'
```

## Step Scaling

Step scaling gives you more control by defining exactly how many tasks to add or remove at different thresholds. It requires a CloudWatch alarm.

```bash
# Create a CloudWatch alarm for high CPU
aws cloudwatch put-metric-alarm \
  --alarm-name api-high-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 70 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ClusterName,Value=my-cluster Name=ServiceName,Value=api-service

# Create a step scaling policy linked to the alarm
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/my-cluster/api-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-step-scaling \
  --policy-type StepScaling \
  --step-scaling-policy-configuration '{
    "AdjustmentType": "ChangeInCapacity",
    "StepAdjustments": [
      {
        "MetricIntervalLowerBound": 0,
        "MetricIntervalUpperBound": 20,
        "ScalingAdjustment": 2
      },
      {
        "MetricIntervalLowerBound": 20,
        "ScalingAdjustment": 4
      }
    ],
    "Cooldown": 60
  }'
```

This policy says:
- If CPU is between 70-90% (threshold to threshold+20), add 2 tasks
- If CPU is above 90% (threshold+20 and above), add 4 tasks

The aggressive scaling at higher thresholds helps you respond faster to sudden traffic spikes.

Don't forget a scale-in policy for when traffic drops.

```bash
# Alarm for low CPU
aws cloudwatch put-metric-alarm \
  --alarm-name api-low-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 3 \
  --threshold 30 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=ClusterName,Value=my-cluster Name=ServiceName,Value=api-service

# Scale-in policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/my-cluster/api-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-step-scale-in \
  --policy-type StepScaling \
  --step-scaling-policy-configuration '{
    "AdjustmentType": "ChangeInCapacity",
    "StepAdjustments": [
      {
        "MetricIntervalUpperBound": 0,
        "ScalingAdjustment": -1
      }
    ],
    "Cooldown": 300
  }'
```

## Scheduled Scaling

If you know your traffic patterns - like a lunch rush or end-of-day processing - schedule scaling actions in advance.

```bash
# Scale up for business hours (weekdays, 8 AM to 6 PM EST)
aws application-autoscaling put-scheduled-action \
  --service-namespace ecs \
  --resource-id service/my-cluster/api-service \
  --scalable-dimension ecs:service:DesiredCount \
  --scheduled-action-name business-hours-scale-up \
  --schedule "cron(0 8 ? * MON-FRI *)" \
  --timezone "US/Eastern" \
  --scalable-target-action MinCapacity=5,MaxCapacity=20

# Scale down for nights and weekends
aws application-autoscaling put-scheduled-action \
  --service-namespace ecs \
  --resource-id service/my-cluster/api-service \
  --scalable-dimension ecs:service:DesiredCount \
  --scheduled-action-name off-hours-scale-down \
  --schedule "cron(0 18 ? * MON-FRI *)" \
  --timezone "US/Eastern" \
  --scalable-target-action MinCapacity=2,MaxCapacity=5
```

Scheduled scaling works alongside target tracking. You pre-position capacity based on when you know traffic will increase, and target tracking handles the fine-tuning.

## Combining Multiple Policies

You can have multiple scaling policies active simultaneously. ECS picks the one that results in the most capacity for scale-out (highest task count) and the least capacity for scale-in (highest task count). This means scale-out is always aggressive and scale-in is always conservative.

A common production setup:

```bash
# 1. Target tracking on CPU (handles gradual load changes)
# 2. Target tracking on ALB requests (handles request-based load)
# 3. Scheduled scaling (pre-positions for known patterns)
# All three work together - the highest desired count wins
```

## Monitoring Auto Scaling

Watch the scaling activity to make sure it's behaving as expected.

```bash
# View scaling activities
aws application-autoscaling describe-scaling-activities \
  --service-namespace ecs \
  --resource-id service/my-cluster/api-service \
  --max-results 10

# View current scaling policies
aws application-autoscaling describe-scaling-policies \
  --service-namespace ecs \
  --resource-id service/my-cluster/api-service
```

Also watch the ECS service events for scaling-related messages.

```bash
# View recent service events including scaling actions
aws ecs describe-services \
  --cluster my-cluster \
  --services api-service \
  --query 'services[0].events[:10]'
```

## Cost Optimization Tips

A few strategies to keep auto scaling costs reasonable:

- Use Fargate Spot for workloads that can handle interruptions - it's 70% cheaper
- Set reasonable max-capacity limits to prevent runaway scaling
- Use longer scale-in cooldowns (300-600 seconds) to avoid oscillation
- Combine scheduled scaling with target tracking to pre-position only what you need
- Monitor your scaling patterns over a few weeks and adjust thresholds based on real data

## Wrapping Up

Auto scaling transforms your ECS services from static deployments into dynamic systems that respond to real demand. Start with target tracking on CPU or ALB request count - it's the simplest to set up and works well for most services. Layer in scheduled scaling if you have predictable traffic patterns, and use step scaling only if you need precise control over the scaling behavior at different thresholds. Always set conservative scale-in policies to avoid removing too much capacity too quickly.
