# How to Use Spot Instances with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Spot Instance, AWS, EC2, Cost Optimization, Infrastructure as Code

Description: Learn how to run EC2 Spot Instances with OpenTofu - configuring Spot requests, interruption handlers, mixed instance ASGs, and Spot Fleet for cost-optimized compute workloads.

## Introduction

EC2 Spot Instances offer up to 90% cost savings over On-Demand pricing by using spare AWS capacity. The trade-off is a two-minute interruption notice when AWS reclaims capacity. OpenTofu manages Spot configuration for individual instances, Auto Scaling Groups, and EC2 Fleets - with interruption handling built into the launch template.

## Spot Instance via Launch Template

```hcl
resource "aws_launch_template" "spot" {
  name          = "${var.environment}-spot-lt"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  instance_market_options {
    market_type = "spot"

    spot_options {
      max_price                      = "0.05"  # Max hourly price (USD)
      spot_instance_type             = "persistent"  # or "one-time"
      instance_interruption_behavior = "terminate"  # or "stop" or "hibernate"
    }
  }

  user_data = base64encode(file("${path.module}/spot_user_data.sh"))

  tag_specifications {
    resource_type = "instance"
    tags = { SpotManaged = "true", Environment = var.environment }
  }
}
```

## Spot Interruption Handler in User Data

```bash
#!/bin/bash
# Install spot interruption handler

# Polls IMDSv2 every 5 seconds for interruption notice
cat > /usr/local/bin/spot-interrupt-handler.sh << 'EOF'
#!/bin/bash
refresh_token() {
  curl -s -X PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"
}

TOKEN=$(refresh_token)

while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/spot/instance-action)

  if [ "$STATUS" -eq 401 ]; then
    TOKEN=$(refresh_token)
    continue
  fi

  if [ "$STATUS" -eq 200 ]; then
    echo "Spot interruption notice received - draining..."
    # Signal application to stop accepting new work
    systemctl stop app
    # Complete current work item then exit
    break
  fi
  sleep 5
done
EOF
chmod +x /usr/local/bin/spot-interrupt-handler.sh
nohup /usr/local/bin/spot-interrupt-handler.sh &
```

## Mixed Instance ASG with Spot

```hcl
resource "aws_autoscaling_group" "spot_mixed" {
  name                = "${var.environment}-spot-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"
  min_size            = 2
  max_size            = 50
  desired_capacity    = 10
  enabled_metrics     = ["GroupInServiceInstances"]

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 2     # Always keep 2 On-Demand
      on_demand_percentage_above_base_capacity = 0     # All additional capacity = Spot
      spot_allocation_strategy                 = "capacity-optimized"  # Best for interruption avoidance
      spot_max_price                           = ""    # Empty = On-Demand price cap
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
        version            = "$Latest"
      }

      # Multiple instance types for better Spot availability
      override { instance_type = "m5.xlarge" }
      override { instance_type = "m5a.xlarge" }
      override { instance_type = "m5n.xlarge" }
      override { instance_type = "m4.xlarge" }
      override { instance_type = "m6i.xlarge" }
    }
  }
}
```

## EC2 Fleet for Batch Workloads

```hcl
resource "aws_launch_template" "batch" {
  name_prefix = "${var.environment}-batch-"
  image_id    = data.aws_ami.amazon_linux.id
  user_data   = filebase64("${path.module}/batch_user_data.sh")

  iam_instance_profile {
    arn = aws_iam_instance_profile.batch.arn
  }

  vpc_security_group_ids = [aws_security_group.batch.id]

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size = 30
      volume_type = "gp3"
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = { Workload = "batch", Environment = var.environment }
  }
}

resource "aws_ec2_fleet" "batch" {
  type                = "maintain"
  terminate_instances = true

  launch_template_config {
    launch_template_specification {
      launch_template_id = aws_launch_template.batch.id
      version            = aws_launch_template.batch.latest_version
    }

    override {
      instance_type = "m5.large"
      subnet_id     = aws_subnet.private[0].id
    }

    override {
      instance_type = "m5a.large"
      subnet_id     = aws_subnet.private[1].id
    }
  }

  target_capacity_specification {
    default_target_capacity_type = "spot"
    total_target_capacity        = 20
  }

  spot_options {
    allocation_strategy = "price-capacity-optimized"
  }
}
```

## CloudWatch Alarm for Spot Capacity

```hcl
resource "aws_cloudwatch_metric_alarm" "spot_capacity" {
  alarm_name          = "${var.environment}-spot-capacity-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "GroupInServiceInstances"
  namespace           = "AWS/AutoScaling"
  period              = 60
  statistic           = "Average"
  threshold           = var.asg_min_size
  alarm_description   = "ASG in-service capacity below minimum - possible Spot interruptions"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.spot_mixed.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Conclusion

Spot Instances with OpenTofu deliver significant cost savings for fault-tolerant workloads. Use `capacity-optimized` allocation strategy to minimize interruptions by letting AWS pick the pool with the most available capacity. Provide multiple instance types and Availability Zones to maximize Spot availability; AWS recommends being flexible across at least 10 instance types for each workload. For stateless web applications, maintain a small On-Demand base (`on_demand_base_capacity = 2`) for reliability while running the bulk of traffic on Spot. For batch jobs, EC2 Fleet with `price-capacity-optimized` provides the best price-to-interruption balance.
