# How to Build a Microservices Architecture with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Microservice, Architecture, OpenTofu, EKS, Service Mesh, API Gateway

Description: Learn how to build a production-ready microservices architecture on AWS using OpenTofu with EKS, API Gateway, service discovery via AWS Cloud Map, and distributed tracing.

## Overview

Microservices on AWS can use EKS for container orchestration, API Gateway for external entry points, AWS Cloud Map for service discovery primitives, and SQS for asynchronous communication. OpenTofu provisions the core platform and demonstrates the key patterns.

## Step 1: EKS Cluster for Microservices

```hcl
# main.tf - EKS cluster for microservices

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "microservices-cluster"
  cluster_version = "1.35"
  enable_irsa     = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_addons = {
    coredns    = {}
    kube-proxy = {}
    vpc-cni    = {}
    aws-ebs-csi-driver = {}
  }

  # Multiple node groups for different workload types
  eks_managed_node_groups = {
    general = {
      min_size       = 3
      max_size       = 20
      desired_size   = 5
      instance_types = ["m5.xlarge"]
    }

    high_memory = {
      min_size       = 0
      max_size       = 10
      desired_size   = 0
      instance_types = ["r5.2xlarge"]
      labels = { workload = "memory-intensive" }
      taints = [{
        key    = "workload"
        value  = "memory-intensive"
        effect = "NO_SCHEDULE"
      }]
    }
  }
}
```

## Step 2: API Gateway as External Entry Point

```hcl
# HTTP API Gateway fronting microservices via VPC Link
resource "aws_apigatewayv2_api" "microservices" {
  name          = "microservices-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["https://app.example.com"]
    allow_methods = ["GET", "POST", "PUT", "DELETE"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }
}

# VPC Link to reach a private load balancer fronting EKS services
resource "aws_apigatewayv2_vpc_link" "eks" {
  name               = "eks-vpc-link"
  security_group_ids = [aws_security_group.vpc_link.id]
  subnet_ids         = module.vpc.private_subnets
}

# Deploy the HTTP API at its base URL
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.microservices.id
  name        = "$default"
  auto_deploy = true
}

# Routes to the orders service
resource "aws_apigatewayv2_route" "orders_root" {
  api_id    = aws_apigatewayv2_api.microservices.id
  route_key = "ANY /orders"
  target    = "integrations/${aws_apigatewayv2_integration.orders.id}"
}

resource "aws_apigatewayv2_route" "orders" {
  api_id    = aws_apigatewayv2_api.microservices.id
  route_key = "ANY /orders/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.orders.id}"
}

resource "aws_apigatewayv2_integration" "orders" {
  api_id             = aws_apigatewayv2_api.microservices.id
  integration_type   = "HTTP_PROXY"
  connection_type    = "VPC_LINK"
  connection_id      = aws_apigatewayv2_vpc_link.eks.id
  integration_uri         = aws_lb_listener.orders.arn
  integration_method      = "ANY"
  payload_format_version = "1.0"
}
```

## Step 3: AWS Cloud Map for Service Discovery

```hcl
# Private DNS namespace for service discovery
resource "aws_service_discovery_private_dns_namespace" "microservices" {
  name = "microservices.local"
  vpc  = module.vpc.vpc_id
}

# Define the orders service in Cloud Map; workloads still need to register instances
resource "aws_service_discovery_service" "orders" {
  name = "orders"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.microservices.id

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
```

## Step 4: Per-Service IAM Roles (IRSA)

```hcl
# Each microservice gets its own IAM role; attach least-privilege policies per service
locals {
  services = {
    orders   = { dynamodb_table = "orders" }
    payments = { sqs_queue = "payment-events" }
    catalog  = { s3_bucket = "product-catalog" }
  }
}

resource "aws_iam_role" "service" {
  for_each = local.services

  name = "microservice-${each.key}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = module.eks.oidc_provider_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${module.eks.oidc_provider}:aud" = "sts.amazonaws.com"
          "${module.eks.oidc_provider}:sub" = "system:serviceaccount:${each.key}:${each.key}"
        }
      }
    }]
  })
}
```

## Step 5: SQS for Async Communication

```hcl
# Event bus via SQS for async microservice communication
resource "aws_sqs_queue" "order_events" {
  name                       = "order-events"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.order_events_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "order_events_dlq" {
  name = "order-events-dlq"
  message_retention_seconds = 604800  # 7 days for investigation
}
```

## Summary

Microservices on AWS built with OpenTofu use EKS for workload isolation, API Gateway with VPC Link and an internal load balancer for secure external access, and IRSA to scope AWS permissions per service. Asynchronous communication via SQS decouples services and provides resilience to downstream failures. AWS Cloud Map provides the service discovery namespace and service definition, but workloads still need to register instances, and least-privilege access still depends on attaching narrow IAM policies to each service role.
