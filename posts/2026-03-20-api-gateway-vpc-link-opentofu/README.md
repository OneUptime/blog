# How to Configure API Gateway VPC Link with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, VPC Link, Private Integration, NLB, Infrastructure as Code

Description: Learn how to create an API Gateway VPC Link with OpenTofu to expose private VPC resources like internal Network Load Balancers and ECS services through API Gateway.

## Introduction

API Gateway VPC Link enables API Gateway to communicate with private resources inside a VPC, such as internal load balancers, ECS services, or EKS pods. HTTP API VPC Links create managed elastic network interfaces in your subnets and can connect to Network Load Balancers, Application Load Balancers, or AWS Cloud Map services. For REST APIs, the legacy `aws_api_gateway_vpc_link` resource shown below connects to NLBs only.

## Prerequisites

- OpenTofu v1.6+
- A VPC with private resources and a Network Load Balancer
- AWS credentials with API Gateway, EC2, and ELB permissions

## Step 1: Create Network Load Balancer for VPC Resources

```hcl
# NLB for internal services (required for the legacy REST API VPC Link resource shown here)

resource "aws_lb" "internal" {
  name               = "${var.project_name}-internal-nlb"
  internal           = true
  load_balancer_type = "network"
  subnets            = var.private_subnet_ids

  enable_cross_zone_load_balancing = true

  tags = {
    Name = "${var.project_name}-internal-nlb"
  }
}

resource "aws_lb_target_group" "services" {
  name        = "${var.project_name}-services-tg"
  port        = 8080
  protocol    = "TCP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled  = true
    protocol = "TCP"
    port     = 8080
  }
}

resource "aws_lb_listener" "services" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 80
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services.arn
  }
}
```

## Step 2: Create REST API VPC Link

```hcl
# Legacy REST API VPC Link resource connects to NLB
resource "aws_api_gateway_vpc_link" "main" {
  name        = "${var.project_name}-vpc-link"
  description = "VPC Link for internal services"
  target_arns = [aws_lb.internal.arn]

  tags = {
    Name = "${var.project_name}-vpc-link"
  }
}
```

## Step 3: Create HTTP API VPC Link

```hcl
# HTTP API VPC Link creates managed ENIs in your subnets for private integrations
resource "aws_apigatewayv2_vpc_link" "main" {
  name               = "${var.project_name}-http-vpc-link"
  security_group_ids = [var.vpc_link_security_group_id]
  subnet_ids         = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-http-vpc-link"
  }
}
```

## Step 4: Create HTTP API with VPC Link Integration

```hcl
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-private-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "vpc_link" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "HTTP_PROXY"
  integration_method = "ANY"

  # Use the private NLB listener ARN as the integration URI
  integration_uri = aws_lb_listener.services.arn

  request_parameters = {
    "overwrite:path" = "$request.path"
  }

  connection_type = "VPC_LINK"
  connection_id   = aws_apigatewayv2_vpc_link.main.id

  payload_format_version = "1.0"
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.vpc_link.id}"
}

resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "prod"
  auto_deploy = true
}
```

## Step 5: Security Group for VPC Link

```hcl
resource "aws_security_group" "vpc_link" {
  name        = "${var.project_name}-vpc-link-sg"
  description = "Security group for API Gateway VPC Link"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Allow traffic to internal NLB"
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test the private API through VPC Link
curl https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/health
```

## Conclusion

VPC Links enable API Gateway to serve as the public-facing API layer for private backend services without exposing them to the internet. The internal NLB remains private within the VPC, and all traffic flows through the AWS network. Use HTTP API VPC Links for new HTTP API deployments-they support NLB, ALB, and AWS Cloud Map targets. For REST APIs, the legacy `aws_api_gateway_vpc_link` resource remains NLB-based, while newer private integrations can use VPC links V2.
