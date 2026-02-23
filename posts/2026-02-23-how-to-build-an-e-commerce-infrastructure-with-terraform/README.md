# How to Build an E-Commerce Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, E-Commerce, AWS, Scalability, High Availability

Description: A hands-on guide to building e-commerce infrastructure with Terraform including product catalogs, order processing, payment handling, CDN delivery, and auto-scaling for traffic spikes.

---

E-commerce platforms face unique infrastructure challenges. Traffic is unpredictable, with massive spikes during sales events. Every second of latency costs conversions. Payment processing must be reliable and secure. Product catalogs need fast search. And the entire stack needs to stay up because downtime means lost revenue. Terraform lets you define all of this as code and deploy it consistently.

## Why Terraform for E-Commerce?

An e-commerce platform touches nearly every AWS service. Compute, databases, caching, CDN, queues, search, and more. Managing these through the console is a recipe for configuration drift and outages. Terraform gives you a single source of truth for the entire stack, making it possible to spin up identical environments for testing and to scale for peak events.

## Architecture Overview

Our e-commerce infrastructure includes:

- ECS Fargate for microservices
- Aurora PostgreSQL for transactional data
- ElastiCache Redis for sessions and caching
- OpenSearch for product search
- SQS for order processing queues
- CloudFront for static assets and product images
- Auto-scaling for handling traffic spikes

## Application Compute Layer

ECS Fargate runs the microservices without managing servers.

```hcl
# ECS cluster for e-commerce services
resource "aws_ecs_cluster" "ecommerce" {
  name = "ecommerce-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Product service
resource "aws_ecs_task_definition" "product_service" {
  family                   = "product-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "product-service"
    image = "${var.ecr_url}/product-service:${var.product_service_version}"
    portMappings = [{ containerPort = 8080 }]
    environment = [
      { name = "DB_HOST", value = aws_rds_cluster.main.endpoint },
      { name = "REDIS_HOST", value = aws_elasticache_replication_group.main.primary_endpoint_address },
      { name = "OPENSEARCH_ENDPOINT", value = aws_opensearch_domain.products.endpoint },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/product-service"
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "product"
      }
    }
  }])
}

# Order service
resource "aws_ecs_task_definition" "order_service" {
  family                   = "order-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "order-service"
    image = "${var.ecr_url}/order-service:${var.order_service_version}"
    portMappings = [{ containerPort = 8080 }]
    environment = [
      { name = "DB_HOST", value = aws_rds_cluster.main.endpoint },
      { name = "ORDER_QUEUE_URL", value = aws_sqs_queue.orders.url },
      { name = "PAYMENT_QUEUE_URL", value = aws_sqs_queue.payments.url },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/order-service"
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "order"
      }
    }
  }])
}

# Auto-scaling for product service
resource "aws_appautoscaling_target" "product_service" {
  max_capacity       = 50
  min_capacity       = 3
  resource_id        = "service/${aws_ecs_cluster.ecommerce.name}/product-service"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "product_service_cpu" {
  name               = "product-service-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.product_service.resource_id
  scalable_dimension = aws_appautoscaling_target.product_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.product_service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 50
    scale_in_cooldown  = 300
    scale_out_cooldown = 30  # Scale out fast for traffic spikes
  }
}
```

## Database Layer with Aurora

Aurora PostgreSQL gives you the performance and availability an e-commerce platform needs.

```hcl
# Aurora PostgreSQL cluster
resource "aws_rds_cluster" "main" {
  cluster_identifier      = "ecommerce-${var.environment}"
  engine                  = "aurora-postgresql"
  engine_version          = "15.4"
  database_name           = "ecommerce"
  master_username         = "admin"
  master_password         = var.db_password
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.database.arn
  deletion_protection     = true
  backup_retention_period = 35
  preferred_backup_window = "03:00-04:00"

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  serverlessv2_scaling_configuration {
    min_capacity = 2
    max_capacity = 64
  }

  tags = {
    Environment = var.environment
  }
}

# Writer instance
resource "aws_rds_cluster_instance" "writer" {
  identifier         = "ecommerce-writer"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  performance_insights_enabled = true
}

# Reader instances for read-heavy product catalog queries
resource "aws_rds_cluster_instance" "readers" {
  count              = 2
  identifier         = "ecommerce-reader-${count.index}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  performance_insights_enabled = true
}
```

