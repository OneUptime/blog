# How to Handle Container Networking with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Containers, Networking, VPC, Kubernetes, ECS

Description: Learn how to configure container networking in Terraform including VPC setup, service discovery, load balancing, and network policies for secure container communication.

---

Container networking determines how your containers communicate with each other, with external services, and with the internet. Getting networking right is fundamental to building secure, reliable containerized applications. Terraform excels at managing the networking infrastructure that containers depend on, from VPC configuration and security groups to service discovery and load balancing.

This guide covers how to handle container networking in Terraform across AWS ECS, Kubernetes, and multi-cloud environments.

## VPC Configuration for Containers

### Creating a Container-Optimized VPC

```hcl
# VPC for container workloads
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "container-vpc"
  }
}

# Public subnets for load balancers
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-subnet-${count.index}"
    # Tag for Kubernetes load balancer discovery
    "kubernetes.io/role/elb" = "1"
  }
}

# Private subnets for container tasks
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-subnet-${count.index}"
    # Tag for Kubernetes internal load balancer discovery
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

# NAT Gateways for private subnet outbound access
resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}

# Route tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table" "private" {
  count  = 3
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }
}

resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

## ECS Service Networking

### Security Groups for ECS Services

```hcl
# Security group for the Application Load Balancer
resource "aws_security_group" "alb" {
  name_prefix = "alb-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for ALB"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from internet"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Security group for ECS API service
resource "aws_security_group" "api_service" {
  name_prefix = "ecs-api-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for API ECS service"

  # Allow traffic from ALB only
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Traffic from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Security group for worker service (no ingress)
resource "aws_security_group" "worker_service" {
  name_prefix = "ecs-worker-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for worker ECS service"

  # Workers only need outbound access
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Security group for inter-service communication
resource "aws_security_group" "internal_service" {
  name_prefix = "ecs-internal-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for internal service communication"

  # Allow traffic from other ECS services
  ingress {
    from_port = 8080
    to_port   = 8080
    protocol  = "tcp"
    self      = true
    description = "Internal service communication"
  }

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.api_service.id]
    description     = "Traffic from API service"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### Service Discovery with Cloud Map

```hcl
# AWS Cloud Map namespace for service discovery
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "internal.local"
  description = "Private DNS namespace for ECS services"
  vpc         = aws_vpc.main.id
}

# Service discovery for the API service
resource "aws_service_discovery_service" "api" {
  name = "api"

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
}

# ECS service with service discovery
resource "aws_ecs_service" "api" {
  name            = "api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.api_service.id]
    assign_public_ip = false
  }

  # Register with service discovery
  service_registries {
    registry_arn = aws_service_discovery_service.api.arn
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }
}
```

### VPC Endpoints for AWS Services

```hcl
# VPC endpoints to avoid NAT Gateway costs for AWS services
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id
}

resource "aws_vpc_endpoint" "logs" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.logs"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

# Security group for VPC endpoints
resource "aws_security_group" "vpc_endpoints" {
  name_prefix = "vpc-endpoints-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "HTTPS from VPC"
  }
}
```

## Kubernetes Network Policies

```hcl
# Network policy to restrict pod communication
resource "kubernetes_network_policy" "api_policy" {
  metadata {
    name      = "api-network-policy"
    namespace = "default"
  }

  spec {
    pod_selector {
      match_labels = {
        app = "api"
      }
    }

    # Control ingress traffic
    ingress {
      # Allow traffic from ingress controller
      from {
        namespace_selector {
          match_labels = {
            name = "ingress-nginx"
          }
        }
      }

      ports {
        port     = "8080"
        protocol = "TCP"
      }
    }

    # Allow traffic from frontend pods
    ingress {
      from {
        pod_selector {
          match_labels = {
            app = "frontend"
          }
        }
      }

      ports {
        port     = "8080"
        protocol = "TCP"
      }
    }

    # Control egress traffic
    egress {
      # Allow DNS resolution
      to {
        namespace_selector {}
      }
      ports {
        port     = "53"
        protocol = "UDP"
      }
      ports {
        port     = "53"
        protocol = "TCP"
      }
    }

    # Allow egress to database
    egress {
      to {
        pod_selector {
          match_labels = {
            app = "database"
          }
        }
      }
      ports {
        port     = "5432"
        protocol = "TCP"
      }
    }

    policy_types = ["Ingress", "Egress"]
  }
}
```

## Load Balancer Configuration

```hcl
# Application Load Balancer
resource "aws_lb" "main" {
  name               = "container-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = true
}

# Target group for API service
resource "aws_lb_target_group" "api" {
  name        = "api-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
  }

  deregistration_delay = 30
}

# HTTPS listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}
```

## Outputs

```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "service_discovery_namespace" {
  description = "Service discovery namespace"
  value       = aws_service_discovery_private_dns_namespace.main.name
}
```

## Monitoring with OneUptime

Container networking issues can be subtle and hard to diagnose. Connectivity problems, DNS resolution failures, and security group misconfigurations all manifest as application errors. OneUptime monitors your service endpoints and can detect network-related failures before they impact users. Visit [OneUptime](https://oneuptime.com) to monitor your container networking.

## Conclusion

Container networking in Terraform encompasses VPC design, security groups, service discovery, load balancing, and network policies. A well-designed networking setup uses private subnets for containers, security groups for access control, service discovery for inter-service communication, and VPC endpoints to reduce NAT Gateway costs. Kubernetes network policies add another layer of security by controlling pod-to-pod traffic. By managing all networking configuration in Terraform, you maintain a comprehensive view of your network topology and ensure consistent security across environments.

For more container topics, see [How to Create Container Service Auto Scaling in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-container-service-auto-scaling-in-terraform/view) and [How to Create App Runner with Custom VPC in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-app-runner-with-custom-vpc-in-terraform/view).
