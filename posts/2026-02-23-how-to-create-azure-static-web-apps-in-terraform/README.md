# How to Create Azure Static Web Apps in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Static Web Apps, JAMstack, Infrastructure as Code, Frontend, Serverless

Description: Learn how to create and configure Azure Static Web Apps using Terraform for deploying modern frontend applications with serverless API backends.

---

Azure Static Web Apps is a hosting service designed for modern frontend applications. It serves your static content from a global CDN, provides serverless API functions, handles authentication, and sets up CI/CD automatically when connected to a Git repository. For React, Angular, Vue, Svelte, or plain HTML/CSS/JS applications, it is one of the simplest deployment options available.

This guide walks through creating Azure Static Web Apps with Terraform, configuring custom domains, linking to a repository, and setting up the serverless backend.

## Why Static Web Apps

Before Terraform code, let's understand what Static Web Apps gives you compared to other hosting options:

- **Global CDN distribution**: Content is served from edge locations worldwide without you configuring anything
- **Free SSL certificates**: Managed SSL for custom domains, no certificate management needed
- **Integrated API functions**: Azure Functions backend automatically deployed alongside your frontend
- **Built-in authentication**: Supports Azure AD, GitHub, Twitter, and custom providers out of the box
- **Pull request previews**: Automatically creates staging environments for PRs
- **Free tier**: The free plan is generous enough for many production sites

## Creating a Static Web App

The Terraform configuration is straightforward:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource group
resource "azurerm_resource_group" "web" {
  name     = "rg-web-prod-eastus"
  location = "East US"
}

# Static Web App
resource "azurerm_static_web_app" "main" {
  name                = "swa-myapp-prod"
  resource_group_name = azurerm_resource_group.web.name
  location            = azurerm_resource_group.web.location

  # SKU - Free or Standard
  sku_tier = "Standard"
  sku_size = "Standard"

  tags = {
    environment = "production"
    application = "myapp"
    managed_by  = "terraform"
  }
}
```

The `location` for a Static Web App determines where the serverless API functions run. The static content itself is served globally from the CDN regardless of the location you choose.

## Free vs Standard SKU

The Free tier is surprisingly capable:

- 100 GB bandwidth per subscription per month
- 2 custom domains
- 250 MB storage per app
- Azure Functions APIs with 100,000 invocations per month

The Standard tier ($9/month) adds:

- 100 GB bandwidth per app
- 5 custom domains per app
- 500 MB storage
- Bring-your-own Azure Functions backend
- Password protection for staging environments
- SLA

For many websites and small applications, the Free tier is enough.

## Configuring a Custom Domain

Add a custom domain to your Static Web App:

```hcl
# Custom domain with DNS validation
resource "azurerm_static_web_app_custom_domain" "main" {
  static_web_app_id = azurerm_static_web_app.main.id
  domain_name       = "www.myapp.com"
  validation_type   = "cname-delegation"
}

# If using Azure DNS, create the CNAME record
resource "azurerm_dns_cname_record" "www" {
  name                = "www"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300
  record              = azurerm_static_web_app.main.default_host_name
}

# For apex domain (myapp.com without www), use a different validation
resource "azurerm_static_web_app_custom_domain" "apex" {
  static_web_app_id = azurerm_static_web_app.main.id
  domain_name       = "myapp.com"
  validation_type   = "dns-txt-token"
}

# TXT record for apex domain validation
resource "azurerm_dns_txt_record" "apex_validation" {
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.dns.name
  ttl                 = 300

  record {
    value = azurerm_static_web_app_custom_domain.apex.validation_token
  }
}
```

Static Web Apps automatically provisions and manages SSL certificates for your custom domains. You do not need to do anything else for HTTPS.

## Linking to a GitHub Repository

While Terraform creates the Static Web App resource, the actual deployment is typically handled through GitHub Actions. Terraform can provide the deployment token that GitHub Actions needs:

```hcl
# Output the deployment token for GitHub Actions
output "deployment_token" {
  description = "Deployment token for CI/CD"
  value       = azurerm_static_web_app.main.api_key
  sensitive   = true
}
```

Store this token as a GitHub Actions secret named `AZURE_STATIC_WEB_APPS_API_TOKEN`. Here is a sample workflow file for your repository:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Azure Static Web Apps

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: "api"
          output_location: "dist"
```

