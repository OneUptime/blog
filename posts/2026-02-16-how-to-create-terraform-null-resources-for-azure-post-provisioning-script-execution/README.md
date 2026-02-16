# How to Create Terraform Null Resources for Azure Post-Provisioning Script Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, Null Resource, Provisioners, Automation, Infrastructure as Code, Scripting

Description: Learn how to use Terraform null_resource with provisioners to run post-provisioning scripts against Azure resources after infrastructure deployment.

---

Terraform is great at creating and configuring Azure resources through its provider. But sometimes you need to run a script after a resource is created - maybe to initialize a database, configure an application, seed some data, or run a health check. Terraform's `null_resource` combined with provisioners fills this gap. It gives you a way to execute local or remote commands as part of your Terraform workflow without creating any actual cloud resource.

This post covers practical patterns for using `null_resource` with Azure deployments, including when it makes sense, when to avoid it, and how to handle the common pitfalls.

## What null_resource Actually Is

The `null_resource` is a resource that does not create anything in your cloud environment. It exists purely within the Terraform state and serves as an anchor for provisioners and triggers. Think of it as a placeholder that lets you attach scripts to your Terraform lifecycle.

A `null_resource` with a `local-exec` provisioner runs a command on the machine where Terraform is executing (your laptop, a CI/CD agent). A `null_resource` with a `remote-exec` provisioner runs commands on a remote machine via SSH or WinRM.

## Basic Usage Pattern

Here is the simplest example - running an Azure CLI command after a resource is created.

```hcl
# Create a storage account
resource "azurerm_storage_account" "main" {
  name                     = "stexampledata"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# Run a script after the storage account is created
resource "null_resource" "configure_storage" {
  # This triggers re-execution when the storage account changes
  triggers = {
    storage_account_id = azurerm_storage_account.main.id
  }

  # Run an Azure CLI command to enable static website hosting
  # (something not directly configurable in some Terraform provider versions)
  provisioner "local-exec" {
    command = <<-EOT
      az storage blob service-properties update \
        --account-name ${azurerm_storage_account.main.name} \
        --static-website \
        --index-document index.html \
        --404-document 404.html
    EOT
  }

  depends_on = [azurerm_storage_account.main]
}
```

The `triggers` block is important. It defines when the null_resource should be recreated (and therefore when the provisioner should run again). Without triggers, the provisioner runs only on the first `terraform apply` and never again.

## Pattern 1: Database Initialization

A common use case is initializing an Azure SQL or PostgreSQL database after Terraform creates it. Terraform can create the server and database resources, but it cannot run SQL scripts.

```hcl
# PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "main" {
  name                = "psql-example"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  version             = "16"
  sku_name            = "GP_Standard_D2ds_v5"

  administrator_login    = var.db_admin_username
  administrator_password = var.db_admin_password

  storage_mb = 32768
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = "app_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Initialize the database schema after creation
resource "null_resource" "db_init" {
  triggers = {
    # Re-run if the database is recreated
    database_id = azurerm_postgresql_flexible_server_database.app.id
    # Also re-run if the schema file changes
    schema_hash = filemd5("${path.module}/sql/schema.sql")
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Wait for the server to be fully ready
      sleep 30

      # Run the schema initialization script
      PGPASSWORD='${var.db_admin_password}' psql \
        -h ${azurerm_postgresql_flexible_server.main.fqdn} \
        -U ${var.db_admin_username} \
        -d ${azurerm_postgresql_flexible_server_database.app.name} \
        -f ${path.module}/sql/schema.sql
    EOT

    # Set environment variables for the script
    environment = {
      PGPASSWORD = var.db_admin_password
    }
  }

  depends_on = [
    azurerm_postgresql_flexible_server_database.app,
    azurerm_postgresql_flexible_server_firewall_rule.allow_deployer
  ]
}
```

## Pattern 2: AKS Post-Deployment Configuration

After creating an AKS cluster, you often need to deploy cluster-level components like ingress controllers, cert-manager, or monitoring agents.

```hcl
# AKS Cluster
resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-example"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "aks-example"

  default_node_pool {
    name       = "system"
    node_count = 3
    vm_size    = "Standard_D4s_v5"
  }

  identity {
    type = "SystemAssigned"
  }
}

# Configure kubectl and deploy cluster components
resource "null_resource" "aks_config" {
  triggers = {
    cluster_id = azurerm_kubernetes_cluster.main.id
    # Re-run when Helm chart versions change
    helm_versions = md5(file("${path.module}/helm-versions.json"))
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Get AKS credentials
      az aks get-credentials \
        --resource-group ${azurerm_resource_group.main.name} \
        --name ${azurerm_kubernetes_cluster.main.name} \
        --overwrite-existing

      # Install NGINX Ingress Controller
      helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
      helm repo update
      helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --set controller.replicaCount=2 \
        --wait

      # Install cert-manager for TLS certificates
      helm repo add jetstack https://charts.jetstack.io
      helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --set installCRDs=true \
        --wait

      echo "AKS post-deployment configuration complete"
    EOT

    # Use bash explicitly
    interpreter = ["bash", "-c"]
  }

  depends_on = [azurerm_kubernetes_cluster.main]
}
```

