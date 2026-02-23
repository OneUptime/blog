# How to Create Azure AD Service Principals in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Service Principal, Azure AD, Entra ID, Identity, Infrastructure as Code

Description: Learn how to create Azure AD service principals in Terraform with role assignments, client secrets, certificates, and federated identity credentials.

---

Service principals are the identity that applications, services, and automation tools use to access Azure resources. When you register an application in Azure AD, a service principal is the local representation of that application in your tenant. Terraform needs service principals to connect to Azure, and your applications need them to authenticate to Azure services.

This guide covers creating service principals with Terraform, configuring credentials, assigning Azure roles, and setting up federated identity for workload identity scenarios.

## Provider Configuration

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.47"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.9"
    }
  }
}

provider "azuread" {}
provider "azurerm" {
  features {}
}
```

## Data Sources

```hcl
# data.tf
data "azuread_client_config" "current" {}
data "azurerm_subscription" "current" {}
```

## Application and Service Principal

A service principal always belongs to an application registration. You create both together.

```hcl
# service-principal.tf
# Step 1: Create the application registration
resource "azuread_application" "cicd" {
  display_name = "CI/CD Pipeline Service"
  owners       = [data.azuread_client_config.current.object_id]

  tags = ["automation", "ci-cd"]
}

# Step 2: Create the service principal for the application
resource "azuread_service_principal" "cicd" {
  client_id                    = azuread_application.cicd.client_id
  app_role_assignment_required = false
  owners                       = [data.azuread_client_config.current.object_id]

  description = "Service principal for CI/CD pipeline automation"

  tags = ["automation", "ci-cd"]
}
```

## Client Secret Credentials

The most common authentication method. Create a password credential with an expiration date.

```hcl
# credentials.tf
# Client secret with 6-month rotation
resource "azuread_application_password" "cicd" {
  application_id = azuread_application.cicd.id
  display_name   = "CI/CD pipeline secret"
  end_date_relative = "4320h"  # 180 days
}

# Track the secret creation time for rotation planning
resource "time_rotating" "secret_rotation" {
  rotation_days = 180
}

# Create a new secret that rotates automatically
resource "azuread_application_password" "cicd_rotating" {
  application_id = azuread_application.cicd.id
  display_name   = "Rotating secret - ${time_rotating.secret_rotation.id}"

  rotate_when_changed = {
    rotation = time_rotating.secret_rotation.id
  }
}
```

## Certificate Credentials

Certificates are more secure than client secrets because the private key never leaves the client.

```hcl
# cert-credentials.tf
# Generate a self-signed certificate using the TLS provider
resource "tls_private_key" "cicd" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "cicd" {
  private_key_pem = tls_private_key.cicd.private_key_pem

  subject {
    common_name  = "cicd-service-principal"
    organization = "Example Corp"
  }

  validity_period_hours = 8760  # 1 year

  allowed_uses = [
    "digital_signature",
    "client_auth",
  ]
}

# Associate the certificate with the application
resource "azuread_application_certificate" "cicd" {
  application_id = azuread_application.cicd.id
  type           = "AsymmetricX509Cert"
  value          = tls_self_signed_cert.cicd.cert_pem
  end_date       = tls_self_signed_cert.cicd.validity_end_time
}
```

## Federated Identity Credentials

Federated credentials enable passwordless authentication from external identity providers like GitHub Actions, Kubernetes, or other Azure AD tenants.

```hcl
# federated-credentials.tf
# Federated credential for GitHub Actions
resource "azuread_application_federated_identity_credential" "github" {
  application_id = azuread_application.cicd.id
  display_name   = "github-actions-main"
  description    = "Allow GitHub Actions to authenticate as this service principal"

  audiences = ["api://AzureADTokenExchange"]
  issuer    = "https://token.actions.githubusercontent.com"
  subject   = "repo:myorg/myrepo:ref:refs/heads/main"
}

# Federated credential for pull requests
resource "azuread_application_federated_identity_credential" "github_pr" {
  application_id = azuread_application.cicd.id
  display_name   = "github-actions-pr"
  description    = "Allow GitHub Actions PR workflows to authenticate"

  audiences = ["api://AzureADTokenExchange"]
  issuer    = "https://token.actions.githubusercontent.com"
  subject   = "repo:myorg/myrepo:pull_request"
}

