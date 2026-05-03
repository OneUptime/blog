# How to Create Route53 Alias Records with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Route53, DNS, AWS, Infrastructure as Code

Description: Learn how to create Route53 alias records with OpenTofu to route traffic to AWS resources like ALBs, CloudFront distributions, and S3 websites.

Route53 alias records are AWS-specific DNS extensions that point to AWS resources. Unlike CNAME records, aliases can be used at the zone apex (e.g., `example.com`) and don't incur DNS query charges when pointing to AWS resources.

## Provider Configuration

```hcl
terraform {
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

## Hosted Zone

```hcl
data "aws_route53_zone" "main" {
  name         = "example.com."
  private_zone = false
}
```

## Alias to Application Load Balancer

```hcl
resource "aws_route53_record" "apex" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "example.com"  # Zone apex
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true  # Health check the ALB
  }
}

# IPv6 alias

resource "aws_route53_record" "apex_ipv6" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "AAAA"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
```

## Alias to CloudFront Distribution

```hcl
resource "aws_route53_record" "cdn" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.example.com"
  type    = "A"

  alias {
    name    = aws_cloudfront_distribution.main.domain_name
    zone_id = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false  # CloudFront doesn't support health checks
  }
}
```

## Alias to S3 Static Website

```hcl
resource "aws_route53_record" "static_site" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "static.example.com"
  type    = "A"

  alias {
    name    = aws_s3_bucket_website_configuration.main.website_endpoint
    zone_id = aws_s3_bucket.main.hosted_zone_id
    evaluate_target_health = true
  }
}
```

## Alias to Another Route53 Record (Latency-Based Routing)

```hcl
# Primary record in us-east-1
resource "aws_route53_record" "api_us_east" {
  zone_id        = data.aws_route53_zone.main.zone_id
  name           = "api.example.com"
  type           = "A"
  set_identifier = "us-east-1"

  latency_routing_policy {
    region = "us-east-1"
  }

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }
}

# Secondary region in eu-west-1
resource "aws_route53_record" "api_eu_west" {
  zone_id        = data.aws_route53_zone.main.zone_id
  name           = "api.example.com"
  type           = "A"
  set_identifier = "eu-west-1"

  latency_routing_policy {
    region = "eu-west-1"
  }

  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }
}
```

## Alias to API Gateway

```hcl
resource "aws_route53_record" "api_gateway" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name    = aws_api_gateway_domain_name.main.cloudfront_domain_name
    zone_id = aws_api_gateway_domain_name.main.cloudfront_zone_id
    evaluate_target_health = false
  }
}
```

## Conclusion

Route53 alias records in OpenTofu provide zero-cost, health-checked DNS routing to AWS resources. Use aliases at the zone apex (where CNAMEs are prohibited), enable evaluate_target_health to automatically remove unhealthy targets from DNS, and combine with latency or failover routing policies for global traffic distribution.
