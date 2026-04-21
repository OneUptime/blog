# How to Use Spot Instances with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EC2, Spot Instance, Cost Optimization, Infrastructure as Code

Description: Learn how to provision AWS EC2 Spot Instances using OpenTofu to significantly reduce compute costs for fault-tolerant and flexible workloads.

## Introduction

AWS Spot Instances offer unused EC2 capacity at up to 90% discount compared to On-Demand prices. They are ideal for batch processing, CI/CD workers, stateless services, and other interruption-tolerant workloads. OpenTofu makes it easy to manage Spot Instance configurations as code.

## Single Spot Instance

```hcl
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

resource "aws_instance" "spot_worker" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "m5.large"

  instance_market_options {
    market_type = "spot"

    spot_options {
      spot_instance_type = "one-time"
    }
  }

  tags = {
    Name = "spot-worker"
  }
}
```

## Using a Launch Template

Launch templates make it easier to manage the instance settings that Auto Scaling uses for Spot capacity:

```hcl
resource "aws_launch_template" "worker" {
  name_prefix   = "spot-worker-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "m5.large"

  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo "Spot worker starting..."
  EOF
  )
}
```

## Auto Scaling with Spot Instances

Use a mixed instances policy for resilience:

```hcl
resource "aws_autoscaling_group" "workers" {
  name               = "spot-workers"
  min_size           = 1
  max_size           = 10
  desired_capacity   = 3
  vpc_zone_identifier = var.subnet_ids

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 1
      on_demand_percentage_above_base_capacity = 20
      spot_allocation_strategy                 = "price-capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.worker.id
        version            = "$Latest"
      }

      override {
        instance_type = "m5.large"
      }

      override {
        instance_type = "m5a.large"
      }

      override {
        instance_type = "m4.large"
      }
    }
  }
}
```

## Handling Spot Interruptions

Configure an interruption handler to drain gracefully:

```bash
# Check for a Spot interruption notice every 5 seconds

while true; do
  TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/spot/instance-action)

  if [ "$STATUS" = "200" ]; then
    echo "Spot interruption notice received, draining..."
    # Add your graceful shutdown logic here
    break
  fi
  sleep 5
done
```

## Deploying

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

OpenTofu simplifies provisioning AWS Spot Instances and Auto Scaling groups with mixed instance policies. By using price-capacity-optimized allocation and handling interruption notices gracefully, you can achieve significant cost savings while maintaining workload reliability.
