# How to Create EC2 Fleet with Mixed Instance Types in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EC2 Fleet, Spot Instance, Mixed Instances, Infrastructure as Code, Cost Optimization

Description: Learn how to create EC2 Fleet with a mix of On-Demand and Spot instances across multiple instance types using OpenTofu for cost-optimized, highly available compute capacity.

## Introduction

EC2 Fleet lets you launch both On-Demand and Spot instances in a single request. AWS recommends EC2 Fleet over Spot Fleet, which is based on a legacy API with no planned investment. By combining instance types and purchase options, you can achieve optimal cost and availability for diverse workloads.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EC2 Fleet permissions
- The `AWSServiceRoleForEC2Fleet` service-linked role for `request` or `maintain` fleets

## Step 1: Create an EC2 Fleet with Mixed Instances

```hcl
resource "aws_ec2_fleet" "mixed" {
  type = "maintain"  # Fleet maintains target capacity even after interruptions

  # Base capacity uses On-Demand for reliability
  on_demand_options {
    allocation_strategy = "lowestPrice"
  }

  # Additional capacity uses Spot for cost savings
  spot_options {
    allocation_strategy            = "price-capacity-optimized"  # Best practice
    instance_interruption_behavior = "terminate"  # Or "stop"/"hibernate"
  }

  target_capacity_specification {
    default_target_capacity_type = "spot"
    on_demand_target_capacity    = 2    # Guaranteed On-Demand units
    total_target_capacity        = 10   # Remaining 8 units are launched as Spot
  }

  launch_template_config {
    launch_template_specification {
      launch_template_id = aws_launch_template.app.id
      version            = aws_launch_template.app.latest_version
    }

    # Override instance types for the fleet
    override {
      instance_type     = "m5.xlarge"
      weighted_capacity = 1
      subnet_id         = var.subnet_ids[0]
    }

    override {
      instance_type     = "m5a.xlarge"
      weighted_capacity = 1
      subnet_id         = var.subnet_ids[1]
    }

    override {
      instance_type     = "m5n.xlarge"
      weighted_capacity = 1
      subnet_id         = var.subnet_ids[2]
    }

    override {
      instance_type     = "m4.xlarge"
      weighted_capacity = 1
      subnet_id         = var.subnet_ids[0]
    }

    override {
      instance_type     = "r5.large"
      weighted_capacity = 1
      subnet_id         = var.subnet_ids[1]
    }
  }

  # Terminate instances when the fleet is deleted
  terminate_instances = true

  tags = {
    Name        = "mixed-ec2-fleet"
    Environment = var.environment
    CostModel   = "Mixed"
  }
}
```

## Step 2: Create the Supporting Launch Template

```hcl
resource "aws_launch_template" "app" {
  name          = "fleet-app-template"
  image_id      = data.aws_ami.amazon_linux.id

  iam_instance_profile {
    name = var.instance_profile_name
  }

  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    # Configure instance for fleet membership
    yum install -y amazon-ssm-agent
    systemctl enable amazon-ssm-agent
    systemctl start amazon-ssm-agent
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = { Name = "fleet-instance" }
  }
}
```

## Step 3: Monitor Fleet Capacity

```hcl
# CloudWatch alarm to track fleet fulfillment

resource "aws_cloudwatch_metric_alarm" "fleet_capacity" {
  alarm_name          = "ec2-fleet-capacity-shortfall"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  threshold           = 0.9  # Alert if less than 90% fulfilled
  alarm_description   = "EC2 Fleet is below 90% of target capacity"

  metric_query {
    id          = "e1"
    expression  = "m1/m2"
    label       = "TargetCapacityFulfillment"
    return_data = true
  }

  metric_query {
    id = "m1"

    metric {
      metric_name = "FulfilledCapacity"
      namespace   = "AWS/EC2Spot"
      period      = 300
      stat        = "Average"

      dimensions = {
        FleetRequestId = aws_ec2_fleet.mixed.id
      }
    }
  }

  metric_query {
    id = "m2"

    metric {
      metric_name = "TargetCapacity"
      namespace   = "AWS/EC2Spot"
      period      = 300
      stat        = "Average"

      dimensions = {
        FleetRequestId = aws_ec2_fleet.mixed.id
      }
    }
  }
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

EC2 Fleet with mixed instance types and purchase options provides an excellent balance of cost savings and reliability. The `price-capacity-optimized` Spot allocation strategy first identifies pools with high capacity availability and then selects the lowest-priced pools among them, reducing interruption rates. Diversifying across multiple instance types and Availability Zones can improve capacity availability.
