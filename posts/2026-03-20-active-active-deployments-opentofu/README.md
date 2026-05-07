# How to Set Up Active-Active Deployments with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: High Availability, Active-Active, OpenTofu, Route53, Global Accelerator, DynamoDB

Description: Learn how to configure active-active deployments using OpenTofu where multiple regions simultaneously serve traffic with automatic load balancing and failover.

## Overview

Active-active deployments run identical workloads in multiple regions simultaneously, routing users to the lowest-latency region for low latency and providing instant failover. OpenTofu configures the AWS services that provide latency-based routing, data replication, and conflict handling.

## Step 1: Latency-Based DNS Routing

```hcl
# main.tf - Route53 latency routing across regions

locals {
  regions = {
    "us-east-1" = {
      alb_dns  = module.app_us_east.alb_dns_name
      alb_zone = module.app_us_east.alb_zone_id
      alb_arn  = module.app_us_east.alb_arn
    }
    "eu-west-1" = {
      alb_dns  = module.app_eu_west.alb_dns_name
      alb_zone = module.app_eu_west.alb_zone_id
      alb_arn  = module.app_eu_west.alb_arn
    }
    "ap-southeast-1" = {
      alb_dns  = module.app_ap_se.alb_dns_name
      alb_zone = module.app_ap_se.alb_zone_id
      alb_arn  = module.app_ap_se.alb_arn
    }
  }
}

# Create latency records for each region and use ALB target health
resource "aws_route53_record" "latency" {
  for_each = local.regions

  zone_id        = aws_route53_zone.app.zone_id
  name           = "app.example.com"
  type           = "A"
  set_identifier = each.key

  alias {
    name                   = each.value.alb_dns
    zone_id                = each.value.alb_zone
    evaluate_target_health = true
  }

  latency_routing_policy {
    region = each.key
  }
}
```

## Step 2: DynamoDB Global Tables (Write Anywhere)

```hcl
# DynamoDB Global Tables for active-active data replication
resource "aws_dynamodb_table" "active_active" {
  name             = "app-data-global"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "pk"
  range_key        = "sk"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # Replicas in all regions
  replica {
    region_name = "eu-west-1"
  }

  replica {
    region_name = "ap-southeast-1"
  }

  # Default MREC global tables use last-writer-wins conflict resolution
  # If you need application-specific reconciliation, handle it outside the table, for example with DynamoDB Streams consumers
}
```

## Step 3: Global Accelerator for Consistent Entry Points

```hcl
resource "aws_globalaccelerator_accelerator" "app" {
  name            = "app-global-accelerator"
  ip_address_type = "IPV4"
  enabled         = true
}

resource "aws_globalaccelerator_listener" "https" {
  accelerator_arn = aws_globalaccelerator_accelerator.app.arn
  protocol        = "TCP"

  port_range {
    from_port = 443
    to_port   = 443
  }
}

# Create one endpoint group per region and keep each region active
resource "aws_globalaccelerator_endpoint_group" "region" {
  for_each = local.regions

  listener_arn            = aws_globalaccelerator_listener.https.arn
  endpoint_group_region   = each.key
  traffic_dial_percentage = 100

  endpoint_configuration {
    endpoint_id                    = each.value.alb_arn
    weight                         = 100
    client_ip_preservation_enabled = true
  }

  health_check_path             = "/health"
  health_check_protocol         = "HTTPS"
  threshold_count               = 3
  health_check_interval_seconds = 30
}
```

## Step 4: Cross-Region Read Replica Cache

```hcl
# ElastiCache Global Datastore for cross-region read replicas
resource "aws_elasticache_global_replication_group" "app" {
  global_replication_group_id_suffix = "app-cache"
  primary_replication_group_id       = aws_elasticache_replication_group.primary.id
}

# A secondary region joins the global datastore as a read-only replica
resource "aws_elasticache_replication_group" "global_member_eu" {
  provider                    = aws.eu_west
  replication_group_id        = "app-cache-eu"
  description                 = "EU secondary cache"
  global_replication_group_id = aws_elasticache_global_replication_group.app.global_replication_group_id
  num_cache_clusters          = 1
}
```

## Summary

Active-active deployments configured with OpenTofu route users to the region with the best latency using Route53 latency routing and ALB target health, providing automatic failover when a region fails. In the default multi-Region eventual consistency mode, DynamoDB Global Tables replicate writes across all regions using last-writer-wins conflict resolution, enabling any region to accept writes. Global Accelerator provides two static anycast IPs for DNS simplicity and uses AWS's backbone network to route from the user's entry point to an optimal healthy endpoint.
