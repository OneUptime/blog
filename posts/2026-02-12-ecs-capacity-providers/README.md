# How to Use ECS Capacity Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Capacity Provider, Auto Scaling, Container

Description: Learn how to use ECS capacity providers to manage compute capacity for your containerized workloads, including auto scaling groups and Fargate strategies.

---

If you've been running ECS clusters for a while, you've probably hit the point where managing the underlying compute gets messy. Maybe you've got an Auto Scaling Group that doesn't quite keep up with demand, or you're paying too much for Fargate when a few EC2 instances would do the trick. That's exactly the problem ECS capacity providers solve.

Capacity providers give you a clean abstraction over the compute layer. Instead of worrying about how many EC2 instances to run or whether Fargate has enough capacity, you define strategies and let ECS figure out the placement. Let's walk through how this works in practice.

## What Are Capacity Providers?

A capacity provider is a bridge between your ECS service and the underlying infrastructure. There are two flavors:

- **Fargate and Fargate Spot** - These are built-in capacity providers that come with every ECS cluster. No setup required.
- **Auto Scaling Group (ASG) capacity providers** - These link an ASG to your cluster so ECS can scale EC2 instances up and down based on task demand.

The real power comes from capacity provider strategies. A strategy lets you combine multiple providers with weights and base values. For example, you could say "always keep 2 tasks on Fargate, then spread the rest across Fargate Spot with 80% weight and regular Fargate at 20%."

## Creating a Cluster with Capacity Providers

When you create a new ECS cluster, you can attach capacity providers right away. Here's a Terraform example that sets up a cluster with both Fargate providers.

```hcl
# Create an ECS cluster with Fargate capacity providers

resource "aws_ecs_cluster" "main" {
  name = "my-app-cluster"
}

# Attach the default Fargate capacity providers
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  # Default strategy for services that don't specify their own
  default_capacity_provider_strategy {
    base              = 1
    weight            = 1
    capacity_provider = "FARGATE"
  }

  default_capacity_provider_strategy {
    weight            = 3
    capacity_provider = "FARGATE_SPOT"
  }
}
```

In this config, the `base = 1` on FARGATE means at least one task always runs on regular Fargate. The weights (1 and 3) mean that for every additional 4 tasks, roughly 1 goes to FARGATE and 3 go to FARGATE_SPOT. That's a nice cost-saving pattern.

## Setting Up an ASG Capacity Provider

If you want EC2-backed capacity, you need to create an Auto Scaling Group first and then link it to an ECS capacity provider. The key feature here is managed scaling - ECS will automatically adjust the ASG's desired count based on task demand.

Here's how to set this up with Terraform.

```hcl
# First, create a launch template for your ECS instances
resource "aws_launch_template" "ecs" {
  name_prefix   = "ecs-instance-"
  image_id      = data.aws_ssm_parameter.ecs_ami.value
  instance_type = "t3.medium"

  # The ECS agent needs this user data to join the cluster
  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo "ECS_CLUSTER=${aws_ecs_cluster.main.name}" >> /etc/ecs/ecs.config
  EOF
  )

  iam_instance_profile {
    name = aws_iam_instance_profile.ecs_instance.name
  }
}

# Create the Auto Scaling Group
resource "aws_autoscaling_group" "ecs" {
  name_prefix         = "ecs-asg-"
  max_size            = 20
  min_size            = 0
  desired_capacity    = 0  # Let ECS manage this
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }

  # Protect instances from scale-in when tasks are running
  protect_from_scale_in = true

  tag {
    key                 = "AmazonECSManaged"
    value               = true
    propagate_at_launch = true
  }
}

# Link the ASG to a capacity provider
resource "aws_ecs_capacity_provider" "ec2" {
  name = "ec2-capacity"

  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.ecs.arn
    managed_termination_protection = "ENABLED"

    managed_scaling {
      maximum_scaling_step_size = 5
      minimum_scaling_step_size = 1
      status                    = "ENABLED"
      target_capacity           = 80  # Keep 80% utilization
    }
  }
}
```

After you create the ASG capacity provider, add `aws_ecs_capacity_provider.ec2.name` to the `capacity_providers` list in `aws_ecs_cluster_capacity_providers.main`. A capacity provider must be associated with the cluster before a service can use it in a strategy.

The `target_capacity = 80` setting is important. It tells ECS to aim for 80% utilization on your EC2 instances, leaving some headroom for burst traffic without needing to wait for new instances to launch.

