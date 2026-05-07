# How to Configure AKS Monitoring with Container Insights Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, AKS, Container Insights, Monitoring, Log Analytics, Infrastructure as Code

Description: Learn how to configure AKS Container Insights with OpenTofu to collect metrics, logs, and health data from Kubernetes clusters for comprehensive observability.

## Introduction

AKS Container Insights provides deep visibility into AKS cluster performance and workload health through Log Analytics integration. It collects node and pod CPU/memory metrics, container logs, Kubernetes events, and live performance data. Container Insights uses the Azure Monitor Agent (AMA) deployed as a DaemonSet on all nodes. Prometheus metrics scraping integration enables collection of custom application metrics alongside infrastructure metrics.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- An Azure resource group and subnet for AKS

## Step 1: Create Log Analytics Workspace

```hcl
resource "azurerm_log_analytics_workspace" "aks" {
  name                = "${var.project_name}-aks-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30  # 30-730 days

  tags = {
    Name    = "${var.project_name}-aks-logs"
    Purpose = "aks-monitoring"
  }
}

resource "azurerm_log_analytics_solution" "container_insights" {
  solution_name         = "ContainerInsights"
  location              = var.location
  resource_group_name   = var.resource_group_name
  workspace_resource_id = azurerm_log_analytics_workspace.aks.id
  workspace_name        = azurerm_log_analytics_workspace.aks.name

  plan {
    publisher = "Microsoft"
    product   = "OMSGallery/ContainerInsights"
  }
}
```

## Step 2: Enable Container Insights on AKS

```hcl
resource "azurerm_kubernetes_cluster" "monitored" {
  name                = "${var.project_name}-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.project_name

  default_node_pool {
    name                 = "system"
    vm_size              = "Standard_D4s_v3"
    node_count           = 3
    min_count            = 3
    max_count            = 10
    auto_scaling_enabled = true
    vnet_subnet_id       = var.subnet_id
  }

  identity {
    type = "SystemAssigned"
  }

  # Enable Container Insights using the Azure Monitor add-on
  oms_agent {
    log_analytics_workspace_id      = azurerm_log_analytics_workspace.aks.id
    msi_auth_for_monitoring_enabled = true  # Use managed identity for auth
  }

  # Enable the managed Prometheus metrics profile on the cluster
  monitor_metrics {
    annotations_allowed = null
    labels_allowed      = null
  }

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
  }

  tags = {
    Name = "${var.project_name}-aks-monitored"
  }
}

# DCR required for Container Insights when managed identity auth is enabled
resource "azurerm_monitor_data_collection_rule" "aks_logs" {
  name                = "${var.project_name}-aks-logs-dcr"
  resource_group_name = var.resource_group_name
  location            = var.location

  destinations {
    log_analytics {
      workspace_resource_id = azurerm_log_analytics_workspace.aks.id
      name                  = "ciworkspace"
    }
  }

  data_flow {
    streams      = ["Microsoft-ContainerInsights-Group-Default"]
    destinations = ["ciworkspace"]
  }

  data_sources {
    extension {
      name           = "ContainerInsightsExtension"
      extension_name = "ContainerInsights"
      streams        = ["Microsoft-ContainerInsights-Group-Default"]
      extension_json = jsonencode({
        dataCollectionSettings = {
          interval               = "1m"
          namespaceFilteringMode = "Off"
          namespaces             = []
          enableContainerLogV2   = true
        }
      })
    }
  }
}

resource "azurerm_monitor_data_collection_rule_association" "aks_logs" {
  name                    = "ContainerInsightsExtension"
  target_resource_id      = azurerm_kubernetes_cluster.monitored.id
  data_collection_rule_id = azurerm_monitor_data_collection_rule.aks_logs.id
}
```

## Step 3: Azure Monitor Managed Prometheus

