# How to Use AWS Spot Instances with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Spot Instance, Cost Optimization, Infrastructure as Code

Description: Learn how to use AWS Spot Instances with OpenTofu for up to 90% cost savings on interruptible workloads like batch processing, CI/CD, and stateless services.

Spot Instances let you use spare EC2 capacity at up to 90% discount. They can be interrupted with 2 minutes notice, making them ideal for fault-tolerant workloads. Managing Spot Instance configurations in OpenTofu ensures consistent interruption handling.

## Spot Instance

```hcl
resource "aws_instance" "batch" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "r7g.xlarge"
  key_name               = var.key_name
  subnet_id              = var.private_subnet_id
  vpc_security_group_ids = [aws_security_group.batch.id]

  instance_market_options {
    market_type = "spot"

    spot_options {
      # Max price - if empty, defaults to On-Demand price
      # max_price = "0.50"

      spot_instance_type = "one-time"  # one-time or persistent

      # Interrupt behavior
      instance_interruption_behavior = "terminate"  # use persistent requests for stop or hibernate
    }
  }

  # Ensure shutdown from inside the instance terminates it instead of stopping it
  instance_initiated_shutdown_behavior = "terminate"

  iam_instance_profile = aws_iam_instance_profile.batch.name

  user_data = <<-EOF
    #!/bin/bash
    # Handle interruption notice
    TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
      -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

    # Poll for interruption notice
    while true; do
      ACTION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
        http://169.254.169.254/latest/meta-data/spot/instance-action 2>&1)
      if [[ "$ACTION" != *"404"* ]]; then
        # Graceful shutdown
        shutdown -h now
      fi
      sleep 5
    done &

    # Start batch job
    /opt/batch/run-job.sh
    EOF

  tags = {
    Name        = "batch-spot"
    Environment = "production"
  }
}
```

## Spot Instances in Auto Scaling Group

```hcl
resource "aws_launch_template" "mixed" {
  name_prefix   = "myapp-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "r7g.large"

  iam_instance_profile {
    arn = aws_iam_instance_profile.app.arn
  }
}

resource "aws_autoscaling_group" "mixed" {
  name               = "mixed-capacity-asg"
  max_size           = 20
  min_size           = 2
  desired_capacity   = 5
  vpc_zone_identifier = var.private_subnet_ids

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 2    # Always keep 2 On-Demand
      on_demand_percentage_above_base_capacity = 20   # 20% On-Demand, 80% Spot above base
      spot_allocation_strategy                 = "capacity-optimized-prioritized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.mixed.id
        version            = "$Latest"
      }

      # Multiple instance types for Spot diversification
      override {
        instance_type = "r7g.large"
      }
      override {
        instance_type = "r6g.large"
      }
      override {
        instance_type = "r6gd.large"
      }
      override {
        instance_type = "m7g.xlarge"
      }
    }
  }

  tag {
    key                 = "Name"
    value               = "myapp-mixed"
    propagate_at_launch = true
  }
}
```

## EKS Node Group with Spot Instances

```hcl
resource "aws_eks_node_group" "spot" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "spot-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = var.private_subnet_ids

  capacity_type = "SPOT"
  ami_type      = "AL2023_ARM_64_STANDARD"

  instance_types = [
    "r7g.large",
    "r6g.large",
    "r6gd.large",
    "m7g.xlarge",
  ]

  scaling_config {
    desired_size = 5
    max_size     = 20
    min_size     = 0
  }

  # Custom node label for workload targeting
  labels = {
    "workload" = "spot"
  }

  # Taints to prevent non-tolerant workloads from running here
  taint {
    key    = "spot"
    value  = "true"
    effect = "NO_SCHEDULE"
  }
}
```

## Conclusion

Spot Instances in OpenTofu dramatically reduce compute costs for interruptible workloads. Use mixed instances policies in Auto Scaling Groups to maintain a minimum On-Demand base with Spot for scale, diversify across multiple compatible instance types for higher availability, and use capacity-optimized allocation strategy to minimize interruptions. Configure workloads to handle the 2-minute interruption notice gracefully.
