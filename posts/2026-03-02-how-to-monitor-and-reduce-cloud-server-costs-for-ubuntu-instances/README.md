# How to Monitor and Reduce Cloud Server Costs for Ubuntu Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cloud Cost Optimization, AWS, DevOps, FinOps

Description: Learn practical techniques to monitor and reduce cloud infrastructure costs for Ubuntu instances on AWS, including right-sizing, spot instances, storage optimization, and cost reporting.

---

Cloud costs have a way of growing silently. A few extra instances left running over a weekend, oversized EBS volumes, data transfer fees from uncompressed logs - they add up without anyone noticing until the monthly invoice arrives. This guide covers practical ways to monitor your Ubuntu instance costs and take concrete steps to reduce them, with a focus on AWS (most techniques apply to Azure and GCP with minor differences).

## Understanding Where Ubuntu Instance Costs Come From

Before optimizing, know what you're paying for:

- **Compute** - Instance hours (usually the largest cost)
- **Storage** - EBS volumes attached to instances
- **Data transfer** - Outbound traffic, especially cross-region
- **Snapshots** - EBS snapshots that accumulate over time
- **Elastic IPs** - Unattached Elastic IPs still incur charges
- **NAT Gateways** - Often surprisingly expensive for internal traffic

## Monitoring Current Costs

### AWS Cost Explorer

```bash
# Install AWS CLI if not present
sudo apt-get install -y awscli

# Configure credentials
aws configure

# Get cost breakdown for the last 30 days by service
aws ce get-cost-and-usage \
    --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=DIMENSION,Key=SERVICE \
    --query 'ResultsByTime[*].Groups[*].{Service:Keys[0],Cost:Metrics.BlendedCost.Amount}' \
    --output table

# Get EC2 instance costs specifically
aws ce get-cost-and-usage \
    --time-period Start=$(date -d '7 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
    --granularity DAILY \
    --metrics BlendedCost \
    --filter '{"Dimensions":{"Key":"SERVICE","Values":["Amazon Elastic Compute Cloud - Compute"]}}' \
    --query 'ResultsByTime[*].{Date:TimePeriod.Start,Cost:Total.BlendedCost.Amount}' \
    --output table
```

### Finding Idle and Underutilized Instances

```bash
#!/bin/bash
# find-idle-instances.sh
# Identifies EC2 instances with low CPU utilization over the past 2 weeks

REGION="us-east-1"
CPU_THRESHOLD=5  # Flag instances averaging under 5% CPU

echo "Checking for low-utilization EC2 instances in $REGION..."
echo ""

# Get all running instances
INSTANCES=$(aws ec2 describe-instances \
    --region "$REGION" \
    --filters "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,Tags[?Key==`Name`].Value|[0]]' \
    --output text)

while IFS=$'\t' read -r INSTANCE_ID INSTANCE_TYPE INSTANCE_NAME; do
    # Get average CPU utilization for the past 2 weeks
    AVG_CPU=$(aws cloudwatch get-metric-statistics \
        --region "$REGION" \
        --namespace AWS/EC2 \
        --metric-name CPUUtilization \
        --dimensions Name=InstanceId,Value="$INSTANCE_ID" \
        --start-time "$(date -d '14 days ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --period 1209600 \
        --statistics Average \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null)

    if [[ "$AVG_CPU" != "None" && $(echo "$AVG_CPU $CPU_THRESHOLD" | awk '{print ($1 < $2)}') -eq 1 ]]; then
        echo "LOW UTILIZATION: $INSTANCE_ID ($INSTANCE_TYPE) - Name: ${INSTANCE_NAME:-unnamed} - Avg CPU: ${AVG_CPU}%"
    fi
done <<< "$INSTANCES"
```

## Right-Sizing Instances

Oversized instances are one of the most common sources of wasted cloud spend.

### Analyzing Instance Size Requirements

