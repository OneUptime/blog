# How to Reduce EC2 Costs with Right-Sizing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Right-Sizing, Cost Optimization

Description: A practical guide to reducing EC2 costs by right-sizing instances based on actual utilization data, including analysis methods and safe migration strategies.

---

Most EC2 instances are larger than they need to be. Developers pick an instance size during initial deployment based on rough estimates or "better safe than sorry" thinking, and then nobody revisits the decision. The result? You're paying for compute capacity that sits idle.

Right-sizing is the process of matching your instance types and sizes to your actual workload requirements. It's consistently the biggest opportunity for EC2 cost reduction, often saving 30-50% on compute costs. Let's walk through how to do it safely.

## Step 1: Gather Utilization Data

You need at least two weeks of utilization data, preferably a month, to capture weekly patterns and any monthly spikes.

This script collects CPU, memory, and network metrics for all running instances.

```python
import boto3
from datetime import datetime, timedelta

cloudwatch = boto3.client("cloudwatch")
ec2 = boto3.client("ec2")

def analyze_instance(instance_id, instance_type, name, days=14):
    """Analyze an EC2 instance's utilization over time."""
    end = datetime.utcnow()
    start = end - timedelta(days=days)

    # CPU utilization
    cpu_response = cloudwatch.get_metric_statistics(
        Namespace="AWS/EC2",
        MetricName="CPUUtilization",
        Dimensions=[{"Name": "InstanceId", "Value": instance_id}],
        StartTime=start,
        EndTime=end,
        Period=3600,
        Statistics=["Average", "Maximum"]
    )

    if not cpu_response["Datapoints"]:
        return None

    cpu_avg = sum(dp["Average"] for dp in cpu_response["Datapoints"]) / len(cpu_response["Datapoints"])
    cpu_max = max(dp["Maximum"] for dp in cpu_response["Datapoints"])

    # Network utilization
    net_in = cloudwatch.get_metric_statistics(
        Namespace="AWS/EC2",
        MetricName="NetworkIn",
        Dimensions=[{"Name": "InstanceId", "Value": instance_id}],
        StartTime=start,
        EndTime=end,
        Period=86400,
        Statistics=["Average"]
    )

    net_avg = 0
    if net_in["Datapoints"]:
        net_avg = sum(dp["Average"] for dp in net_in["Datapoints"]) / len(net_in["Datapoints"])
        net_avg = net_avg / 1024 / 1024  # Convert to MB/day

    return {
        "instance_id": instance_id,
        "instance_type": instance_type,
        "name": name,
        "cpu_avg": cpu_avg,
        "cpu_max": cpu_max,
        "net_avg_mb": net_avg
    }

def scan_all_instances():
    """Scan all running instances and categorize by utilization."""
    instances = ec2.describe_instances(
        Filters=[{"Name": "instance-state-name", "Values": ["running"]}]
    )

    results = {"over_provisioned": [], "right_sized": [], "under_provisioned": []}

    for reservation in instances["Reservations"]:
        for inst in reservation["Instances"]:
            instance_id = inst["InstanceId"]
            instance_type = inst["InstanceType"]
            name = next(
                (t["Value"] for t in inst.get("Tags", []) if t["Key"] == "Name"),
                "N/A"
            )

            metrics = analyze_instance(instance_id, instance_type, name)
            if not metrics:
                continue

            # Categorize based on CPU
            if metrics["cpu_avg"] < 10 and metrics["cpu_max"] < 40:
                results["over_provisioned"].append(metrics)
            elif metrics["cpu_avg"] > 70 or metrics["cpu_max"] > 90:
                results["under_provisioned"].append(metrics)
            else:
                results["right_sized"].append(metrics)

    # Print results
    print(f"\n{'='*80}")
    print(f"EC2 Right-Sizing Analysis")
    print(f"{'='*80}")

    print(f"\nOVER-PROVISIONED ({len(results['over_provisioned'])} instances):")
    for m in sorted(results["over_provisioned"], key=lambda x: x["cpu_avg"]):
        print(f"  {m['instance_id']} ({m['instance_type']}) - {m['name']}")
        print(f"    CPU avg: {m['cpu_avg']:.1f}% | max: {m['cpu_max']:.1f}%")

    print(f"\nRIGHT-SIZED ({len(results['right_sized'])} instances):")
    for m in results["right_sized"]:
        print(f"  {m['instance_id']} ({m['instance_type']}) - {m['name']}")

    print(f"\nUNDER-PROVISIONED ({len(results['under_provisioned'])} instances):")
    for m in results["under_provisioned"]:
        print(f"  {m['instance_id']} ({m['instance_type']}) - {m['name']}")
        print(f"    CPU avg: {m['cpu_avg']:.1f}% | max: {m['cpu_max']:.1f}%")

scan_all_instances()
```

