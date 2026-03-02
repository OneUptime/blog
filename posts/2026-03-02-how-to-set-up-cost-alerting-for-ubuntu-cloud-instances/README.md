# How to Set Up Cost Alerting for Ubuntu Cloud Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cloud Cost Optimization, AWS, Monitoring, FinOps

Description: Learn how to configure cost alerting for Ubuntu cloud instances on AWS and Azure, using budgets, CloudWatch alarms, and custom scripts to get notified before costs exceed thresholds.

---

Cost surprises in cloud environments are largely preventable. Most cloud providers offer native budgeting and alerting features that send notifications when spending crosses thresholds - but these tools require configuration to be useful. Beyond native tools, you can build more targeted alerts that notify you when specific resources or patterns drive costs unexpectedly. This guide covers setting up comprehensive cost alerting for Ubuntu instances on AWS, with notes on Azure.

## AWS Native Cost Alerting

### Setting Up AWS Budgets

AWS Budgets is the primary cost alerting tool. You set a spending threshold and receive notifications when you approach or exceed it.

```bash
# Install and configure AWS CLI
sudo apt-get install -y awscli
aws configure

# Get your account ID (needed for budget creation)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account ID: $ACCOUNT_ID"
```

Create a monthly budget with multiple notification thresholds:

```bash
# Create a comprehensive monthly budget with tiered alerts
aws budgets create-budget \
    --account-id "$ACCOUNT_ID" \
    --budget '{
        "BudgetName": "Monthly-Total-Budget",
        "BudgetLimit": {
            "Amount": "1000",
            "Unit": "USD"
        },
        "TimeUnit": "MONTHLY",
        "BudgetType": "COST"
    }' \
    --notifications-with-subscribers '[
        {
            "Notification": {
                "NotificationType": "ACTUAL",
                "ComparisonOperator": "GREATER_THAN",
                "Threshold": 50,
                "ThresholdType": "PERCENTAGE"
            },
            "Subscribers": [{
                "SubscriptionType": "EMAIL",
                "Address": "ops@example.com"
            }]
        },
        {
            "Notification": {
                "NotificationType": "ACTUAL",
                "ComparisonOperator": "GREATER_THAN",
                "Threshold": 80,
                "ThresholdType": "PERCENTAGE"
            },
            "Subscribers": [{
                "SubscriptionType": "EMAIL",
                "Address": "ops@example.com"
            }, {
                "SubscriptionType": "EMAIL",
                "Address": "finance@example.com"
            }]
        },
        {
            "Notification": {
                "NotificationType": "FORECASTED",
                "ComparisonOperator": "GREATER_THAN",
                "Threshold": 100,
                "ThresholdType": "PERCENTAGE"
            },
            "Subscribers": [{
                "SubscriptionType": "EMAIL",
                "Address": "ops@example.com"
            }]
        }
    ]'
```

The three notifications above send alerts at 50% actual spend, 80% actual spend, and when the forecast projects you'll exceed the budget.

### Service-Specific Budgets

Create separate budgets for different services to pinpoint cost increases:

```bash
# EC2-specific budget
aws budgets create-budget \
    --account-id "$ACCOUNT_ID" \
    --budget '{
        "BudgetName": "EC2-Monthly-Budget",
        "BudgetLimit": {"Amount": "600", "Unit": "USD"},
        "TimeUnit": "MONTHLY",
        "BudgetType": "COST",
        "CostFilters": {
            "Service": ["Amazon Elastic Compute Cloud - Compute"]
        }
    }' \
    --notifications-with-subscribers '[{
        "Notification": {
            "NotificationType": "ACTUAL",
            "ComparisonOperator": "GREATER_THAN",
            "Threshold": 80,
            "ThresholdType": "PERCENTAGE"
        },
        "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "ops@example.com"}]
    }]'

# RDS-specific budget
aws budgets create-budget \
    --account-id "$ACCOUNT_ID" \
    --budget '{
        "BudgetName": "RDS-Monthly-Budget",
        "BudgetLimit": {"Amount": "200", "Unit": "USD"},
        "TimeUnit": "MONTHLY",
        "BudgetType": "COST",
        "CostFilters": {
            "Service": ["Amazon Relational Database Service"]
        }
    }' \
    --notifications-with-subscribers '[{
        "Notification": {
            "NotificationType": "ACTUAL",
            "ComparisonOperator": "GREATER_THAN",
            "Threshold": 90,
            "ThresholdType": "PERCENTAGE"
        },
        "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "ops@example.com"}]
    }]'
```