## Caching with ElastiCache

Redis handles sessions, cart data, and product cache.

```hcl
# Redis cluster for caching and sessions
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "ecommerce-cache"
  description          = "Redis for e-commerce caching"

  node_type            = "cache.r6g.xlarge"
  num_cache_clusters   = 3
  engine_version       = "7.0"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  automatic_failover_enabled = true

  snapshot_retention_limit = 7

  tags = {
    Purpose = "ecommerce-caching"
  }
}
```

## Product Search with OpenSearch

Fast, relevant product search is critical for conversions.

```hcl
# OpenSearch domain for product search
resource "aws_opensearch_domain" "products" {
  domain_name    = "product-search"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type          = "r6g.large.search"
    instance_count         = 3
    zone_awareness_enabled = true

    zone_awareness_config {
      availability_zone_count = 3
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 100
    volume_type = "gp3"
    throughput  = 250
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-PFS-2023-10"
  }

  vpc_options {
    subnet_ids         = slice(var.private_subnet_ids, 0, 3)
    security_group_ids = [aws_security_group.opensearch.id]
  }

  advanced_options = {
    "rest.action.multi.allow_explicit_index" = "true"
  }

  tags = {
    Purpose = "product-search"
  }
}
```

## Order Processing Queue

Decouple order placement from processing for reliability.

```hcl
# Order processing queue
resource "aws_sqs_queue" "orders" {
  name                       = "order-processing"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400
  receive_wait_time_seconds  = 20

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Purpose = "order-processing"
  }
}

resource "aws_sqs_queue" "orders_dlq" {
  name                      = "order-processing-dlq"
  message_retention_seconds = 604800  # 7 days
}

# Payment processing queue
resource "aws_sqs_queue" "payments" {
  name                       = "payment-processing"
  visibility_timeout_seconds = 120
  message_retention_seconds  = 86400
  receive_wait_time_seconds  = 20
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.payments_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "payments_dlq" {
  name                      = "payment-processing-dlq"
  message_retention_seconds = 1209600  # 14 days - payments need longer retention
}
```

## CDN for Product Images and Static Assets

CloudFront delivers product images globally with low latency.

```hcl
# S3 bucket for product images
resource "aws_s3_bucket" "product_images" {
  bucket = "ecommerce-product-images-${var.environment}"
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "static" {
  enabled         = true
  is_ipv6_enabled = true
  price_class     = "PriceClass_200"
  aliases         = ["static.shop.company.com"]

  origin {
    domain_name = aws_s3_bucket.product_images.bucket_regional_domain_name
    origin_id   = "S3-images"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.images.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-images"

    forwarded_values {
      query_string = true
      query_string_cache_keys = ["w", "h", "q"]  # Image transformation params
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400
    default_ttl            = 604800
    max_ttl                = 31536000
    compress               = true
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.static.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }
}
```

## Monitoring and Alerting

Track the metrics that matter for e-commerce.

```hcl
# Order processing failure alarm
resource "aws_cloudwatch_metric_alarm" "order_dlq" {
  alarm_name          = "orders-in-dlq"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Failed orders detected in dead letter queue"
  alarm_actions       = [aws_sns_topic.critical.arn]

  dimensions = {
    QueueName = aws_sqs_queue.orders_dlq.name
  }
}

# Database connection alarm
resource "aws_cloudwatch_metric_alarm" "db_connections" {
  alarm_name          = "db-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 800
  alarm_actions       = [aws_sns_topic.critical.arn]

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.main.cluster_identifier
  }
}

resource "aws_sns_topic" "critical" {
  name = "ecommerce-critical-alerts"
}
```

## Wrapping Up

E-commerce infrastructure needs to handle unpredictable traffic, process orders reliably, and deliver content fast. Aurora handles transactional data with read replicas for the product catalog. Redis caches everything that can be cached. SQS decouples order processing for reliability. CloudFront delivers images globally. And auto-scaling handles the traffic spikes.

Terraform ties all of these pieces together in code that you can review, test, and deploy confidently. When Black Friday comes, you adjust the scaling parameters and apply.

For monitoring your e-commerce platform health, tracking order processing latency, and alerting on checkout failures, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-e-commerce-infrastructure-with-terraform/view) for e-commerce infrastructure observability.
