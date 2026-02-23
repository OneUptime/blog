# How to Configure DNS Failover with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DNS, Failover, AWS, Route 53, High Availability, Networking

Description: Learn how to configure DNS failover routing policies with Terraform and AWS Route 53 for automatic traffic redirection during outages.

---

DNS failover is a critical high-availability pattern that automatically routes traffic from an unhealthy endpoint to a healthy backup. When your primary server goes down, DNS failover detects the issue through health checks and seamlessly redirects users to a secondary resource. Terraform makes it straightforward to codify this entire setup as infrastructure as code, ensuring repeatability and version control.

In this guide, we will walk through setting up a complete DNS failover configuration using Terraform and AWS Route 53.

## Understanding DNS Failover

DNS failover works by associating health checks with DNS records. Route 53 continuously monitors the health of your primary endpoint. When a health check fails, Route 53 stops returning the primary IP address and instead returns the secondary (failover) record. This happens transparently to end users, who simply experience a brief DNS propagation delay before being directed to the backup resource.

There are two main types of failover records in Route 53: the primary record that points to your main resource, and the secondary record that points to your backup resource.

## Prerequisites

Before getting started, make sure you have Terraform installed (version 1.0 or later), an AWS account with appropriate permissions, and a registered domain with a Route 53 hosted zone.

## Setting Up the Provider

First, configure the AWS provider in your Terraform configuration:

```hcl
# Configure the AWS provider
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

## Creating Health Checks

Health checks are the foundation of DNS failover. They monitor your endpoints and report their status to Route 53.

```hcl
# Health check for the primary endpoint
resource "aws_route53_health_check" "primary" {
  fqdn              = "primary.example.com"
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 30

  tags = {
    Name = "primary-health-check"
  }
}

# Health check for the secondary endpoint
resource "aws_route53_health_check" "secondary" {
  fqdn              = "secondary.example.com"
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 30

  tags = {
    Name = "secondary-health-check"
  }
}
```

The `failure_threshold` parameter sets how many consecutive failed checks are needed before Route 53 considers the endpoint unhealthy. The `request_interval` determines how often Route 53 sends health check requests.

## Creating Failover DNS Records

Now, create the failover routing policy records:

```hcl
# Reference the existing hosted zone
data "aws_route53_zone" "main" {
  name = "example.com"
}

# Primary failover record
resource "aws_route53_record" "primary" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 60

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier  = "primary"
  records         = ["10.0.1.100"]
  health_check_id = aws_route53_health_check.primary.id
}

# Secondary failover record
resource "aws_route53_record" "secondary" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 60

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier  = "secondary"
  records         = ["10.0.2.100"]
  health_check_id = aws_route53_health_check.secondary.id
}
```

Notice that both records share the same `name` but have different `set_identifier` values and failover types. The TTL is set to 60 seconds to ensure quick failover propagation.

## Using Alias Records with Failover

In many cases, you will want to use alias records instead of simple A records. Alias records are free in Route 53 and support pointing to AWS resources like load balancers:

```hcl
# Primary failover using an alias to an ALB
resource "aws_route53_record" "primary_alias" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier = "primary-alias"
  health_check_id = aws_route53_health_check.primary.id

  alias {
    name                   = aws_lb.primary.dns_name
    zone_id                = aws_lb.primary.zone_id
    evaluate_target_health = true
  }
}

# Secondary failover using an alias to a static S3 website
resource "aws_route53_record" "secondary_alias" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier = "secondary-alias"

  alias {
    name                   = aws_s3_bucket_website_configuration.failover.website_domain
    zone_id                = aws_s3_bucket.failover.hosted_zone_id
    evaluate_target_health = false
  }
}
```

Setting `evaluate_target_health` to `true` on the primary alias means Route 53 will consider the target resource's health in addition to the health check.

## Creating a Calculated Health Check

For more complex scenarios, you can combine multiple health checks into a single calculated health check:

```hcl
# Calculated health check that monitors multiple endpoints
resource "aws_route53_health_check" "calculated" {
  type = "CALCULATED"

  # At least 2 of the child health checks must be healthy
  child_health_threshold = 2

  child_healthchecks = [
    aws_route53_health_check.web_server_1.id,
    aws_route53_health_check.web_server_2.id,
    aws_route53_health_check.web_server_3.id,
  ]

  tags = {
    Name = "calculated-health-check"
  }
}
```

This calculated health check considers the primary healthy only if at least 2 out of 3 child health checks pass.

## Adding CloudWatch Alarm Integration

You can also create health checks based on CloudWatch alarms for more sophisticated monitoring:

```hcl
# CloudWatch alarm for high error rates
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "Triggers when 5XX errors exceed threshold"
}

# Health check based on the CloudWatch alarm
resource "aws_route53_health_check" "cloudwatch_based" {
  type                            = "CLOUDWATCH_METRIC"
  cloudwatch_alarm_name           = aws_cloudwatch_metric_alarm.high_error_rate.alarm_name
  cloudwatch_alarm_region         = "us-east-1"
  insufficient_data_health_status = "Unhealthy"

  tags = {
    Name = "cloudwatch-health-check"
  }
}
```

## Complete Example with Variables

Here is a more modular approach using Terraform variables:

```hcl
variable "domain_name" {
  description = "The domain name for DNS failover"
  type        = string
  default     = "example.com"
}

variable "subdomain" {
  description = "Subdomain for the application"
  type        = string
  default     = "app"
}

variable "primary_ip" {
  description = "IP address of the primary server"
  type        = string
}

variable "secondary_ip" {
  description = "IP address of the secondary server"
  type        = string
}

# Outputs for verification
output "primary_health_check_id" {
  value = aws_route53_health_check.primary.id
}

output "dns_name" {
  value = "${var.subdomain}.${var.domain_name}"
}
```

## Testing Your Failover Configuration

After applying your Terraform configuration with `terraform apply`, you should test the failover behavior. You can do this by simulating a failure on your primary endpoint. Stop the application or block the health check port, then observe Route 53 health check status in the AWS console. Use `dig` or `nslookup` to verify that DNS responses switch to the secondary IP.

```bash
# Check which IP is being returned
dig +short app.example.com

# Watch for DNS changes in real time
watch -n 5 "dig +short app.example.com"
```

## Monitoring with OneUptime

While DNS failover provides automatic recovery, you still need visibility into when failovers occur. Integrating with a monitoring solution like [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-dns-failover-with-terraform/view) helps you track failover events, measure recovery times, and ensure your backup resources are performing well during failover scenarios.

## Best Practices

Keep your TTL values low (30-60 seconds) for failover records to minimize the time users are directed to an unhealthy endpoint. Always test your failover configuration before relying on it in production. Use calculated health checks to avoid false positives from transient failures. Consider using alias records when pointing to AWS resources to avoid charges and gain native health checking support.

## Conclusion

DNS failover with Terraform gives you a reproducible, version-controlled approach to high availability. By combining Route 53 health checks with failover routing policies, you can automatically redirect traffic away from failing endpoints. The infrastructure as code approach ensures that your failover configuration is documented, testable, and consistent across environments. Whether you use simple IP-based failover or complex calculated health checks with CloudWatch integration, Terraform makes the entire setup manageable and repeatable.
