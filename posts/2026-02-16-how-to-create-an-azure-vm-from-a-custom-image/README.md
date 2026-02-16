# How to Create an Azure VM from a Custom Image

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machine, Custom Image, Azure CLI, VM Deployment, Image Gallery, Cloud Computing

Description: Learn how to create custom VM images in Azure and use them to deploy consistent, pre-configured virtual machines at scale.

---

Marketplace images are a good starting point, but when you need VMs pre-loaded with your application, specific configurations, or internal tools, a custom image is the way to go. Custom images let you capture a fully configured VM and use it as a template to spin up identical copies. This is especially useful for scaling out web servers, creating consistent development environments, or deploying standardized builds across your organization.

In this post, I will cover how to prepare a VM for imaging, capture the image, and then create new VMs from it.

## The Two Types of Images

Azure supports two types of custom images:

**Generalized images**: The VM has been "sysprep'd" (Windows) or "deprovisioned" (Linux) to remove machine-specific data like hostnames, user accounts, and SSH keys. When you create a VM from a generalized image, Azure sets up the machine as if it were brand new - assigning a new hostname, creating the user account you specify, and generating new SSH keys.

**Specialized images**: The VM is captured as-is, with all user accounts, hostnames, and configurations intact. When you create a VM from a specialized image, it boots up as an exact clone of the original. This is useful for backup/restore scenarios but less flexible for scaling.

For most deployment scenarios, you want a generalized image.

## Preparing a Linux VM for Imaging

Start with a VM that has all your software installed and configured the way you want it. SSH into the VM and do your setup:

```bash
# Example: install your application dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx nodejs npm

# Install your application
cd /opt && sudo git clone https://your-repo-url/your-app.git
cd your-app && sudo npm install

# Configure your services
sudo systemctl enable nginx
sudo systemctl enable your-app
```

Once everything is installed and tested, deprovision the VM:

```bash
# Remove machine-specific data and prepare for imaging
# The -deprovision+user flag removes the default user account too
sudo waagent -deprovision+user -force
```

This command removes SSH host keys, the default user account, the DHCP lease, and other machine-specific data. After running this, do not log back in or reboot the VM - the image capture should be done next.

## Preparing a Windows VM for Imaging

On a Windows VM, the equivalent process uses Sysprep:

1. RDP into the VM and install all your software.
2. Open `C:\Windows\System32\Sysprep\sysprep.exe`.
3. Select "Enter System Out-of-Box Experience (OOBE)."
4. Check "Generalize."
5. Select "Shutdown" from the shutdown options.
6. Click OK.

The VM will run Sysprep and shut down. Do not start it again before capturing the image.

## Capturing the Image

After the VM is deprovisioned/sysprepped and stopped, deallocate it from Azure:

```bash
# Deallocate the VM
az vm deallocate \
  --resource-group myResourceGroup \
  --name myTemplateVM

# Mark the VM as generalized
az vm generalize \
  --resource-group myResourceGroup \
  --name myTemplateVM
```

The `generalize` command tells Azure that this VM has been deprovisioned and should be treated as a generalized image source.

Now capture the image:

```bash
# Create an image from the generalized VM
az image create \
  --resource-group myResourceGroup \
  --name myCustomImage \
  --source myTemplateVM \
  --location eastus
```

This creates a managed image resource. The original VM cannot be started again after this - it is effectively consumed by the imaging process.

## Using Azure Compute Gallery (Recommended)

For production use, Azure Compute Gallery (formerly Shared Image Gallery) is the better approach. It provides versioning, replication across regions, and sharing capabilities.

Create a gallery:

```bash
# Create an Azure Compute Gallery
az sig create \
  --resource-group myResourceGroup \
  --gallery-name myGallery \
  --location eastus
```

Create an image definition in the gallery:

```bash
# Create an image definition that describes the image properties
az sig image-definition create \
  --resource-group myResourceGroup \
  --gallery-name myGallery \
  --gallery-image-definition myAppImage \
  --publisher MyOrg \
  --offer MyApp \
  --sku 1.0 \
  --os-type Linux \
  --os-state Generalized \
  --hyper-v-generation V2
```

