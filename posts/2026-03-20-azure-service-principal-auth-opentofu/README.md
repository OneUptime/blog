# How to Authenticate with Azure Using Service Principal in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Service Principal, Authentication, CI/CD

Description: Learn how to create an Azure Service Principal and configure OpenTofu to authenticate using client secret or certificate-based credentials for CI/CD pipelines.

## Introduction

An Azure Service Principal is a non-human identity used by applications, services, and automation tools to access Azure resources. It is a common authentication method for CI/CD pipelines running OpenTofu.

## Creating a Service Principal

```bash
# Create a service principal with Contributor role on a specific subscription

az ad sp create-for-rbac \
  --name "opentofu-deploy-sp" \
  --role "Contributor" \
  --scopes "/subscriptions/$SUBSCRIPTION_ID" \
  --output json
```

This includes:
```json
{
  "appId": "CLIENT_ID",
  "password": "CLIENT_SECRET",
  "tenant": "TENANT_ID"
}
```

## Client Secret Authentication

```hcl
provider "azurerm" {
  features {}

  # Credentials from environment variables (preferred)
  # ARM_CLIENT_ID, ARM_CLIENT_SECRET, ARM_TENANT_ID, ARM_SUBSCRIPTION_ID
  # Or configure directly (not recommended for production)
  client_id       = var.client_id
  client_secret   = var.client_secret
  tenant_id       = var.tenant_id
  subscription_id = var.subscription_id
}
```

## Certificate-Based Authentication

```hcl
provider "azurerm" {
  features {}

  # Credentials from environment variables (preferred)
  # ARM_CLIENT_ID, ARM_CLIENT_CERTIFICATE_PATH,
  # ARM_CLIENT_CERTIFICATE_PASSWORD, ARM_TENANT_ID, ARM_SUBSCRIPTION_ID
  # The certificate must be a PKCS#12 (.pfx) bundle whose public
  # certificate has been uploaded to the service principal.
  client_id                   = var.client_id
  client_certificate_path     = var.client_certificate_path
  client_certificate_password = var.client_certificate_password
  tenant_id                   = var.tenant_id
  subscription_id             = var.subscription_id
}
```

## GitHub Actions with Service Principal

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    env:
      ARM_CLIENT_ID:       ${{ secrets.AZURE_CLIENT_ID }}
      ARM_CLIENT_SECRET:   ${{ secrets.AZURE_CLIENT_SECRET }}
      ARM_TENANT_ID:       ${{ secrets.AZURE_TENANT_ID }}
      ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

    steps:
      - uses: actions/checkout@v6
      - uses: opentofu/setup-opentofu@v2
      - run: tofu init
      - run: tofu apply -auto-approve
```

## Least-Privilege Role Assignment

Instead of Contributor on the entire subscription, scope permissions to specific resource groups:

```hcl
resource "azurerm_role_assignment" "opentofu_rg" {
  scope                = azurerm_resource_group.app.id
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.opentofu.object_id
}
```

## Conclusion

Service Principals are a common CI/CD authentication method for Azure. Prefer certificate authentication over client secrets for production when you can securely manage certificate distribution and rotation, and monitor expiration for both certificates and secrets. Always scope the role assignment to the minimum required resource group, subscription, or resource.
