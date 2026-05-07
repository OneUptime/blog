# How to Configure Azure Traffic Manager with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Traffic Manager, DNS Load Balancing, High Availability, Global Routing, Infrastructure as Code

Description: Learn how to configure Azure Traffic Manager with OpenTofu to route global DNS traffic across multiple endpoints using performance, weighted, priority, and geographic routing methods.

## Introduction

Azure Traffic Manager is a DNS-based load balancer that routes client requests to the best available endpoint across global Azure regions and on-premises locations. It supports six routing methods: Performance (lowest latency), Weighted (proportional), Priority (failover), Geographic (compliance), Multivalue (returns multiple IPs), and Subnet (routes based on client IP subnet). Traffic Manager works at the DNS layer and is not a proxy-after DNS resolution, clients connect directly to endpoints.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- Application endpoints in multiple locations (Azure or on-premises)

## Step 1: Performance Routing

```hcl
resource "azurerm_traffic_manager_profile" "main" {
  name                   = "${var.project_name}-tm"
  resource_group_name    = var.resource_group_name
  traffic_routing_method = "Performance"  # Routes to lowest-latency endpoint

  dns_config {
    relative_name = var.project_name  # Becomes <name>.trafficmanager.net
    ttl           = 60                # Low TTL for faster failover
  }

  monitor_config {
    protocol                     = "HTTPS"
    port                         = 443
    path                         = "/health"
    interval_in_seconds          = 30
    timeout_in_seconds           = 10
    tolerated_number_of_failures = 3
  }

  tags = {
    Name = "${var.project_name}-traffic-manager"
  }
}

# East US endpoint

resource "azurerm_traffic_manager_azure_endpoint" "east_us" {
  name               = "east-us-endpoint"
  profile_id         = azurerm_traffic_manager_profile.main.id
  target_resource_id = var.east_us_app_service_id  # Azure App Service, Public IP, etc.
  weight             = 1
  enabled            = true
}

# West Europe endpoint
resource "azurerm_traffic_manager_azure_endpoint" "west_europe" {
  name               = "west-europe-endpoint"
  profile_id         = azurerm_traffic_manager_profile.main.id
  target_resource_id = var.west_europe_app_service_id
  weight             = 1
  enabled            = true
}
```

## Step 2: Priority Routing (Active-Passive Failover)

```hcl
resource "azurerm_traffic_manager_profile" "failover" {
  name                   = "${var.project_name}-failover-tm"
  resource_group_name    = var.resource_group_name
  traffic_routing_method = "Priority"

  dns_config {
    relative_name = "${var.project_name}-failover"
    ttl           = 30
  }

  monitor_config {
    protocol                     = "HTTPS"
    port                         = 443
    path                         = "/health"
    interval_in_seconds          = 30
    timeout_in_seconds           = 10
    tolerated_number_of_failures = 3
  }
}

resource "azurerm_traffic_manager_azure_endpoint" "primary" {
  name               = "primary-endpoint"
  profile_id         = azurerm_traffic_manager_profile.failover.id
  target_resource_id = var.primary_app_service_id
  priority           = 1  # Lower number = higher priority
}

resource "azurerm_traffic_manager_azure_endpoint" "secondary" {
  name               = "secondary-endpoint"
  profile_id         = azurerm_traffic_manager_profile.failover.id
  target_resource_id = var.secondary_app_service_id
  priority           = 2  # Used only when priority 1 is unhealthy
}
```

## Step 3: Weighted Routing with External Endpoints

```hcl
resource "azurerm_traffic_manager_profile" "weighted" {
  name                   = "${var.project_name}-weighted-tm"
  resource_group_name    = var.resource_group_name
  traffic_routing_method = "Weighted"

  dns_config {
    relative_name = "${var.project_name}-weighted"
    ttl           = 60
  }

  monitor_config {
    protocol                     = "HTTPS"
    port                         = 443
    path                         = "/health"
    interval_in_seconds          = 30
    timeout_in_seconds           = 10
    tolerated_number_of_failures = 3
  }
}

# Azure endpoint (weight 75)
resource "azurerm_traffic_manager_azure_endpoint" "azure_main" {
  name               = "azure-endpoint"
  profile_id         = azurerm_traffic_manager_profile.weighted.id
  target_resource_id = var.azure_app_service_id
  weight             = 75
}

# External/on-premises endpoint (weight 25)
resource "azurerm_traffic_manager_external_endpoint" "onprem" {
  name       = "onprem-endpoint"
  profile_id = azurerm_traffic_manager_profile.weighted.id
  target     = "app.onpremises.example.com"  # External FQDN
  weight     = 25
}
```

## Step 4: Geographic Routing for Compliance

```hcl
resource "azurerm_traffic_manager_profile" "geo" {
  name                   = "${var.project_name}-geo-tm"
  resource_group_name    = var.resource_group_name
  traffic_routing_method = "Geographic"

  dns_config {
    relative_name = "${var.project_name}-geo"
    ttl           = 300
  }

  monitor_config {
    protocol                     = "HTTPS"
    port                         = 443
    path                         = "/health"
    interval_in_seconds          = 30
    timeout_in_seconds           = 10
    tolerated_number_of_failures = 3
  }
}

resource "azurerm_traffic_manager_azure_endpoint" "eu_region" {
  name               = "eu-endpoint"
  profile_id         = azurerm_traffic_manager_profile.geo.id
  target_resource_id = var.eu_app_service_id
  geo_mappings       = ["GEO-EU"]  # All European traffic
}

resource "azurerm_traffic_manager_azure_endpoint" "us_region" {
  name               = "us-endpoint"
  profile_id         = azurerm_traffic_manager_profile.geo.id
  target_resource_id = var.us_app_service_id
  geo_mappings       = ["GEO-NA"]  # North America traffic
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check endpoint health
az network traffic-manager endpoint show \
  --resource-group <rg> \
  --profile-name <profile-name> \
  --name <endpoint-name> \
  --type azureEndpoints \
  --query "properties.endpointMonitorStatus"

# Test DNS resolution
nslookup <relative-name>.trafficmanager.net
dig <relative-name>.trafficmanager.net
```

## Conclusion

Traffic Manager's low TTL (30-60 seconds) is critical for fast failover-clients must re-query DNS frequently for Traffic Manager to redirect them to healthy endpoints. Traffic Manager doesn't terminate connections; it only influences DNS responses. Use `monitor_config` with `interval_in_seconds = 10` and `timeout_in_seconds` between `5` and `9` for critical applications that need faster failure detection (at higher cost). For GDPR and data residency, Geographic routing is the right choice-set `geo_mappings = ["WORLD"]` on a catch-all endpoint to handle traffic not matched by more specific geographic rules, and use nested endpoints if you need failover within a geographic mapping.
