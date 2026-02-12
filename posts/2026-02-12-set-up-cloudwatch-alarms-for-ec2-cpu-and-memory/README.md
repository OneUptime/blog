# How to Set Up CloudWatch Alarms for EC2 CPU and Memory

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, CloudWatch, Alarms, Monitoring, CPU, Memory, Alerting

Description: Configure CloudWatch alarms for EC2 CPU utilization and memory usage with SNS notifications, Auto Scaling actions, and composite alarms.

---

An EC2 instance running at 99% CPU for 20 minutes while nobody notices is a preventable outage. CloudWatch alarms let you detect resource issues and respond - either automatically or through notifications - before they become full-blown incidents. CPU alarms are straightforward since CloudWatch tracks CPU natively. Memory alarms take an extra step because you need the CloudWatch agent to collect memory metrics.

## Setting Up SNS for Notifications

Before creating alarms, you need somewhere to send the alerts. Create an SNS topic and subscribe to it:

```bash
# Create an SNS topic for EC2 alerts
TOPIC_ARN=$(aws sns create-topic --name ec2-alerts --query 'TopicArn' --output text)

# Subscribe an email address
aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol email \
  --notification-endpoint ops-team@yourcompany.com

# Subscribe a Slack webhook via Lambda or HTTPS endpoint
aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol https \
  --notification-endpoint https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Check your email and confirm the subscription before alarms can deliver notifications.

## CPU Utilization Alarm

CPU utilization is a built-in EC2 metric, so alarms work right away without any agent installation.

This alarm fires when average CPU stays above 80% for 5 consecutive minutes:

```bash
# Create a CPU high alarm - fires when CPU > 80% for 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name "cpu-high-i-0abc123" \
  --alarm-description "CPU utilization exceeds 80% for 5 minutes" \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-0abc123 \
  --statistic Average \
  --period 60 \
  --evaluation-periods 5 \
  --datapoints-to-alarm 5 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $TOPIC_ARN \
  --ok-actions $TOPIC_ARN \
  --treat-missing-data missing
```

Key parameters explained:
- `period: 60` - Evaluate every 60 seconds (requires detailed monitoring)
- `evaluation-periods: 5` - Look at 5 consecutive periods
- `datapoints-to-alarm: 5` - All 5 must breach (stricter than "3 out of 5")
- `ok-actions` - Also notify when the alarm recovers
- `treat-missing-data: missing` - Don't change alarm state if data is missing

For a low CPU alarm that helps identify idle instances:

```bash
# Create a CPU low alarm - might indicate an idle or stuck instance
aws cloudwatch put-metric-alarm \
  --alarm-name "cpu-low-i-0abc123" \
  --alarm-description "CPU utilization below 5% for 1 hour - instance may be idle" \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-0abc123 \
  --statistic Average \
  --period 300 \
  --evaluation-periods 12 \
  --datapoints-to-alarm 12 \
  --threshold 5 \
  --comparison-operator LessThanThreshold \
  --alarm-actions $TOPIC_ARN
```

## Memory Alarms (Requires CloudWatch Agent)

CloudWatch doesn't collect memory metrics by default. You need the CloudWatch agent installed and configured. If you haven't set that up yet, check out [installing and configuring the CloudWatch agent on EC2](https://oneuptime.com/blog/post/install-and-configure-the-cloudwatch-agent-on-ec2/view).

Once the agent is reporting memory metrics, you can create alarms against them:

```bash
# Create a memory high alarm - fires when memory usage exceeds 90%
aws cloudwatch put-metric-alarm \
  --alarm-name "memory-high-i-0abc123" \
  --alarm-description "Memory utilization exceeds 90% for 5 minutes" \
  --namespace CWAgent \
  --metric-name mem_used_percent \
  --dimensions Name=InstanceId,Value=i-0abc123 \
  --statistic Average \
  --period 60 \
  --evaluation-periods 5 \
  --datapoints-to-alarm 5 \
  --threshold 90 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $TOPIC_ARN \
  --ok-actions $TOPIC_ARN
```

Note the namespace is `CWAgent`, not `AWS/EC2`. The metric name `mem_used_percent` comes from the CloudWatch agent configuration.

## Creating Alarms with Terraform

For production environments, manage alarms as code:

```hcl
# Terraform: CPU and memory alarms for an EC2 instance
variable "instance_id" {
  default = "i-0abc123"
}

variable "sns_topic_arn" {
  default = "arn:aws:sns:us-east-1:123456789:ec2-alerts"
}

# CPU high alarm
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "cpu-high-${var.instance_id}"
  alarm_description   = "CPU utilization exceeds 80%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  datapoints_to_alarm = 5

  dimensions = {
    InstanceId = var.instance_id
  }

  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]

  treat_missing_data = "missing"
}

# Memory high alarm (requires CloudWatch agent)
resource "aws_cloudwatch_metric_alarm" "memory_high" {
  alarm_name          = "memory-high-${var.instance_id}"
  alarm_description   = "Memory utilization exceeds 90%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "mem_used_percent"
  namespace           = "CWAgent"
  period              = 60
  statistic           = "Average"
  threshold           = 90
  datapoints_to_alarm = 5

  dimensions = {
    InstanceId = var.instance_id
  }

  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
}