### Budget with SNS for Programmatic Notifications

For Slack notifications or automated remediation, use SNS:

```bash
# Create an SNS topic for budget alerts
SNS_TOPIC_ARN=$(aws sns create-topic \
    --name budget-alerts \
    --query TopicArn \
    --output text)

echo "SNS Topic ARN: $SNS_TOPIC_ARN"

# Subscribe an email to the topic
aws sns subscribe \
    --topic-arn "$SNS_TOPIC_ARN" \
    --protocol email \
    --notification-endpoint "ops@example.com"

# Subscribe a Lambda function or HTTPS endpoint for programmatic handling
aws sns subscribe \
    --topic-arn "$SNS_TOPIC_ARN" \
    --protocol https \
    --notification-endpoint "https://hooks.slack.com/services/xxx/yyy/zzz"

# Create budget with SNS notification
aws budgets create-budget \
    --account-id "$ACCOUNT_ID" \
    --budget '{
        "BudgetName": "SNS-Alerting-Budget",
        "BudgetLimit": {"Amount": "1000", "Unit": "USD"},
        "TimeUnit": "MONTHLY",
        "BudgetType": "COST"
    }' \
    --notifications-with-subscribers "[{
        \"Notification\": {
            \"NotificationType\": \"ACTUAL\",
            \"ComparisonOperator\": \"GREATER_THAN\",
            \"Threshold\": 80,
            \"ThresholdType\": \"PERCENTAGE\"
        },
        \"Subscribers\": [{
            \"SubscriptionType\": \"SNS\",
            \"Address\": \"$SNS_TOPIC_ARN\"
        }]
    }]"
```

## CloudWatch Billing Alarms

CloudWatch can monitor your billing metrics and trigger alarms - useful for more granular alerting than AWS Budgets.

**Note:** Billing metrics must be enabled in your AWS account settings (Account Settings -> Billing -> IAM access to billing information, and enable "Receive Billing Alerts").

```bash
# Create a CloudWatch alarm for estimated charges exceeding $500
aws cloudwatch put-metric-alarm \
    --region us-east-1 \
    --alarm-name "Monthly-Billing-500" \
    --alarm-description "Alert when estimated monthly charges exceed $500" \
    --metric-name EstimatedCharges \
    --namespace AWS/Billing \
    --statistic Maximum \
    --period 86400 \
    --evaluation-periods 1 \
    --threshold 500 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --dimensions Name=Currency,Value=USD \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --ok-actions "$SNS_TOPIC_ARN"

# Create per-service billing alarms
aws cloudwatch put-metric-alarm \
    --region us-east-1 \
    --alarm-name "EC2-Billing-300" \
    --metric-name EstimatedCharges \
    --namespace AWS/Billing \
    --statistic Maximum \
    --period 86400 \
    --evaluation-periods 1 \
    --threshold 300 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --dimensions \
        Name=Currency,Value=USD \
        Name=ServiceName,Value=AmazonEC2 \
    --alarm-actions "$SNS_TOPIC_ARN"
```

## Custom Cost Monitoring Script

For daily cost summaries and anomaly detection on your Ubuntu machine:

```bash
#!/bin/bash
# /usr/local/bin/daily-cost-report.sh
# Generates a daily cost report and sends alerts for anomalies

ALERT_WEBHOOK="${SLACK_WEBHOOK:-}"
ALERT_EMAIL="${ALERT_EMAIL:-ops@example.com}"
COST_HISTORY_FILE="/var/log/aws-daily-costs.csv"
REGION="us-east-1"

# Get today's costs grouped by service
TODAY_COSTS=$(aws ce get-cost-and-usage \
    --time-period Start=$(date +%Y-%m-%d),End=$(date -d '+1 day' +%Y-%m-%d) \
    --granularity DAILY \
    --metrics BlendedCost \
    --group-by Type=DIMENSION,Key=SERVICE \
    --query 'ResultsByTime[0].Groups[*].[Keys[0],Metrics.BlendedCost.Amount]' \
    --output text 2>/dev/null)

TOTAL_TODAY=$(aws ce get-cost-and-usage \
    --time-period Start=$(date +%Y-%m-%d),End=$(date -d '+1 day' +%Y-%m-%d) \
    --granularity DAILY \
    --metrics BlendedCost \
    --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
    --output text 2>/dev/null)

# Get yesterday's total for comparison
YESTERDAY_TOTAL=$(aws ce get-cost-and-usage \
    --time-period Start=$(date -d '1 day ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
    --granularity DAILY \
    --metrics BlendedCost \
    --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
    --output text 2>/dev/null)

# Log to CSV
echo "$(date +%Y-%m-%d),$TOTAL_TODAY" >> "$COST_HISTORY_FILE"

# Check for anomaly: more than 30% increase day-over-day
if [[ -n "$YESTERDAY_TOTAL" && -n "$TOTAL_TODAY" ]]; then
    INCREASE=$(echo "$TOTAL_TODAY $YESTERDAY_TOTAL" | \
        awk '{if ($2 > 0) print (($1 - $2) / $2 * 100); else print 0}')

    IS_ANOMALY=$(echo "$INCREASE" | awk '{print ($1 > 30)}')

    if [[ "$IS_ANOMALY" == "1" && -n "$ALERT_WEBHOOK" ]]; then
        REPORT="Daily cost anomaly detected!\nToday: \$$TOTAL_TODAY\nYesterday: \$$YESTERDAY_TOTAL\nIncrease: ${INCREASE}%\n\nTop services today:\n$TODAY_COSTS"

        curl -s -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"$REPORT\"}"
    fi
fi

echo "Today's cost: \$$TOTAL_TODAY (Yesterday: \$$YESTERDAY_TOTAL)"
echo ""
echo "Top 10 services by cost today:"
echo "$TODAY_COSTS" | sort -k2 -rn | head -10
```

Schedule this as a daily report:

```bash
# Make script executable
sudo chmod +x /usr/local/bin/daily-cost-report.sh

# Add IAM permissions for Cost Explorer (attach to your instance role or user)
# Required actions: ce:GetCostAndUsage

# Schedule daily at 8 AM
crontab -e
# Add:
# 0 8 * * * SLACK_WEBHOOK="https://hooks.slack.com/xxx" /usr/local/bin/daily-cost-report.sh >> /var/log/daily-cost-report.log 2>&1
```

## Azure Cost Alerting

For Azure, use Azure Monitor and Budget alerts:

```bash
# Install Azure CLI on Ubuntu
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
az login

# Create a monthly budget with alerts (requires Azure CLI 2.x)
SUBSCRIPTION_ID=$(az account show --query id --output tsv)
RESOURCE_GROUP="my-resource-group"

# Create budget with alert at 80%
az consumption budget create \
    --budget-name "Monthly-Ubuntu-Budget" \
    --amount 500 \
    --time-grain Monthly \
    --start-date "$(date +%Y-%m-01)" \
    --end-date "2027-12-31" \
    --resource-group "$RESOURCE_GROUP" \
    --notification-key "80PercentAlert" \
    --threshold 80 \
    --contact-emails "ops@example.com"
```

## Checking Existing Budgets and Alerts

```bash
# List all AWS Budgets
aws budgets describe-budgets \
    --account-id "$ACCOUNT_ID" \
    --query 'Budgets[*].{Name:BudgetName,Amount:BudgetLimit.Amount,Type:BudgetType}' \
    --output table

# Check budget notifications
aws budgets describe-notifications-for-budget \
    --account-id "$ACCOUNT_ID" \
    --budget-name "Monthly-Total-Budget"

# List CloudWatch billing alarms
aws cloudwatch describe-alarms \
    --alarm-names "Monthly-Billing-500" \
    --region us-east-1 \
    --query 'MetricAlarms[*].{Name:AlarmName,State:StateValue,Threshold:Threshold}' \
    --output table
```

The most common mistake with cost alerting is setting it up and then never reviewing whether the thresholds are still appropriate as infrastructure grows. Budget at the beginning of each quarter, set alerts at 50%, 80%, and 100% of expected spend, and review the thresholds whenever you add significant new infrastructure.
