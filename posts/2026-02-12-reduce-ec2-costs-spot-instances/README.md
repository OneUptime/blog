# How to Reduce EC2 Costs with Spot Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Spot Instances, Cost Optimization

Description: A hands-on guide to using EC2 Spot Instances for up to 90% cost savings, covering interruption handling, fleet strategies, and production-ready patterns.

---

Spot Instances are AWS's best-kept cost optimization secret. They use spare EC2 capacity at discounts of up to 90% compared to On-Demand pricing. The catch? AWS can reclaim them with 2 minutes notice when it needs the capacity back. That sounds scary, but with the right architecture, Spot Instances are perfectly viable for production workloads.

The key is designing for interruption. If your application can handle instances disappearing and being replaced, you can save a fortune.

## Understanding Spot Basics

Spot pricing is dynamic. It fluctuates based on supply and demand for each instance type in each Availability Zone. But unlike the old Spot bidding model, the current model uses a simpler approach: you pay the current Spot price, and if it rises above your maximum (or capacity runs out), you get a 2-minute warning before termination.

In practice, Spot interruption rates vary by instance type. Larger, older instance types tend to have higher interruption rates. Using multiple instance types across multiple AZs dramatically reduces your effective interruption rate.

## Launching Your First Spot Instance

The simplest way to request a Spot Instance is through a standard RunInstances call with the Spot market type.

```bash
# Launch a single Spot Instance
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type m5.large \
  --instance-market-options '{
    "MarketType": "spot",
    "SpotOptions": {
      "SpotInstanceType": "one-time",
      "InstanceInterruptionBehavior": "terminate"
    }
  }' \
  --key-name my-key \
  --security-group-ids sg-xxx123 \
  --subnet-id subnet-abc123
```

But for production use, you'll want a Spot Fleet or an Auto Scaling group with mixed instances. Let's cover both.

## Spot Fleet for Batch Workloads

A Spot Fleet requests capacity across multiple instance types and AZs, maximizing your chance of getting and keeping capacity.

This Terraform configuration creates a Spot Fleet for batch processing.

```hcl
resource "aws_spot_fleet_request" "batch_processing" {
  iam_fleet_role                      = aws_iam_role.spot_fleet.arn
  target_capacity                     = 20
  allocation_strategy                 = "capacityOptimized"
  terminate_instances_with_expiration = true

  # Use multiple instance types for diversification
  launch_specification {
    instance_type = "m5.large"
    ami           = data.aws_ami.amazon_linux.id
    subnet_id     = var.subnet_ids[0]
    key_name      = var.key_name

    root_block_device {
      volume_size = 50
      volume_type = "gp3"
    }
  }

  launch_specification {
    instance_type = "m5.xlarge"
    ami           = data.aws_ami.amazon_linux.id
    subnet_id     = var.subnet_ids[0]
    key_name      = var.key_name
    weighted_capacity = 2  # Counts as 2 units of capacity

    root_block_device {
      volume_size = 50
      volume_type = "gp3"
    }
  }

  launch_specification {
    instance_type = "m5a.large"
    ami           = data.aws_ami.amazon_linux.id
    subnet_id     = var.subnet_ids[1]
    key_name      = var.key_name
  }

  launch_specification {
    instance_type = "m5d.large"
    ami           = data.aws_ami.amazon_linux.id
    subnet_id     = var.subnet_ids[1]
    key_name      = var.key_name
  }

  launch_specification {
    instance_type = "m4.large"
    ami           = data.aws_ami.amazon_linux.id
    subnet_id     = var.subnet_ids[2]
    key_name      = var.key_name
  }

  tags = {
    Name = "batch-processing-fleet"
  }
}
```

The `capacityOptimized` allocation strategy picks instance types with the most available capacity, reducing interruption rates. This is almost always the best choice.

## Mixed Instances Auto Scaling Group

