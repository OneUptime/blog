# How to Implement Zero Trust Networking with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Zero Trust, Networking, Security

Description: Implement zero trust networking principles on AWS with Terraform including identity-based access, micro-segmentation, service mesh, and continuous verification.

---

Zero trust networking abandons the idea that anything inside your network perimeter can be trusted. Instead, every connection is verified based on identity, device posture, and context, regardless of where the request originates. This model works particularly well in cloud environments where the traditional network perimeter has already dissolved.

Implementing zero trust on AWS with Terraform means building infrastructure where every service-to-service connection is authenticated, authorized, and encrypted. This guide walks through the key patterns.

## Core Principles

Before diving into code, the zero trust principles that translate to AWS infrastructure are:

1. Never trust, always verify - every request must be authenticated
2. Least privilege access - grant only the minimum permissions needed
3. Assume breach - design as if the network is already compromised
4. Micro-segmentation - isolate workloads into small, controlled segments
5. Encrypt everything - TLS everywhere, no exceptions

## Identity-Based Access with IAM

In zero trust, identity replaces network location as the primary access control. Every service gets its own identity:

```hcl
# Each service gets its own IAM role
resource "aws_iam_role" "order_service" {
  name = "order-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = "arn:aws:ecs:${var.region}:${data.aws_caller_identity.current.account_id}:task-definition/order-service:*"
          }
        }
      }
    ]
  })
}

# Scoped permissions - order service can only access its own resources
resource "aws_iam_role_policy" "order_service" {
  name = "order-service-policy"
  role = aws_iam_role.order_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AccessOwnDatabase"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.orders.arn
      },
      {
        Sid    = "PublishToOrderEvents"
        Effect = "Allow"
        Action = "sns:Publish"
        Resource = aws_sns_topic.order_events.arn
      },
      {
        Sid    = "AccessOwnSecrets"
        Effect = "Allow"
        Action = "secretsmanager:GetSecretValue"
        Resource = "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:order-service/*"
      }
    ]
  })
}
```

## Micro-Segmentation with Security Groups

Each service gets its own security group. Traffic is only allowed between services that need to communicate:

```hcl
# Security group per service
resource "aws_security_group" "order_service" {
  name        = "order-service-sg"
  description = "Order service - accepts traffic only from API gateway"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "order-service-sg" }
}

resource "aws_security_group" "payment_service" {
  name        = "payment-service-sg"
  description = "Payment service - accepts traffic only from order service"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "payment-service-sg" }
}

resource "aws_security_group" "inventory_service" {
  name        = "inventory-service-sg"
  description = "Inventory service - accepts traffic from order service"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "inventory-service-sg" }
}

# Explicit allow between order and payment service only
resource "aws_vpc_security_group_ingress_rule" "payment_from_order" {
  security_group_id            = aws_security_group.payment_service.id
  description                  = "gRPC from order service"
  from_port                    = 8443
  to_port                      = 8443
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.order_service.id
}

# Order service can talk to inventory
resource "aws_vpc_security_group_ingress_rule" "inventory_from_order" {
  security_group_id            = aws_security_group.inventory_service.id
  description                  = "gRPC from order service"
  from_port                    = 8443
  to_port                      = 8443
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.order_service.id
}

# Payment service CANNOT talk to inventory (not needed, so not allowed)
# This is micro-segmentation - each connection must be explicitly authorized
```

## VPC Lattice for Service-to-Service Auth

AWS VPC Lattice provides application-layer networking with built-in authentication:

```hcl
# Create a service network
resource "aws_vpclattice_service_network" "main" {
  name      = "${var.project}-service-network"
  auth_type = "AWS_IAM"

  tags = { Name = "${var.project}-service-network" }
}

# Associate VPC with the service network
resource "aws_vpclattice_service_network_vpc_association" "main" {
  vpc_identifier             = aws_vpc.main.id
  service_network_identifier = aws_vpclattice_service_network.main.id

  security_group_ids = [aws_security_group.lattice.id]
}

# Create a service for each microservice
resource "aws_vpclattice_service" "order" {
  name      = "order-service"
  auth_type = "AWS_IAM"

  tags = { Name = "order-service" }
}

# Auth policy - only allow specific services to call this service
resource "aws_vpclattice_auth_policy" "order" {
  resource_identifier = aws_vpclattice_service.order.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = {
          AWS = aws_iam_role.api_gateway_service.arn
        }
        Action    = "vpc-lattice-svcs:Invoke"
        Resource  = "*"
        Condition = {
          StringEquals = {
            "vpc-lattice-svcs:RequestMethod" = ["GET", "POST"]
          }
        }
      }
    ]
  })
}

# Service network association
resource "aws_vpclattice_service_network_service_association" "order" {
  service_identifier         = aws_vpclattice_service.order.id
  service_network_identifier = aws_vpclattice_service_network.main.id
}
```