## Pattern 3: Health Check After Deployment

Run a health check to verify your deployment is working before Terraform reports success.

```hcl
# Web App deployment
resource "azurerm_linux_web_app" "main" {
  name                = "app-health-check-example"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = true
  }
}

# Verify the app is responding after deployment
resource "null_resource" "health_check" {
  triggers = {
    app_id = azurerm_linux_web_app.main.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      #!/bin/bash
      # Health check with retry logic
      MAX_RETRIES=10
      RETRY_INTERVAL=15
      URL="https://${azurerm_linux_web_app.main.default_hostname}/health"

      for i in $(seq 1 $MAX_RETRIES); do
        echo "Health check attempt $i of $MAX_RETRIES..."
        STATUS=$(curl -s -o /dev/null -w "%%{http_code}" "$URL" 2>/dev/null)

        if [ "$STATUS" = "200" ]; then
          echo "Health check passed! Status: $STATUS"
          exit 0
        fi

        echo "Status: $STATUS - waiting $RETRY_INTERVAL seconds..."
        sleep $RETRY_INTERVAL
      done

      echo "Health check failed after $MAX_RETRIES attempts"
      exit 1
    EOT

    interpreter = ["bash", "-c"]
  }

  depends_on = [azurerm_linux_web_app.main]
}
```

## Pattern 4: Cleanup on Destroy

`null_resource` can also run scripts when a resource is destroyed, using the `when = destroy` option in the provisioner.

```hcl
# Run cleanup tasks when the infrastructure is destroyed
resource "null_resource" "cleanup" {
  triggers = {
    resource_group_name = azurerm_resource_group.main.name
  }

  # This runs during terraform destroy
  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      echo "Running cleanup for resource group: ${self.triggers.resource_group_name}"

      # Remove DNS records that Terraform does not manage
      az network dns record-set a delete \
        --name app \
        --zone-name example.com \
        --resource-group rg-dns \
        --yes 2>/dev/null || true

      # Purge Key Vault soft-deleted items
      az keyvault purge \
        --name kv-example 2>/dev/null || true

      echo "Cleanup complete"
    EOT

    interpreter = ["bash", "-c"]
  }
}
```

Note that destroy-time provisioners have a limitation: they can only reference `self.triggers` values, not other resources. This is because during destruction, the other resources might already be gone.

## Using the terraform_data Resource (Terraform 1.4+)

Starting with Terraform 1.4, the `terraform_data` resource is the recommended replacement for `null_resource`. It does not require the hashicorp/null provider and has slightly better semantics.

```hcl
# Modern alternative using terraform_data (Terraform 1.4+)
resource "terraform_data" "configure_app" {
  triggers_replace = {
    app_id  = azurerm_linux_web_app.main.id
    version = var.app_version
  }

  provisioner "local-exec" {
    command = <<-EOT
      az webapp config set \
        --name ${azurerm_linux_web_app.main.name} \
        --resource-group ${azurerm_resource_group.main.name} \
        --linux-fx-version "NODE|20-lts"
    EOT
  }
}
```

## When to Avoid null_resource

While `null_resource` is useful, there are situations where other approaches are better:

1. **If a Terraform resource or data source exists** - Check the provider documentation first. Many things people use `null_resource` for are now natively supported.

2. **For complex orchestration** - If you have a chain of five scripts that depend on each other, a separate deployment tool (like Ansible or a shell script) is more maintainable.

3. **For idempotent operations** - Provisioners are not idempotent by default. If you need retry logic and state tracking, consider using the `azurerm_resource_deployment_script_azure_cli` resource instead.

4. **When secrets are involved** - Provisioner commands can appear in Terraform plan output and state files. Be careful with passwords and keys.

## Wrapping Up

Terraform's `null_resource` (or `terraform_data` in newer versions) bridges the gap between infrastructure provisioning and configuration. For Azure deployments, it is most useful for database initialization, post-deployment health checks, AKS component installation, and cleanup scripts. The key is to use triggers wisely so the scripts re-run when they should, and to keep the scripts simple enough that they do not become a maintenance burden. When the scripts get complex, that is usually a signal to reach for a dedicated configuration management tool.
