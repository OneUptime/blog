# How to Handle Network Cost Optimization with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Networking, Cost Optimization, VPC, Data Transfer, Cloud Networking

Description: Learn how to optimize cloud network costs with Terraform by reducing data transfer fees, right-sizing NAT gateways, and using VPC endpoints effectively.

---

Network costs in the cloud are notoriously difficult to predict and manage. Data transfer charges, NAT gateway fees, and load balancer costs can quickly add up to a significant portion of your monthly bill. The good news is that Terraform allows you to architect your network infrastructure for cost efficiency from the start, rather than trying to fix expensive mistakes after deployment.

This guide covers practical Terraform configurations for reducing network costs without sacrificing performance or reliability.

## Understanding Network Cost Components

Cloud network costs typically come from several sources: data transfer between availability zones, data transfer to the internet, NAT gateway processing fees, load balancer charges, and VPC endpoint usage. Many teams are surprised to discover that inter-AZ data transfer alone can cost thousands of dollars per month in busy environments.

## Using VPC Endpoints to Eliminate NAT Gateway Costs

Every API call from a private subnet to an AWS service that goes through a NAT gateway incurs both NAT gateway processing charges and data transfer fees. VPC endpoints route this traffic through the AWS backbone network at no or minimal cost.

```hcl
# VPC endpoint for S3 (Gateway type - free)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"

  # Gateway endpoints are free and have no hourly charges
  vpc_endpoint_type = "Gateway"

  # Associate with route tables in private subnets
  route_table_ids = var.private_route_table_ids

  tags = {
    Name        = "s3-endpoint-${var.environment}"
    Environment = var.environment
    CostSaving  = "nat-bypass"
  }
}

# VPC endpoint for DynamoDB (Gateway type - free)
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = var.private_route_table_ids

  tags = {
    Name        = "dynamodb-endpoint-${var.environment}"
    Environment = var.environment
    CostSaving  = "nat-bypass"
  }
}

# Interface endpoints for frequently used services
# These have hourly charges but save on NAT gateway costs
locals {
  # List of services that benefit from interface endpoints
  interface_endpoint_services = [
    "ecr.api",
    "ecr.dkr",
    "logs",
    "monitoring",
    "ssm",
    "ssmmessages",
    "ec2messages",
    "secretsmanager",
  ]
}

resource "aws_vpc_endpoint" "interface_endpoints" {
  for_each = toset(local.interface_endpoint_services)

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.${each.value}"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]

  tags = {
    Name        = "${each.value}-endpoint-${var.environment}"
    Environment = var.environment
  }
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
    description = "Allow HTTPS from VPC"
  }

  tags = {
    Name = "vpc-endpoints-sg-${var.environment}"
  }
}
```

## Optimizing NAT Gateway Architecture

NAT gateways charge per hour and per GB processed. In non-production environments, you can save significantly by using a single NAT gateway instead of one per AZ.

```hcl
# Variable to control NAT gateway strategy
variable "nat_gateway_strategy" {
  description = "NAT gateway deployment strategy"
  type        = string
  default     = "single"
  validation {
    condition     = contains(["single", "per-az", "none"], var.nat_gateway_strategy)
    error_message = "NAT strategy must be single, per-az, or none."
  }
}

locals {
  # For production: one NAT per AZ for high availability
  # For dev/staging: single NAT gateway to save costs
  nat_gateway_count = var.nat_gateway_strategy == "per-az" ? length(var.availability_zones) : (
    var.nat_gateway_strategy == "single" ? 1 : 0
  )
}

# Elastic IPs for NAT gateways
resource "aws_eip" "nat" {
  count  = local.nat_gateway_count
  domain = "vpc"

  tags = {
    Name = "nat-eip-${var.environment}-${count.index}"
  }
}

# NAT gateways based on strategy
resource "aws_nat_gateway" "main" {
  count         = local.nat_gateway_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = var.public_subnet_ids[count.index]

  tags = {
    Name        = "nat-${var.environment}-${count.index}"
    Environment = var.environment
    Strategy    = var.nat_gateway_strategy
  }
}

# Route tables for private subnets
resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "private-rt-${var.environment}-${count.index}"
  }
}

# Routes through NAT gateway
resource "aws_route" "private_nat" {
  count                  = local.nat_gateway_count > 0 ? length(var.availability_zones) : 0
  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"

  # If single NAT, all routes point to it; if per-AZ, use matching index
  nat_gateway_id = aws_nat_gateway.main[
    var.nat_gateway_strategy == "single" ? 0 : count.index
  ].id
}
```