# CPU credit alarm for T instances
resource "aws_cloudwatch_metric_alarm" "cpu_credits_low" {
  alarm_name          = "cpu-credits-low-${var.instance_id}"
  alarm_description   = "CPU credit balance is low - instance may be throttled"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUCreditBalance"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Minimum"
  threshold           = 20

  dimensions = {
    InstanceId = var.instance_id
  }

  alarm_actions = [var.sns_topic_arn]
}
```

## Composite Alarms

Sometimes a single metric alarm isn't enough context. Composite alarms combine multiple alarms using boolean logic:

```bash
# Create a composite alarm that fires only when BOTH CPU and memory are high
aws cloudwatch put-composite-alarm \
  --alarm-name "resource-pressure-i-0abc123" \
  --alarm-description "Both CPU and memory are critically high" \
  --alarm-rule 'ALARM("cpu-high-i-0abc123") AND ALARM("memory-high-i-0abc123")' \
  --alarm-actions $TOPIC_ARN
```

This reduces alert noise. High CPU alone might be normal during a deployment. High CPU AND high memory together likely indicates a real problem.

You can also create escalation patterns:

```bash
# Warning alarm - CPU high OR memory high
aws cloudwatch put-composite-alarm \
  --alarm-name "resource-warning-i-0abc123" \
  --alarm-description "Either CPU or memory is elevated" \
  --alarm-rule 'ALARM("cpu-high-i-0abc123") OR ALARM("memory-high-i-0abc123")' \
  --alarm-actions arn:aws:sns:us-east-1:123456789:warnings

# Critical alarm - both are high
aws cloudwatch put-composite-alarm \
  --alarm-name "resource-critical-i-0abc123" \
  --alarm-description "Both CPU and memory are critically high" \
  --alarm-rule 'ALARM("cpu-high-i-0abc123") AND ALARM("memory-high-i-0abc123")' \
  --alarm-actions arn:aws:sns:us-east-1:123456789:pagerduty
```

## Auto Scaling Integration

Alarms can trigger Auto Scaling actions to automatically add or remove capacity:

```bash
# Create a scale-out alarm - add instances when CPU is high across the group
aws cloudwatch put-metric-alarm \
  --alarm-name "asg-cpu-high-scale-out" \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=AutoScalingGroupName,Value=my-asg \
  --statistic Average \
  --period 60 \
  --evaluation-periods 3 \
  --threshold 70 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:autoscaling:us-east-1:123456789:scalingPolicy:abc-123:autoScalingGroupName/my-asg:policyName/scale-out

# Create a scale-in alarm - remove instances when CPU is low
aws cloudwatch put-metric-alarm \
  --alarm-name "asg-cpu-low-scale-in" \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=AutoScalingGroupName,Value=my-asg \
  --statistic Average \
  --period 300 \
  --evaluation-periods 10 \
  --threshold 30 \
  --comparison-operator LessThanThreshold \
  --alarm-actions arn:aws:autoscaling:us-east-1:123456789:scalingPolicy:abc-123:autoScalingGroupName/my-asg:policyName/scale-in
```

Notice the scale-in alarm uses a longer evaluation period (10 x 300s = 50 minutes). You want to be really sure traffic has dropped before removing instances.

## EC2 Auto Recovery

You can also use alarms to trigger EC2 auto recovery, which moves an instance to new hardware if the underlying host has issues:

```bash
# Create an alarm that triggers instance recovery on status check failure
aws cloudwatch put-metric-alarm \
  --alarm-name "auto-recover-i-0abc123" \
  --namespace AWS/EC2 \
  --metric-name StatusCheckFailed_System \
  --dimensions Name=InstanceId,Value=i-0abc123 \
  --statistic Maximum \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions arn:aws:automate:us-east-1:ec2:recover
```

## Alarm Best Practices

**Avoid alarm fatigue**: If alarms fire too often and nobody acts on them, they get ignored. Tune thresholds to only fire for actionable events.

**Use different severity levels**: Not every alarm needs to page someone at 3am. Route warnings to email/Slack and only critical alarms to PagerDuty.

**Include instance context in alarm names**: Names like `cpu-high-web-prod-i-0abc123` are much more useful than `alarm-1` when you get paged.

**Set OK actions**: Getting notified when an alarm recovers is just as important as knowing when it fires. It tells you the issue resolved.

**Account for burst workloads**: If your application has predictable spikes (batch jobs, report generation), either adjust thresholds during those windows or use anomaly detection alarms instead.

For a broader monitoring strategy that includes these alarms, consider setting up [detailed monitoring on your EC2 instances](https://oneuptime.com/blog/post/monitor-ec2-instances-with-cloudwatch-detailed-monitoring/view) to get 1-minute metric granularity, which makes alarms more responsive.

Well-configured alarms are the difference between catching a problem in 3 minutes and finding out about it from your users 30 minutes later. Take the time to set them up properly, and they'll pay for themselves the first time they catch an issue before it becomes an outage.