```hcl
# Azure Monitor workspace for Prometheus metrics

resource "azurerm_monitor_workspace" "prometheus" {
  name                = "${var.project_name}-prometheus-workspace"
  resource_group_name = var.resource_group_name
  location            = var.location
}

# Data collection endpoint for managed Prometheus
resource "azurerm_monitor_data_collection_endpoint" "aks_prometheus" {
  name                = "${var.project_name}-aks-prometheus-dce"
  resource_group_name = var.resource_group_name
  location            = var.location
  kind                = "Linux"
}

# Enable managed Prometheus scraping
resource "azurerm_monitor_data_collection_rule" "aks_prometheus" {
  name                        = "${var.project_name}-aks-prometheus-dcr"
  resource_group_name         = var.resource_group_name
  location                    = var.location
  data_collection_endpoint_id = azurerm_monitor_data_collection_endpoint.aks_prometheus.id
  kind                        = "Linux"

  destinations {
    monitor_account {
      monitor_account_id = azurerm_monitor_workspace.prometheus.id
      name               = "prometheus-destination"
    }
  }

  data_flow {
    streams      = ["Microsoft-PrometheusMetrics"]
    destinations = ["prometheus-destination"]
  }

  data_sources {
    prometheus_forwarder {
      streams = ["Microsoft-PrometheusMetrics"]
      name    = "prometheus-stream"
    }
  }
}

resource "azurerm_monitor_data_collection_rule_association" "aks_prometheus" {
  name                    = "aks-prometheus-association"
  target_resource_id      = azurerm_kubernetes_cluster.monitored.id
  data_collection_rule_id = azurerm_monitor_data_collection_rule.aks_prometheus.id
}
```

## Step 4: Alerts for AKS

```hcl
# Alert on high node CPU
resource "azurerm_monitor_metric_alert" "node_cpu" {
  name                = "${var.project_name}-node-cpu-high"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_kubernetes_cluster.monitored.id]
  description         = "Alert when node CPU exceeds 80%"
  severity            = 2

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_cpu_usage_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80

    dimension {
      name     = "node"
      operator = "Include"
      values   = ["*"]
    }
  }

  action {
    action_group_id = var.action_group_id
  }
}

# Alert on pod OOM kills using managed Prometheus
resource "azurerm_monitor_alert_prometheus_rule_group" "pod_oom" {
  name                = "${var.project_name}-pod-oom-kills"
  location            = var.location
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_monitor_workspace.prometheus.id]
  cluster_name        = azurerm_kubernetes_cluster.monitored.name
  description         = "Alert when pods are OOM killed"
  rule_group_enabled  = true
  interval            = "PT1M"

  rule {
    alert   = "KubeContainerOOMKilledCount"
    enabled = true
    expression = <<EOF
sum by (container, namespace, cluster) (
  kube_pod_container_status_terminated_reason{reason="OOMKilled", cluster="${azurerm_kubernetes_cluster.monitored.name}"}
) > 0
EOF
    for      = "PT5M"
    severity = 1

    action {
      action_group_id = var.action_group_id
    }
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Data can take about 10-15 minutes to appear after the cluster becomes ready

# Query container logs in Log Analytics
az monitor log-analytics query \
  --workspace <workspace-guid> \
  --analytics-query "ContainerLogV2 | where TimeGenerated > ago(1h) | take 10"

# Check node performance
az monitor log-analytics query \
  --workspace <workspace-guid> \
  --analytics-query "Perf | where ObjectName == 'K8SNode' | summarize avg(CounterValue) by Computer"

# Live container logs in kubectl
kubectl logs -n production deployment/api-server -f
```

## Conclusion

Enable `msi_auth_for_monitoring_enabled = true` to use managed identity for the monitoring add-on rather than workspace keys, simplifying secret management. Container Insights generates significant log volume in large clusters, so use namespace filtering, ConfigMap annotations, or DCR transformations to reduce noisy log collection. Enable Azure Managed Prometheus alongside Container Insights: Container Insights excels at cluster health and Kubernetes events, while Prometheus captures application-level custom metrics. Use the prebuilt Container Insights workbooks in the Azure portal for cluster overview dashboards without writing custom queries.
