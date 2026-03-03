# How to Install Terraform Enterprise on Azure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Azure, Cloud Infrastructure, Self-Hosted

Description: Deploy Terraform Enterprise on Azure using Virtual Machines, Azure Database for PostgreSQL, and Blob Storage for a production setup.

---

Azure provides all the managed services needed for a production Terraform Enterprise deployment. This guide walks through deploying Terraform Enterprise on Azure using Virtual Machines for compute, Azure Database for PostgreSQL for the database, and Azure Blob Storage for object storage. We will use Terraform to provision the entire stack.

## Architecture

The Azure deployment follows a similar pattern to other cloud providers:

- Azure Virtual Machine running the Terraform Enterprise container
- Azure Database for PostgreSQL Flexible Server
- Azure Blob Storage for state files and artifacts
- Azure Application Gateway or Load Balancer for HTTPS access
- Virtual Network with subnets for network isolation

```text
[Internet]
    |
[Application Gateway - HTTPS:443]
    |
[Subnet: tfe-compute]
    |
[VM - TFE Container]
    |              |
[PostgreSQL]  [Blob Storage]
```

## Step 1: Set Up Networking

```hcl
# networking.tf

resource "azurerm_resource_group" "tfe" {
  name     = "tfe-resources"
  location = var.azure_region
}

resource "azurerm_virtual_network" "tfe" {
  name                = "tfe-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.tfe.location
  resource_group_name = azurerm_resource_group.tfe.name
}

# Subnet for the TFE virtual machine
resource "azurerm_subnet" "compute" {
  name                 = "tfe-compute"
  resource_group_name  = azurerm_resource_group.tfe.name
  virtual_network_name = azurerm_virtual_network.tfe.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Subnet for the database
resource "azurerm_subnet" "database" {
  name                 = "tfe-database"
  resource_group_name  = azurerm_resource_group.tfe.name
  virtual_network_name = azurerm_virtual_network.tfe.name
  address_prefixes     = ["10.0.2.0/24"]

  # Required delegation for PostgreSQL Flexible Server
  delegation {
    name = "postgresql"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action"
      ]
    }
  }
}

# Subnet for the Application Gateway
resource "azurerm_subnet" "appgw" {
  name                 = "tfe-appgw"
  resource_group_name  = azurerm_resource_group.tfe.name
  virtual_network_name = azurerm_virtual_network.tfe.name
  address_prefixes     = ["10.0.3.0/24"]
}

# Private DNS zone for PostgreSQL
resource "azurerm_private_dns_zone" "postgres" {
  name                = "tfe.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.tfe.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "tfe-postgres-link"
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  resource_group_name   = azurerm_resource_group.tfe.name
  virtual_network_id    = azurerm_virtual_network.tfe.id
}
```

## Step 2: Create the PostgreSQL Database

```hcl
# database.tf

resource "azurerm_postgresql_flexible_server" "tfe" {
  name                = "tfe-postgres"
  resource_group_name = azurerm_resource_group.tfe.name
  location            = azurerm_resource_group.tfe.location

  administrator_login    = "terraform"
  administrator_password = var.db_password

  sku_name   = "GP_Standard_D4s_v3"
  version    = "15"
  storage_mb = 65536

  delegated_subnet_id = azurerm_subnet.database.id
  private_dns_zone_id = azurerm_private_dns_zone.postgres.id

  backup_retention_days        = 14
  geo_redundant_backup_enabled = false

  zone = "1"

  depends_on = [
    azurerm_private_dns_zone_virtual_network_link.postgres
  ]

  tags = {
    environment = "production"
    application = "terraform-enterprise"
  }
}

resource "azurerm_postgresql_flexible_server_database" "tfe" {
  name      = "terraform_enterprise"
  server_id = azurerm_postgresql_flexible_server.tfe.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Allow SSL connections
resource "azurerm_postgresql_flexible_server_configuration" "require_ssl" {
  name      = "require_secure_transport"
  server_id = azurerm_postgresql_flexible_server.tfe.id
  value     = "on"
}
```

## Step 3: Create Blob Storage

```hcl
# storage.tf

resource "azurerm_storage_account" "tfe" {
  name                     = "tfedata${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.tfe.name
  location                 = azurerm_resource_group.tfe.location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  # Security settings
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = true

  blob_properties {
    versioning_enabled = true
  }

  tags = {
    environment = "production"
    application = "terraform-enterprise"
  }
}

resource "azurerm_storage_container" "tfe" {
  name                  = "tfe-data"
  storage_account_name  = azurerm_storage_account.tfe.name
  container_access_type = "private"
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}
```

## Step 4: Create the Virtual Machine

