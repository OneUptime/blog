# How to Use Terraform for Service Discovery Infrastructure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Service Discovery, DNS, Consul, Cloud Map, DevOps

Description: Learn how to build service discovery infrastructure with Terraform, including AWS Cloud Map, Consul integration, DNS-based discovery, and service mesh configurations for dynamic environments.

---

Service discovery enables services to find and communicate with each other dynamically without hardcoded addresses. In modern microservices architectures, services come and go as they scale up and down, and their IP addresses change frequently. Service discovery infrastructure managed by Terraform provides the foundation for reliable service-to-service communication.

In this guide, we will cover how to build service discovery infrastructure with Terraform.

## AWS Cloud Map Service Discovery

```hcl
# service-discovery/cloud-map.tf
# AWS Cloud Map for ECS service discovery

# Private DNS namespace
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${var.environment}.internal"
  description = "Service discovery namespace for ${var.environment}"
  vpc         = var.vpc_id

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Service discovery service for each microservice
resource "aws_service_discovery_service" "services" {
  for_each = var.services

  name = each.key

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = {
    Service     = each.key
    Team        = each.value.team
    Environment = var.environment
  }
}

# ECS service with Cloud Map integration
resource "aws_ecs_service" "app" {
  for_each = var.services

  name            = each.key
  cluster         = var.ecs_cluster_id
  task_definition = each.value.task_definition_arn
  desired_count   = each.value.desired_count

  # Register with Cloud Map
  service_registries {
    registry_arn = aws_service_discovery_service.services[each.key].arn
  }

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.services[each.key].id]
  }
}
```

## DNS-Based Service Discovery

```hcl
# service-discovery/dns.tf
# Route 53 based service discovery

# Internal hosted zone
resource "aws_route53_zone" "internal" {
  name = "${var.environment}.internal.example.com"

  vpc {
    vpc_id = var.vpc_id
  }

  tags = {
    Environment = var.environment
    Purpose     = "service-discovery"
  }
}

# Service records
resource "aws_route53_record" "services" {
  for_each = var.service_endpoints

  zone_id = aws_route53_zone.internal.zone_id
  name    = "${each.key}.${var.environment}.internal.example.com"
  type    = "A"

  alias {
    name                   = each.value.alb_dns_name
    zone_id                = each.value.alb_zone_id
    evaluate_target_health = true
  }
}

# Health checks for service endpoints
resource "aws_route53_health_check" "services" {
  for_each = var.service_endpoints

  fqdn              = each.value.alb_dns_name
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 30

  tags = {
    Service = each.key
  }
}
```

## Consul-Based Service Discovery

```hcl
# service-discovery/consul.tf
# HashiCorp Consul cluster for service discovery

resource "aws_instance" "consul_server" {
  count = 3

  ami           = data.aws_ami.consul.id
  instance_type = "t3.medium"
  subnet_id     = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]

  vpc_security_group_ids = [aws_security_group.consul.id]
  iam_instance_profile   = aws_iam_instance_profile.consul.name

  user_data = templatefile("consul-server.sh", {
    consul_version  = var.consul_version
    datacenter      = var.environment
    server_count    = 3
    retry_join_tag  = "consul-server-${var.environment}"
  })

  tags = {
    Name     = "consul-server-${count.index}"
    consul   = "server"
    consul-join = "consul-server-${var.environment}"
  }
}

# Security group for Consul
resource "aws_security_group" "consul" {
  name_prefix = "consul-"
  vpc_id      = var.vpc_id

  # Consul HTTP API
  ingress {
    from_port   = 8500
    to_port     = 8500
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Consul DNS
  ingress {
    from_port   = 8600
    to_port     = 8600
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    from_port   = 8600
    to_port     = 8600
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Serf LAN
  ingress {
    from_port   = 8301
    to_port     = 8301
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Server RPC
  ingress {
    from_port   = 8300
    to_port     = 8300
    protocol    = "tcp"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Monitoring Service Discovery Health

Track the health of your service discovery infrastructure:

```hcl
# service-discovery/monitoring.tf
# Monitor service discovery health

resource "aws_cloudwatch_metric_alarm" "service_count" {
  for_each = var.critical_services

  alarm_name          = "service-discovery-${each.key}-instance-count"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthyInstanceCount"
  namespace           = "AWS/ServiceDiscovery"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "No healthy instances for ${each.key}"

  alarm_actions = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceId   = aws_service_discovery_service.services[each.key].id
    NamespaceId = aws_service_discovery_private_dns_namespace.main.id
  }
}

# Dashboard for service discovery overview
resource "aws_cloudwatch_dashboard" "service_discovery" {
  dashboard_name = "service-discovery-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      for name, _ in var.services : {
        type   = "metric"
        width  = 6
        height = 4
        properties = {
          metrics = [
            ["AWS/ServiceDiscovery", "HealthyInstanceCount",
             "ServiceId", aws_service_discovery_service.services[name].id,
             "NamespaceId", aws_service_discovery_private_dns_namespace.main.id]
          ]
          title  = "${name} - Healthy Instances"
          period = 60
        }
      }
    ]
  })
}
```

## Best Practices

Use short DNS TTLs for service discovery records. Long TTLs prevent quick failover when services move or scale. A TTL of 10 seconds is appropriate for most microservices environments.

Implement health checks for all discovered services. Without health checks, clients may be routed to unhealthy instances. Use application-level health checks that verify the service can handle requests, not just that the process is running.

Choose the right discovery mechanism for your architecture. Cloud Map is simplest for ECS, Consul provides the most features including key-value storage and service mesh, and DNS is the most universal and works with any application.

Monitor service registration and deregistration. Track how often services register and deregister to detect instability. Frequent churn may indicate a health check that is too aggressive or an application that is crashing repeatedly.

Plan for service discovery failure. What happens when the discovery mechanism itself is unavailable? Services should cache discovered endpoints locally and fall back to cached values when the discovery service is unreachable.

Use namespaces to isolate environments. Each environment (dev, staging, production) should have its own service discovery namespace to prevent accidental cross-environment communication.

## Conclusion

Service discovery infrastructure with Terraform provides the dynamic routing foundation that modern microservices architectures depend on. Whether using AWS Cloud Map, DNS-based discovery, or HashiCorp Consul, Terraform manages the discovery infrastructure as code, ensuring consistency and repeatability. The key is choosing the right discovery mechanism for your architecture, implementing comprehensive health checks, and monitoring the health of the discovery system itself to ensure clients always connect to healthy service instances.
