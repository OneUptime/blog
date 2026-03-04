# How to Create App Runner Services with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, App Runner, Terraform, Containers

Description: Step-by-step guide to deploying AWS App Runner services with Terraform, covering ECR image sources, auto-scaling, custom domains, VPC connectors, and observability.

---

AWS App Runner is the simplest way to run containers on AWS. You point it at a container image or a source code repository, and it handles load balancing, TLS, scaling, and deployments. There's no ECS task definitions, no ALB configuration, no target groups - just a running service with an HTTPS endpoint.

The trade-off is control. You can't customize the load balancer, you can't pick your instance types, and networking options are limited compared to ECS or EKS. But for web APIs and microservices that don't need that level of customization, App Runner is a great fit.

Let's set it up with Terraform.

## Basic App Runner Service from ECR

The most common pattern is deploying a Docker image from ECR.

This creates an App Runner service that runs a container image from your ECR repository:

```hcl
resource "aws_apprunner_service" "main" {
  service_name = "my-api"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_configuration {
        port = "8080"

        runtime_environment_variables = {
          APP_ENV     = "production"
          LOG_LEVEL   = "info"
          DB_HOST     = "prod-db.cluster-abc123.us-east-1.rds.amazonaws.com"
        }

        runtime_environment_secrets = {
          DB_PASSWORD = aws_secretsmanager_secret.db_password.arn
        }
      }

      image_identifier      = "${aws_ecr_repository.app.repository_url}:latest"
      image_repository_type = "ECR"
    }

    auto_deployments_enabled = true  # Redeploy when new image is pushed
  }

  instance_configuration {
    cpu    = "1024"   # 1 vCPU
    memory = "2048"   # 2 GB
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  tags = {
    Environment = "production"
    Service     = "my-api"
  }
}
```

## IAM Roles

App Runner needs two roles: one for pulling images from ECR (access role) and one for the running container to use (instance role).

These IAM roles give App Runner permission to pull from ECR and give the container access to AWS services:

```hcl
# Access role - lets App Runner pull images from ECR
resource "aws_iam_role" "apprunner_ecr_access" {
  name = "apprunner-ecr-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "build.apprunner.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  role       = aws_iam_role.apprunner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# Instance role - used by the running container
resource "aws_iam_role" "apprunner_instance" {
  name = "apprunner-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "tasks.apprunner.amazonaws.com"
      }
    }]
  })
}

# Grant the container access to specific AWS services
resource "aws_iam_role_policy" "apprunner_instance" {
  role = aws_iam_role.apprunner_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query"
        ]
        Resource = "arn:aws:dynamodb:*:*:table/my-app-*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::my-app-uploads/*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.db_password.arn
      }
    ]
  })
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "production/my-api/db-password"
}
```

## Auto Scaling

App Runner automatically scales your service, but you can customize the scaling behavior.

This auto scaling configuration sets min/max instances and a concurrency target:

```hcl
resource "aws_apprunner_auto_scaling_configuration_version" "main" {
  auto_scaling_configuration_name = "my-api-scaling"

  max_concurrency = 100  # Max concurrent requests per instance
  max_size        = 10   # Maximum number of instances
  min_size        = 2    # Minimum number of instances (always running)

  tags = {
    Service = "my-api"
  }
}

# Reference in your service
resource "aws_apprunner_service" "main" {
  service_name = "my-api"

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.main.arn

  # ... rest of configuration ...

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_configuration {
        port = "8080"
      }
      image_identifier      = "${aws_ecr_repository.app.repository_url}:latest"
      image_repository_type = "ECR"
    }
  }

  instance_configuration {
    cpu    = "1024"
    memory = "2048"
  }
}
```

The `max_concurrency` setting is important. When an instance hits this threshold, App Runner provisions a new one. Setting it too low wastes money on idle instances. Setting it too high risks slow responses under load. Start with 100 and adjust based on your application's performance characteristics.

## VPC Connector

By default, App Runner services can only reach the public internet. To connect to resources in a VPC (like an RDS database or ElastiCache cluster), you need a VPC connector.

This creates a VPC connector and attaches it to the App Runner service:

```hcl
resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = "my-api-vpc-connector"
  subnets            = var.private_subnet_ids
  security_groups    = [aws_security_group.apprunner.id]

  tags = {
    Service = "my-api"
  }
}

resource "aws_security_group" "apprunner" {
  name   = "apprunner-my-api"
  vpc_id = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.rds_security_group_id]
  }

  tags = {
    Name = "apprunner-my-api"
  }
}

# Add this to your service configuration
resource "aws_apprunner_service" "with_vpc" {
  service_name = "my-api"

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }
  }

  # ... rest of configuration ...

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_configuration {
        port = "8080"
      }
      image_identifier      = "${aws_ecr_repository.app.repository_url}:latest"
      image_repository_type = "ECR"
    }
  }

  instance_configuration {
    cpu    = "1024"
    memory = "2048"
  }
}
```

## Custom Domain

App Runner gives you an auto-generated URL, but for production you'll want a custom domain.

This associates a custom domain with the App Runner service:

```hcl
resource "aws_apprunner_custom_domain_association" "main" {
  domain_name = "api.example.com"
  service_arn = aws_apprunner_service.main.arn
}

# Create the validation records in Route 53
resource "aws_route53_record" "apprunner_validation" {
  for_each = {
    for record in aws_apprunner_custom_domain_association.main.certificate_validation_records :
    record.name => record
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.value]
  ttl     = 300
}

# CNAME pointing to the App Runner service
resource "aws_route53_record" "apprunner_cname" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "CNAME"
  records = [aws_apprunner_service.main.service_url]
  ttl     = 300
}

data "aws_route53_zone" "main" {
  name = "example.com"
}
```

## Observability

Enable observability to send traces to X-Ray for distributed tracing.

This enables X-Ray tracing for the App Runner service:

```hcl
resource "aws_apprunner_observability_configuration" "main" {
  observability_configuration_name = "my-api-observability"

  trace_configuration {
    vendor = "AWSXRAY"
  }

  tags = {
    Service = "my-api"
  }
}

# Reference in your service
resource "aws_apprunner_service" "observed" {
  service_name = "my-api"

  observability_configuration {
    observability_configuration_arn = aws_apprunner_observability_configuration.main.arn
    observability_enabled           = true
  }

  # ... rest of configuration ...

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_configuration {
        port = "8080"
      }
      image_identifier      = "${aws_ecr_repository.app.repository_url}:latest"
      image_repository_type = "ECR"
    }
  }

  instance_configuration {
    cpu    = "1024"
    memory = "2048"
  }
}
```

## WAF Integration

You can protect your App Runner service with AWS WAF by associating a Web ACL.

This attaches a WAF Web ACL to the App Runner service:

```hcl
resource "aws_wafv2_web_acl_association" "apprunner" {
  resource_arn = aws_apprunner_service.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
```

For details on creating the Web ACL itself, see our guide on [creating WAF Web ACLs with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-waf-web-acls-terraform/view).

## Outputs

```hcl
output "service_url" {
  value       = aws_apprunner_service.main.service_url
  description = "App Runner service URL"
}

output "service_arn" {
  value       = aws_apprunner_service.main.arn
  description = "App Runner service ARN"
}
```

## Wrapping Up

App Runner removes most of the infrastructure complexity of running containers on AWS. For web APIs and services that don't need fine-grained control over networking and compute, it's the fastest path to production. The main things to get right are the VPC connector (if you need private resource access), auto scaling configuration (to balance cost and performance), and proper IAM roles. The Terraform configurations here should get you from zero to a production-ready service with minimal friction.
