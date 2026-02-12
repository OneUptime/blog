# How to Use EC2 Fleet for Mixed Instance Provisioning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, EC2 Fleet, Spot Instances, Cost Optimization, Auto Scaling

Description: Use EC2 Fleet to provision a mix of On-Demand and Spot instances across multiple instance types and availability zones for cost-effective, resilient deployments.

---

Running all your EC2 workloads on a single instance type in a single availability zone is the cloud equivalent of putting all your eggs in one basket. EC2 Fleet lets you define a target capacity and spread it across multiple instance types, purchase options (On-Demand and Spot), and availability zones. The result is better availability, lower costs, and more resilience against capacity constraints.

## What Is EC2 Fleet?

EC2 Fleet is an API that lets you launch a group of instances with a single request. You tell it what you need (capacity, instance preferences, pricing limits) and it figures out the optimal placement. It's like Auto Scaling but more flexible for one-time or managed fleet provisioning.

There are three fleet types:
- **instant**: Launches all instances synchronously in a single API call
- **request**: Places an asynchronous request that AWS fulfills as capacity becomes available
- **maintain**: Keeps the fleet at target capacity, replacing terminated instances automatically

## Creating a Basic Fleet

Let's start with a simple fleet that mixes On-Demand and Spot instances:

```bash
# Create a fleet with 10 instances: 3 On-Demand for baseline, 7 Spot for savings
aws ec2 create-fleet \
  --type maintain \
  --target-capacity-specification '{
    "TotalTargetCapacity": 10,
    "OnDemandTargetCapacity": 3,
    "SpotTargetCapacity": 7,
    "DefaultTargetCapacityType": "spot"
  }' \
  --launch-template-configs '[
    {
      "LaunchTemplateSpecification": {
        "LaunchTemplateId": "lt-0abc123",
        "Version": "$Latest"
      },
      "Overrides": [
        {"InstanceType": "m5.large", "AvailabilityZone": "us-east-1a"},
        {"InstanceType": "m5.large", "AvailabilityZone": "us-east-1b"},
        {"InstanceType": "m5.xlarge", "AvailabilityZone": "us-east-1a", "WeightedCapacity": 2},
        {"InstanceType": "m5.xlarge", "AvailabilityZone": "us-east-1b", "WeightedCapacity": 2},
        {"InstanceType": "m5a.large", "AvailabilityZone": "us-east-1a"},
        {"InstanceType": "m5a.large", "AvailabilityZone": "us-east-1b"},
        {"InstanceType": "m6i.large", "AvailabilityZone": "us-east-1a"},
        {"InstanceType": "m6i.large", "AvailabilityZone": "us-east-1b"}
      ]
    }
  ]' \
  --spot-options '{
    "AllocationStrategy": "capacity-optimized",
    "InstanceInterruptionBehavior": "terminate"
  }' \
  --on-demand-options '{
    "AllocationStrategy": "lowest-price"
  }'
```

A few things to notice here:

- **WeightedCapacity**: An m5.xlarge counts as 2 units of capacity because it has double the resources of m5.large
- **Multiple instance types**: If one type runs out of capacity, the fleet uses alternatives
- **Multiple AZs**: Spreads instances for availability
- **capacity-optimized**: Picks Spot pools with the most available capacity, reducing interruption risk

## Allocation Strategies

The allocation strategy determines how EC2 Fleet picks which instance types and pools to use.

**For Spot instances:**

| Strategy | Description | Best For |
|----------|------------|----------|
| capacity-optimized | Picks pools with most available capacity | Reducing interruptions |
| price-capacity-optimized | Balances price and capacity | Most workloads (recommended) |
| lowest-price | Picks cheapest pools | Cost-sensitive, interruption-tolerant |
| diversified | Spreads evenly across pools | Long-running workloads |

**For On-Demand instances:**

| Strategy | Description |
|----------|------------|
| lowest-price | Uses the cheapest instance type |
| prioritized | Uses instances in the order you list them |

For most production workloads, `price-capacity-optimized` for Spot and `prioritized` for On-Demand gives the best balance:

```bash
# Fleet with price-capacity-optimized Spot and prioritized On-Demand
aws ec2 create-fleet \
  --type maintain \
  --target-capacity-specification '{
    "TotalTargetCapacity": 20,
    "OnDemandTargetCapacity": 5,
    "SpotTargetCapacity": 15,
    "DefaultTargetCapacityType": "spot"
  }' \
  --launch-template-configs '[
    {
      "LaunchTemplateSpecification": {
        "LaunchTemplateId": "lt-0abc123",
        "Version": "$Latest"
      },
      "Overrides": [
        {"InstanceType": "m6i.large", "Priority": 1},
        {"InstanceType": "m5.large", "Priority": 2},
        {"InstanceType": "m5a.large", "Priority": 3},
        {"InstanceType": "m5n.large", "Priority": 4},
        {"InstanceType": "m6a.large", "Priority": 5}
      ]
    }
  ]' \
  --spot-options '{"AllocationStrategy": "price-capacity-optimized"}' \
  --on-demand-options '{"AllocationStrategy": "prioritized"}'
```

The Priority field only matters for On-Demand. For Spot, the fleet uses the allocation strategy to choose.

## Terraform Configuration

Here's a complete Terraform setup for an EC2 Fleet:

