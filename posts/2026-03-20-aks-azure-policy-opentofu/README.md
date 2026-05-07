# How to Set Up AKS with Azure Policy Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, AKS, Azure Policy, OPA Gatekeeper, Governance, Infrastructure as Code

Description: Learn how to configure Azure Policy for AKS with OpenTofu to enforce Kubernetes security standards, resource limits, and compliance requirements using OPA Gatekeeper.

## Introduction

Azure Policy for AKS uses OPA Gatekeeper as an admission controller to enforce policies on Kubernetes resources at creation and update time. Policies can deny non-compliant resources (Deny effect), audit them (Audit effect), or mutate supported resources. Built-in policy initiatives include Kubernetes cluster pod security baseline standards and restricted standards, covering common security requirements like privileged container restrictions, host path mounts, and required resource limits.

## Prerequisites

- OpenTofu v1.6+
- Azure CLI v2.12+ and `kubectl`
- Azure credentials with AKS and Policy permissions
- The `Microsoft.PolicyInsights` resource provider registered in your subscription
- An AKS cluster running a currently supported Kubernetes version, or create one with the Policy add-on

## Step 1: Enable Azure Policy Add-on on AKS

```hcl
resource "azurerm_kubernetes_cluster" "policy_enabled" {
  name                = "${var.project_name}-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.project_name

  default_node_pool {
    name                = "system"
    vm_size             = "Standard_D4s_v3"
    node_count          = 3
    min_count           = 3
    max_count           = 10
    enable_auto_scaling = true
    vnet_subnet_id      = var.subnet_id
  }

  identity {
    type = "SystemAssigned"
  }

  # Enable Azure Policy add-on
  azure_policy_enabled = true

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
  }

  tags = {
    Name = "${var.project_name}-aks-policy"
  }
}
```

## Step 2: Assign Built-in Kubernetes Policy Initiative

```hcl
# Assign the Kubernetes cluster pod security baseline standards initiative

resource "azurerm_resource_policy_assignment" "k8s_baseline" {
  name                 = "k8s-pod-security-baseline"
  resource_id          = azurerm_kubernetes_cluster.policy_enabled.id
  policy_definition_id = "/providers/Microsoft.Authorization/policySetDefinitions/a8640138-9b0a-4a28-b8cb-1666c838647d"

  description = "Enforce Kubernetes pod security baseline standards"

  parameters = jsonencode({
    effect = {
      value = "deny"  # deny, audit, or disabled
    }
    excludedNamespaces = {
      value = ["kube-system", "gatekeeper-system", "azure-arc", "azure-extensions-usage-system"]
    }
  })
}

# Require resource limits on containers
resource "azurerm_resource_policy_assignment" "require_limits" {
  name                 = "k8s-require-resource-limits"
  resource_id          = azurerm_kubernetes_cluster.policy_enabled.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/e345eecc-fa47-480f-9e88-67dcc122b164"

  parameters = jsonencode({
    effect = {
      value = "deny"
    }
    excludedNamespaces = {
      value = ["kube-system", "gatekeeper-system", "azure-arc", "azure-extensions-usage-system"]
    }
    cpuLimit = {
      value = "2000m"
    }
    memoryLimit = {
      value = "2Gi"
    }
  })
}
```

## Step 3: Custom Policy - Require Specific Labels

```hcl
# Custom policy definition to require specific labels
resource "azurerm_policy_definition" "require_labels" {
  name         = "${var.project_name}-require-k8s-labels"
  policy_type  = "Custom"
  mode         = "Microsoft.Kubernetes.Data"  # Mode for AKS policies
  display_name = "Require labels on pods"

  parameters = jsonencode({
    effect = {
      type = "String"
      metadata = {
        displayName = "Effect"
      }
      allowedValues = ["audit", "Audit", "deny", "Deny", "disabled", "Disabled"]
      defaultValue  = "deny"
    }
  })

  policy_rule = jsonencode({
    if = {
      field = "type"
      in = [
        "Microsoft.Kubernetes/connectedClusters",
        "Microsoft.ContainerService/managedClusters"
      ]
    }
    then = {
      effect = "[parameters('effect')]"
      details = {
        templateInfo = {
          sourceType = "PublicURL"
          url        = "https://raw.githubusercontent.com/open-policy-agent/gatekeeper-library/master/library/general/requiredlabels/template.yaml"
        }
        apiGroups = [""]
        kinds     = ["Pod"]
        excludedNamespaces = ["kube-system", "gatekeeper-system", "azure-arc", "azure-extensions-usage-system"]
        labelSelector      = {}
        values = {
          labels = [
            { key = "environment" },
            { key = "app" },
            { key = "version" }
          ]
          message = "Pods must define environment, app, and version labels."
        }
      }
    }
  })
}

resource "azurerm_resource_policy_assignment" "require_labels" {
  name                 = "require-k8s-labels"
  resource_id          = azurerm_kubernetes_cluster.policy_enabled.id
  policy_definition_id = azurerm_policy_definition.require_labels.id

  parameters = jsonencode({
    effect = { value = "deny" }
  })
}
```

## Step 4: Policy Compliance Reporting

Azure Policy compliance data for AKS comes from Policy Insights, and policy state change notifications are routed through Event Grid rather than AKS metrics.

```bash
# Trigger a fresh policy evaluation for the resource group
az policy state trigger-scan --resource-group <resource-group-name>

# Summarize policy compliance for the AKS cluster
az policy state summarize --resource <aks-resource-id>

# List non-compliant policy states for the AKS cluster
az policy state list \
  --resource <aks-resource-id> \
  --filter "complianceState eq 'NonCompliant'" \
  --output table
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check Gatekeeper templates and constraints in the cluster
kubectl get constrainttemplates
kubectl get k8sazurecontainerlimits
kubectl get k8srequiredlabels
```

## Conclusion

Azure Policy for AKS uses OPA Gatekeeper inside the cluster, and policy assignments and compliance results can take around 15 minutes to sync after you enable the add-on. Always include system namespaces (`kube-system`, `gatekeeper-system`, `azure-arc`) in `excludedNamespaces` to avoid breaking cluster operations. Start with `effect = "audit"` to assess current compliance before switching to `effect = "deny"`. Audit mode reports violations without blocking deployments, giving teams time to remediate existing workloads. Use policy initiatives (sets of related policies) rather than individual policies to enforce comprehensive security baselines with a single assignment.