For web services and long-running workloads, use an Auto Scaling group with mixed instance types. This combines On-Demand instances for baseline capacity with Spot Instances for cost savings.

```hcl
resource "aws_autoscaling_group" "web_service" {
  name                = "web-service-asg"
  min_size            = 4
  max_size            = 20
  desired_capacity    = 8
  vpc_zone_identifier = var.subnet_ids

  mixed_instances_policy {
    instances_distribution {
      # Keep 2 On-Demand instances as baseline
      on_demand_base_capacity                  = 2
      # After baseline, use 80% Spot
      on_demand_percentage_above_base_capacity = 20
      spot_allocation_strategy                 = "capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.web.id
        version            = "$Latest"
      }

      # List multiple instance types for Spot diversification
      override {
        instance_type = "m5.large"
      }
      override {
        instance_type = "m5a.large"
      }
      override {
        instance_type = "m5d.large"
      }
      override {
        instance_type = "m4.large"
      }
      override {
        instance_type = "c5.large"
      }
      override {
        instance_type = "c5a.large"
      }
    }
  }

  tag {
    key                 = "Name"
    value               = "web-service"
    propagate_at_launch = true
  }
}
```

With this configuration, you always have 2 On-Demand instances for stability. The remaining 6 instances (at desired capacity of 8) are ~80% Spot. If all Spot instances get interrupted, you still have the On-Demand base.

## Handling Spot Interruptions

When AWS needs to reclaim a Spot Instance, it sends a 2-minute warning. You can detect this and gracefully drain the instance.

This script polls the instance metadata endpoint for interruption notices.

```python
#!/usr/bin/env python3
"""Spot interruption handler - runs on each Spot Instance."""

import requests
import subprocess
import time
import signal
import sys

METADATA_URL = "http://169.254.169.254/latest/meta-data/spot/instance-action"
CHECK_INTERVAL = 5  # seconds

def handle_interruption(action_data):
    """Gracefully handle Spot interruption."""
    print(f"Spot interruption notice received: {action_data}")

    # Step 1: Stop accepting new work
    # (deregister from load balancer, stop consuming from queue, etc.)
    subprocess.run([
        "aws", "elb", "deregister-instances-from-load-balancer",
        "--load-balancer-name", "my-lb",
        "--instances", get_instance_id()
    ])

    # Step 2: Finish current work (you have ~2 minutes)
    print("Draining current connections...")
    subprocess.run(["systemctl", "stop", "my-application"])

    # Step 3: Checkpoint any state
    print("Saving checkpoint...")
    # Save progress to S3, DynamoDB, etc.

    print("Graceful shutdown complete")

def get_instance_id():
    """Get this instance's ID from metadata."""
    resp = requests.get(
        "http://169.254.169.254/latest/meta-data/instance-id",
        timeout=2
    )
    return resp.text

def main():
    print("Spot interruption handler started")

    while True:
        try:
            response = requests.get(METADATA_URL, timeout=2)
            if response.status_code == 200:
                handle_interruption(response.json())
                sys.exit(0)
        except requests.exceptions.RequestException:
            pass  # No interruption notice, keep checking

        time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    main()
```

For containerized workloads, use the AWS Node Termination Handler with EKS, or handle the interruption signal in your ECS task.

## Using EventBridge for Interruption Handling

Instead of polling the metadata endpoint, you can use EventBridge to react to Spot interruption notices centrally.

```hcl
resource "aws_cloudwatch_event_rule" "spot_interruption" {
  name        = "spot-interruption-handler"
  description = "React to EC2 Spot Instance interruption warnings"

  event_pattern = jsonencode({
    source      = ["aws.ec2"]
    detail-type = ["EC2 Spot Instance Interruption Warning"]
  })
}

resource "aws_cloudwatch_event_target" "spot_handler_lambda" {
  rule      = aws_cloudwatch_event_rule.spot_interruption.name
  target_id = "spot-handler"
  arn       = aws_lambda_function.spot_handler.arn
}
```

