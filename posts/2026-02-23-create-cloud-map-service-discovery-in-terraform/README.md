# How to Create Cloud Map Service Discovery in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Cloud Map, Service Discovery, Microservices, Infrastructure as Code

Description: Learn how to create AWS Cloud Map namespaces, services, and instances for DNS-based and API-based service discovery using Terraform.

---

AWS Cloud Map is a service discovery service that lets your applications find the resources they depend on. Instead of hardcoding IP addresses or endpoints in your configuration, services register themselves with Cloud Map and other services look them up by name. It supports both DNS-based discovery (where clients resolve a service name to IP addresses) and API-based discovery (where clients call the Cloud Map API directly). Terraform makes it straightforward to define your entire service discovery infrastructure in code.

This guide covers creating namespaces, services, and instances, plus integration patterns with ECS and other AWS services.

## Prerequisites

- Terraform 1.0 or later
- AWS CLI configured with appropriate permissions
- A VPC (for private DNS namespaces)
- Services that need to discover each other

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Creating a Private DNS Namespace

Private DNS namespaces are the most common type. They create a Route 53 private hosted zone associated with your VPC, allowing services to discover each other using DNS within the VPC.

```hcl
# Private DNS namespace for internal service discovery
resource "aws_service_discovery_private_dns_namespace" "internal" {
  name        = "internal.myapp.local"
  description = "Private DNS namespace for internal microservices"
  vpc         = aws_vpc.main.id

  tags = {
    Environment = "production"
  }
}

# You can create multiple namespaces for different environments or domains
resource "aws_service_discovery_private_dns_namespace" "staging" {
  name        = "staging.myapp.local"
  description = "Private DNS namespace for staging services"
  vpc         = aws_vpc.main.id

  tags = {
    Environment = "staging"
  }
}
```

## Creating a Public DNS Namespace

Public DNS namespaces use Route 53 public hosted zones. Use these when external clients need to discover your services.

```hcl
# Public DNS namespace for externally discoverable services
resource "aws_service_discovery_public_dns_namespace" "public" {
  name        = "services.example.com"
  description = "Public DNS namespace for externally accessible services"

  tags = {
    Environment = "production"
  }
}
```

## Creating an HTTP Namespace

HTTP namespaces support API-based discovery only. Clients use the Cloud Map DiscoverInstances API instead of DNS.

```hcl
# HTTP namespace for API-based service discovery
resource "aws_service_discovery_http_namespace" "api_discovery" {
  name        = "api-services"
  description = "HTTP namespace for API-based service discovery"

  tags = {
    Environment = "production"
  }
}
```

## Creating Services

Services live within a namespace and represent a specific application or microservice.

```hcl
# Service with DNS-based discovery (A records)
resource "aws_service_discovery_service" "api" {
  name = "api"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    # MULTIVALUE returns up to 8 healthy IPs
    # WEIGHTED uses Route 53 weighted routing
    routing_policy = "MULTIVALUE"
  }

  # Health check based on Cloud Map health checks
  health_check_custom_config {
    failure_threshold = 1
  }

  tags = {
    Service = "api"
  }
}

# Service with SRV records (includes port information)
resource "aws_service_discovery_service" "grpc_service" {
  name = "auth"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id

    dns_records {
      ttl  = 10
      type = "SRV"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = {
    Service = "auth"
  }
}

# Service with both A and SRV records
resource "aws_service_discovery_service" "web" {
  name = "web"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    dns_records {
      ttl  = 10
      type = "SRV"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 2
  }

  tags = {
    Service = "web"
  }
}

# Service with Route 53 health checks (for public namespaces)
resource "aws_service_discovery_service" "public_api" {
  name = "api"

  dns_config {
    namespace_id = aws_service_discovery_public_dns_namespace.public.id

    dns_records {
      ttl  = 60
      type = "A"
    }

    routing_policy = "WEIGHTED"
  }

  # Route 53 health check instead of custom
  health_check_config {
    failure_threshold = 3
    resource_path     = "/health"
    type              = "HTTP"
  }

  tags = {
    Service = "public-api"
  }
}

# HTTP-only service (API-based discovery, no DNS)
resource "aws_service_discovery_service" "worker" {
  name         = "worker"
  namespace_id = aws_service_discovery_http_namespace.api_discovery.id

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = {
    Service = "worker"
  }
}
```

## Registering Service Instances

Service instances represent the actual running copies of your service.

