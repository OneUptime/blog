# How to Create ECS with Service Connect in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, Service Connect, Service Mesh, Container, Microservices

Description: Learn how to set up ECS Service Connect in Terraform for service-to-service communication with built-in load balancing, observability, and traffic management.

---

When you have multiple ECS services that need to talk to each other, the traditional approach is to use internal load balancers or Cloud Map service discovery. Both work, but they require managing additional infrastructure. ECS Service Connect simplifies this by providing a managed service mesh that handles service-to-service communication, load balancing, and observability without extra ALBs or custom DNS configurations.

Service Connect uses an Envoy proxy sidecar that is automatically injected into your tasks. Your services connect to each other using simple hostnames like `api:8080` or `payment-service:3000`, and the proxy handles the routing, retries, and health checking. This guide covers setting up Service Connect in Terraform from scratch.

## How Service Connect Works

Service Connect has two roles a service can play:

- **Client and server** - the service both exposes endpoints and connects to other services
- **Client only** - the service connects to other services but does not expose any endpoints

Each service gets an Envoy proxy sidecar automatically. The proxy intercepts outbound connections and routes them to healthy instances of the target service. You get load balancing, circuit breaking, and connection pooling without writing any code.

## Setting Up the Namespace

Service Connect requires a Cloud Map namespace. Create an HTTP namespace for the cluster:

```hcl
# Cloud Map namespace for Service Connect
resource "aws_service_discovery_http_namespace" "main" {
  name        = "myapp"
  description = "Namespace for ECS Service Connect"

  tags = {
    Name = "myapp-namespace"
  }
}

# ECS Cluster with Service Connect default namespace
resource "aws_ecs_cluster" "main" {
  name = "myapp-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  service_connect_defaults {
    namespace = aws_service_discovery_http_namespace.main.arn
  }

  tags = {
    Name = "myapp-cluster"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 1
    capacity_provider = "FARGATE"
  }
}
```

## API Service (Server + Client)

The API service exposes an endpoint and also connects to the payment service:

```hcl
# Task definition for the API service
resource "aws_ecs_task_definition" "api" {
  family                   = "api-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "${var.ecr_repo_url}/api:latest"
      essential = true

      portMappings = [
        {
          name          = "api-http"  # Port mapping name - used by Service Connect
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
          appProtocol   = "http"     # Enables HTTP-level features
        }
      ]

      environment = [
        { name = "PORT", value = "8080" },
        # Connect to payment service using Service Connect hostname
        { name = "PAYMENT_SERVICE_URL", value = "http://payment-service:3000" },
        # Connect to user service using Service Connect hostname
        { name = "USER_SERVICE_URL", value = "http://user-service:4000" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "api-task-definition"
  }
}

# API ECS service with Service Connect
resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  # Service Connect configuration
  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.main.arn

    # Expose the API service to other services
    service {
      port_name = "api-http"  # Matches the port mapping name

      client_alias {
        port     = 8080
        dns_name = "api"  # Other services connect to "api:8080"
      }
    }

    # Log configuration for the Service Connect proxy
    log_configuration {
      log_driver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.service_connect.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api-proxy"
      }
    }
  }

  # Also expose to external traffic via ALB
  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.https]

  tags = {
    Name = "api-service"
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/api"
  retention_in_days = 30
}
```

## Payment Service (Server + Client)

```hcl
# Task definition for the payment service
resource "aws_ecs_task_definition" "payment" {
  family                   = "payment-service"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "payment"
      image     = "${var.ecr_repo_url}/payment:latest"
      essential = true

      portMappings = [{
        name          = "payment-http"
        containerPort = 3000
        hostPort      = 3000
        protocol      = "tcp"
        appProtocol   = "http"
      }]

      environment = [
        { name = "PORT", value = "3000" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.payment.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "payment"
        }
      }
    }
  ])
}

# Payment ECS service with Service Connect
resource "aws_ecs_service" "payment" {
  name            = "payment"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.payment.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.main.arn

    service {
      port_name = "payment-http"

      client_alias {
        port     = 3000
        dns_name = "payment-service"
        # API service connects to "payment-service:3000"
      }
    }

    log_configuration {
      log_driver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.service_connect.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "payment-proxy"
      }
    }
  }

  tags = {
    Name = "payment-service"
  }
}

resource "aws_cloudwatch_log_group" "payment" {
  name              = "/ecs/payment"
  retention_in_days = 30
}
```