## Application Configuration

Static Web Apps use a `staticwebapp.config.json` file for routing and authentication configuration. While this file lives in your application repository, Terraform can manage app settings:

```hcl
# App settings for the Static Web App's API functions
resource "azurerm_static_web_app" "main" {
  name                = "swa-myapp-prod"
  resource_group_name = azurerm_resource_group.web.name
  location            = azurerm_resource_group.web.location
  sku_tier            = "Standard"
  sku_size            = "Standard"

  # App settings are available as environment variables in the API functions
  app_settings = {
    "DATABASE_URL"    = "@Microsoft.KeyVault(VaultName=kv-prod;SecretName=db-url)"
    "API_VERSION"     = "v2"
    "FEATURE_FLAGS"   = "new-dashboard,beta-api"
  }

  tags = {
    environment = "production"
  }
}
```

## Managed Identity for Backend APIs

If your API functions need to access other Azure resources:

```hcl
resource "azurerm_static_web_app" "main" {
  name                = "swa-myapp-prod"
  resource_group_name = azurerm_resource_group.web.name
  location            = azurerm_resource_group.web.location
  sku_tier            = "Standard"
  sku_size            = "Standard"

  # Enable managed identity for the API backend
  identity {
    type = "SystemAssigned"
  }
}

# Grant the Static Web App access to a storage account
resource "azurerm_role_assignment" "swa_storage" {
  scope                = azurerm_storage_account.data.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_static_web_app.main.identity[0].principal_id
}

# Grant access to Key Vault for secrets
resource "azurerm_role_assignment" "swa_keyvault" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_static_web_app.main.identity[0].principal_id
}
```

## Multiple Environments

Create separate Static Web Apps for different environments:

```hcl
variable "environments" {
  description = "Map of environments to configure"
  type = map(object({
    sku_tier = string
    sku_size = string
  }))
  default = {
    "production" = {
      sku_tier = "Standard"
      sku_size = "Standard"
    }
    "staging" = {
      sku_tier = "Free"
      sku_size = "Free"
    }
    "development" = {
      sku_tier = "Free"
      sku_size = "Free"
    }
  }
}

resource "azurerm_static_web_app" "envs" {
  for_each = var.environments

  name                = "swa-myapp-${each.key}"
  resource_group_name = azurerm_resource_group.web.name
  location            = azurerm_resource_group.web.location
  sku_tier            = each.value.sku_tier
  sku_size            = each.value.sku_size

  tags = {
    environment = each.key
    managed_by  = "terraform"
  }
}
```

## Outputs

```hcl
output "static_web_app_url" {
  description = "Default URL of the Static Web App"
  value       = "https://${azurerm_static_web_app.main.default_host_name}"
}

output "static_web_app_id" {
  description = "Resource ID of the Static Web App"
  value       = azurerm_static_web_app.main.id
}

output "deployment_token" {
  description = "API key for deployment (store as CI/CD secret)"
  value       = azurerm_static_web_app.main.api_key
  sensitive   = true
}
```

## Best Practices

**Use the Standard SKU for production.** The SLA and additional features are worth $9/month for any production application.

**Configure routing in staticwebapp.config.json.** SPA routing, redirects, and authentication rules belong in the application configuration file, not in Terraform.

**Store the deployment token securely.** The API key allows anyone to deploy to your Static Web App. Keep it in a secrets manager, not in your Terraform state.

**Use managed identity for API connections.** If your serverless functions connect to databases or other Azure services, use managed identity instead of connection strings.

**Set up staging environments for PRs.** Static Web Apps creates preview environments for pull requests automatically. Use this feature to review changes before merging.

## Wrapping Up

Azure Static Web Apps is a great fit for modern frontend applications that need a global CDN, serverless APIs, and zero infrastructure management. Terraform provisions the resource, configures custom domains, and sets up identity and access. The application deployment itself flows through GitHub Actions or Azure DevOps using the deployment token. It is a clean separation of concerns - infrastructure in Terraform, application in CI/CD.