```hcl
# compute.tf

# Network security group for the VM
resource "azurerm_network_security_group" "tfe" {
  name                = "tfe-nsg"
  location            = azurerm_resource_group.tfe.location
  resource_group_name = azurerm_resource_group.tfe.name

  # Allow HTTPS from Application Gateway subnet
  security_rule {
    name                       = "allow-https"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "10.0.3.0/24"
    destination_address_prefix = "*"
  }

  # Allow SSH for management (restrict to your IP in production)
  security_rule {
    name                       = "allow-ssh"
    priority                   = 200
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = var.admin_cidr
    destination_address_prefix = "*"
  }
}

# Network interface
resource "azurerm_network_interface" "tfe" {
  name                = "tfe-nic"
  location            = azurerm_resource_group.tfe.location
  resource_group_name = azurerm_resource_group.tfe.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.compute.id
    private_ip_address_allocation = "Dynamic"
  }
}

resource "azurerm_network_interface_security_group_association" "tfe" {
  network_interface_id      = azurerm_network_interface.tfe.id
  network_security_group_id = azurerm_network_security_group.tfe.id
}

# User-assigned managed identity for storage access
resource "azurerm_user_assigned_identity" "tfe" {
  name                = "tfe-identity"
  location            = azurerm_resource_group.tfe.location
  resource_group_name = azurerm_resource_group.tfe.name
}

resource "azurerm_role_assignment" "tfe_storage" {
  scope                = azurerm_storage_account.tfe.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.tfe.principal_id
}

# Virtual Machine
resource "azurerm_linux_virtual_machine" "tfe" {
  name                = "tfe-server"
  resource_group_name = azurerm_resource_group.tfe.name
  location            = azurerm_resource_group.tfe.location
  size                = "Standard_D4s_v3"

  admin_username = "azureuser"
  admin_ssh_key {
    username   = "azureuser"
    public_key = file(var.ssh_public_key_path)
  }

  network_interface_ids = [azurerm_network_interface.tfe.id]

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.tfe.id]
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 100
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  custom_data = base64encode(templatefile("${path.module}/templates/cloud-init.sh", {
    tfe_license             = var.tfe_license
    tfe_hostname            = var.tfe_hostname
    tfe_encryption_password = var.tfe_encryption_password
    db_host                 = azurerm_postgresql_flexible_server.tfe.fqdn
    db_username             = "terraform"
    db_password             = var.db_password
    db_name                 = "terraform_enterprise"
    storage_account_name    = azurerm_storage_account.tfe.name
    storage_container_name  = azurerm_storage_container.tfe.name
    storage_account_key     = azurerm_storage_account.tfe.primary_access_key
  }))

  tags = {
    environment = "production"
    application = "terraform-enterprise"
  }
}
```

## Step 5: Cloud Init Script

```bash
#!/bin/bash
# templates/cloud-init.sh

set -euo pipefail

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Pull and run Terraform Enterprise
echo "${tfe_license}" | docker login images.releases.hashicorp.com \
  --username terraform --password-stdin

docker pull images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest

docker run -d \
  --name terraform-enterprise \
  --restart always \
  -p 443:443 \
  -p 8800:8800 \
  -v tfe-data:/var/lib/terraform-enterprise \
  -e TFE_LICENSE="${tfe_license}" \
  -e TFE_HOSTNAME="${tfe_hostname}" \
  -e TFE_ENCRYPTION_PASSWORD="${tfe_encryption_password}" \
  -e TFE_OPERATIONAL_MODE="external" \
  -e TFE_DATABASE_HOST="${db_host}" \
  -e TFE_DATABASE_USER="${db_username}" \
  -e TFE_DATABASE_PASSWORD="${db_password}" \
  -e TFE_DATABASE_NAME="${db_name}" \
  -e TFE_DATABASE_PARAMETERS="sslmode=require" \
  -e TFE_OBJECT_STORAGE_TYPE="azure" \
  -e TFE_OBJECT_STORAGE_AZURE_ACCOUNT_NAME="${storage_account_name}" \
  -e TFE_OBJECT_STORAGE_AZURE_CONTAINER="${storage_container_name}" \
  -e TFE_OBJECT_STORAGE_AZURE_ACCOUNT_KEY="${storage_account_key}" \
  --cap-add IPC_LOCK \
  images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest
```

## Step 6: Variables

```hcl
# variables.tf

variable "azure_region" {
  type    = string
  default = "eastus"
}

variable "tfe_hostname" {
  type        = string
  description = "Hostname for Terraform Enterprise"
}

variable "tfe_license" {
  type        = string
  sensitive   = true
  description = "Terraform Enterprise license"
}

variable "tfe_encryption_password" {
  type        = string
  sensitive   = true
  description = "Encryption password for TFE data"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "PostgreSQL database password"
}

variable "ssh_public_key_path" {
  type        = string
  description = "Path to SSH public key for VM access"
  default     = "~/.ssh/id_rsa.pub"
}

variable "admin_cidr" {
  type        = string
  description = "CIDR block for SSH access"
}
```

## Deploying

```bash
# Set up the Azure provider
export ARM_CLIENT_ID="..."
export ARM_CLIENT_SECRET="..."
export ARM_SUBSCRIPTION_ID="..."
export ARM_TENANT_ID="..."

# Initialize and deploy
terraform init
terraform plan -var-file="production.tfvars"
terraform apply -var-file="production.tfvars"
```

## Verifying the Deployment

```bash
# SSH into the VM
ssh azureuser@<vm-private-ip>

# Check the TFE container
sudo docker ps
sudo docker logs terraform-enterprise

# Check the health endpoint
curl -k https://localhost/_health_check
```

## Post-Deployment

After the infrastructure is provisioned and Terraform Enterprise is running:

1. Configure DNS to point `tfe.example.com` to the Application Gateway's public IP
2. Navigate to `https://tfe.example.com` in your browser
3. Create the initial admin user
4. Create your first organization
5. Configure VCS integration for your Git provider

## Monitoring

Use Azure Monitor for observability:

```hcl
# Enable monitoring
resource "azurerm_monitor_diagnostic_setting" "tfe_vm" {
  name                       = "tfe-diagnostics"
  target_resource_id         = azurerm_linux_virtual_machine.tfe.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
```

## Summary

Deploying Terraform Enterprise on Azure uses Azure-native services for database, storage, and networking. The pattern is similar to other cloud deployments - a VM running the TFE container with external PostgreSQL and Blob Storage for production reliability. Use managed identities where possible for authentication, enable Azure Monitor for observability, and configure network security groups to restrict access to only necessary traffic.
