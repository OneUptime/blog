# How to Create EC2 Spot Instances with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, EC2, Spot Instances, Cost Optimization

Description: A practical guide to provisioning AWS EC2 Spot Instances using Terraform, covering spot requests, spot fleets, launch templates, and interruption handling strategies.

---

EC2 Spot Instances let you use spare AWS compute capacity at up to 90% off the on-demand price. The catch is that AWS can reclaim them with a two-minute warning when it needs the capacity back. For workloads that can handle interruptions - batch processing, CI/CD runners, stateless web servers behind a load balancer, data processing pipelines - spot instances are one of the best ways to cut your AWS bill.

Terraform supports several ways to provision spot instances. Let's go through each option and when you'd use it.

## Simple Spot Instance Request

The most basic approach is adding `instance_market_options` to a regular `aws_instance` resource.

```hcl
# Create a single spot instance
resource "aws_instance" "spot_worker" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.large"
  subnet_id     = aws_subnet.private.id

  vpc_security_group_ids = [aws_security_group.worker.id]

  # Request this instance as a spot instance
  instance_market_options {
    market_type = "spot"

    spot_options {
      # Maximum price you're willing to pay per hour
      max_price = "0.05"

      # "one-time" means the request is not re-submitted if interrupted
      # "persistent" means AWS will try to re-launch after interruption
      spot_instance_type = "one-time"
    }
  }

  user_data = <<-EOF
    #!/bin/bash
    echo "Starting spot worker..."
  EOF

  tags = {
    Name = "spot-worker"
  }
}
```

If you omit `max_price`, AWS uses the on-demand price as the maximum, which means you'll always get the spot instance as long as capacity is available (at whatever the current spot price is).

## Spot Instance Request Resource

For more control over the spot request lifecycle, use the dedicated `aws_spot_instance_request` resource.

```hcl
# Spot instance request with full lifecycle control
resource "aws_spot_instance_request" "batch_processor" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "c5.2xlarge"
  subnet_id     = aws_subnet.private.id

  vpc_security_group_ids = [aws_security_group.batch.id]
  iam_instance_profile   = aws_iam_instance_profile.batch.name

  # Spot-specific options
  spot_price           = "0.15"            # Max hourly price
  spot_type            = "persistent"       # Re-request after interruption
  wait_for_fulfillment = true               # Wait until the instance is running
  valid_until          = "2026-12-31T23:59:59Z"  # Request expiration

  # What happens when the spot request is cancelled or interrupted
  instance_interruption_behavior = "terminate"  # or "stop" or "hibernate"

  user_data = <<-EOF
    #!/bin/bash
    set -euxo pipefail

    # Install processing dependencies
    yum install -y python3 python3-pip
    pip3 install boto3 pandas

    # Start the batch job
    python3 /opt/batch/process.py
  EOF

  tags = {
    Name = "batch-processor"
  }
}
```

Key options:
- `spot_type = "persistent"` means if the instance is interrupted, AWS will automatically re-submit the request
- `wait_for_fulfillment = true` makes Terraform wait until the instance is actually running
- `instance_interruption_behavior` controls whether the instance is terminated, stopped, or hibernated on interruption

## Spot Fleet for Multiple Instance Types

Spot Fleets let you request capacity across multiple instance types and availability zones, which significantly reduces interruption risk.

```hcl
# Spot fleet request for diversified capacity
resource "aws_spot_fleet_request" "workers" {
  iam_fleet_role                      = aws_iam_role.spot_fleet.arn
  spot_price                          = "0.10"
  target_capacity                     = 10
  terminate_instances_with_expiration = true
  valid_until                         = "2026-12-31T23:59:59Z"

  # Allocation strategy determines how instances are distributed
  # "lowestPrice" picks the cheapest options
  # "diversified" spreads across pools for better availability
  # "capacityOptimized" picks pools with most available capacity
  allocation_strategy = "capacityOptimized"

  # Launch specification for c5.xlarge
  launch_specification {
    ami                    = data.aws_ami.amazon_linux.id
    instance_type          = "c5.xlarge"
    subnet_id              = aws_subnet.private_a.id
    vpc_security_group_ids = [aws_security_group.worker.id]
    weighted_capacity      = 1

    tags = {
      Name = "spot-worker"
    }
  }

  # Launch specification for c5.2xlarge (counts as 2 units of capacity)
  launch_specification {
    ami                    = data.aws_ami.amazon_linux.id
    instance_type          = "c5.2xlarge"
    subnet_id              = aws_subnet.private_a.id
    vpc_security_group_ids = [aws_security_group.worker.id]
    weighted_capacity      = 2

    tags = {
      Name = "spot-worker"
    }
  }

  # Same instance types in a different AZ for better availability
  launch_specification {
    ami                    = data.aws_ami.amazon_linux.id
    instance_type          = "c5.xlarge"
    subnet_id              = aws_subnet.private_b.id
    vpc_security_group_ids = [aws_security_group.worker.id]
    weighted_capacity      = 1

    tags = {
      Name = "spot-worker"
    }
  }

  launch_specification {
    ami                    = data.aws_ami.amazon_linux.id
    instance_type          = "c5.2xlarge"
    subnet_id              = aws_subnet.private_b.id
    vpc_security_group_ids = [aws_security_group.worker.id]
    weighted_capacity      = 2

    tags = {
      Name = "spot-worker"
    }
  }
}

# IAM role required for spot fleet
resource "aws_iam_role" "spot_fleet" {
  name = "spot-fleet-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "spotfleet.amazonaws.com"
      }
    }]
  })
}

# Attach the required AWS managed policy
resource "aws_iam_role_policy_attachment" "spot_fleet" {
  role       = aws_iam_role.spot_fleet.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2SpotFleetTaggingRole"
}
```

