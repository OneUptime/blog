# How to Build Custom RHEL VHD Images for Azure with Image Builder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Azure, VHD, Image Builder, Custom Images, Cloud, Linux

Description: Build custom RHEL VHD images for Azure using Image Builder with the Azure Linux Agent, cloud-init, and your organization's standard configurations.

---

Custom VHD images for Azure let you deploy pre-configured RHEL virtual machines with your organization's standards built in. Image Builder creates Azure-compatible VHD files that you can upload to Azure as managed images or add to a Shared Image Gallery.

## Creating an Azure-Optimized Blueprint

```toml
# azure-golden-image.toml
name = "azure-golden-image"
description = "Organization standard RHEL VHD for Azure"
version = "1.0.0"

# Azure integration packages
[[packages]]
name = "WALinuxAgent"
version = "*"

[[packages]]
name = "cloud-init"
version = "*"

[[packages]]
name = "cloud-utils-growpart"
version = "*"

# Security and compliance
[[packages]]
name = "aide"
version = "*"

[[packages]]
name = "firewalld"
version = "*"

# Organization standard packages
[[packages]]
name = "vim-enhanced"
version = "*"

[[packages]]
name = "tmux"
version = "*"

[[packages]]
name = "rsync"
version = "*"

[[packages]]
name = "bash-completion"
version = "*"

# Azure-specific customizations
[customizations]
hostname = ""

[customizations.services]
enabled = ["waagent", "cloud-init", "sshd", "firewalld"]
disabled = ["kdump"]

[customizations.kernel]
append = "console=tty1 console=ttyS0 earlyprintk=ttyS0 rootdelay=300"

[[customizations.filesystem]]
mountpoint = "/var"
size = "10 GiB"

[[customizations.filesystem]]
mountpoint = "/var/log"
size = "5 GiB"
```

## Building the VHD

```bash
# Push and build
composer-cli blueprints push azure-golden-image.toml
composer-cli blueprints depsolve azure-golden-image

# Start the VHD build
composer-cli compose start azure-golden-image vhd

# Monitor progress
watch composer-cli compose status

# Download when complete
composer-cli compose image <compose-uuid>
```

## Uploading to Azure

```bash
# Login to Azure
az login

# Create a storage account for images
az storage account create \
  --name rhelimages \
  --resource-group images-rg \
  --sku Standard_LRS \
  --location eastus

# Get storage key
STORAGE_KEY=$(az storage account keys list \
  --account-name rhelimages \
  --resource-group images-rg \
  --query "[0].value" -o tsv)

# Create a container
az storage container create \
  --name vhds \
  --account-name rhelimages \
  --account-key "$STORAGE_KEY"

# Upload the VHD (must be a fixed-size VHD for Azure)
az storage blob upload \
  --account-name rhelimages \
  --account-key "$STORAGE_KEY" \
  --container-name vhds \
  --type page \
  --file <compose-uuid>-disk.vhd \
  --name rhel-golden-image-v1.0.0.vhd
```

## Creating a Managed Image

```bash
# Create a managed image from the uploaded VHD
az image create \
  --resource-group images-rg \
  --name rhel-golden-v1.0.0 \
  --os-type Linux \
  --source "https://rhelimages.blob.core.windows.net/vhds/rhel-golden-image-v1.0.0.vhd"
```

## Adding to Shared Image Gallery

For multi-region distribution:

```bash
# Create a Shared Image Gallery
az sig create \
  --resource-group images-rg \
  --gallery-name rhel_gallery

# Create an image definition
az sig image-definition create \
  --resource-group images-rg \
  --gallery-name rhel_gallery \
  --gallery-image-definition rhel-golden \
  --publisher MyOrg \
  --offer RHEL \
  --sku 9.4-golden \
  --os-type Linux

# Create an image version
az sig image-version create \
  --resource-group images-rg \
  --gallery-name rhel_gallery \
  --gallery-image-definition rhel-golden \
  --gallery-image-version 1.0.0 \
  --managed-image rhel-golden-v1.0.0 \
  --target-regions eastus westus2
```

## Deploying from the Gallery Image

```bash
az vm create \
  --resource-group prod-rg \
  --name app-server-01 \
  --image "/subscriptions/<sub-id>/resourceGroups/images-rg/providers/Microsoft.Compute/galleries/rhel_gallery/images/rhel-golden/versions/1.0.0" \
  --size Standard_D4s_v5 \
  --admin-username azadmin \
  --ssh-key-values ~/.ssh/id_rsa.pub
```