```hcl
# Launch template for fleet instances
resource "aws_launch_template" "app" {
  name_prefix   = "app-fleet-"
  image_id      = "ami-0abc123"
  key_name      = "my-key"

  vpc_security_group_ids = [aws_security_group.app.id]

  user_data = base64encode(<<-EOF
    #!/bin/bash
    yum install -y httpd
    systemctl start httpd
    systemctl enable httpd
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "fleet-instance"
      Fleet = "app-fleet"
    }
  }
}

# EC2 Fleet with mixed instance types and purchase options
resource "aws_ec2_fleet" "app" {
  type = "maintain"

  target_capacity_specification {
    total_target_capacity       = 20
    on_demand_target_capacity   = 5
    spot_target_capacity        = 15
    default_target_capacity_type = "spot"
  }

  launch_template_config {
    launch_template_specification {
      launch_template_id = aws_launch_template.app.id
      version            = "$Latest"
    }

    # Multiple instance type overrides for diversification
    override {
      instance_type     = "m6i.large"
      availability_zone = "us-east-1a"
    }
    override {
      instance_type     = "m6i.large"
      availability_zone = "us-east-1b"
    }
    override {
      instance_type     = "m5.large"
      availability_zone = "us-east-1a"
    }
    override {
      instance_type     = "m5.large"
      availability_zone = "us-east-1b"
    }
    override {
      instance_type     = "m5a.large"
      availability_zone = "us-east-1a"
    }
    override {
      instance_type     = "m5a.large"
      availability_zone = "us-east-1b"
    }
  }

  spot_options {
    allocation_strategy = "price-capacity-optimized"
  }

  on_demand_options {
    allocation_strategy = "prioritized"
  }

  tags = {
    Name = "app-fleet"
  }
}
```

## Instant Fleets for Batch Jobs

The `instant` fleet type is perfect for batch processing. It launches all instances at once and gives you the list of what was provisioned:

```bash
# Create an instant fleet for a batch job
RESULT=$(aws ec2 create-fleet \
  --type instant \
  --target-capacity-specification '{
    "TotalTargetCapacity": 50,
    "DefaultTargetCapacityType": "spot"
  }' \
  --launch-template-configs '[
    {
      "LaunchTemplateSpecification": {
        "LaunchTemplateId": "lt-0abc123",
        "Version": "$Latest"
      },
      "Overrides": [
        {"InstanceType": "c5.2xlarge"},
        {"InstanceType": "c5a.2xlarge"},
        {"InstanceType": "c5n.2xlarge"},
        {"InstanceType": "c6i.2xlarge"},
        {"InstanceType": "c6a.2xlarge"}
      ]
    }
  ]' \
  --spot-options '{"AllocationStrategy": "price-capacity-optimized"}')

# Extract the instance IDs
echo $RESULT | jq -r '.Instances[].InstanceIds[]'
```

## Handling Spot Interruptions

Spot instances can be reclaimed with 2 minutes notice. Your fleet should be prepared:

```bash
# Check for Spot interruption notices in instance metadata
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

NOTICE=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/spot/instance-action 2>/dev/null)

if [ "$NOTICE" != "" ]; then
  echo "Spot interruption notice received!"
  # Gracefully drain and shutdown
  # - Stop accepting new work
  # - Finish in-progress tasks
  # - Save state to S3 or EBS
fi
```

For a `maintain` fleet, EC2 Fleet automatically replaces interrupted Spot instances. But your application needs to handle the graceful shutdown.

## Monitoring Your Fleet

Track fleet activity with these CLI commands:

```bash
# Describe fleet status
aws ec2 describe-fleets \
  --fleet-ids fleet-abc123 \
  --query 'Fleets[0].{
    State: FleetState,
    TotalTarget: TargetCapacitySpecification.TotalTargetCapacity,
    OnDemand: TargetCapacitySpecification.OnDemandTargetCapacity,
    Spot: TargetCapacitySpecification.SpotTargetCapacity,
    Fulfilled: FulfilledCapacity,
    OnDemandFulfilled: FulfilledOnDemandCapacity
  }'

# List all instances in the fleet
aws ec2 describe-fleet-instances \
  --fleet-id fleet-abc123 \
  --query 'ActiveInstances[*].{
    InstanceId: InstanceId,
    Type: InstanceType,
    Health: InstanceHealth,
    AZ: AvailabilityZone
  }' \
  --output table
```

For ongoing fleet monitoring with alerting, you can integrate with [CloudWatch alarms](https://oneuptime.com/blog/post/set-up-cloudwatch-alarms-for-ec2-cpu-and-memory/view) to track the health of individual instances within the fleet.

## EC2 Fleet vs Auto Scaling Groups

You might wonder when to use EC2 Fleet versus Auto Scaling groups with mixed instances. Here's the distinction:

- **EC2 Fleet**: Better for one-time provisioning, batch jobs, or when you need fine-grained control over allocation
- **Auto Scaling Group**: Better for long-running services that need scaling policies, health checks, and integration with load balancers

In practice, Auto Scaling groups now support most of what EC2 Fleet does (mixed instances, Spot, multiple AZs). Use EC2 Fleet when ASG doesn't fit your use case or when you need the `instant` fleet type.

EC2 Fleet gives you the flexibility to build resilient, cost-effective infrastructure by diversifying across instance types and purchase options. The key is to always specify more instance type overrides than you think you need - the more options the fleet has, the better it can optimize for price, capacity, and availability.
