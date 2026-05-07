# How to Set Up Azure App Service SSL Bindings with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, SSL, TLS, OpenTofu, HTTPS, Certificate

Description: Learn how to configure SSL/TLS certificates and HTTPS bindings for Azure App Service with OpenTofu, including managed certificates and Key Vault certificates.

## Overview

Azure App Service supports multiple SSL/TLS certificate options: App Service Managed Certificates (free), certificates imported from Key Vault, and uploaded PFX certificates. OpenTofu manages the full certificate binding lifecycle.

## Step 1: Free App Service Managed Certificate

```hcl
# main.tf - Free managed certificate for custom domains

# Requires: custom domain already bound to the app
resource "azurerm_app_service_managed_certificate" "managed_cert" {
  custom_hostname_binding_id = azurerm_app_service_custom_hostname_binding.www.id
}

# Bind the managed certificate to the custom domain
resource "azurerm_app_service_certificate_binding" "managed_cert_binding" {
  hostname_binding_id = azurerm_app_service_custom_hostname_binding.www.id
  certificate_id      = azurerm_app_service_managed_certificate.managed_cert.id
  ssl_state           = "SniEnabled"  # SNI SSL (recommended; no dedicated IP required)
}
```

## Step 2: Certificate from Azure Key Vault

```hcl
# Lookup an existing CA-issued PKCS#12 certificate in Key Vault
data "azurerm_key_vault_certificate" "ca_cert" {
  name         = "my-app-certificate"
  key_vault_id = azurerm_key_vault.kv.id
}

# Import a certificate from Key Vault
resource "azurerm_app_service_certificate" "kv_cert" {
  name                = "my-app-certificate"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  # Requires: App Service resource provider has Secret Get and Certificate Get on the vault
  key_vault_secret_id = data.azurerm_key_vault_certificate.ca_cert.secret_id
}

# Bind the Key Vault certificate to a custom domain
resource "azurerm_app_service_certificate_binding" "kv_cert_binding" {
  hostname_binding_id = azurerm_app_service_custom_hostname_binding.www.id
  certificate_id      = azurerm_app_service_certificate.kv_cert.id
  ssl_state           = "SniEnabled"
}
```

## Step 3: Create a Self-Signed Key Vault Certificate

```hcl
# Create a self-signed certificate in Key Vault (for dev/staging only)
# Use a CA-issued certificate for public App Service custom-domain bindings
resource "azurerm_key_vault_certificate" "app_cert" {
  name         = "app-ssl-cert"
  key_vault_id = azurerm_key_vault.kv.id

  certificate_policy {
    issuer_parameters {
      name = "Self"  # Self-signed example
    }

    key_properties {
      exportable = true
      key_size   = 2048
      key_type   = "RSA"
      reuse_key  = true
    }

    lifetime_action {
      action {
        action_type = "AutoRenew"
      }
      trigger {
        days_before_expiry = 30  # Auto-renew 30 days before expiry
      }
    }

    secret_properties {
      content_type = "application/x-pkcs12"
    }

    x509_certificate_properties {
      extended_key_usage = ["1.3.6.1.5.5.7.3.1"]  # Server authentication

      key_usage = [
        "cRLSign",
        "dataEncipherment",
        "digitalSignature",
        "keyAgreement",
        "keyCertSign",
        "keyEncipherment",
      ]

      subject            = "CN=www.example.com"
      validity_in_months = 12

      subject_alternative_names {
        dns_names = ["www.example.com", "example.com"]
      }
    }
  }
}
```

## Step 4: Force HTTPS and Minimum TLS Version

```hcl
# Enforce HTTPS-only and minimum TLS version on the web app
resource "azurerm_linux_web_app" "secure_app" {
  name                = "my-secure-app"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id

  # Redirect all HTTP to HTTPS
  https_only = true

  site_config {
    # Enforce TLS 1.2 as the minimum version on the main site
    minimum_tls_version = "1.2"

    # Enforce TLS 1.2 on the SCM/Kudu endpoint as well
    scm_minimum_tls_version = "1.2"

    # Enable HTTP/2 for better performance
    http2_enabled = true
  }
}
```

## Summary

Azure App Service SSL bindings with OpenTofu support multiple certificate scenarios from free managed certificates to Key Vault-backed certificates. The free managed certificate is ideal for most cases, while Key Vault-backed CA-issued certificates are recommended for production workloads that need certificate lifecycle management.
