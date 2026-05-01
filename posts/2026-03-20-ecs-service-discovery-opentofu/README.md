# How to Set Up ECS Service Discovery with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECS, Service Discovery, Cloud Map, DNS, Infrastructure as Code

Description: Learn how to configure ECS service discovery with AWS Cloud Map using OpenTofu to enable services to find and communicate with each other using private DNS names.

## Introduction

ECS Service Discovery integrates with AWS Cloud Map to automatically register and deregister task IP addresses in a private DNS namespace. Services can call each other using DNS names like `api.myapp.local` without hardcoding IP addresses or requiring a load balancer for internal service-to-service communication.

## Prerequisites

- OpenTofu v1.6+
- A VPC and ECS cluster
- AWS credentials with Cloud Map and ECS permissions

## Step 1: Create Private DNS Namespace

```hcl
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${var.project_name}.local"
  description = "Service discovery namespace for ${var.project_name}"
  vpc         = var.vpc_id

  tags = {
    Name = "${var.project_name}.local"
  }
}
```

## Step 2: Create Service Discovery Services

```hcl
# Service discovery entry for the API service

resource "aws_service_discovery_service" "api" {
  name = "api"  # Results in DNS: api.myapp.local

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10  # Short TTL for fast failover
      type = "A"  # A records for IP addresses
    }

    routing_policy = "MULTIVALUE"  # Return up to eight task IPs per DNS response
  }

  tags = {
    Name = "${var.project_name}-api-discovery"
  }
}

# Service discovery for the worker service
resource "aws_service_discovery_service" "worker" {
  name = "worker"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }
}
```

## Step 3: Link ECS Service to Service Discovery

```hcl
resource "aws_ecs_service" "api" {
  name            = "${var.project_name}-api"
  cluster         = var.ecs_cluster_id
  task_definition = var.api_task_definition_arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_tasks_security_group_id]
    assign_public_ip = false
  }

  # Enable service discovery
  service_registries {
    registry_arn   = aws_service_discovery_service.api.arn
    container_name = "api"
    container_port = 8080
  }

  tags = {
    Name = "${var.project_name}-api"
  }
}
```

## Step 4: Service-to-Service Communication

```python
# In the worker service, call the API service by DNS name
import requests

# Uses AWS Cloud Map DNS resolution
# api.myapp.local resolves to the private IPs of running API tasks
response = requests.get('http://api.myapp.local:8080/internal/process', timeout=5)
```

## Step 5: Optional ALB with Service Discovery

```hcl
# For external traffic: use ALB
# For internal traffic: use Service Discovery DNS
# Both can coexist on the same ECS service

resource "aws_ecs_service" "api_with_both" {
  name            = "${var.project_name}-api"
  cluster         = var.ecs_cluster_id
  task_definition = var.api_task_definition_arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_tasks_security_group_id]
    assign_public_ip = false
  }

  # External access via ALB
  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = "api"
    container_port   = 8080
  }

  # Internal access via Service Discovery
  service_registries {
    registry_arn   = aws_service_discovery_service.api.arn
    container_name = "api"
    container_port = 8080
  }

  health_check_grace_period_seconds = 60
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Launch a test task in the same VPC, then run DNS checks from inside the container
aws ecs run-task \
  --cluster my-project-cluster \
  --task-definition test-dns \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=DISABLED}"
```

## Conclusion

Service Discovery is ideal for microservices architectures where internal services need to communicate without going through a load balancer. The `MULTIVALUE` routing policy returns up to eight task IPs in each DNS response, so clients can distribute requests across the returned endpoints. Keep the TTL short (10-30 seconds) so newly registered tasks receive traffic quickly and stopped tasks drop out of cached DNS responses promptly.