```bash
#!/bin/bash
# analyze-instance-sizing.sh
# Collects resource utilization data to inform right-sizing decisions

OUTPUT_FILE="/tmp/instance-sizing-$(date +%Y%m%d).txt"

echo "=== Instance Sizing Analysis ===" > "$OUTPUT_FILE"
echo "Generated: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# CPU utilization over last 24 hours
echo "=== CPU Utilization (24h) ===" >> "$OUTPUT_FILE"
sar -u 1 1 >> "$OUTPUT_FILE" 2>/dev/null || \
    top -bn1 | grep "Cpu(s)" >> "$OUTPUT_FILE"

# Memory utilization
echo "" >> "$OUTPUT_FILE"
echo "=== Memory Utilization ===" >> "$OUTPUT_FILE"
free -h >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
cat /proc/meminfo | grep -E "MemTotal|MemFree|MemAvailable|Cached" >> "$OUTPUT_FILE"

# Disk I/O
echo "" >> "$OUTPUT_FILE"
echo "=== Disk I/O ===" >> "$OUTPUT_FILE"
iostat -x 1 3 >> "$OUTPUT_FILE" 2>/dev/null

# Network utilization
echo "" >> "$OUTPUT_FILE"
echo "=== Network Interfaces ===" >> "$OUTPUT_FILE"
ip -s link show >> "$OUTPUT_FILE"

echo "Analysis saved to: $OUTPUT_FILE"
cat "$OUTPUT_FILE"
```

Install `sysstat` for better historical data:

```bash
sudo apt-get install -y sysstat

# Enable sysstat data collection
sudo sed -i 's/ENABLED="false"/ENABLED="true"/' /etc/default/sysstat
sudo systemctl restart sysstat

# After some time, view historical data
sar -u  # CPU history
sar -r  # Memory history
sar -b  # I/O history
```

### Using AWS Compute Optimizer

```bash
# Check if Compute Optimizer has recommendations for your instances
aws compute-optimizer get-ec2-instance-recommendations \
    --region us-east-1 \
    --query 'instanceRecommendations[*].{
        Instance:instanceArn,
        Finding:finding,
        CurrentType:currentInstanceType,
        RecommendedType:recommendationOptions[0].instanceType,
        SavingsPercent:recommendationOptions[0].estimatedMonthlySavings.percentage
    }' \
    --output table
```

## Using Spot Instances for Cost Reduction

Spot instances offer up to 90% savings for workloads that can tolerate interruption.

### Identifying Spot-Eligible Workloads

Good candidates for Spot:
- CI/CD build runners
- Batch processing jobs
- Development and testing environments
- Auto-scaling groups that can handle instance replacement

Poor candidates for Spot:
- Stateful databases
- Services requiring 99.9%+ availability
- Long-running jobs that can't checkpoint

### Checking Spot Instance Pricing

```bash
# Check Spot pricing history for a specific instance type
aws ec2 describe-spot-price-history \
    --instance-types t3.medium m5.large \
    --product-descriptions "Linux/UNIX" \
    --start-time "$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
    --region us-east-1 \
    --query 'SpotPriceHistory[*].{Type:InstanceType,AZ:AvailabilityZone,Price:SpotPrice,Time:Timestamp}' \
    --output table | head -30
```

## Optimizing EBS Storage Costs

EBS volumes often represent 20-30% of EC2 total costs.

### Finding Unattached EBS Volumes

```bash
# List unattached EBS volumes (you're paying for these but not using them)
aws ec2 describe-volumes \
    --region us-east-1 \
    --filters "Name=status,Values=available" \
    --query 'Volumes[*].{ID:VolumeId,Size:Size,Type:VolumeType,Created:CreateTime}' \
    --output table
```

### Converting gp2 Volumes to gp3

gp3 volumes are cheaper than gp2 with equal or better performance:

```bash
# List all gp2 volumes and their costs
aws ec2 describe-volumes \
    --region us-east-1 \
    --filters "Name=volume-type,Values=gp2" \
    --query 'Volumes[*].{ID:VolumeId,Size:Size,Attachments:Attachments[0].InstanceId}' \
    --output table

# Convert a gp2 volume to gp3 (no downtime required)
aws ec2 modify-volume \
    --region us-east-1 \
    --volume-id vol-0abc1234def56789 \
    --volume-type gp3

# Script to convert all gp2 volumes to gp3
aws ec2 describe-volumes \
    --region us-east-1 \
    --filters "Name=volume-type,Values=gp2" \
    --query 'Volumes[*].VolumeId' \
    --output text | \
    xargs -n1 -I {} aws ec2 modify-volume \
        --region us-east-1 \
        --volume-id {} \
        --volume-type gp3
```

