# How to Use EC2 Spot Instances to Save Up to 90% on Compute

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Spot Instances, Cost Optimization, Cloud Computing

Description: A practical guide to using EC2 Spot Instances effectively to cut your compute costs by up to 90 percent without sacrificing reliability.

---

Spot Instances are one of AWS's best-kept secrets for slashing your compute bill. They let you bid on unused EC2 capacity at discounts of up to 90% compared to On-Demand pricing. The catch? AWS can reclaim them with a 2-minute warning when it needs the capacity back. But with the right architecture and strategies, that trade-off is absolutely worth it.

Let's dig into how Spot Instances work, when to use them, and how to set them up properly.

## How Spot Pricing Works

Unlike On-Demand instances where you pay a fixed hourly rate, Spot Instance prices fluctuate based on supply and demand in each Availability Zone. AWS doesn't use a traditional auction anymore - instead, prices adjust gradually and you pay the current Spot price at the time of launch, not a bid.

You can set a maximum price you're willing to pay. If the Spot price exceeds your max, your instance gets interrupted. But in practice, most people set their max to the On-Demand price and let the savings come naturally.

Here's a quick comparison of pricing for common instance types (prices vary by region):

| Instance Type | On-Demand ($/hr) | Spot ($/hr) | Savings |
|---------------|-------------------|-------------|---------|
| m5.large      | $0.096           | $0.031      | 68%     |
| c5.xlarge     | $0.170           | $0.042      | 75%     |
| r5.2xlarge    | $0.504           | $0.098      | 81%     |
| m5.4xlarge    | $0.768           | $0.115      | 85%     |

## When to Use Spot Instances

Spot Instances are a great fit for workloads that are:

- **Fault-tolerant** - The workload can handle interruptions without data loss
- **Flexible** - Can run on multiple instance types and in multiple AZs
- **Stateless** - Don't store critical data on local disks
- **Checkpointable** - Can save progress and resume later

Common use cases include CI/CD build agents, batch data processing, big data analytics (EMR, Spark), machine learning training, web application servers behind load balancers, rendering workloads, and dev/test environments.

Workloads you should NOT run on Spot: databases, single-instance applications, long-running stateful processes that can't be interrupted.

## Launching Your First Spot Instance

The simplest way to launch a Spot Instance is through the RunInstances API with the Spot market type.

This command launches a single Spot Instance with a max price cap:

```bash
# Launch a Spot Instance
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type m5.large \
  --key-name my-keypair \
  --security-group-ids sg-0123456789abcdef0 \
  --subnet-id subnet-0123456789abcdef0 \
  --instance-market-options '{
    "MarketType": "spot",
    "SpotOptions": {
      "MaxPrice": "0.096",
      "SpotInstanceType": "one-time",
      "InstanceInterruptionBehavior": "terminate"
    }
  }'
```

Setting `MaxPrice` to the On-Demand price means your instance only runs when there's a discount. You'll never pay more than On-Demand.

## Using Launch Templates with Spot

The recommended approach is to use Launch Templates, which give you more flexibility. You can specify multiple instance types and let AWS pick the cheapest available one.

This Launch Template configuration supports both Spot and On-Demand requests:

```bash
# Create a Launch Template for Spot
aws ec2 create-launch-template \
  --launch-template-name spot-template \
  --launch-template-data '{
    "ImageId": "ami-0abcdef1234567890",
    "KeyName": "my-keypair",
    "SecurityGroupIds": ["sg-0123456789abcdef0"],
    "InstanceMarketOptions": {
      "MarketType": "spot",
      "SpotOptions": {
        "MaxPrice": "0.10",
        "SpotInstanceType": "persistent",
        "InstanceInterruptionBehavior": "stop"
      }
    },
    "TagSpecifications": [
      {
        "ResourceType": "instance",
        "Tags": [
          {"Key": "Name", "Value": "spot-worker"},
          {"Key": "Environment", "Value": "production"}
        ]
      }
    ]
  }'
```

Notice the `InstanceInterruptionBehavior` set to `stop` instead of `terminate`. For persistent Spot requests, AWS will stop the instance when interrupted and restart it when capacity becomes available again. This is useful if your instance has data on EBS volumes you don't want to lose.

