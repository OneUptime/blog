# How to Configure AWS Global Accelerator with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS Global Accelerator, Networking, Performance, Load Balancing, CDN

Description: Learn how to configure AWS Global Accelerator with Terraform to improve application performance with static anycast IP addresses and intelligent traffic routing.

---

AWS Global Accelerator is a networking service that improves the availability and performance of your applications by directing traffic through the AWS global network. Instead of relying on the public internet for the entire journey, Global Accelerator provides two static anycast IP addresses that route traffic to the nearest AWS edge location, from where it travels over the AWS backbone to your endpoints. Terraform lets you configure the entire Global Accelerator setup, including listeners, endpoint groups, and health checks, as infrastructure as code.

## How Global Accelerator Works

When a user connects to your application through Global Accelerator, the DNS resolves to one of the two static anycast IP addresses. The user's request reaches the nearest AWS edge location via the shortest network path. From the edge location, traffic travels over the optimized AWS global network to the endpoint group closest to the user (or the healthiest one). This reduces latency and improves reliability compared to routing over the public internet.

Global Accelerator supports endpoints like Application Load Balancers, Network Load Balancers, EC2 instances, and Elastic IP addresses.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and application endpoints (ALBs, NLBs, EC2 instances, or EIPs) in one or more regions.

## Creating the Global Accelerator

Start with the accelerator resource:

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

# Create the Global Accelerator
resource "aws_globalaccelerator_accelerator" "main" {
  name            = "main-accelerator"
  ip_address_type = "IPV4"
  enabled         = true

  attributes {
    flow_logs_enabled   = true
    flow_logs_s3_bucket = aws_s3_bucket.accelerator_logs.bucket
    flow_logs_s3_prefix = "global-accelerator/"
  }

  tags = {
    Name = "main-accelerator"
  }
}

# S3 bucket for flow logs
resource "aws_s3_bucket" "accelerator_logs" {
  bucket = "my-global-accelerator-logs"
}
```

## Creating Listeners

Listeners define the ports and protocols that accept traffic:

```hcl
# HTTP listener
resource "aws_globalaccelerator_listener" "http" {
  accelerator_arn = aws_globalaccelerator_accelerator.main.id
  protocol        = "TCP"

  port_range {
    from_port = 80
    to_port   = 80
  }

  # Client affinity ensures the same client
  # reaches the same endpoint
  client_affinity = "NONE"
}

# HTTPS listener
resource "aws_globalaccelerator_listener" "https" {
  accelerator_arn = aws_globalaccelerator_accelerator.main.id
  protocol        = "TCP"

  port_range {
    from_port = 443
    to_port   = 443
  }

  client_affinity = "SOURCE_IP"
}

# Multi-port listener for custom applications
resource "aws_globalaccelerator_listener" "custom" {
  accelerator_arn = aws_globalaccelerator_accelerator.main.id
  protocol        = "TCP"

  port_range {
    from_port = 8080
    to_port   = 8090
  }

  client_affinity = "NONE"
}
```

Setting `client_affinity` to `SOURCE_IP` ensures that requests from the same client IP always reach the same endpoint, which is important for stateful applications.

## Creating Endpoint Groups

Endpoint groups define the regional endpoints that receive traffic:

```hcl
# US East endpoint group
resource "aws_globalaccelerator_endpoint_group" "us_east" {
  listener_arn = aws_globalaccelerator_listener.https.id

  # The AWS region for this endpoint group
  endpoint_group_region = "us-east-1"

  # Health check configuration
  health_check_path             = "/health"
  health_check_port             = 443
  health_check_protocol         = "HTTPS"
  health_check_interval_seconds = 30
  threshold_count               = 3

  # Traffic dial - percentage of traffic to send to this group
  traffic_dial_percentage = 100

  # Endpoint configuration
  endpoint_configuration {
    endpoint_id                    = aws_lb.us_east.arn
    weight                         = 128
    client_ip_preservation_enabled = true
  }

  tags = { Name = "us-east-endpoint-group" }
}

# EU West endpoint group
resource "aws_globalaccelerator_endpoint_group" "eu_west" {
  listener_arn          = aws_globalaccelerator_listener.https.id
  endpoint_group_region = "eu-west-1"

  health_check_path             = "/health"
  health_check_port             = 443
  health_check_protocol         = "HTTPS"
  health_check_interval_seconds = 30
  threshold_count               = 3

  traffic_dial_percentage = 100

  endpoint_configuration {
    endpoint_id                    = aws_lb.eu_west.arn
    weight                         = 128
    client_ip_preservation_enabled = true
  }

  tags = { Name = "eu-west-endpoint-group" }
}

