# How to Set Up AWS Cloud Map Service Discovery with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Cloud Map, Service Discovery, Microservice, Infrastructure as Code

Description: Learn how to create AWS Cloud Map namespaces and services for automatic service discovery in microservices architectures using OpenTofu.

## Introduction

AWS Cloud Map is a service registry that lets your applications discover cloud resources by name. Services register attributes such as IP addresses, ports, and custom metadata, and consumers look them up via DNS or API calls. OpenTofu manages namespaces, services, and service instances as code.

## Creating a Private DNS Namespace

```hcl
# Private DNS namespace tied to a VPC (internal service discovery)

resource "aws_service_discovery_private_dns_namespace" "internal" {
  name        = "internal.${var.app_name}.local"
  description = "Private DNS namespace for ${var.app_name} services"
  vpc         = var.vpc_id

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Creating a Public DNS Namespace

```hcl
# Public DNS namespace (requires a registered public domain)
resource "aws_service_discovery_public_dns_namespace" "external" {
  name        = "api.example.com"
  description = "Public DNS namespace for external services"
}
```

## Creating Services

```hcl
# A service within the private namespace
resource "aws_service_discovery_service" "payments" {
  name         = "payments"
  namespace_id = aws_service_discovery_private_dns_namespace.internal.id

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id

    dns_records {
      ttl  = 10
      type = "A"  # returns IP addresses
    }

    # Return up to eight healthy instances (MULTIVALUE) or one randomly selected instance (WEIGHTED)
    routing_policy = "MULTIVALUE"
  }
}
```

## Registering Service Instances

```hcl
# Manually register a service instance (useful for non-ECS workloads)
resource "aws_service_discovery_instance" "payments_1" {
  instance_id = "payments-instance-1"
  service_id  = aws_service_discovery_service.payments.id

  attributes = {
    AWS_INSTANCE_IPV4 = "10.0.1.100"
    AWS_INSTANCE_PORT = "8080"
    version           = "v2.1.0"
  }
}
```

## Integrating with ECS

ECS services can automatically register with Cloud Map.

```hcl
resource "aws_ecs_service" "payments" {
  name            = "payments"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.payments.arn
  desired_count   = 2

  service_registries {
    registry_arn   = aws_service_discovery_service.payments.arn
    container_name = "payments"
    container_port = 8080
  }

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.payments.id]
  }
}
```

## Variables and Outputs

```hcl
variable "app_name"          { type = string }
variable "environment"       { type = string }
variable "vpc_id"            { type = string }
variable "private_subnet_ids"{ type = list(string) }

output "payments_service_arn" {
  value = aws_service_discovery_service.payments.arn
}

output "namespace_hosted_zone_id" {
  value = aws_service_discovery_private_dns_namespace.internal.hosted_zone
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

AWS Cloud Map enables dynamic service discovery for microservices by maintaining a registry of service locations. OpenTofu manages namespaces, services, and manual registrations as code, and integrates seamlessly with ECS auto-registration for fully automated service discovery.