## Diversifying Instance Types

The single most important strategy for Spot reliability is diversifying across multiple instance types and Availability Zones. If one instance type gets reclaimed, others likely won't be affected.

Here's a Terraform example that uses an Auto Scaling group with mixed instance types:

```hcl
resource "aws_autoscaling_group" "spot_workers" {
  name                = "spot-workers"
  min_size            = 0
  max_size            = 50
  desired_capacity    = 10
  vpc_zone_identifier = var.subnet_ids  # Multiple AZs

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 0
      on_demand_percentage_above_base_capacity = 0
      spot_allocation_strategy                 = "capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.worker.id
        version            = "$Latest"
      }

      # Specify multiple instance types for better availability
      override {
        instance_type = "m5.large"
      }
      override {
        instance_type = "m5a.large"
      }
      override {
        instance_type = "m4.large"
      }
      override {
        instance_type = "m5d.large"
      }
      override {
        instance_type = "m5n.large"
      }
      override {
        instance_type = "c5.large"
      }
    }
  }
}
```

The `capacity-optimized` allocation strategy is key here. Instead of just picking the cheapest option, it launches instances from the pool with the most available capacity, which means fewer interruptions.

## Checking Spot Price History

Before committing to a Spot strategy, check the price history to understand what you'll actually pay.

This command shows the last 24 hours of Spot pricing for a specific instance type:

```bash
# Check Spot price history for the last 24 hours
aws ec2 describe-spot-price-history \
  --instance-types m5.large m5a.large c5.large \
  --product-descriptions "Linux/UNIX" \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --query 'SpotPriceHistory[].{AZ:AvailabilityZone,Type:InstanceType,Price:SpotPrice,Time:Timestamp}' \
  --output table
```

You can also view this data in the AWS Console under EC2 > Spot Requests > Pricing History.

## Handling Interruptions

When AWS needs the capacity back, it sends a 2-minute warning via the instance metadata service. Your application should check for this and gracefully shut down.

This script polls the instance metadata for Spot interruption notices:

```bash
#!/bin/bash
# Poll for Spot interruption notice
while true; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    http://169.254.169.254/latest/meta-data/spot/instance-action)

  if [ "$RESPONSE" == "200" ]; then
    echo "Spot interruption notice received!"
    # Get the action details
    ACTION=$(curl -s http://169.254.169.254/latest/meta-data/spot/instance-action)
    echo "Action: $ACTION"

    # Graceful shutdown - deregister from load balancer, drain connections, etc.
    /opt/scripts/graceful-shutdown.sh

    break
  fi

  sleep 5
done
```

You can also use EC2 Instance Metadata Service v2 (IMDSv2) for better security, and set up EventBridge rules to handle interruptions at the fleet level. For more details on handling interruptions, check out our guide on [handling Spot Instance interruptions gracefully](https://oneuptime.com/blog/post/handle-spot-instance-interruptions-gracefully/view).

## Spot Instance Best Practices

Here's a quick summary of best practices that'll keep your Spot workloads running smoothly:

1. **Use at least 6 instance types** across 3 or more AZs
2. **Use capacity-optimized allocation** instead of lowest-price
3. **Set max price to On-Demand** - don't try to optimize your bid
4. **Build for interruption** - assume instances can disappear at any time
5. **Use Auto Scaling groups** rather than standalone Spot requests
6. **Monitor your Spot usage** with CloudWatch metrics and billing alerts
7. **Consider Spot placement scores** to find the best regions and AZs

## Cost Monitoring

Once you're running Spot Instances, track your actual savings through AWS Cost Explorer. Filter by purchase type (Spot vs On-Demand) and compare the effective rates.

Setting up proper monitoring for your Spot fleet is critical. You need to track instance counts, interruption rates, and application health. A solid monitoring solution helps you quickly identify when Spot capacity is thin and you might need to fall back to On-Demand.

## Summary

EC2 Spot Instances are a powerful tool for cutting compute costs dramatically. The key to success is designing for interruption, diversifying your instance types and AZs, and using capacity-optimized allocation strategies. Start with non-critical workloads like CI/CD or batch processing, get comfortable with the model, and then expand to more workloads over time. The savings are real and substantial.
