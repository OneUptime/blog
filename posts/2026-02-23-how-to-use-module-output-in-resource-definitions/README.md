# How to Use Module Output in Resource Definitions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Outputs, Resources, Infrastructure as Code, DevOps

Description: Learn how to reference Terraform module outputs in resource definitions to connect infrastructure components created by different modules and configurations.

---

One of the most common patterns in Terraform is using the output of one module as input to a resource or another module. This is how you connect the pieces of your infrastructure together. A VPC module produces subnet IDs, and an EC2 instance uses those subnet IDs to know where to launch. A database module outputs an endpoint, and your application configuration uses that endpoint to set up a connection string.

This guide shows you the various ways to reference module outputs in resource definitions, with practical examples for common infrastructure patterns.

## The Basic Pattern

The syntax for referencing a module output is `module.<MODULE_NAME>.<OUTPUT_NAME>`:

```hcl
# Create a VPC using a module
module "vpc" {
  source = "./modules/vpc"

  cidr_block  = "10.0.0.0/16"
  environment = "production"
}

# Use the module's output in a resource definition
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  # Reference the VPC module's output
  subnet_id = module.vpc.public_subnet_ids[0]

  tags = {
    Name = "web-server"
  }
}
```

Terraform automatically understands the dependency: the `aws_instance` depends on `module.vpc` because it references its output. You do not need to add explicit `depends_on`.

## Referencing Outputs in Different Argument Types

Module outputs can be used anywhere you would use a regular value.

### As a Direct Argument

```hcl
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = module.vpc.vpc_id  # Direct reference to a string output
}
```

### In Lists and Sets

```hcl
resource "aws_lb" "app" {
  name               = "app-lb"
  load_balancer_type = "application"

  # Use a list output directly
  subnets         = module.vpc.public_subnet_ids
  security_groups = [module.security.lb_security_group_id]
}
```

### In Maps and Tags

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = module.vpc.private_subnet_ids[0]

  tags = merge(
    module.tagging.standard_tags,  # A module that outputs a map of tags
    {
      Name = "app-server"
      Role = "application"
    },
  )
}
```

### In String Interpolation

```hcl
resource "aws_ssm_parameter" "db_connection" {
  name  = "/app/database/connection-string"
  type  = "SecureString"
  value = "postgresql://${module.database.db_username}:${var.db_password}@${module.database.db_endpoint}/${module.database.db_name}"
}
```

### In Dynamic Blocks

```hcl
resource "aws_ecs_service" "app" {
  name            = "app-service"
  cluster         = module.ecs_cluster.cluster_id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2

  # Use module output in a dynamic block
  dynamic "load_balancer" {
    for_each = module.alb.target_group_arns

    content {
      target_group_arn = load_balancer.value
      container_name   = "app"
      container_port   = 8080
    }
  }

  network_configuration {
    subnets          = module.vpc.private_subnet_ids
    security_groups  = [module.security.ecs_security_group_id]
    assign_public_ip = false
  }
}
```

## Common Infrastructure Patterns

Here are complete examples of the most common patterns you will encounter.

### VPC to Compute

```hcl
# VPC module creates the network
module "vpc" {
  source = "./modules/vpc"

  vpc_cidr    = "10.0.0.0/16"
  environment = "prod"
  az_count    = 3
}

# Auto Scaling Group uses VPC outputs
resource "aws_autoscaling_group" "web" {
  name                = "web-asg"
  desired_capacity    = 3
  max_size            = 6
  min_size            = 2
  vpc_zone_identifier = module.vpc.private_subnet_ids  # List of subnet IDs

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  tag {
    key                 = "VPC"
    value               = module.vpc.vpc_id  # String output
    propagate_at_launch = true
  }
}

# Security group also uses VPC output
resource "aws_security_group" "web" {
  name_prefix = "web-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [module.alb.security_group_id]  # Reference ALB module output
  }
}
```

### Database to Application Configuration

```hcl
# Database module
module "database" {
  source = "./modules/rds"

