# How to Implement Encryption in Transit with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Encryption, TLS, AWS

Description: Learn how to enforce encryption in transit across AWS services using Terraform, including TLS configuration, certificate management, and policy enforcement.

---

Encryption in transit protects data as it moves between services, from client to server, and between internal components. Without it, anyone who can observe network traffic - through a compromised network device, a misconfigured VPC, or a man-in-the-middle attack - can read your data in plain text. Terraform makes it possible to enforce encryption in transit consistently across your entire infrastructure.

This guide covers practical implementations for the most common AWS services and patterns.

## ACM Certificate Management

Most encryption in transit starts with TLS certificates. AWS Certificate Manager (ACM) provides free certificates for AWS services:

```hcl
# Request a certificate for your domain
resource "aws_acm_certificate" "main" {
  domain_name       = "example.com"
  validation_method = "DNS"

  subject_alternative_names = [
    "*.example.com",
    "api.example.com"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "main-certificate"
    Environment = var.environment
  }
}

# DNS validation record
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Wait for validation to complete
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

## Application Load Balancer with TLS

```hcl
resource "aws_lb" "main" {
  name               = "production-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  # Enable access logging
  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "alb"
    enabled = true
  }

  # Drop invalid headers for security
  drop_invalid_header_fields = true
}

# HTTPS listener with strong TLS policy
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# HTTP listener that redirects to HTTPS
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

The `ssl_policy` is critical. Use `ELBSecurityPolicy-TLS13-1-2-2021-06` to require TLS 1.3 with a fallback to TLS 1.2. Avoid older policies that allow TLS 1.0 or 1.1.

## S3 Bucket - Enforce SSL-Only Access

```hcl
resource "aws_s3_bucket_policy" "enforce_ssl" {
  bucket = aws_s3_bucket.data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.data.arn,
          "${aws_s3_bucket.data.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid       = "DenyOldTLS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.data.arn,
          "${aws_s3_bucket.data.arn}/*"
        ]
        Condition = {
          NumericLessThan = {
            "s3:TlsVersion" = 1.2
          }
        }
      }
    ]
  })
}
```

## RDS - Enforce SSL Connections

```hcl
# RDS parameter group requiring SSL
resource "aws_db_parameter_group" "postgres_ssl" {
  family = "postgres15"
  name   = "postgres-ssl-required"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = {
    Name = "postgres-ssl-required"
  }
}

resource "aws_db_instance" "main" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  # Use the SSL-enforcing parameter group
  parameter_group_name = aws_db_parameter_group.postgres_ssl.name

  # Other settings
  storage_encrypted   = true
  publicly_accessible = false
}
```

For MySQL:

```hcl
resource "aws_db_parameter_group" "mysql_ssl" {
  family = "mysql8.0"
  name   = "mysql-ssl-required"

  parameter {
    name  = "require_secure_transport"
    value = "ON"
  }
}
```

## ElastiCache Redis - Enable Transit Encryption

```hcl
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "production-redis"
  description          = "Production Redis with encryption"
  node_type            = "cache.r6g.large"
  num_cache_clusters   = 2

  # Enable transit encryption (TLS)
  transit_encryption_enabled = true

  # Auth token for an additional layer of security
  auth_token = var.redis_auth_token

  # At rest encryption too
  at_rest_encryption_enabled = true
  kms_key_id                 = aws_kms_key.main.arn

  subnet_group_name  = aws_elasticache_subnet_group.private.name
  security_group_ids = [aws_security_group.redis.id]
}
```

Note: Enabling transit encryption on ElastiCache requires clients to connect via TLS. Make sure your application is configured to use TLS connections.

## CloudFront with Modern TLS

```hcl
resource "aws_cloudfront_distribution" "main" {
  # ... origin configuration ...

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  default_cache_behavior {
    # Force HTTPS for viewer connections
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "main-origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  # Use HTTPS to origin as well
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "main-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
```

## API Gateway with TLS

```hcl
resource "aws_api_gateway_rest_api" "main" {
  name        = "production-api"
  description = "Production API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Custom domain with TLS 1.2
resource "aws_api_gateway_domain_name" "main" {
  domain_name              = "api.example.com"
  regional_certificate_arn = aws_acm_certificate_validation.main.certificate_arn

  security_policy = "TLS_1_2"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}
```

## Elasticsearch/OpenSearch with Node-to-Node Encryption

```hcl
resource "aws_opensearch_domain" "main" {
  domain_name    = "production-search"
  engine_version = "OpenSearch_2.11"

  # Node-to-node encryption
  node_to_node_encryption {
    enabled = true
  }

  # Encryption at rest
  encrypt_at_rest {
    enabled    = true
    kms_key_id = aws_kms_key.main.arn
  }

  # Enforce HTTPS
  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  # VPC configuration
  vpc_options {
    subnet_ids         = [aws_subnet.private[0].id]
    security_group_ids = [aws_security_group.opensearch.id]
  }
}
```

## Enforce TLS at the Organization Level with SCP

Use Service Control Policies to enforce encryption in transit across all accounts:

```hcl
resource "aws_organizations_policy" "require_tls" {
  name        = "require-tls"
  description = "Deny API calls that do not use TLS"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyNonTLSS3"
        Effect    = "Deny"
        Action    = "s3:*"
        Resource  = "*"
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}
```

## Wrapping Up

Encryption in transit should be enforced at every layer: client-facing load balancers, internal service communication, database connections, and cache access. Use modern TLS policies (TLS 1.2 minimum, TLS 1.3 where supported), automate certificate management with ACM, and use bucket policies and parameter groups to make encryption mandatory rather than optional.

For monitoring your TLS certificates and endpoint health, [OneUptime](https://oneuptime.com) provides SSL certificate monitoring, uptime checks, and alerting to catch expiration and configuration issues before they impact users.