# Federated credential for Azure Kubernetes Service workload identity
resource "azuread_application_federated_identity_credential" "aks" {
  application_id = azuread_application.cicd.id
  display_name   = "aks-workload-identity"
  description    = "Allow AKS pods to authenticate as this service principal"

  audiences = ["api://AzureADTokenExchange"]
  issuer    = var.aks_oidc_issuer_url
  subject   = "system:serviceaccount:${var.k8s_namespace}:${var.k8s_service_account}"
}
```

## Azure Role Assignments

Once you have a service principal, assign it Azure roles to grant access to resources.

```hcl
# role-assignments.tf
# Contributor on the entire subscription (broad - be careful)
resource "azurerm_role_assignment" "cicd_contributor" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.cicd.object_id
}

# Reader on a specific resource group
resource "azurerm_role_assignment" "cicd_reader" {
  scope                = "/subscriptions/${data.azurerm_subscription.current.subscription_id}/resourceGroups/rg-production"
  role_definition_name = "Reader"
  principal_id         = azuread_service_principal.cicd.object_id
}

# AcrPush on a container registry
resource "azurerm_role_assignment" "cicd_acr_push" {
  scope                = var.acr_id
  role_definition_name = "AcrPush"
  principal_id         = azuread_service_principal.cicd.object_id
}

# Key Vault Secrets User for reading secrets
resource "azurerm_role_assignment" "cicd_kv_secrets" {
  scope                = var.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azuread_service_principal.cicd.object_id
}
```

## Multiple Service Principals with for_each

Create service principals for different services using a map.

```hcl
# multiple-sps.tf
variable "service_principals" {
  description = "Map of service principals to create"
  type = map(object({
    display_name = string
    role         = string
    scope        = string
  }))
  default = {
    "web-app" = {
      display_name = "Web Application"
      role         = "Contributor"
      scope        = "rg-web"
    }
    "worker" = {
      display_name = "Background Worker"
      role         = "Reader"
      scope        = "rg-worker"
    }
    "monitoring" = {
      display_name = "Monitoring Service"
      role         = "Monitoring Reader"
      scope        = "subscription"
    }
  }
}

resource "azuread_application" "services" {
  for_each     = var.service_principals
  display_name = each.value.display_name
  owners       = [data.azuread_client_config.current.object_id]
}

resource "azuread_service_principal" "services" {
  for_each  = var.service_principals
  client_id = azuread_application.services[each.key].client_id
  owners    = [data.azuread_client_config.current.object_id]
}

resource "azuread_application_password" "services" {
  for_each       = var.service_principals
  application_id = azuread_application.services[each.key].id
  display_name   = "Service secret for ${each.value.display_name}"
  end_date_relative = "4320h"
}
```

## Outputs

```hcl
# outputs.tf
output "cicd_client_id" {
  value       = azuread_application.cicd.client_id
  description = "Client ID (application ID) for the CI/CD service principal"
}

output "cicd_client_secret" {
  value       = azuread_application_password.cicd.value
  sensitive   = true
  description = "Client secret for the CI/CD service principal"
}

output "cicd_object_id" {
  value       = azuread_service_principal.cicd.object_id
  description = "Object ID of the service principal"
}

output "tenant_id" {
  value       = data.azuread_client_config.current.tenant_id
  description = "Azure AD tenant ID"
}
```

## Authentication Methods Comparison

- **Client secret**: Easiest to set up. Must be rotated regularly. Secret is shared between Azure AD and the client.
- **Certificate**: More secure. Private key stays on the client. Longer validity periods are acceptable.
- **Federated identity**: Most secure. No secrets or certificates to manage. The external IdP issues tokens that Azure AD trusts directly.

For CI/CD pipelines, federated identity credentials with GitHub Actions or Azure DevOps are the recommended approach. They eliminate the need to store and rotate secrets entirely.

## Deployment

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

The Terraform principal running these commands needs Application Administrator or Global Administrator role in Azure AD. For role assignments on Azure resources, it also needs User Access Administrator or Owner on the target scope.

Service principals are a fundamental piece of Azure security. Managing them in Terraform ensures that every service identity is documented, every role assignment is reviewed, and credential rotation is automated rather than forgotten.
