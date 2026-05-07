# How to Configure AKS Ingress with Application Gateway Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, AKS, Application Gateway, AGIC, Ingress, TLS, Infrastructure as Code

Description: Learn how to configure AKS with Application Gateway Ingress Controller (AGIC) using OpenTofu for Layer 7 HTTP routing, SSL termination, and WAF protection for Kubernetes services.

## Introduction

The Application Gateway Ingress Controller (AGIC) uses an Azure Application Gateway as the Kubernetes Ingress controller, translating Kubernetes Ingress resources into Application Gateway routing rules. This provides enterprise-grade L7 routing (path-based, hostname-based), TLS termination, and WAF protection through standard Kubernetes Ingress manifests. In add-on mode, AKS manages the AGIC deployment; when you supply `gateway_id`, AGIC manages routing on an existing Application Gateway rather than creating one. By default, AGIC assumes full ownership of the Application Gateway configuration and overwrites settings that aren't defined through Kubernetes Ingress resources.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials with permission to manage AKS, Application Gateway, and role assignments
- A VNet with subnets for AKS and Application Gateway

## Step 1: Create Application Gateway and AKS with AGIC

```hcl
# Subnet for Application Gateway (cannot overlap with AKS subnet)

resource "azurerm_subnet" "appgw" {
  name                 = "appgw-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = var.vnet_name
  address_prefixes     = ["10.0.3.0/24"]
}

data "azurerm_resource_group" "appgw" {
  name = var.resource_group_name
}

resource "azurerm_public_ip" "appgw" {
  name                = "${var.project_name}-appgw-pip"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_application_gateway" "main" {
  name                = "${var.project_name}-appgw"
  location            = var.location
  resource_group_name = var.resource_group_name

  sku {
    name = "WAF_v2"
    tier = "WAF_v2"
  }

  autoscale_configuration {
    min_capacity = 2
    max_capacity = 10
  }

  gateway_ip_configuration {
    name      = "gateway-ip-config"
    subnet_id = azurerm_subnet.appgw.id
  }

  frontend_port {
    name = "http-port"
    port = 80
  }

  frontend_port {
    name = "https-port"
    port = 443
  }

  frontend_ip_configuration {
    name                 = "frontend-ip"
    public_ip_address_id = azurerm_public_ip.appgw.id
  }

  # Dummy backend (AGIC manages actual backends)
  backend_address_pool {
    name = "placeholder-backend-pool"
  }

  backend_http_settings {
    name                  = "placeholder-http-settings"
    cookie_based_affinity = "Disabled"
    port                  = 80
    protocol              = "Http"
    request_timeout       = 30
  }

  http_listener {
    name                           = "placeholder-listener"
    frontend_ip_configuration_name = "frontend-ip"
    frontend_port_name             = "http-port"
    protocol                       = "Http"
  }

  request_routing_rule {
    name                       = "placeholder-rule"
    rule_type                  = "Basic"
    http_listener_name         = "placeholder-listener"
    backend_address_pool_name  = "placeholder-backend-pool"
    backend_http_settings_name = "placeholder-http-settings"
    priority                   = 100
  }

  waf_configuration {
    enabled          = true
    firewall_mode    = "Prevention"
    rule_set_type    = "OWASP"
    rule_set_version = "3.2"
  }
}

# AKS cluster with AGIC add-on
resource "azurerm_kubernetes_cluster" "agic" {
  name                = "${var.project_name}-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.project_name

  default_node_pool {
    name                = "system"
    vm_size             = "Standard_D4s_v3"
    node_count          = 3
    enable_auto_scaling = true
    min_count           = 3
    max_count           = 10
    vnet_subnet_id      = var.aks_subnet_id
  }

  identity {
    type = "SystemAssigned"
  }

  # AGIC add-on
  ingress_application_gateway {
    gateway_id = azurerm_application_gateway.main.id
  }

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
  }

  tags = {
    Name = "${var.project_name}-aks-agic"
  }
}

# Grant the AGIC managed identity access to the Application Gateway resource group
resource "azurerm_role_assignment" "agic_appgw_reader" {
  scope                            = data.azurerm_resource_group.appgw.id
  role_definition_name             = "Reader"
  principal_id                     = azurerm_kubernetes_cluster.agic.ingress_application_gateway[0].ingress_application_gateway_identity[0].object_id
  skip_service_principal_aad_check = true
}

resource "azurerm_role_assignment" "agic_appgw_network_contributor" {
  scope                            = data.azurerm_resource_group.appgw.id
  role_definition_name             = "Network Contributor"
  principal_id                     = azurerm_kubernetes_cluster.agic.ingress_application_gateway[0].ingress_application_gateway_identity[0].object_id
  skip_service_principal_aad_check = true
}
```

## Step 2: Kubernetes Ingress Resources

```yaml
# kubernetes/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
    appgw.ingress.kubernetes.io/ssl-redirect: "true"
    appgw.ingress.kubernetes.io/connection-draining: "true"
    appgw.ingress.kubernetes.io/connection-draining-timeout: "30"
    appgw.ingress.kubernetes.io/waf-policy-for-path: "/subscriptions/.../providers/Microsoft.Network/applicationGatewayWebApplicationFirewallPolicies/my-policy"
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls-secret  # Omit spec.tls if you use appgw.ingress.kubernetes.io/appgw-ssl-certificate instead
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service:
                name: api-v1
                port:
                  number: 80
          - path: /v2
            pathType: Prefix
            backend:
              service:
                name: api-v2
                port:
                  number: 80
```

## Step 3: Deploy

```bash
tofu init
tofu plan
tofu apply

# Get credentials
az aks get-credentials \
  --resource-group <rg> \
  --name <cluster-name>

# Deploy Ingress
kubectl apply -f kubernetes/ingress.yaml

# Check AGIC controller logs
kubectl logs -n kube-system -l app=ingress-appgw -f

# Check Application Gateway backend health
az network application-gateway show-backend-health \
  --resource-group <rg> \
  --name <appgw-name>
```

## Conclusion

AGIC translates Kubernetes Ingress resources into Application Gateway configuration and continuously reconciles changes through Azure Resource Manager. Use `appgw.ingress.kubernetes.io/ssl-redirect: "true"` to automatically redirect HTTP to HTTPS at the Application Gateway level when TLS is configured. For TLS certificates, use cert-manager with Let's Encrypt to automate certificate renewal and store certs as Kubernetes secrets, or omit the `tls` block and use the `appgw.ingress.kubernetes.io/appgw-ssl-certificate` annotation to reference certificates already uploaded to Application Gateway. Enable WAF in Prevention mode after validating no false positives in Detection mode.