### Managing EBS Snapshots

Old snapshots accumulate costs silently:

```bash
# Find snapshots older than 90 days
aws ec2 describe-snapshots \
    --owner-ids self \
    --region us-east-1 \
    --query "Snapshots[?StartTime<='$(date -d '90 days ago' -u +%Y-%m-%dT%H:%M:%SZ)'].{ID:SnapshotId,Date:StartTime,Size:VolumeSize}" \
    --output table | head -30

# Calculate total snapshot costs
aws ec2 describe-snapshots \
    --owner-ids self \
    --region us-east-1 \
    --query 'sum(Snapshots[*].VolumeSize)' \
    --output text
```

## Reducing Data Transfer Costs

Data transfer out from AWS is often the most surprising cost.

```bash
# Check outbound data transfer from an instance (Linux perspective)
# Install nethogs for per-process bandwidth monitoring
sudo apt-get install -y nethogs
sudo nethogs eth0

# Or use iftop for per-connection monitoring
sudo apt-get install -y iftop
sudo iftop -i eth0

# Check total outbound transfer for the current month via CloudWatch
aws cloudwatch get-metric-statistics \
    --namespace AWS/EC2 \
    --metric-name NetworkOut \
    --dimensions Name=InstanceId,Value=i-0abc1234 \
    --start-time "$(date -d 'first day of this month' -u +%Y-%m-%dT00:00:00Z)" \
    --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --period 2592000 \
    --statistics Sum \
    --query 'Datapoints[0].Sum' \
    --output text
```

### Compressing Logs Before Transfer

```bash
# Configure logrotate to compress logs (saves storage and reduces transfer)
sudo tee /etc/logrotate.d/myapp << 'EOF'
/var/log/myapp/*.log {
    daily
    rotate 30
    compress          # Compress rotated logs with gzip
    delaycompress     # Keep most recent rotated log uncompressed
    missingok
    notifempty
    sharedscripts
    postrotate
        systemctl reload myapp
    endscript
}
EOF
```

## Scheduled Scaling for Non-Production Environments

Stop development instances outside business hours:

```bash
#!/bin/bash
# /usr/local/bin/manage-dev-instances.sh
# Stop non-production instances outside business hours

ACTION="${1:-stop}"  # stop or start
REGION="us-east-1"
ENVIRONMENT_TAG="dev"

# Get instances with Environment=dev tag
INSTANCE_IDS=$(aws ec2 describe-instances \
    --region "$REGION" \
    --filters \
        "Name=tag:Environment,Values=$ENVIRONMENT_TAG" \
        "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].InstanceId' \
    --output text)

if [[ -z "$INSTANCE_IDS" ]]; then
    echo "No $ENVIRONMENT_TAG instances found"
    exit 0
fi

echo "$(date): ${ACTION}ping instances: $INSTANCE_IDS"

if [[ "$ACTION" == "stop" ]]; then
    aws ec2 stop-instances --region "$REGION" --instance-ids $INSTANCE_IDS
elif [[ "$ACTION" == "start" ]]; then
    aws ec2 start-instances --region "$REGION" --instance-ids $INSTANCE_IDS
fi
```

Add to crontab:

```bash
# Stop dev instances at 7 PM weekdays
0 19 * * 1-5 /usr/local/bin/manage-dev-instances.sh stop

# Start dev instances at 8 AM weekdays
0 8 * * 1-5 /usr/local/bin/manage-dev-instances.sh start
```

## Setting Up AWS Budgets for Alerting

Configure cost alerts before costs get out of hand:

```bash
# Create a monthly budget with email alerts
aws budgets create-budget \
    --account-id $(aws sts get-caller-identity --query Account --output text) \
    --budget '{
        "BudgetName": "Monthly-EC2-Budget",
        "BudgetLimit": {"Amount": "500", "Unit": "USD"},
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
        "Subscribers": [{
            "SubscriptionType": "EMAIL",
            "Address": "ops@example.com"
        }]
    }]'
```

Even moderate attention to these optimizations - right-sizing a handful of instances, deleting stale EBS volumes, converting gp2 to gp3 - typically yields 20-40% cost reductions without any impact on service availability or performance.