The Lambda function can deregister the instance from the load balancer, trigger an ASG scale-up, or send notifications.

```python
import boto3
import json

autoscaling = boto3.client("autoscaling")
elbv2 = boto3.client("elbv2")

def handler(event, context):
    """Handle Spot interruption events from EventBridge."""
    instance_id = event["detail"]["instance-id"]
    action = event["detail"]["instance-action"]

    print(f"Spot interruption: {instance_id} will be {action}")

    # Detach from target group to stop new traffic
    try:
        elbv2.deregister_targets(
            TargetGroupArn="arn:aws:elasticloadbalancing:...:targetgroup/my-tg/...",
            Targets=[{"Id": instance_id}]
        )
        print(f"Deregistered {instance_id} from target group")
    except Exception as e:
        print(f"Error deregistering: {e}")

    # The ASG will automatically launch a replacement instance

    return {"statusCode": 200}
```

## Spot Pricing Analysis

Check current Spot prices and historical trends before choosing instance types.

```python
import boto3
from datetime import datetime, timedelta

ec2 = boto3.client("ec2")

def analyze_spot_pricing(instance_types, days=7):
    """Analyze Spot pricing for given instance types."""
    end = datetime.utcnow()
    start = end - timedelta(days=days)

    for instance_type in instance_types:
        response = ec2.describe_spot_price_history(
            InstanceTypes=[instance_type],
            ProductDescriptions=["Linux/UNIX"],
            StartTime=start,
            EndTime=end
        )

        prices_by_az = {}
        for price_point in response["SpotPriceHistory"]:
            az = price_point["AvailabilityZone"]
            price = float(price_point["SpotPrice"])
            if az not in prices_by_az:
                prices_by_az[az] = []
            prices_by_az[az].append(price)

        print(f"\n{instance_type}:")
        for az, prices in sorted(prices_by_az.items()):
            avg_price = sum(prices) / len(prices)
            max_price = max(prices)
            min_price = min(prices)
            print(f"  {az}: avg=${avg_price:.4f}/hr "
                  f"min=${min_price:.4f} max=${max_price:.4f}")

# Compare similar instance types
analyze_spot_pricing([
    "m5.large", "m5a.large", "m5d.large",
    "m4.large", "c5.large", "c5a.large"
])
```

## Best Practices for Production Spot

1. **Diversify across 6+ instance types**: More diversity means less chance of simultaneous interruption.
2. **Spread across all AZs**: Don't put all Spot eggs in one AZ basket.
3. **Use capacity-optimized allocation**: Let AWS pick the instance type with the most available capacity.
4. **Keep On-Demand baseline**: Never run 100% Spot for critical workloads.
5. **Design for statelessness**: Store state externally (S3, DynamoDB, EFS), not on local disks.
6. **Use checkpointing for long jobs**: Save progress regularly so interrupted work isn't completely lost.
7. **Monitor interruption frequency**: Track interruptions per instance type and adjust your fleet composition.

## When NOT to Use Spot

Spot Instances aren't appropriate for:
- Single-instance databases
- Stateful workloads without checkpointing
- Instances that take > 10 minutes to become productive (long boot times)
- Workloads that absolutely cannot tolerate any interruption

For those workloads, use [Reserved Instances](https://oneuptime.com/blog/post/2026-02-12-reduce-ec2-costs-reserved-instances/view) or [Savings Plans](https://oneuptime.com/blog/post/2026-02-12-reduce-ec2-costs-savings-plans/view) instead.

## Wrapping Up

Spot Instances can save you up to 90% on EC2 costs if you design for interruption. Use mixed instance Auto Scaling groups for web services, Spot Fleets for batch processing, and always maintain an On-Demand baseline. Diversify across instance types and AZs, handle interruption notices gracefully, and store state externally. The combination of Spot for variable capacity, Savings Plans for baseline, and right-sizing for all instances gives you the most cost-effective EC2 deployment possible.