## Private Connectivity Only

In zero trust, there is no reason for services to communicate over the public internet:

```hcl
# PrivateLink for third-party services
resource "aws_vpc_endpoint_service" "partner" {
  acceptance_required        = true
  network_load_balancer_arns = [aws_lb.partner_nlb.arn]

  tags = { Name = "partner-endpoint-service" }
}

# All AWS service access through VPC endpoints
resource "aws_vpc_endpoint" "all_services" {
  for_each = toset([
    "sts", "logs", "monitoring", "kms",
    "secretsmanager", "sqs", "sns", "dynamodb"
  ])

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.${each.value}"
  vpc_endpoint_type   = each.value == "dynamodb" ? "Gateway" : "Interface"
  private_dns_enabled = each.value != "dynamodb"

  subnet_ids         = each.value != "dynamodb" ? aws_subnet.private[*].id : null
  route_table_ids    = each.value == "dynamodb" ? aws_route_table.private[*].id : null
  security_group_ids = each.value != "dynamodb" ? [aws_security_group.vpc_endpoints.id] : null

  tags = { Name = "${var.project}-${each.value}-endpoint" }
}
```

## Continuous Verification with CloudWatch

Zero trust means continuously monitoring and verifying, not just checking at connection time:

```hcl
# Monitor for anomalous network patterns
resource "aws_cloudwatch_metric_alarm" "unusual_cross_service_traffic" {
  alarm_name          = "unusual-cross-service-traffic"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RejectedConnectionCount"
  namespace           = "CustomMetrics/ZeroTrust"
  period              = 300
  statistic           = "Sum"
  threshold           = 10

  alarm_actions = [aws_sns_topic.security_alerts.arn]
  alarm_description = "High number of rejected connections indicates possible lateral movement"
}

# VPC Flow Logs for forensics
resource "aws_flow_log" "all_traffic" {
  vpc_id                   = aws_vpc.main.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn             = aws_iam_role.flow_logs.arn
  max_aggregation_interval = 60

  tags = { Name = "${var.project}-flow-logs" }
}

# Query rejected traffic patterns
resource "aws_cloudwatch_log_metric_filter" "rejected_traffic" {
  name           = "rejected-traffic"
  log_group_name = aws_cloudwatch_log_group.flow_logs.name
  pattern        = "[version, account, eni, source, destination, srcport, destport, protocol, packets, bytes, windowstart, windowend, action=\"REJECT\", flowlogstatus]"

  metric_transformation {
    name      = "RejectedConnectionCount"
    namespace = "CustomMetrics/ZeroTrust"
    value     = "1"
  }
}
```

## Encrypt Everything in Transit

Every connection between services must use TLS:

```hcl
# ACM certificate for internal service communication
resource "aws_acm_certificate" "internal" {
  domain_name       = "*.internal.${var.domain}"
  validation_method = "DNS"

  tags = { Name = "${var.project}-internal-cert" }
}

# ALB listener that only accepts HTTPS
resource "aws_lb_listener" "internal_https" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate.internal.arn
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service.arn
  }
}
```

## Summary

Zero trust networking with Terraform means building infrastructure where every connection is authenticated through IAM, every service is isolated in its own security group, all traffic is encrypted, and all access is continuously monitored. The key AWS services for this are IAM for identity, security groups for micro-segmentation, VPC Lattice for service-to-service auth, VPC endpoints for private connectivity, and CloudWatch for continuous verification. Terraform ties it all together in a configuration that can be reviewed, versioned, and applied consistently.

For more on network security, see [how to implement network segmentation with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-network-segmentation-with-terraform/view) and [how to handle Terraform with private network access only](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-with-private-network-access-only/view).