## Step 2: Choose the Right Target Instance

When downsizing, consider more than just CPU. Here's a decision matrix.

| Current Finding | Recommended Action |
|---|---|
| CPU avg < 5%, max < 20% | Downsize by 2 sizes (e.g., xlarge to small) |
| CPU avg 5-10%, max < 40% | Downsize by 1 size (e.g., xlarge to large) |
| CPU avg 10-40%, max < 70% | Currently right-sized |
| CPU avg > 40% or max > 80% | Monitor closely, possibly upsize |
| Memory-bound workload | Switch to memory-optimized (r-series) |
| Compute-bound, steady | Switch to compute-optimized (c-series) |
| Bursty, low baseline | Consider T-series with unlimited credits |

AWS Compute Optimizer handles this analysis automatically. See our guide on [using Compute Optimizer](https://oneuptime.com/blog/post/2026-02-12-use-aws-compute-optimizer-right-sizing/view) for data-driven recommendations.

## Step 3: Calculate Potential Savings

Before making changes, calculate the savings to prioritize your efforts.

This script estimates monthly savings for each right-sizing candidate.

```python
# EC2 pricing (simplified - use AWS Pricing API for exact values)
PRICING = {
    "t3.micro": 0.0104,
    "t3.small": 0.0208,
    "t3.medium": 0.0416,
    "t3.large": 0.0832,
    "t3.xlarge": 0.1664,
    "t3.2xlarge": 0.3328,
    "m5.large": 0.096,
    "m5.xlarge": 0.192,
    "m5.2xlarge": 0.384,
    "m5.4xlarge": 0.768,
    "c5.large": 0.085,
    "c5.xlarge": 0.170,
    "c5.2xlarge": 0.340,
    "r5.large": 0.126,
    "r5.xlarge": 0.252,
}

def calculate_savings(current_type, recommended_type):
    """Calculate monthly savings from right-sizing."""
    current_hourly = PRICING.get(current_type, 0)
    recommended_hourly = PRICING.get(recommended_type, 0)

    if current_hourly == 0 or recommended_hourly == 0:
        return None

    hourly_savings = current_hourly - recommended_hourly
    monthly_savings = hourly_savings * 730  # Average hours per month

    return {
        "current_monthly": current_hourly * 730,
        "recommended_monthly": recommended_hourly * 730,
        "monthly_savings": monthly_savings,
        "savings_pct": (hourly_savings / current_hourly) * 100
    }

# Example calculations
examples = [
    ("m5.2xlarge", "m5.large"),
    ("m5.xlarge", "t3.large"),
    ("m5.4xlarge", "m5.xlarge"),
]

print(f"\n{'Current':<15} {'Recommended':<15} {'Monthly Savings':>15} {'% Saved':>10}")
print("-" * 60)
for current, recommended in examples:
    savings = calculate_savings(current, recommended)
    if savings:
        print(f"{current:<15} {recommended:<15} "
              f"${savings['monthly_savings']:>14.2f} {savings['savings_pct']:>9.0f}%")
```

## Step 4: Implement Right-Sizing Safely

Never right-size production instances in one shot. Follow a safe migration process.

### For Stateless Instances (Behind Load Balancers)

The safest approach for stateless workloads is to launch a new, smaller instance and shift traffic gradually.

```bash
# 1. Create a launch template with the new instance type
aws ec2 create-launch-template-version \
  --launch-template-id lt-0abc123def \
  --source-version 1 \
  --launch-template-data '{"InstanceType": "m5.large"}'

# 2. Update the Auto Scaling group to use the new launch template version
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name my-asg \
  --launch-template '{
    "LaunchTemplateId": "lt-0abc123def",
    "Version": "$Latest"
  }'

# 3. Start an instance refresh to gradually replace instances
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name my-asg \
  --preferences '{
    "MinHealthyPercentage": 90,
    "InstanceWarmup": 300
  }'
```

The instance refresh replaces instances one (or a few) at a time, keeping 90% healthy at all times. If the new instance type causes issues, cancel the refresh.

### For Stateful Instances (Databases, Single Servers)

For instances you can't easily replace, use a stop-and-resize approach during a maintenance window.

```bash
# 1. Create a snapshot/backup first
aws ec2 create-image \
  --instance-id i-0abc123def456 \
  --name "pre-rightsize-backup-$(date +%Y%m%d)" \
  --no-reboot

# 2. Stop the instance
aws ec2 stop-instances --instance-ids i-0abc123def456

# 3. Change the instance type
aws ec2 modify-instance-attribute \
  --instance-id i-0abc123def456 \
  --instance-type '{"Value": "m5.large"}'

# 4. Start the instance
aws ec2 start-instances --instance-ids i-0abc123def456

# 5. Verify everything works
aws ec2 describe-instances \
  --instance-ids i-0abc123def456 \
  --query 'Reservations[0].Instances[0].{State:State.Name,Type:InstanceType}'
```

## Step 5: Monitor After Right-Sizing

After resizing, watch the instance closely for at least a week.

```python
import boto3
from datetime import datetime, timedelta

cloudwatch = boto3.client("cloudwatch")

def post_resize_monitoring(instance_id, hours=24):
    """Monitor an instance closely after right-sizing."""
    end = datetime.utcnow()
    start = end - timedelta(hours=hours)

    metrics = {
        "CPUUtilization": {"unit": "%", "warn": 70, "critical": 90},
        "StatusCheckFailed": {"unit": "count", "warn": 0, "critical": 0},
    }

    print(f"\nPost-Resize Monitoring - {instance_id}")
    print(f"Period: last {hours} hours")
    print("-" * 50)

    for metric_name, config in metrics.items():
        response = cloudwatch.get_metric_statistics(
            Namespace="AWS/EC2",
            MetricName=metric_name,
            Dimensions=[{"Name": "InstanceId", "Value": instance_id}],
            StartTime=start,
            EndTime=end,
            Period=300,  # 5-minute intervals
            Statistics=["Average", "Maximum"]
        )

        if response["Datapoints"]:
            avg = sum(dp["Average"] for dp in response["Datapoints"]) / len(response["Datapoints"])
            maximum = max(dp["Maximum"] for dp in response["Datapoints"])

            status = "OK"
            if maximum > config["critical"]:
                status = "CRITICAL"
            elif maximum > config["warn"]:
                status = "WARNING"

            print(f"  {metric_name}: avg={avg:.1f} max={maximum:.1f} [{status}]")

post_resize_monitoring("i-0abc123def456")
```

## Automating Right-Sizing Reviews

Make right-sizing a regular process, not a one-time exercise. Set up a monthly review.

```hcl
# Schedule monthly right-sizing analysis
resource "aws_cloudwatch_event_rule" "monthly_rightsizing" {
  name                = "monthly-rightsizing-review"
  description         = "Trigger monthly right-sizing analysis"
  schedule_expression = "cron(0 9 1 * ? *)"  # 1st of every month at 9 AM
}

resource "aws_cloudwatch_event_target" "rightsizing_lambda" {
  rule      = aws_cloudwatch_event_rule.monthly_rightsizing.name
  target_id = "rightsizing"
  arn       = aws_lambda_function.rightsizing_report.arn
}
```

## Wrapping Up

Right-sizing is the lowest-risk, highest-reward optimization you can make for EC2 costs. Gather at least two weeks of utilization data, identify over-provisioned instances, calculate the savings potential, and migrate safely using instance refresh for stateless workloads or stop-and-resize for stateful ones. Make it a monthly habit, and combine it with other strategies like [Savings Plans](https://oneuptime.com/blog/post/2026-02-12-reduce-ec2-costs-savings-plans/view) and [Spot Instances](https://oneuptime.com/blog/post/2026-02-12-reduce-ec2-costs-spot-instances/view) for maximum savings.