## Launch Templates with Spot Options

The modern approach is to use launch templates with an Auto Scaling Group that mixes on-demand and spot capacity.

```hcl
# Launch template shared between on-demand and spot instances
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "t3.large"

  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  user_data = base64encode(templatefile("${path.module}/scripts/bootstrap.sh", {
    environment = var.environment
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "app-server"
    }
  }
}

# Auto Scaling Group with mixed instance types and purchase options
resource "aws_autoscaling_group" "app" {
  name_prefix         = "app-"
  desired_capacity    = 6
  min_size            = 2
  max_size            = 20
  vpc_zone_identifier = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  mixed_instances_policy {
    # Control the on-demand vs spot split
    instances_distribution {
      on_demand_base_capacity                  = 2   # Always keep 2 on-demand
      on_demand_percentage_above_base_capacity = 25  # 25% on-demand above base
      spot_allocation_strategy                 = "capacity-optimized"

      # Maximum spot price (optional, defaults to on-demand price)
      spot_max_price = ""
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
        version            = "$Latest"
      }

      # Override with multiple instance types for spot diversity
      override {
        instance_type     = "t3.large"
        weighted_capacity = "1"
      }

      override {
        instance_type     = "t3a.large"
        weighted_capacity = "1"
      }

      override {
        instance_type     = "m5.large"
        weighted_capacity = "1"
      }

      override {
        instance_type     = "m5a.large"
        weighted_capacity = "1"
      }
    }
  }

  tag {
    key                 = "Name"
    value               = "app-mixed"
    propagate_at_launch = true
  }
}
```

This is the recommended approach for production workloads. You get a guaranteed baseline of on-demand instances while filling the rest with spot capacity across multiple instance types.

## Handling Spot Interruptions

You should always plan for interruptions. Here are practical strategies:

```bash
#!/bin/bash
# Script to monitor for spot interruption notices
# Run this as a background process on your spot instances

METADATA_URL="http://169.254.169.254/latest/meta-data/spot/instance-action"

while true; do
  # Check for interruption notice
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $METADATA_URL)

  if [ "$RESPONSE" -eq 200 ]; then
    # Interruption notice received - we have ~2 minutes
    ACTION=$(curl -s $METADATA_URL | jq -r '.action')
    echo "Spot interruption notice received: $ACTION"

    # Gracefully stop accepting new work
    touch /tmp/draining

    # Finish current task if possible
    # Signal the application to wrap up
    kill -SIGTERM $(cat /var/run/app.pid)

    # Deregister from the load balancer
    INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
    aws elbv2 deregister-targets \
      --target-group-arn "$TARGET_GROUP_ARN" \
      --targets "Id=$INSTANCE_ID"

    break
  fi

  # Check every 5 seconds
  sleep 5
done
```

## Checking Spot Prices

Before setting your max price, check current spot pricing:

```bash
# Check current spot prices for specific instance types
aws ec2 describe-spot-price-history \
  --instance-types t3.large t3a.large m5.large \
  --product-descriptions "Linux/UNIX" \
  --start-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
  --query "SpotPriceHistory[*].[InstanceType,AvailabilityZone,SpotPrice]" \
  --output table
```

## Summary

For one-off spot instances, `aws_instance` with `instance_market_options` is the simplest path. For batch workloads that need multiple instances, spot fleets give you instance type diversity. For production services, the Auto Scaling Group with mixed instances policy is the gold standard - it gives you the cost savings of spot with the reliability of on-demand as a fallback.

The key to making spot work reliably is instance type diversity (use at least 4-6 types), multi-AZ distribution, and graceful interruption handling. Get those right, and you can run production workloads on spot with very few issues.

For more on Auto Scaling, see our guide on [creating Auto Scaling groups with Terraform](https://oneuptime.com/blog/post/2026-02-23-create-auto-scaling-groups-with-terraform/view).
