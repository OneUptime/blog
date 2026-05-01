# How to Use EC2 Spot Fleet with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EC2, Spot Fleet, Cost Optimization, Infrastructure as Code, Compute

Description: Learn how to configure EC2 Spot Fleet with diverse instance pools using OpenTofu to run fault-tolerant workloads at significantly reduced costs compared to On-Demand pricing.

## Introduction

EC2 Spot Fleet lets you launch a fleet of Spot instances from multiple instance types and pools to meet a target capacity. Spot instances can save up to 90% compared to On-Demand pricing and are ideal for batch processing, data analytics, CI/CD, and other interruption-tolerant workloads. Spot Fleet is backed by the legacy `RequestSpotFleet` API, which AWS strongly discourages for new workloads; for new designs, prefer EC2 Fleet or EC2 Auto Scaling, but the configuration below remains valid when you specifically need Spot Fleet.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EC2 Spot Fleet permissions
- An IAM role for the Spot Fleet
- Existing subnets, an EC2 key pair, and an IAM instance profile for the fleet instances

## Step 1: Create the Spot Fleet IAM Role

```hcl
# IAM role that allows the Spot Fleet service to manage instances

resource "aws_iam_role" "spot_fleet" {
  name = "spot-fleet-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "spotfleet.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "spot_fleet" {
  role       = aws_iam_role.spot_fleet.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2SpotFleetTaggingRole"
}
```

## Step 2: Create a Spot Fleet Request

```hcl
# Assumes data.aws_ami.amazon_linux and the referenced variables are defined elsewhere in this module.

resource "aws_spot_fleet_request" "batch" {
  iam_fleet_role      = aws_iam_role.spot_fleet.arn
  target_capacity     = 20             # Number of instances to maintain
  fleet_type          = "maintain"
  allocation_strategy = "diversified"  # Spread across pools

  # Automatically replace unhealthy instances
  replace_unhealthy_instances = true

  # Terminate instances when the fleet is deleted
  terminate_instances_on_delete = true

  # Maximum bid price per unit hour (defaults to the On-Demand price if omitted)
  # You still pay the current Spot price, not your bid price
  # spot_price = "0.05"

  # Define multiple launch specifications for instance diversity
  launch_specification {
    instance_type = "m5.xlarge"
    ami           = data.aws_ami.amazon_linux.id
    subnet_id     = var.subnet_ids[0]
    key_name      = var.key_pair_name

    iam_instance_profile_arn = var.instance_profile_arn

    root_block_device {
      volume_size = 30
      volume_type = "gp3"
    }

    tags = { Name = "spot-fleet-m5xl" }
  }

  launch_specification {
    instance_type = "m5a.xlarge"
    ami           = data.aws_ami.amazon_linux.id
    subnet_id     = var.subnet_ids[1]
    key_name      = var.key_pair_name

    iam_instance_profile_arn = var.instance_profile_arn

    tags = { Name = "spot-fleet-m5axl" }
  }

  launch_specification {
    instance_type = "m4.xlarge"
    ami           = data.aws_ami.amazon_linux.id
    subnet_id     = var.subnet_ids[2]
    key_name      = var.key_pair_name

    iam_instance_profile_arn = var.instance_profile_arn

    tags = { Name = "spot-fleet-m4xl" }
  }

  tags = {
    Name        = "batch-spot-fleet"
    Workload    = "batch-processing"
    Environment = var.environment
  }
}
```

## Step 3: Configure Fleet Scaling

```hcl
# Auto Scaling target for the Spot Fleet
resource "aws_appautoscaling_target" "spot_fleet" {
  max_capacity       = 50
  min_capacity       = 5
  resource_id        = "spot-fleet-request/${aws_spot_fleet_request.batch.id}"
  scalable_dimension = "ec2:spot-fleet-request:TargetCapacity"
  service_namespace  = "ec2"
}

# Target tracking policy to keep average CPU utilization near 70%
resource "aws_appautoscaling_policy" "scale_out" {
  name               = "spot-fleet-scale-out"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.spot_fleet.resource_id
  scalable_dimension = aws_appautoscaling_target.spot_fleet.scalable_dimension
  service_namespace  = aws_appautoscaling_target.spot_fleet.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0
    predefined_metric_specification {
      predefined_metric_type = "EC2SpotFleetRequestAverageCPUUtilization"
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

EC2 Spot Fleet with the `diversified` allocation strategy spreads capacity across the Spot pools defined by your launch specifications, which can reduce the impact of Spot interruptions. Always handle the two-minute interruption notice in your applications via the instance metadata endpoint, and use checkpointing for batch jobs to enable seamless restarts after interruption.