## Reducing Cross-AZ Data Transfer

Cross-AZ data transfer costs $0.01/GB in each direction. For high-throughput applications, this adds up fast. Consider placing communicating services in the same AZ.

```hcl
# Place tightly coupled services in the same AZ
variable "primary_az" {
  description = "Primary AZ for tightly coupled services"
  type        = string
  default     = "us-east-1a"
}

# Redis cluster in a single AZ (no cross-AZ replication costs)
resource "aws_elasticache_replication_group" "cost_optimized" {
  replication_group_id = "app-cache-${var.environment}"
  description          = "Cost-optimized Redis cluster"

  # Single AZ for dev/staging to avoid cross-AZ transfer
  automatic_failover_enabled = var.environment == "production"

  # Use single AZ for non-production
  multi_az_enabled = var.environment == "production"

  node_type            = var.cache_node_type
  num_cache_clusters   = var.environment == "production" ? 2 : 1
  preferred_cache_cluster_azs = var.environment == "production" ? var.availability_zones : [var.primary_az]

  subnet_group_name = aws_elasticache_subnet_group.main.name

  tags = {
    Environment = var.environment
    CostCenter  = var.cost_center
  }
}

# Application instances colocated with their cache
resource "aws_instance" "app_server" {
  count             = var.app_instance_count
  ami               = var.ami_id
  instance_type     = var.instance_type
  availability_zone = var.primary_az
  subnet_id         = var.primary_az_subnet_id

  tags = {
    Name        = "app-server-${count.index}"
    Environment = var.environment
  }
}
```

## Optimizing Load Balancer Costs

Application Load Balancers charge based on LCU (Load Balancer Capacity Units). Consolidating services behind fewer ALBs reduces the base hourly cost.

```hcl
# Shared ALB for multiple services
resource "aws_lb" "shared" {
  name               = "shared-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  # Enable deletion protection for production
  enable_deletion_protection = var.environment == "production"

  tags = {
    Name        = "shared-alb-${var.environment}"
    Environment = var.environment
  }
}

# Single HTTPS listener with multiple rules for different services
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.shared.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }
}

# Host-based routing to share a single ALB across services
resource "aws_lb_listener_rule" "service_routes" {
  for_each     = var.services
  listener_arn = aws_lb_listener.https.arn
  priority     = each.value.priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services[each.key].arn
  }

  condition {
    host_header {
      values = [each.value.hostname]
    }
  }
}
```

## CloudFront for Reducing Origin Transfer Costs

Using CloudFront as a caching layer reduces data transfer costs from your origin servers.

```hcl
# CloudFront distribution for cost-effective content delivery
resource "aws_cloudfront_distribution" "cost_optimized" {
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"
  default_root_object = "index.html"

  origin {
    domain_name = aws_lb.shared.dns_name
    origin_id   = "alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "alb-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # Use managed caching policy for optimal caching
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    # Set reasonable TTL values
    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.cloudfront_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
```

## Monitoring Network Costs

Set up monitoring to catch unexpected network cost increases early.

```hcl
# Budget for network-related costs
resource "aws_budgets_budget" "network_budget" {
  name              = "network-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_network_budget
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  cost_filter {
    name   = "Service"
    values = [
      "Amazon Virtual Private Cloud",
      "Amazon CloudFront",
      "Amazon Elastic Load Balancing",
    ]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 75
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = [var.network_alert_email]
  }
}
```

## Best Practices

Network cost optimization requires understanding your traffic patterns. Use VPC Flow Logs to analyze where data is flowing and identify opportunities for optimization. Always prefer VPC endpoints over NAT gateways for AWS service traffic. Consolidate services behind shared load balancers where possible.

For additional cost management approaches, check out our guides on [database cost optimization with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-database-cost-optimization-with-terraform/view) and [implementing cost governance with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cost-governance-with-terraform/view).

## Conclusion

Network costs can be one of the most opaque parts of your cloud bill, but Terraform gives you the tools to architect for cost efficiency from the start. By implementing VPC endpoints, right-sizing NAT gateways for each environment, reducing cross-AZ traffic, and consolidating load balancers, you can often reduce network costs by 30-50% without any impact on performance. The key is treating network architecture as a cost optimization opportunity, not just a connectivity concern.
