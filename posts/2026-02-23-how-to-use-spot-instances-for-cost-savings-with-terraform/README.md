# How to Use Spot Instances for Cost Savings with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Spot Instances, Cost Optimization, Auto Scaling

Description: Learn how to use AWS Spot Instances with Terraform to save up to 90% on compute costs while managing interruptions through diversification and fallback strategies.

---

AWS Spot Instances offer up to 90% savings compared to on-demand pricing by utilizing spare EC2 capacity. The trade-off is that AWS can reclaim Spot Instances with a two-minute warning when capacity is needed. Terraform makes it easy to configure Spot Instances with proper diversification and interruption handling. This guide covers practical Spot Instance strategies with Terraform.

## Basic Spot Instance

Create a simple Spot Instance:

```hcl
resource "aws_spot_instance_request" "worker" {
  ami                    = var.ami_id
  instance_type          = "c5.xlarge"
  spot_price             = "0.10"  # Maximum price you are willing to pay
  wait_for_fulfillment   = true
  spot_type              = "persistent"
  instance_interruption_behavior = "stop"

  tags = {
    Name = "spot-worker"
  }
}
```

## Spot Instances with Auto Scaling Groups

The recommended approach is using Spot with Auto Scaling Groups for automatic replacement:

```hcl
# Launch template with Spot configuration
resource "aws_launch_template" "spot_workers" {
  name_prefix   = "spot-worker-"
  image_id      = var.ami_id

  instance_market_options {
    market_type = "spot"
    spot_options {
      max_price                      = "0.10"
      spot_instance_type             = "one-time"
      instance_interruption_behavior = "terminate"
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name     = "spot-worker"
      SpotType = "asg-managed"
    }
  }
}

# ASG with mixed instances for Spot diversification
resource "aws_autoscaling_group" "workers" {
  name                = "spot-workers"
  min_size            = 2
  max_size            = 20
  desired_capacity    = 5
  vpc_zone_identifier = var.private_subnet_ids

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 1  # 1 on-demand for baseline
      on_demand_percentage_above_base_capacity = 0  # Rest are Spot
      spot_allocation_strategy                 = "capacity-optimized"
      spot_max_price                           = ""  # Use on-demand price as max
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.spot_workers.id
        version            = "$Latest"
      }

      # Diversify across instance types for better availability
      override {
        instance_type = "c5.xlarge"
      }
      override {
        instance_type = "c5a.xlarge"
      }
      override {
        instance_type = "c5d.xlarge"
      }
      override {
        instance_type = "c6i.xlarge"
      }
      override {
        instance_type = "m5.xlarge"
      }
      override {
        instance_type = "m5a.xlarge"
      }
    }
  }

  tag {
    key                 = "Name"
    value               = "spot-worker"
    propagate_at_launch = true
  }
}
```

## Spot Fleet for Batch Workloads

Spot Fleets are ideal for batch processing:

```hcl
resource "aws_spot_fleet_request" "batch" {
  iam_fleet_role  = aws_iam_role.spot_fleet.arn
  target_capacity = 10
  valid_until     = timeadd(timestamp(), "24h")

  allocation_strategy                 = "capacityOptimized"
  terminate_instances_with_expiration = true

  launch_specification {
    instance_type   = "c5.2xlarge"
    ami             = var.ami_id
    subnet_id       = var.subnet_ids[0]
    spot_price      = "0.20"
  }

  launch_specification {
    instance_type   = "c5a.2xlarge"
    ami             = var.ami_id
    subnet_id       = var.subnet_ids[1]
    spot_price      = "0.20"
  }

  launch_specification {
    instance_type   = "m5.2xlarge"
    ami             = var.ami_id
    subnet_id       = var.subnet_ids[0]
    spot_price      = "0.22"
  }

  tags = {
    Name    = "batch-spot-fleet"
    Purpose = "batch-processing"
  }
}

# IAM role for Spot Fleet
resource "aws_iam_role" "spot_fleet" {
  name = "spot-fleet-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "spotfleet.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "spot_fleet" {
  role       = aws_iam_role.spot_fleet.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2SpotFleetTaggingRole"
}
```

## EKS with Spot Node Groups

Use Spot Instances in Kubernetes:

```hcl
resource "aws_eks_node_group" "spot" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "spot-workers"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids
  capacity_type   = "SPOT"

  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 1
  }

  instance_types = [
    "m5.large",
    "m5a.large",
    "m5d.large",
    "m6i.large",
    "c5.large",
    "c5a.large",
  ]

  labels = {
    "node-type" = "spot"
  }

  taint {
    key    = "spot"
    value  = "true"
    effect = "NO_SCHEDULE"
  }

  tags = {
    "k8s.io/cluster-autoscaler/enabled" = "true"
    "node-type"                         = "spot"
  }
}
```

## Handling Spot Interruptions

Set up interruption handling:

```hcl
# CloudWatch Events rule for Spot interruption notices
resource "aws_cloudwatch_event_rule" "spot_interruption" {
  name        = "spot-interruption-notice"
  description = "Capture EC2 Spot Instance interruption notices"

  event_pattern = jsonencode({
    source      = ["aws.ec2"]
    detail_type = ["EC2 Spot Instance Interruption Warning"]
  })
}

resource "aws_cloudwatch_event_target" "spot_interruption" {
  rule = aws_cloudwatch_event_rule.spot_interruption.name
  arn  = aws_lambda_function.spot_handler.arn
}

resource "aws_cloudwatch_event_target" "spot_interruption_sns" {
  rule = aws_cloudwatch_event_rule.spot_interruption.name
  arn  = aws_sns_topic.spot_alerts.arn
}

resource "aws_sns_topic" "spot_alerts" {
  name = "spot-interruption-alerts"
}
```

## Cost Comparison Tags

Track Spot vs on-demand costs:

```hcl
locals {
  spot_tags = {
    PricingModel = "spot"
    CostSavings  = "estimated-70-percent"
  }

  ondemand_tags = {
    PricingModel = "on-demand"
    CostSavings  = "none"
  }
}
```

## Best Practices

Diversify across multiple instance types and availability zones. Use the capacity-optimized allocation strategy. Keep at least one on-demand instance as a baseline. Implement graceful shutdown handlers for Spot interruptions. Use Auto Scaling Groups rather than standalone Spot Instances. Monitor Spot pricing trends before committing to specific types. Design applications to be stateless and interruption-tolerant for Spot workloads.

## Conclusion

Spot Instances offer dramatic cost savings for workloads that can tolerate interruptions. Terraform's support for mixed instance policies, Spot Fleets, and EKS Spot node groups makes it straightforward to implement Spot strategies. By diversifying across instance types and implementing proper interruption handling, you can achieve reliable compute at a fraction of on-demand costs.

For related guides, see [How to Right-Size EC2 Instances with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-right-size-ec2-instances-with-terraform/view) and [How to Use Savings Plans with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-savings-plans-with-terraform/view).
