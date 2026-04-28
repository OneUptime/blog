# How to Create OpenSearch VPC Endpoints with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, OpenSearch, VPC, Infrastructure as Code

Description: Learn how to deploy AWS OpenSearch domains in a VPC with OpenTofu for private network access and enhanced security.

Deploying OpenSearch in a VPC ensures the domain is not reachable from the public internet. All access goes through VPC networking, keeping search traffic private and reducing attack surface.

## VPC-Deployed OpenSearch Domain

```hcl
resource "aws_opensearch_domain" "private" {
  domain_name    = "private-search"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type          = "r6g.large.search"
    instance_count         = 3

    dedicated_master_enabled = true
    dedicated_master_type    = "r6g.large.search"
    dedicated_master_count   = 3

    zone_awareness_enabled = true
    zone_awareness_config {
      availability_zone_count = 3
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 100
  }

  # VPC configuration - deploys domain inside the VPC
  vpc_options {
    subnet_ids = [
      aws_subnet.opensearch_a.id,
      aws_subnet.opensearch_b.id,
      aws_subnet.opensearch_c.id,
    ]
    security_group_ids = [aws_security_group.opensearch.id]
  }

  encrypt_at_rest         { enabled = true }
  node_to_node_encryption { enabled = true }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
    custom_endpoint_enabled = true
    custom_endpoint        = "search.internal.example.com"
    custom_endpoint_certificate_arn = var.acm_cert_arn
  }

  advanced_security_options {
    enabled                        = true
    anonymous_auth_enabled         = false
    internal_user_database_enabled = false

    master_user_options {
      master_user_arn = aws_iam_role.opensearch_admin.arn
    }
  }

  tags = {
    Environment = "production"
    Network     = "private"
  }
}
```

## Security Group

```hcl
resource "aws_security_group" "opensearch" {
  name        = "opensearch-sg"
  description = "OpenSearch domain security group"
  vpc_id      = var.vpc_id

  # Allow HTTPS access from application security group
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  # Allow HTTPS from monitoring tools
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [var.monitoring_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Private Subnets for OpenSearch

```hcl
resource "aws_subnet" "opensearch_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.20.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name    = "opensearch-subnet-a"
    Tier    = "search"
  }
}

resource "aws_subnet" "opensearch_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.21.0/24"
  availability_zone = "us-east-1b"

  tags = {
    Name = "opensearch-subnet-b"
    Tier = "search"
  }
}

resource "aws_subnet" "opensearch_c" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.22.0/24"
  availability_zone = "us-east-1c"

  tags = {
    Name = "opensearch-subnet-c"
    Tier = "search"
  }
}
```

## Route53 DNS for Custom Endpoint

```hcl
data "aws_route53_zone" "internal" {
  name         = "internal.example.com."
  private_zone = true
}

resource "aws_route53_record" "opensearch" {
  zone_id = data.aws_route53_zone.internal.zone_id
  name    = "search.internal.example.com"
  type    = "CNAME"
  ttl     = 60
  records = [aws_opensearch_domain.private.endpoint]
}
```

## Access Policy (VPC Domain)

```hcl
resource "aws_opensearch_domain_policy" "private" {
  domain_name = aws_opensearch_domain.private.domain_name

  # For VPC domains with FGAC, use an open policy
  # (FGAC handles authorization, VPC handles network isolation)
  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "*" }
      Action    = "es:*"
      Resource  = "${aws_opensearch_domain.private.arn}/*"
    }]
  })
}
```

## Conclusion

Deploying OpenSearch in a VPC with OpenTofu keeps search traffic private and off the public internet. Create dedicated subnets per AZ for OpenSearch, configure security groups to allow access only from application tier security groups, and use custom endpoints with ACM certificates for developer-friendly DNS names. For VPC deployments with fine-grained access control, an open domain policy is acceptable since VPC networking provides network-level isolation.
