# How to Deploy AWS App Runner Services with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, App Runner, Container, Serverless, Auto Scaling, Infrastructure as Code

Description: Learn how to deploy containerized applications on AWS App Runner with OpenTofu for fully managed web service hosting with automatic scaling, load balancing, and TLS.

## Introduction

AWS App Runner is a fully managed service for deploying containerized web applications and APIs. It automatically handles load balancing, TLS, health checks, and automatic scaling, and it can automatically deploy from source code or private ECR repositories in the same AWS account. App Runner is simpler than ECS/Fargate for stateless web services that don't require fine-grained networking control. As of 2026, App Runner is only available to existing AWS customers.

## Prerequisites

- OpenTofu v1.6+
- A container image in ECR
- AWS credentials with App Runner permissions

## Step 1: Create App Runner Service from ECR

```hcl
# IAM role for App Runner to access ECR

resource "aws_iam_role" "app_runner_access" {
  name = "${var.project_name}-app-runner-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "app_runner_ecr" {
  role       = aws_iam_role.app_runner_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# IAM role for the App Runner service instance
resource "aws_iam_role" "app_runner_instance" {
  name = "${var.project_name}-app-runner-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "tasks.apprunner.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "app_runner_instance" {
  name = "app-permissions"
  role = aws_iam_role.app_runner_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:GetItem", "dynamodb:PutItem"]
      Resource = var.dynamodb_table_arn
    }]
  })
}

resource "aws_apprunner_service" "main" {
  service_name = "${var.project_name}-app"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.app_runner_access.arn
    }

    image_repository {
      image_identifier      = "${var.ecr_repository_url}:${var.image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port                          = "8080"
        runtime_environment_variables = {
          APP_ENV = var.environment
          PORT    = "8080"
        }
        runtime_environment_secrets = {
          DATABASE_PASSWORD = var.database_password_arn  # Secrets Manager ARN
        }
      }
    }

    auto_deployments_enabled = true  # Auto-deploy for images in the same AWS account's ECR repository
  }

  instance_configuration {
    cpu               = "1024"   # 1 vCPU (valid: 256, 512, 1024, 2048, 4096)
    memory            = "2048"   # 2 GB (must match valid combination)
    instance_role_arn = aws_iam_role.app_runner_instance.arn
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.main.arn

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  tags = {
    Name        = "${var.project_name}-app"
    Environment = var.environment
  }
}
```

## Step 2: Configure Auto Scaling

```hcl
resource "aws_apprunner_auto_scaling_configuration_version" "main" {
  auto_scaling_configuration_name = "${var.project_name}-scaling"

  max_concurrency = 100   # Max concurrent requests per instance
  min_size        = 1     # Minimum provisioned instances (App Runner doesn't scale to zero automatically)
  max_size        = 10    # Maximum number of instances

  tags = {
    Name = "${var.project_name}-scaling"
  }
}
```

## Step 3: Connect to VPC for Database Access

If your service needs private database access, create a VPC connector and update the existing `aws_apprunner_service.main` resource like this:

```hcl
resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = "${var.project_name}-vpc-connector"
  subnets            = var.private_subnet_ids
  security_groups    = [var.app_runner_sg_id]

  tags = {
    Name = "${var.project_name}-vpc-connector"
  }
}

resource "aws_apprunner_service" "main" {
  # ... existing configuration from Step 1 ...

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }
  }
}
```

## Step 4: Custom Domain

```hcl
resource "aws_apprunner_custom_domain_association" "main" {
  domain_name          = "api.${var.domain_name}"
  service_arn          = aws_apprunner_service.main.arn
  enable_www_subdomain = false
}

resource "aws_route53_record" "app_runner_domain" {
  zone_id = var.route53_zone_id
  name    = aws_apprunner_custom_domain_association.main.domain_name
  type    = "CNAME"
  ttl     = 300
  records = [aws_apprunner_custom_domain_association.main.dns_target]
}

resource "aws_route53_record" "app_runner_validation" {
  for_each = {
    for record in aws_apprunner_custom_domain_association.main.certificate_validation_records :
    record.name => {
      name  = record.name
      type  = record.type
      value = record.value
    }
  }

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.value]
}

output "app_runner_url" {
  value = "https://${aws_apprunner_service.main.service_url}"
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check service status
aws apprunner describe-service \
  --service-arn <service-arn> \
  --query 'Service.{Status: Status, URL: ServiceUrl}'
```

## Conclusion

App Runner is ideal for simple web services and APIs that need automatic scaling and TLS without managing ECS, ALBs, or Fargate directly. It doesn't scale to zero automatically; instead, you control baseline capacity with `min_size`, and you can pause the service when you want compute capacity reduced to zero. Use VPC connectors when your application needs to access private resources like RDS or ElastiCache, and enable automatic deployments when you're deploying from source code or a same-account ECR repository.