## Using Capacity Provider Strategies in Services

Once your capacity providers are set up, you reference them in your ECS service definitions. This is where you decide how each service distributes its tasks.

```hcl
# A service that mixes EC2 capacity providers
resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 6

  # Don't use launch_type when using capacity providers
  capacity_provider_strategy {
    capacity_provider = "ec2-capacity"
    base              = 2      # Always keep 2 tasks on EC2
    weight            = 2      # 2 parts EC2
  }

  capacity_provider_strategy {
    capacity_provider = "ec2-spot-capacity"
    weight            = 1      # 1 part EC2 Spot-backed capacity
  }
}
```

One thing to note: you can't use `launch_type` and `capacity_provider_strategy` at the same time. If you're migrating from a service that specifies `launch_type = "FARGATE"`, you need to remove that and switch to a capacity provider strategy instead. A single capacity provider strategy also can't mix Fargate providers with Auto Scaling Group providers, so keep Fargate and EC2-backed strategies separate.

## Migrating Existing Services

If you've got existing services running with a launch type, the migration path looks like this:

1. Add capacity providers to your cluster
2. Make sure the task definition is compatible with the target capacity provider
3. Remove `launch_type` from the service and add the capacity provider strategy
4. Force a new deployment so replacement tasks start with the new strategy

ECS now supports updating an existing service from a launch type to a capacity provider strategy. In Terraform, `capacity_provider_strategy` still conflicts with `launch_type`, so remove `launch_type` and use `force_new_deployment = true` when changing the service's compute configuration.

```hcl
resource "aws_ecs_service" "api" {
  # ... service config with capacity_provider_strategy ...

  force_new_deployment = true
}
```

## CLI Examples

If you prefer the AWS CLI, here's how you'd create a capacity provider and update a cluster.

```bash
# Create a capacity provider linked to an ASG
aws ecs create-capacity-provider \
  --name ec2-spot-provider \
  --auto-scaling-group-provider "autoScalingGroupArn=arn:aws:autoscaling:us-east-1:123456789:autoScalingGroup:xxx,managedScaling={status=ENABLED,targetCapacity=80},managedTerminationProtection=ENABLED"

# Associate capacity providers with your cluster
aws ecs put-cluster-capacity-providers \
  --cluster my-app-cluster \
  --capacity-providers FARGATE FARGATE_SPOT ec2-spot-provider \
  --default-capacity-provider-strategy \
    "capacityProvider=FARGATE,weight=1,base=1" \
    "capacityProvider=FARGATE_SPOT,weight=3"
```

## Monitoring Capacity Providers

You'll want to keep an eye on how your capacity providers are performing. CloudWatch and ECS give you a few useful signals:

- `CapacityProviderReservation` - Published in the `AWS/ECS/ManagedScaling` namespace for ASG capacity providers with managed scaling enabled. If this is consistently above your target capacity, you might need to increase your ASG max size or adjust the scaling settings.
- ECS service events and tasks stuck in `PROVISIONING` - These are useful signals that tasks are waiting to be placed. If you see this often, scaling isn't keeping up or the ASG can't provide compatible instances.

For monitoring ECS clusters and the services running on them, it's worth setting up proper observability. Check out our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view) for tips on building dashboards and alerts.

## Common Pitfalls

There are a few things that trip people up with capacity providers:

**Forgetting the ECS_CLUSTER config** - EC2 instances won't join your cluster without the right user data. Always verify your launch template includes the ECS agent configuration.

**Setting target_capacity too high** - If you set it to 100%, you'll have zero headroom. Tasks will queue up waiting for new instances to launch. Stick with 70-85% for most workloads.

**Not enabling managed termination protection** - Without this, your ASG might terminate an instance that's still running tasks. Always enable it for production.

**Mixing launch_type and capacity providers** - Pick one. You can't have both on the same service.

## When to Use What

Here's a quick decision framework:

- **Fargate only** - Small teams, variable workloads, don't want to manage instances
- **Fargate + Fargate Spot** - Cost-sensitive workloads that can handle interruptions
- **EC2 ASG** - Need GPU instances, specific instance types, or want to use reserved instances
- **Cluster-level mix** - Best of both worlds. Keep steady services on EC2-backed capacity and use separate Fargate or Fargate Spot strategies where they fit

Capacity providers aren't complicated once you understand the model. Define your providers, set up strategies, and let ECS handle the placement math. Your cluster gets smarter about how it uses resources, and you stop over-provisioning "just in case."