## Worker Service (Client Only)

A worker that connects to other services but does not expose its own endpoint:

```hcl
resource "aws_ecs_task_definition" "worker" {
  family                   = "worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "worker"
      image     = "${var.ecr_repo_url}/worker:latest"
      essential = true

      # No port mappings - this service does not expose an endpoint

      environment = [
        # Can still connect to other services via Service Connect
        { name = "API_URL", value = "http://api:8080" },
        { name = "PAYMENT_URL", value = "http://payment-service:3000" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/worker"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "worker"
        }
      }
    }
  ])
}

# Worker service - client only
resource "aws_ecs_service" "worker" {
  name            = "worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  service_connect_configuration {
    enabled   = true
    namespace = aws_service_discovery_http_namespace.main.arn
    # No "service" block - client only mode

    log_configuration {
      log_driver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.service_connect.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "worker-proxy"
      }
    }
  }

  tags = {
    Name = "worker-service"
  }
}
```

## Service Connect Proxy Log Group

All the proxy sidecars share a log group:

```hcl
resource "aws_cloudwatch_log_group" "service_connect" {
  name              = "/ecs/service-connect-proxy"
  retention_in_days = 14

  tags = {
    Name = "service-connect-proxy-logs"
  }
}
```

## Shared Resources

```hcl
# Security group for all ECS tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "ecs-tasks-"
  vpc_id      = var.vpc_id
  description = "Security group for ECS tasks with Service Connect"

  # Allow traffic between tasks on any port
  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
    description = "Allow inter-service traffic"
  }

  # Allow traffic from ALB
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "From ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "ecs-tasks-sg"
  }
}

# IAM roles
resource "aws_iam_role" "ecs_execution" {
  name = "ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name = "ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}
```

## Service Connect Metrics

Service Connect automatically publishes metrics to CloudWatch. You get request counts, latency, and error rates per service without any instrumentation:

```hcl
# Alarm on high error rate between services
resource "aws_cloudwatch_metric_alarm" "service_connect_errors" {
  alarm_name          = "service-connect-http-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  threshold           = 5

  metric_query {
    id          = "error_rate"
    expression  = "errors / total * 100"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "HTTPCode_Target_5XX_Count"
      namespace   = "AWS/ECS/ManagedScaling"
      period      = 60
      stat        = "Sum"
      dimensions = {
        ClusterName = aws_ecs_cluster.main.name
        ServiceName = "api"
      }
    }
  }

  metric_query {
    id = "total"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ECS/ManagedScaling"
      period      = 60
      stat        = "Sum"
      dimensions = {
        ClusterName = aws_ecs_cluster.main.name
        ServiceName = "api"
      }
    }
  }

  alarm_actions = [var.sns_topic_arn]
}
```

## Service Connect vs Service Discovery vs Internal ALB

**Service Connect** (recommended for new projects): Managed service mesh with Envoy. Handles load balancing, retries, and observability. Simple hostnames for service-to-service communication.

**Cloud Map Service Discovery**: DNS-based discovery. Services register their IP addresses, clients resolve hostnames via DNS. No proxy, no built-in load balancing beyond DNS round-robin.

**Internal ALB**: Traditional load balancer. More expensive, but gives you advanced features like path-based routing and WAF. Suitable when services need to be accessed from outside the cluster.

## Outputs

```hcl
output "namespace_name" {
  value = aws_service_discovery_http_namespace.main.name
}

output "namespace_arn" {
  value = aws_service_discovery_http_namespace.main.arn
}

output "cluster_name" {
  value = aws_ecs_cluster.main.name
}
```

## Summary

ECS Service Connect in Terraform requires a Cloud Map HTTP namespace, cluster configuration with `service_connect_defaults`, and per-service `service_connect_configuration` blocks. Services that expose endpoints define `service` blocks with `client_alias` for the hostname other services use. Client-only services just enable Service Connect without defining a service. The Envoy proxy is injected automatically - you do not manage it. Service Connect gives you load balancing, health checking, and observability between services with minimal configuration, making it the recommended approach for service-to-service communication in ECS.