```hcl
# Register an instance with IP-based attributes
resource "aws_service_discovery_instance" "api_instance_1" {
  instance_id = "api-instance-1"
  service_id  = aws_service_discovery_service.api.id

  attributes = {
    AWS_INSTANCE_IPV4 = "10.0.1.100"
    AWS_INSTANCE_PORT = "8080"

    # Custom attributes for API-based discovery
    version     = "2.1.0"
    region      = "us-east-1"
    environment = "production"
  }
}

resource "aws_service_discovery_instance" "api_instance_2" {
  instance_id = "api-instance-2"
  service_id  = aws_service_discovery_service.api.id

  attributes = {
    AWS_INSTANCE_IPV4 = "10.0.2.100"
    AWS_INSTANCE_PORT = "8080"
    version           = "2.1.0"
    region            = "us-east-1"
    environment       = "production"
  }
}

# Register an instance for the HTTP namespace
resource "aws_service_discovery_instance" "worker_instance" {
  instance_id = "worker-instance-1"
  service_id  = aws_service_discovery_service.worker.id

  attributes = {
    AWS_INSTANCE_IPV4 = "10.0.3.50"
    AWS_INSTANCE_PORT = "9090"
    queue             = "high-priority"
    version           = "1.5.0"
  }
}
```

## Integration with ECS

The most common use of Cloud Map is with Amazon ECS, where services automatically register and deregister as tasks start and stop.

```hcl
# Cloud Map service for ECS integration
resource "aws_service_discovery_service" "ecs_api" {
  name = "api"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# ECS service with service discovery integration
resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.api.id]
  }

  # Register tasks with Cloud Map automatically
  service_registries {
    registry_arn = aws_service_discovery_service.ecs_api.arn
  }
}
```

## Creating Services Dynamically with for_each

When you have many services to register, use a variable map.

```hcl
# Define your services
variable "services" {
  type = map(object({
    port           = number
    dns_type       = string
    health_threshold = number
  }))
  default = {
    "api" = {
      port             = 8080
      dns_type         = "A"
      health_threshold = 1
    }
    "auth" = {
      port             = 4000
      dns_type         = "SRV"
      health_threshold = 1
    }
    "notification" = {
      port             = 5000
      dns_type         = "A"
      health_threshold = 2
    }
    "analytics" = {
      port             = 6000
      dns_type         = "A"
      health_threshold = 2
    }
    "search" = {
      port             = 9200
      dns_type         = "A"
      health_threshold = 1
    }
  }
}

# Create all services
resource "aws_service_discovery_service" "services" {
  for_each = var.services

  name = each.key

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id

    dns_records {
      ttl  = 10
      type = each.value.dns_type
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = each.value.health_threshold
  }

  tags = {
    Service = each.key
  }
}
```

## Outputs

```hcl
# Output the namespace details
output "namespace_id" {
  value       = aws_service_discovery_private_dns_namespace.internal.id
  description = "Cloud Map namespace ID"
}

output "namespace_hosted_zone" {
  value       = aws_service_discovery_private_dns_namespace.internal.hosted_zone
  description = "Route 53 hosted zone ID for the namespace"
}

# Output service ARNs for ECS integration
output "service_arns" {
  value = {
    for k, v in aws_service_discovery_service.services : k => v.arn
  }
  description = "Cloud Map service ARNs for ECS service registry"
}

# DNS names for connecting to services
output "service_dns_names" {
  value = {
    for k, v in var.services : k => "${k}.${aws_service_discovery_private_dns_namespace.internal.name}"
  }
  description = "DNS names for service discovery"
}
```

## Querying Cloud Map with the AWS CLI

For testing, you can query Cloud Map using the AWS CLI.

```bash
# Discover instances via the API
aws servicediscovery discover-instances \
  --namespace-name internal.myapp.local \
  --service-name api \
  --query-parameters version=2.1.0

# List instances in a service
aws servicediscovery list-instances \
  --service-id srv-xxxxxxxxxxxxx
```

For DNS-based discovery, just resolve the name:

```bash
# DNS query from within the VPC
dig api.internal.myapp.local
```

## Best Practices

1. **Use short TTLs for DNS records.** A TTL of 10 seconds ensures clients get updated IP addresses quickly when instances change. Longer TTLs risk sending traffic to terminated instances.

2. **Use MULTIVALUE routing for internal services.** It returns multiple healthy IPs and lets the client decide which to connect to. WEIGHTED routing is better for public services where you want to control traffic distribution.

3. **Use health check custom config with ECS.** ECS manages the health status of instances automatically, so custom health checks (managed by the registering service) work better than Route 53 health checks.

4. **Add custom attributes.** Custom attributes like version, environment, and region let you filter instances when using API-based discovery.

5. **One namespace per environment.** Separate your staging and production services into different namespaces to avoid cross-environment traffic.

6. **Clean up stale instances.** If you are not using ECS automatic registration, make sure your deregistration logic is solid. Stale instances cause connection failures.

## Conclusion

AWS Cloud Map provides the service discovery layer that microservices architectures need to function without hardcoded endpoints. With Terraform managing your namespaces, services, and registration, your service discovery infrastructure is as reproducible as the rest of your stack. Whether you use DNS-based discovery for simplicity or API-based discovery for richer metadata, Cloud Map with Terraform keeps everything organized and version-controlled.

For more on microservices networking, see our guide on [creating App Mesh service mesh in Terraform](https://oneuptime.com/blog/post/2026-02-23-create-appmesh-service-mesh-in-terraform/view).
