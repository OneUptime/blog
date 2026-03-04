# How to Create Azure-Compatible RHEL VM Images with Image Builder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Azure, Image Builder, VHD, Cloud, Linux

Description: Build Azure-compatible RHEL VHD images using Image Builder, including the necessary Azure agent and cloud-init configurations.

---

RHEL Image Builder can create VHD (Virtual Hard Disk) images compatible with Microsoft Azure. These images include the Azure Linux Agent and cloud-init for proper integration with the Azure platform.

## Creating an Azure Blueprint

```toml
# azure-server.toml
name = "azure-server"
description = "Custom RHEL image for Azure deployment"
version = "1.0.0"

[[packages]]
name = "WALinuxAgent"
version = "*"

[[packages]]
name = "cloud-init"
version = "*"

[[packages]]
name = "cloud-utils-growpart"
version = "*"

[[packages]]
name = "firewalld"
version = "*"

[[packages]]
name = "insights-client"
version = "*"

[customizations.services]
enabled = ["waagent", "cloud-init", "firewalld", "sshd"]

[customizations.kernel]
append = "console=tty1 console=ttyS0 earlyprintk=ttyS0 rootdelay=300"

[customizations]
hostname = ""
```

Push the blueprint:

```bash
composer-cli blueprints push azure-server.toml
composer-cli blueprints depsolve azure-server
```

## Building the VHD Image

```bash
# Build an Azure VHD image
composer-cli compose start azure-server vhd

# Monitor progress
watch composer-cli compose status

# Download the VHD when complete
composer-cli compose image <compose-uuid>
```

## Uploading to Azure

### Using Azure CLI

```bash
# Install Azure CLI
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
sudo dnf install -y azure-cli

# Login to Azure
az login

# Create a resource group and storage account
az group create --name rhel-images-rg --location eastus
az storage account create --name rhelimagestorage --resource-group rhel-images-rg --sku Standard_LRS

# Get the storage account key
STORAGE_KEY=$(az storage account keys list --account-name rhelimagestorage --resource-group rhel-images-rg --query "[0].value" -o tsv)

# Create a container for VHD images
az storage container create --name vhds --account-name rhelimagestorage --account-key "$STORAGE_KEY"

# Upload the VHD
az storage blob upload \
  --account-name rhelimagestorage \
  --account-key "$STORAGE_KEY" \
  --container-name vhds \
  --type page \
  --file <compose-uuid>-disk.vhd \
  --name rhel-server.vhd
```

### Creating a Managed Image

```bash
# Create a managed image from the VHD
az image create \
  --resource-group rhel-images-rg \
  --name rhel-custom-image \
  --os-type Linux \
  --source "https://rhelimagestorage.blob.core.windows.net/vhds/rhel-server.vhd"

# Create a VM from the image
az vm create \
  --resource-group rhel-images-rg \
  --name rhel-server-01 \
  --image rhel-custom-image \
  --size Standard_B2s \
  --admin-username azadmin \
  --ssh-key-values ~/.ssh/id_rsa.pub
```

The VM will boot with the Azure Agent running and cloud-init handling initial configuration such as SSH key injection and disk expansion.
