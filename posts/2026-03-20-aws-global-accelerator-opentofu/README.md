# How to Create AWS Global Accelerator with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Global Accelerator, Performance, Multi-Region, Infrastructure as Code

Description: Learn how to create an AWS Global Accelerator with OpenTofu to improve global application performance by routing traffic through the AWS global network backbone.

## Introduction

AWS Global Accelerator provides two static Anycast IP addresses that route user traffic onto the AWS global network at the edge location closest to the user and then to the optimal healthy regional endpoint, improving application performance by up to 60% compared to public internet routing. It's ideal for globally distributed applications, gaming, VoIP, and services requiring static IPs with automatic failover between regions.

## Prerequisites

- OpenTofu v1.6+
- ALBs or NLBs in multiple regions as endpoints
- AWS credentials with Global Accelerator permissions

## Step 1: Create Global Accelerator

```hcl
resource "aws_globalaccelerator_accelerator" "main" {
  name            = "${var.project_name}-accelerator"
  ip_address_type = "IPV4"  # or "DUAL_STACK" if your endpoints and DNS records also support IPv6
  enabled         = true

  attributes {
    flow_logs_enabled   = true
    flow_logs_s3_bucket = var.flow_logs_bucket
    flow_logs_s3_prefix = "global-accelerator/"
  }

  tags = {
    Name = "${var.project_name}-accelerator"
  }
}

output "static_ips" {
  value       = aws_globalaccelerator_accelerator.main.ip_sets[0].ip_addresses
  description = "Static Anycast IPv4 addresses for A records"
}
```

## Step 2: Create Listener

```hcl
resource "aws_globalaccelerator_listener" "https" {
  accelerator_arn = aws_globalaccelerator_accelerator.main.arn
  protocol        = "TCP"

  port_range {
    from_port = 443
    to_port   = 443
  }

  port_range {
    from_port = 80
    to_port   = 80
  }

  client_affinity = "SOURCE_IP"  # Route same client IP to same endpoint
}
```

## Step 3: Create Endpoint Groups with Regional ALBs

```hcl
# Primary region endpoint group (us-east-1)

resource "aws_globalaccelerator_endpoint_group" "us_east_1" {
  listener_arn            = aws_globalaccelerator_listener.https.arn
  endpoint_group_region   = "us-east-1"
  traffic_dial_percentage = 100  # 100% in normal operation

  # For ALB endpoints, configure health checks on the load balancer target groups.

  endpoint_configuration {
    endpoint_id                    = var.us_east_1_alb_arn
    weight                         = 100  # Relative weight within this region
    client_ip_preservation_enabled = true  # Preserve client IP in X-Forwarded-For
  }
}

# Secondary region endpoint group (eu-west-1) for geographic proximity
resource "aws_globalaccelerator_endpoint_group" "eu_west_1" {
  listener_arn            = aws_globalaccelerator_listener.https.arn
  endpoint_group_region   = "eu-west-1"
  traffic_dial_percentage = 100

  endpoint_configuration {
    endpoint_id                    = var.eu_west_1_alb_arn
    weight                         = 100
    client_ip_preservation_enabled = true
  }
}
```

## Step 4: Route 53 DNS Record

```hcl
resource "aws_route53_record" "accelerator" {
  zone_id = var.route53_zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  # Point to Global Accelerator static IPs directly
  # Add a matching AAAA record if you use DUAL_STACK
  records = aws_globalaccelerator_accelerator.main.ip_sets[0].ip_addresses
  ttl     = 60
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test the endpoint through Global Accelerator
curl -I https://api.example.com
```

## Conclusion

Global Accelerator delivers the most benefit for users geographically distant from your primary AWS region-the AWS private backbone significantly outperforms public internet routing across continents. Configure `traffic_dial_percentage = 0` on secondary regions during normal operation if you want them idle for normal traffic while still available for failover, or use percentage-based routing for active-active multi-region deployments. The static IPs simplify firewall allowlisting compared to ALB DNS names that can change over time.