# AP Southeast endpoint group
resource "aws_globalaccelerator_endpoint_group" "ap_southeast" {
  listener_arn          = aws_globalaccelerator_listener.https.id
  endpoint_group_region = "ap-southeast-1"

  health_check_path             = "/health"
  health_check_port             = 443
  health_check_protocol         = "HTTPS"
  health_check_interval_seconds = 30
  threshold_count               = 3

  traffic_dial_percentage = 100

  endpoint_configuration {
    endpoint_id                    = aws_lb.ap_southeast.arn
    weight                         = 128
    client_ip_preservation_enabled = true
  }

  tags = { Name = "ap-southeast-endpoint-group" }
}
```

## Multiple Endpoints Per Group

You can have multiple endpoints within a single endpoint group, with traffic distributed by weight:

```hcl
# Endpoint group with multiple endpoints
resource "aws_globalaccelerator_endpoint_group" "multi_endpoint" {
  listener_arn          = aws_globalaccelerator_listener.http.id
  endpoint_group_region = "us-east-1"

  health_check_path     = "/health"
  health_check_port     = 80
  health_check_protocol = "HTTP"

  # Primary ALB gets 70% of traffic
  endpoint_configuration {
    endpoint_id = aws_lb.primary.arn
    weight      = 179
  }

  # Secondary ALB gets 30% of traffic
  endpoint_configuration {
    endpoint_id = aws_lb.secondary.arn
    weight      = 77
  }

  tags = { Name = "multi-endpoint-group" }
}
```

## EC2 Instance Endpoints

You can also use EC2 instances directly as endpoints:

```hcl
# Endpoint group with EC2 instances
resource "aws_globalaccelerator_endpoint_group" "ec2_endpoints" {
  listener_arn          = aws_globalaccelerator_listener.custom.id
  endpoint_group_region = "us-east-1"

  health_check_port     = 8080
  health_check_protocol = "TCP"

  endpoint_configuration {
    endpoint_id                    = aws_instance.app_1.id
    weight                         = 128
    client_ip_preservation_enabled = false
  }

  endpoint_configuration {
    endpoint_id                    = aws_instance.app_2.id
    weight                         = 128
    client_ip_preservation_enabled = false
  }
}
```

## Traffic Dial for Blue-Green Deployments

The traffic dial is useful for gradual rollouts:

```hcl
variable "us_east_traffic_percentage" {
  description = "Percentage of traffic to send to US East"
  type        = number
  default     = 100
}

variable "eu_west_traffic_percentage" {
  description = "Percentage of traffic to send to EU West"
  type        = number
  default     = 100
}

# Adjustable traffic dial
resource "aws_globalaccelerator_endpoint_group" "adjustable" {
  listener_arn          = aws_globalaccelerator_listener.https.id
  endpoint_group_region = "us-east-1"

  # Adjust this to shift traffic during deployments
  traffic_dial_percentage = var.us_east_traffic_percentage

  health_check_path     = "/health"
  health_check_protocol = "HTTPS"
  health_check_port     = 443

  endpoint_configuration {
    endpoint_id = aws_lb.us_east.arn
    weight      = 128
  }
}
```

By setting the traffic dial to 0, you can completely remove a region from receiving traffic during maintenance.

## Custom Routing Accelerator

For use cases that need deterministic routing to specific EC2 instances:

```hcl
# Custom routing accelerator
resource "aws_globalaccelerator_custom_routing_accelerator" "custom" {
  name            = "custom-routing-accelerator"
  ip_address_type = "IPV4"
  enabled         = true

  tags = { Name = "custom-routing-accelerator" }
}

# Custom routing listener
resource "aws_globalaccelerator_custom_routing_listener" "custom" {
  accelerator_arn = aws_globalaccelerator_custom_routing_accelerator.custom.id

  port_range {
    from_port = 10000
    to_port   = 20000
  }
}

# Custom routing endpoint group
resource "aws_globalaccelerator_custom_routing_endpoint_group" "custom" {
  listener_arn          = aws_globalaccelerator_custom_routing_listener.custom.id
  endpoint_group_region = "us-east-1"

  destination_configuration {
    from_port = 80
    to_port   = 8080
    protocols = ["TCP"]
  }

  endpoint_configuration {
    endpoint_id = aws_subnet.app.id
  }
}
```

## Outputs

```hcl
output "accelerator_dns_name" {
  description = "DNS name of the Global Accelerator"
  value       = aws_globalaccelerator_accelerator.main.dns_name
}

output "accelerator_static_ips" {
  description = "Static IP addresses of the Global Accelerator"
  value       = aws_globalaccelerator_accelerator.main.ip_sets
}

output "accelerator_hosted_zone_id" {
  description = "Route 53 hosted zone ID for alias records"
  value       = aws_globalaccelerator_accelerator.main.hosted_zone_id
}
```

## Monitoring Global Accelerator

Monitor your Global Accelerator performance and health with [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-aws-global-accelerator-with-terraform/view) to track latency improvements, endpoint health, and traffic distribution across regions.

## Best Practices

Enable client IP preservation when using ALB endpoints so your application sees the real client IP. Use health checks on all endpoint groups to ensure traffic only reaches healthy endpoints. Leverage the traffic dial for safe deployments. Enable flow logs for troubleshooting and security analysis. Use Route 53 alias records pointing to the Global Accelerator DNS name for custom domains.

## Conclusion

AWS Global Accelerator with Terraform provides a powerful way to improve application performance and availability globally. The static anycast IP addresses simplify DNS management, while the intelligent routing through the AWS backbone network reduces latency. Managing the configuration as Terraform code ensures your Global Accelerator setup is reproducible, version-controlled, and easy to modify across environments.
