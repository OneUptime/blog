# How to Configure Azure Backend with Service Principal Authentication in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Azure, Security

Description: Learn how to authenticate the OpenTofu azurerm backend using an Azure Service Principal with either a client secret or certificate for CI/CD and automated deployments.

## Introduction

Service Principal authentication is the standard approach for OpenTofu CI/CD pipelines on Azure. A Service Principal represents an application identity with specific permissions - it can authenticate using a client secret or certificate, making it suitable for automated, non-interactive workflows.

## Step 1: Create a Service Principal

```bash
# Create SP and assign Storage Blob Data Contributor

az ad sp create-for-rbac \
  --name "sp-opentofu-state" \
  --role "Storage Blob Data Contributor" \
  --scopes "/subscriptions/SUBSCRIPTION_ID/resourceGroups/rg-terraform-state/providers/Microsoft.Storage/storageAccounts/stterraformstate001" \
  --output json

# Output:
# {
#   "appId": "00000000-0000-0000-0000-000000000000",        ← client_id
#   "displayName": "sp-opentofu-state",
#   "password": "xxx~xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",          ← client_secret
#   "tenant": "00000000-0000-0000-0000-000000000000"        ← tenant_id
# }
```

## Step 2: Configure Backend with Client Secret

```hcl
# backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate001"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"

    subscription_id   = "SUBSCRIPTION_ID"
    tenant_id         = "TENANT_ID"
    client_id         = "CLIENT_ID"  # SP appId
    use_azuread_auth  = true
    # client_secret in environment variable, not here
  }
}
```

```bash
# Set the client secret via environment variable (never in HCL)
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_CLIENT_ID="SP_CLIENT_ID"
export ARM_TENANT_ID="TENANT_ID"
export ARM_SUBSCRIPTION_ID="SUBSCRIPTION_ID"
```

## Step 3: Configure Backend with Certificate

For higher security, use certificate-based authentication:

```bash
# Generate a certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem \
  -days 365 -nodes -subj "/CN=opentofu-state"

# Convert to PKCS12 for Azure
openssl pkcs12 -export -in cert.pem -inkey key.pem \
  -out opentofu-state.pfx -passout pass:

# Upload the certificate to the Service Principal
az ad sp credential reset \
  --id "SP_APP_ID" \
  --cert @cert.pem \
  --append
```

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate001"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"

    use_azuread_auth            = true
    subscription_id      = "SUBSCRIPTION_ID"
    tenant_id            = "TENANT_ID"
    client_id            = "CLIENT_ID"
    client_certificate_path     = "/path/to/opentofu-state.pfx"
    client_certificate_password = ""  # Empty if no password
  }
}
```

## Step 4: Assign Required Permissions

The Service Principal needs the `Storage Blob Data Contributor` RBAC role:

```hcl
# Storage Blob Data Contributor: Read, write, and delete state files
resource "azurerm_role_assignment" "state_contributor" {
  scope                = azurerm_storage_account.state.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azuread_service_principal.opentofu.object_id
}

# Alternatively, scope the same role to the container for least privilege
resource "azurerm_role_assignment" "state_contributor_container" {
  scope                = azurerm_storage_container.state.resource_manager_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azuread_service_principal.opentofu.object_id
}
```

## Using Service Principal in GitHub Actions

```yaml
name: Deploy with OpenTofu

on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Init and Apply
        env:
          ARM_CLIENT_ID:       ${{ secrets.AZURE_CLIENT_ID }}
          ARM_CLIENT_SECRET:   ${{ secrets.AZURE_CLIENT_SECRET }}
          ARM_TENANT_ID:       ${{ secrets.AZURE_TENANT_ID }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
        run: |
          tofu init
          tofu apply -auto-approve
```

## Service Principal Secret Rotation

Service Principal secrets expire. Set up rotation notifications:

```bash
# Check when the SP secret expires
az ad sp credential list \
  --id "SP_APP_ID" \
  --query '[*].{EndDate:endDateTime, KeyId:keyId}' \
  --output table

# Append a new secret before expiration
az ad sp credential reset \
  --id "SP_APP_ID" \
  --append \
  --end-date "2027-01-01"
```

## Using Federated Identity (Recommended over Secrets)

For GitHub Actions, use workload identity federation to avoid managing secrets:

```bash
# Create a federated credential
az ad app federated-credential create \
  --id "SP_APP_ID" \
  --parameters '{
    "name": "github-actions",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:my-org/my-repo:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

## Conclusion

Service Principal authentication for the azurerm backend provides a reliable, CI/CD-friendly authentication method. Use client certificates instead of secrets where possible for better security. For modern CI/CD platforms, consider workload identity federation as the preferred approach - it eliminates secret management entirely. Always rotate secrets before expiration and use RBAC with least-privilege permissions.