Create an image version from your managed image:

```bash
# Create a version of the image and replicate to multiple regions
az sig image-version create \
  --resource-group myResourceGroup \
  --gallery-name myGallery \
  --gallery-image-definition myAppImage \
  --gallery-image-version 1.0.0 \
  --managed-image "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/images/myCustomImage" \
  --target-regions "eastus" "westus2" "westeurope" \
  --replica-count 2
```

The `--target-regions` flag replicates the image to multiple Azure regions, which is essential if you deploy VMs in different geographies. The `--replica-count` specifies how many copies to keep in each region for throughput during high-volume VM creation.

## Creating a VM from the Custom Image

From a managed image:

```bash
# Create a VM from the custom managed image
az vm create \
  --resource-group myResourceGroup \
  --name myAppVM \
  --image myCustomImage \
  --size Standard_D2s_v5 \
  --admin-username azureuser \
  --generate-ssh-keys
```

From an Azure Compute Gallery image:

```bash
# Create a VM from a gallery image version
az vm create \
  --resource-group myResourceGroup \
  --name myAppVM \
  --image "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/galleries/myGallery/images/myAppImage/versions/1.0.0" \
  --size Standard_D2s_v5 \
  --admin-username azureuser \
  --generate-ssh-keys
```

You can also reference the latest version:

```bash
# Use the 'latest' version from the gallery
az vm create \
  --resource-group myResourceGroup \
  --name myAppVM \
  --image "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/galleries/myGallery/images/myAppImage/versions/latest" \
  --size Standard_D2s_v5 \
  --admin-username azureuser \
  --generate-ssh-keys
```

## Scaling with VM Scale Sets

Custom images really shine when combined with VM Scale Sets. You can define an auto-scaling group that automatically creates VMs from your custom image:

```bash
# Create a VM Scale Set using your custom gallery image
az vmss create \
  --resource-group myResourceGroup \
  --name myScaleSet \
  --image "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/galleries/myGallery/images/myAppImage/versions/1.0.0" \
  --instance-count 3 \
  --vm-sku Standard_D2s_v5 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --upgrade-policy-mode Automatic
```

When the scale set needs to add capacity, it creates new VMs from your image. All of them come up with your application pre-installed and configured.

## Updating Your Image

When you need to update the image (new application version, security patches), the process is:

1. Create a new VM from the existing image.
2. Make your updates on the new VM.
3. Deprovision and capture a new image.
4. Create a new image version in the gallery (e.g., 1.1.0).
5. Update your VM Scale Set or deployment scripts to reference the new version.

```bash
# Create a new image version after updating
az sig image-version create \
  --resource-group myResourceGroup \
  --gallery-name myGallery \
  --gallery-image-definition myAppImage \
  --gallery-image-version 1.1.0 \
  --managed-image "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/images/myCustomImageV2" \
  --target-regions "eastus" "westus2" "westeurope" \
  --replica-count 2
```

## Tips and Best Practices

1. **Automate the image build process.** Use tools like Packer (by HashiCorp) to script the entire image creation pipeline. Packer integrates with Azure and can build, provision, and capture images without manual intervention.

2. **Keep images small.** Only include what is necessary. Large images take longer to replicate and slow down VM creation.

3. **Test images before deploying to production.** Spin up a test VM from the image and verify everything works correctly.

4. **Use versioning.** Always create new image versions instead of overwriting existing ones. This gives you a rollback path if something goes wrong.

5. **Set lifecycle policies.** Delete old image versions that are no longer in use. Each version consumes storage, and the replication costs add up.

6. **Use Gen2 images.** Generation 2 images support UEFI boot, larger OS disks, and faster boot times compared to Gen1.

## Wrapping Up

Custom images are the foundation of repeatable, consistent VM deployments on Azure. Whether you are deploying a handful of web servers or managing a fleet of hundreds of VMs through scale sets, starting from a well-built custom image saves time and eliminates configuration drift. Invest in building a solid image pipeline early, and your infrastructure will be easier to manage as it grows.
