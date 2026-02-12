# How to Monitor EC2 Instances with CloudWatch Detailed Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, CloudWatch, Monitoring, Metrics, Observability

Description: Enable and use CloudWatch detailed monitoring on EC2 instances to get 1-minute metric granularity for better visibility into instance performance.

---

By default, EC2 instances send metrics to CloudWatch every 5 minutes. That might sound fine until you're trying to debug a CPU spike that lasted 90 seconds and completely disappeared between data points. Detailed monitoring drops the interval to 1 minute, giving you the resolution you actually need to catch performance problems.

## Basic vs Detailed Monitoring

Here's what changes when you switch from basic to detailed:

| Aspect | Basic Monitoring | Detailed Monitoring |
|--------|-----------------|-------------------|
| Metric interval | 5 minutes | 1 minute |
| Cost | Free | ~$3.50/month per instance |
| Available metrics | Standard EC2 set | Same metrics, finer granularity |
| Alarm evaluation | 5-minute periods | 1-minute periods |

The metrics themselves don't change - you still get CPU utilization, network in/out, disk read/write ops, and status checks. What changes is how often those data points are collected.

## Enabling Detailed Monitoring

You can enable it at launch or on a running instance.

At launch time:

```bash
# Launch an instance with detailed monitoring enabled
aws ec2 run-instances \
  --image-id ami-0abc123 \
  --instance-type m5.xlarge \
  --monitoring Enabled=true \
  --key-name my-key \
  --subnet-id subnet-abc123 \
  --security-group-ids sg-abc123
```

On an existing instance:

```bash
# Enable detailed monitoring on a running instance
aws ec2 monitor-instances --instance-ids i-0abc123 i-0def456 i-0ghi789

# Verify it's enabled
aws ec2 describe-instances \
  --instance-ids i-0abc123 \
  --query 'Reservations[0].Instances[0].Monitoring.State'
# Should return "enabled"
```

To disable it later:

```bash
# Disable detailed monitoring (revert to basic 5-minute intervals)
aws ec2 unmonitor-instances --instance-ids i-0abc123
```

## Enabling via Terraform

For infrastructure-as-code setups:

```hcl
# Terraform: enable detailed monitoring on an EC2 instance
resource "aws_instance" "web" {
  ami           = "ami-0abc123"
  instance_type = "m5.xlarge"
  monitoring    = true  # This enables detailed monitoring

  tags = {
    Name = "web-server"
  }
}
```

For Auto Scaling groups, enable it in the launch template:

```hcl
# Terraform: launch template with detailed monitoring for ASG
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = "ami-0abc123"
  instance_type = "m5.large"

  monitoring {
    enabled = true  # All instances launched by ASG will have detailed monitoring
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "app-server"
    }
  }
}

resource "aws_autoscaling_group" "app" {
  desired_capacity = 3
  max_size         = 10
  min_size         = 2

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}
```

## Available EC2 Metrics

With detailed monitoring enabled, these metrics arrive every minute:

**CPU metrics:**
- `CPUUtilization` - Percentage of allocated EC2 compute units in use
- `CPUCreditBalance` - (T instances only) Available CPU credits
- `CPUCreditUsage` - (T instances only) Credits consumed

**Disk metrics:**
- `DiskReadOps` - Completed read operations
- `DiskWriteOps` - Completed write operations
- `DiskReadBytes` - Bytes read
- `DiskWriteBytes` - Bytes written

**Network metrics:**
- `NetworkIn` - Bytes received
- `NetworkOut` - Bytes sent
- `NetworkPacketsIn` - Packets received
- `NetworkPacketsOut` - Packets sent

**Status checks:**
- `StatusCheckFailed` - Either check failed
- `StatusCheckFailed_Instance` - Instance check failed
- `StatusCheckFailed_System` - System check failed

## Querying Metrics with the CLI

Here's how to pull metric data to see your 1-minute granularity in action:

```bash
# Get CPU utilization for the last hour at 1-minute intervals
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-0abc123 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average Maximum \
  --output table
```

Compare the 1-minute vs 5-minute view of the same time period:

```bash
# 1-minute granularity (detailed monitoring)
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-0abc123 \
  --start-time 2026-02-12T10:00:00Z \
  --end-time 2026-02-12T11:00:00Z \
  --period 60 \
  --statistics Maximum

# 5-minute granularity (basic monitoring) - same time range
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-0abc123 \
  --start-time 2026-02-12T10:00:00Z \
  --end-time 2026-02-12T11:00:00Z \
  --period 300 \
  --statistics Maximum
```

You'll notice the 1-minute data captures spikes that the 5-minute data smooths over.

## Setting Up 1-Minute Alarms

The main reason to enable detailed monitoring is to create alarms that respond faster. A 5-minute alarm can take 5-15 minutes to trigger. A 1-minute alarm can trigger in 1-3 minutes.

```bash
# Create a CPU alarm that evaluates every 1 minute
aws cloudwatch put-metric-alarm \
  --alarm-name "high-cpu-i-0abc123" \
  --alarm-description "CPU above 80% for 3 consecutive minutes" \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-0abc123 \
  --statistic Average \
  --period 60 \
  --evaluation-periods 3 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789:ops-alerts
```

This alarm checks CPU every minute and fires if the average exceeds 80% for 3 consecutive minutes. With basic monitoring, the fastest equivalent would check every 5 minutes - much slower to detect and respond to issues.

## Combining with Auto Scaling

Detailed monitoring makes Auto Scaling more responsive. Here's a scaling policy that reacts to 1-minute metrics:

```bash
# Create a target tracking scaling policy using 1-minute metrics
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name my-asg \
  --policy-name cpu-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "TargetValue": 60.0,
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'
```

Notice the asymmetric cooldown: scale-out has only 60 seconds (we want to add capacity fast) while scale-in has 300 seconds (we want to be cautious about removing capacity).

## What Detailed Monitoring Doesn't Give You

There's a common misconception that detailed monitoring adds more metric types. It doesn't. You still won't get:

- **Memory utilization**: Requires the CloudWatch agent
- **Disk usage percentage**: Requires the CloudWatch agent
- **Per-process metrics**: Requires the CloudWatch agent
- **Application-level metrics**: Requires custom metrics

For these, you need to install and configure the CloudWatch agent. Check out [installing and configuring the CloudWatch agent on EC2](https://oneuptime.com/blog/post/install-and-configure-the-cloudwatch-agent-on-ec2/view) for a full walkthrough.

## Cost Considerations

Detailed monitoring costs approximately $3.50 per instance per month. For a fleet of 100 instances, that's $350/month. Whether it's worth it depends on your needs:

**Worth it when:**
- You have latency-sensitive applications
- You use Auto Scaling and need fast reactions
- You're debugging intermittent performance issues
- You need 1-minute alarm evaluation periods

**Skip it when:**
- You're running dev/test environments
- Your workloads are steady-state with no scaling
- Budget is extremely tight
- 5-minute granularity is sufficient for your alerting

A good middle ground is to enable detailed monitoring only on production instances and instances in Auto Scaling groups, while leaving basic monitoring on development and staging.

## Dashboard Example

Create a CloudWatch dashboard that takes advantage of 1-minute data:

```bash
# Create a dashboard with 1-minute granularity widgets
aws cloudwatch put-dashboard \
  --dashboard-name "EC2-Fleet-Overview" \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["AWS/EC2", "CPUUtilization", "InstanceId", "i-0abc123", {"period": 60}],
            ["AWS/EC2", "CPUUtilization", "InstanceId", "i-0def456", {"period": 60}]
          ],
          "period": 60,
          "stat": "Average",
          "title": "CPU Utilization (1-minute)",
          "view": "timeSeries"
        }
      },
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["AWS/EC2", "NetworkIn", "InstanceId", "i-0abc123", {"period": 60}],
            ["AWS/EC2", "NetworkOut", "InstanceId", "i-0abc123", {"period": 60}]
          ],
          "period": 60,
          "stat": "Sum",
          "title": "Network Traffic (1-minute)",
          "view": "timeSeries"
        }
      }
    ]
  }'
```

For alerts and incident management on top of your CloudWatch data, consider setting up [CloudWatch alarms for CPU and memory](https://oneuptime.com/blog/post/set-up-cloudwatch-alarms-for-ec2-cpu-and-memory/view) to get notified before issues impact your users.

Detailed monitoring is one of those simple toggles that makes a real difference in your ability to understand and react to what's happening on your instances. For production workloads, the $3.50/month per instance is almost always worth the visibility you get in return.
