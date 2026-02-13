# How to Create CloudWatch Alarms for Billing Thresholds

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, Billing, Cost Management, Alarms

Description: Set up CloudWatch billing alarms to get notified when your AWS spending approaches or exceeds your budget thresholds before costs spiral out of control.

---

Nothing ruins a Monday morning like discovering your AWS bill tripled over the weekend because someone left a fleet of GPU instances running. Billing alarms are your safety net. They won't stop the spending, but they'll make sure you know about it before the month-end invoice delivers a nasty surprise.

AWS gives you two ways to monitor costs: CloudWatch billing alarms (the classic approach) and AWS Budgets (the newer, more feature-rich option). This guide focuses on CloudWatch billing alarms because they're straightforward, integrate with your existing alarm infrastructure, and work great for simple threshold monitoring.

## Prerequisites

Billing alarms require a specific setup. The billing metric data is only available in the **us-east-1** region, regardless of where your resources run. You also need to enable billing alerts in your account.

### Enable Billing Alerts

This is a one-time setup per account:

1. Sign in to the AWS Console as the root user or an IAM user with billing access
2. Go to Billing and Cost Management > Billing Preferences
3. Check "Receive Billing Alerts"
4. Save

Or via CLI:

```bash
# Enable billing alerts (must be run in us-east-1)
aws ce update-cost-allocation-tags-status \
  --region us-east-1 \
  --cost-allocation-tags-status Key=aws:createdBy,Status=Active
```

Note: After enabling billing alerts, it takes about 15 minutes before billing metrics start appearing in CloudWatch.

## Creating a Basic Billing Alarm

The simplest alarm watches your total estimated charges:

```bash
# Create an alarm when estimated charges exceed $500
aws cloudwatch put-metric-alarm \
  --region us-east-1 \
  --alarm-name "AWS-Bill-Exceeds-500" \
  --alarm-description "Estimated AWS charges have exceeded $500" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --threshold 500 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:billing-alerts \
  --dimensions Name=Currency,Value=USD
```

A few things to note:

- **Region must be us-east-1.** Billing metrics only exist there.
- **Period of 21600 (6 hours).** Billing metrics update approximately every 6 hours, so there's no point checking more frequently.
- **Statistic is Maximum.** The EstimatedCharges metric only increases throughout the billing period, so Maximum gives you the current running total.
- **The dimension is Currency=USD.** This is required.

## Multiple Threshold Alarms

Don't just set one alarm. Create a series of escalating alarms:

```bash
# Warning at 50% of budget ($250 of $500)
aws cloudwatch put-metric-alarm \
  --region us-east-1 \
  --alarm-name "AWS-Bill-50pct-Warning" \
  --alarm-description "AWS bill has reached 50% of monthly budget" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --threshold 250 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:billing-warnings \
  --dimensions Name=Currency,Value=USD

# Alert at 80% of budget ($400 of $500)
aws cloudwatch put-metric-alarm \
  --region us-east-1 \
  --alarm-name "AWS-Bill-80pct-Alert" \
  --alarm-description "AWS bill has reached 80% of monthly budget" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --threshold 400 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:billing-alerts \
  --dimensions Name=Currency,Value=USD

# Critical at 100% of budget ($500)
aws cloudwatch put-metric-alarm \
  --region us-east-1 \
  --alarm-name "AWS-Bill-100pct-Critical" \
  --alarm-description "AWS bill has exceeded monthly budget!" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --threshold 500 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:billing-critical \
  --dimensions Name=Currency,Value=USD
```