  identifier     = "app-db"
  engine         = "postgres"
  instance_class = "db.r6g.large"
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.database_subnet_ids
}

# Use database outputs in application configuration
resource "aws_ecs_task_definition" "app" {
  family = "app"

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "myapp:latest"
      environment = [
        {
          name  = "DB_HOST"
          # Use the database module's endpoint output
          value = module.database.db_endpoint
        },
        {
          name  = "DB_PORT"
          value = tostring(module.database.db_port)
        },
        {
          name  = "DB_NAME"
          value = module.database.db_name
        },
      ]
    }
  ])
}
```

### Multiple Module Outputs in IAM Policies

```hcl
# S3 module creates buckets
module "storage" {
  source = "./modules/s3"

  bucket_name = "app-data"
  environment = "prod"
}

# Use module outputs in IAM policy
data "aws_iam_policy_document" "app_access" {
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
    ]
    resources = [
      "${module.storage.bucket_arn}/*",  # Use ARN output with wildcard
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "s3:ListBucket",
    ]
    resources = [
      module.storage.bucket_arn,  # Use ARN output directly
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "sqs:SendMessage",
      "sqs:ReceiveMessage",
    ]
    resources = [
      module.queue.queue_arn,  # Output from a different module
    ]
  }
}

resource "aws_iam_role_policy" "app" {
  name   = "app-access"
  role   = module.ecs_service.task_role_id
  policy = data.aws_iam_policy_document.app_access.json
}
```

## Indexing into List and Map Outputs

When a module returns a list, you can index into it or iterate over it:

```hcl
# Access a specific element
resource "aws_route53_record" "api" {
  zone_id = var.zone_id
  name    = "api"
  type    = "A"

  alias {
    name                   = module.alb.dns_name
    zone_id                = module.alb.zone_id
    evaluate_target_health = true
  }
}

# Iterate over a list output
resource "aws_route_table_association" "private" {
  count = length(module.vpc.private_subnet_ids)

  subnet_id      = module.vpc.private_subnet_ids[count.index]
  route_table_id = aws_route_table.private.id
}
```

When a module returns a map, you can look up specific keys:

```hcl
# Module returns a map of subnet_name -> subnet_id
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = module.vpc.subnet_map["app-subnet"]
}
```

## Using Outputs with for_each

Module outputs work seamlessly with `for_each`:

```hcl
# Create a CloudWatch alarm for each instance the module created
resource "aws_cloudwatch_metric_alarm" "cpu" {
  for_each = module.compute.instance_ids  # Map output

  alarm_name          = "high-cpu-${each.key}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    InstanceId = each.value
  }
}
```

## Handling "Known After Apply" Values

Some module outputs are only available after `terraform apply` runs (like resource IDs that AWS assigns). Terraform handles this correctly by creating implicit dependencies, but you should be aware of it:

```hcl
# This works - Terraform knows to create the VPC first
resource "aws_instance" "web" {
  subnet_id = module.vpc.public_subnet_ids[0]
  # The subnet ID is "known after apply" during the first run
  # Terraform plans this resource but waits for the VPC module to complete
}
```

If you need to use a module output in a context where "known after apply" values are not supported (like in `for_each` keys during initial creation), you may need to use a two-step apply or restructure your code.

## Summary

Using module outputs in resource definitions is how you connect infrastructure components in Terraform. The `module.<NAME>.<OUTPUT>` syntax works anywhere you can use a value - as direct arguments, in lists, in maps, in string interpolation, and in dynamic blocks. Terraform automatically creates dependencies based on these references, so resources wait for their dependencies to be created. The most common patterns involve connecting networking outputs to compute resources, database outputs to application configuration, and resource ARNs to IAM policies.

For more on defining outputs, see [How to Return Output Values from Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-return-output-values-from-terraform-modules/view). For connecting modules to each other, check out [How to Chain Module Outputs to Other Module Inputs](https://oneuptime.com/blog/post/2026-02-23-how-to-chain-module-outputs-to-other-module-inputs/view).