Route each level to different SNS topics with different subscribers. The 50% warning might go to email. The 80% alert goes to Slack. The 100% breach goes to [PagerDuty](https://oneuptime.com/blog/post/2026-02-12-cloudwatch-alarms-pagerduty/view).

## Per-Service Billing Alarms

You can also monitor spending per AWS service:

```bash
# Alarm for EC2 charges exceeding $200
aws cloudwatch put-metric-alarm \
  --region us-east-1 \
  --alarm-name "EC2-Bill-Exceeds-200" \
  --alarm-description "EC2 estimated charges exceeded $200" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --threshold 200 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:billing-alerts \
  --dimensions Name=ServiceName,Value=AmazonEC2 Name=Currency,Value=USD

# Alarm for RDS charges exceeding $100
aws cloudwatch put-metric-alarm \
  --region us-east-1 \
  --alarm-name "RDS-Bill-Exceeds-100" \
  --alarm-description "RDS estimated charges exceeded $100" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:billing-alerts \
  --dimensions Name=ServiceName,Value=AmazonRDS Name=Currency,Value=USD
```

Common service name values include: `AmazonEC2`, `AmazonRDS`, `AmazonS3`, `AWSLambda`, `AmazonDynamoDB`, `AmazonCloudWatch`, `AmazonSageMaker`, and `AWSDataTransfer`.

## CloudFormation Template

Here's a complete template for a multi-threshold billing alarm setup:

```yaml
# CloudFormation for billing alarms
AWSTemplateFormatVersion: '2010-09-09'
Description: Billing threshold alarms

Parameters:
  MonthlyBudget:
    Type: Number
    Default: 500
    Description: Monthly budget in USD
  AlertEmail:
    Type: String
    Description: Email for billing alerts

Resources:
  BillingAlertsTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: billing-alerts

  EmailSubscription:
    Type: AWS::SNS::Subscription
    Properties:
      TopicArn: !Ref BillingAlertsTopic
      Protocol: email
      Endpoint: !Ref AlertEmail

  BillingAlarm50Pct:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'Billing-50pct-${MonthlyBudget}'
      AlarmDescription: !Sub 'AWS charges have reached 50% of $${MonthlyBudget} budget'
      Namespace: AWS/Billing
      MetricName: EstimatedCharges
      Dimensions:
        - Name: Currency
          Value: USD
      Statistic: Maximum
      Period: 21600
      EvaluationPeriods: 1
      Threshold: !Sub '${AWS::NoValue}'
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref BillingAlertsTopic

  BillingAlarm80Pct:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'Billing-80pct-${MonthlyBudget}'
      AlarmDescription: !Sub 'AWS charges have reached 80% of $${MonthlyBudget} budget'
      Namespace: AWS/Billing
      MetricName: EstimatedCharges
      Dimensions:
        - Name: Currency
          Value: USD
      Statistic: Maximum
      Period: 21600
      EvaluationPeriods: 1
      Threshold: !FindInMap [ThresholdMap, EightyPercent, Value]
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref BillingAlertsTopic

  BillingAlarm100Pct:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'Billing-Exceeded-${MonthlyBudget}'
      AlarmDescription: !Sub 'AWS charges have exceeded $${MonthlyBudget} budget!'
      Namespace: AWS/Billing
      MetricName: EstimatedCharges
      Dimensions:
        - Name: Currency
          Value: USD
      Statistic: Maximum
      Period: 21600
      EvaluationPeriods: 1
      Threshold: !Ref MonthlyBudget
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref BillingAlertsTopic
```

## Terraform Alternative

If you prefer Terraform:

```hcl
# Terraform configuration for billing alarms
variable "monthly_budget" {
  default = 500
}

variable "alert_email" {
  type = string
}

resource "aws_sns_topic" "billing_alerts" {
  provider = aws.us_east_1  # Must be us-east-1
  name     = "billing-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  provider  = aws.us_east_1
  topic_arn = aws_sns_topic.billing_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Alarm at 50% of budget
resource "aws_cloudwatch_metric_alarm" "billing_50" {
  provider            = aws.us_east_1
  alarm_name          = "billing-50-percent"
  alarm_description   = "Billing reached 50% of monthly budget"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = var.monthly_budget * 0.5
  alarm_actions       = [aws_sns_topic.billing_alerts.arn]

  dimensions = {
    Currency = "USD"
  }
}

# Alarm at 80% of budget
resource "aws_cloudwatch_metric_alarm" "billing_80" {
  provider            = aws.us_east_1
  alarm_name          = "billing-80-percent"
  alarm_description   = "Billing reached 80% of monthly budget"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = var.monthly_budget * 0.8
  alarm_actions       = [aws_sns_topic.billing_alerts.arn]

  dimensions = {
    Currency = "USD"
  }
}

# Alarm at 100% of budget
resource "aws_cloudwatch_metric_alarm" "billing_100" {
  provider            = aws.us_east_1
  alarm_name          = "billing-exceeded"
  alarm_description   = "Billing has exceeded monthly budget!"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = var.monthly_budget
  alarm_actions       = [aws_sns_topic.billing_alerts.arn]

  dimensions = {
    Currency = "USD"
  }
}
```

## Automated Cost Control with Lambda

For accounts where runaway costs are a real risk, you can go beyond alerting and automate cost control:

```python
# Lambda function to stop non-essential EC2 instances when billing alarm fires
import boto3

def lambda_handler(event, context):
    ec2 = boto3.client('ec2')

    # Find all running instances tagged as non-essential
    response = ec2.describe_instances(
        Filters=[
            {'Name': 'tag:CostCategory', 'Values': ['non-essential']},
            {'Name': 'instance-state-name', 'Values': ['running']}
        ]
    )

    instance_ids = []
    for reservation in response['Reservations']:
        for instance in reservation['Instances']:
            instance_ids.append(instance['InstanceId'])

    if instance_ids:
        print(f'Stopping {len(instance_ids)} non-essential instances: {instance_ids}')
        ec2.stop_instances(InstanceIds=instance_ids)
    else:
        print('No non-essential instances to stop')

    return {
        'stopped_instances': instance_ids,
        'count': len(instance_ids)
    }
```

Subscribe this Lambda to your critical billing SNS topic, and it'll automatically shut down non-essential resources when your budget is exceeded. Be very careful with this approach - make sure your tagging is solid so you don't accidentally stop production resources.

## Limitations of CloudWatch Billing Alarms

CloudWatch billing alarms have some limitations you should know about:

- **6-hour delay.** Billing metrics update roughly every 6 hours, so you won't catch a cost spike instantly.
- **Estimated only.** These are estimates that can differ from your final bill by a few percent.
- **No forecasting.** Billing alarms look at current spend, not projected spend. AWS Budgets handles forecasting.
- **US-East-1 only.** All billing metrics live in us-east-1 regardless of where your resources are.
- **Account level.** For multi-account setups with Organizations, you need to set up alarms in the management account.

For more advanced cost monitoring - like forecasting, cost allocation by tag, or budget actions - look into AWS Budgets. But for simple "tell me when I hit $X" alerts, CloudWatch billing alarms are perfect.

## Best Practices

**Set alarms before you need them.** The first day of a new AWS account should include setting up billing alarms. Don't wait until you've been burned.

**Use multiple thresholds.** A single alarm at your budget limit means you only find out after it's too late. Escalating thresholds at 50%, 80%, and 100% give you time to react.

**Monitor per-service too.** A total budget alarm might not fire until several services have gone over individually. Per-service alarms help you spot which component is driving costs.

**Review and adjust quarterly.** As your usage grows, your thresholds need to grow with it. An alarm that fires every month because your normal spend exceeds the threshold becomes noise.

For a broader look at controlling AWS monitoring costs, check out our guide on [reducing CloudWatch costs](https://oneuptime.com/blog/post/2026-02-12-reduce-cloudwatch-costs/view).

## Wrapping Up

Billing alarms take five minutes to set up and can save you thousands. Every AWS account should have them - no exceptions. Start with a simple total charges alarm, add per-service alarms for your biggest cost drivers, and consider automated remediation if you're running workloads that could unexpectedly scale. Your finance team will thank you.
