# How to Capture a Generalized Image from an Azure Virtual Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machine, Generalized Image, VM Image, Azure CLI, Azure Compute Gallery, Cloud Infrastructure

Description: Step-by-step instructions for capturing a generalized image from an Azure VM to create reusable templates for deploying identical machines.

---

When you have spent time configuring a VM with all the right packages, settings, and application code, you probably do not want to repeat that process every time you need a new instance. Capturing a generalized image lets you create a golden template that you can use to spin up identical VMs on demand. The image strips out machine-specific data while preserving all your installed software and configurations.

This guide covers the end-to-end process: preparing the VM, capturing the image, storing it in Azure Compute Gallery, and deploying new VMs from it.

## Generalized vs. Specialized Images

Before we start, let me clarify the distinction:

A **generalized** image has been cleaned of machine-specific data - hostname, user accounts, SSH keys, machine ID, and similar identifiers. When you deploy a VM from it, Azure runs the provisioning process to set up a new hostname, create the user account you specify, and configure networking. This is what you want for creating templates.

A **specialized** image is an exact copy of the VM, including all accounts and hostnames. It is like cloning a machine. This is useful for creating backups but not for deploying multiple unique instances.

For template-based deployment, always use generalized images.

## Step 1: Prepare the Linux VM

SSH into the VM that you want to image. First, make sure all your software is installed and configured correctly. Test everything before proceeding - once you generalize the VM, you cannot undo it without recreating the machine.

Clean up unnecessary files to keep the image small:

```bash
# Clean up apt cache to reduce image size
sudo apt clean

# Remove temporary files
sudo rm -rf /tmp/*

# Clear bash history
history -c

# Remove cloud-init logs so the next boot runs fresh initialization
sudo cloud-init clean --logs
```

Now deprovision the VM. This removes machine-specific data:

```bash
# Deprovision the VM - removes user account, SSH keys, hostname, etc.
# WARNING: This is irreversible - do not log back in after running this
sudo waagent -deprovision+user -force
```

The flags mean:
- `-deprovision`: Remove SSH host keys, DHCP lease, root password, and cached user data.
- `+user`: Also remove the last provisioned user account and its home directory.
- `-force`: Do not prompt for confirmation.

After this command, log out immediately. Do not reboot or log back in.

```bash
# Exit the SSH session
exit
```

## Step 2: Prepare a Windows VM

For Windows, the process uses Sysprep:

1. RDP into the VM and finalize all your software installations.
2. Open a command prompt and navigate to Sysprep:

```powershell
# Navigate to the Sysprep directory
cd C:\Windows\System32\Sysprep
```

3. Run Sysprep with the OOBE and generalize options:

```powershell
# Run Sysprep to generalize the Windows installation
.\sysprep.exe /oobe /generalize /shutdown
```

The VM will shut down automatically after Sysprep completes. Do not start it again before capturing the image.

## Step 3: Deallocate and Generalize in Azure

From your local machine (not inside the VM), deallocate the VM and mark it as generalized:

```bash
# Deallocate the VM
az vm deallocate \
  --resource-group myResourceGroup \
  --name myTemplateVM

# Mark the VM as generalized in Azure
az vm generalize \
  --resource-group myResourceGroup \
  --name myTemplateVM
```

The `generalize` command tells Azure's resource manager that this VM has been deprovisioned and should be treated as an image source. After this, the VM can no longer be started - it exists only as an image source.

## Step 4: Create a Managed Image

The simplest approach is to create a managed image directly:

```bash
# Capture the VM as a managed image
az image create \
  --resource-group myResourceGroup \
  --name myAppImage-v1 \
  --source myTemplateVM \
  --location eastus \
  --hyper-v-generation V2
```

Use `--hyper-v-generation V2` for Gen2 images, which support UEFI boot and are recommended for new deployments.

You can now create VMs from this managed image:

```bash
# Create a new VM from the managed image
az vm create \
  --resource-group myResourceGroup \
  --name webServer1 \
  --image myAppImage-v1 \
  --size Standard_D2s_v5 \
  --admin-username azureuser \
  --generate-ssh-keys
```

However, managed images have limitations: they are region-specific and do not support versioning. For production use, Azure Compute Gallery is the better option.

## Step 5: Store in Azure Compute Gallery (Recommended)

Azure Compute Gallery provides image versioning, multi-region replication, and organization-wide sharing.

Create the gallery if you do not already have one:

```bash
# Create an Azure Compute Gallery
az sig create \
  --resource-group myResourceGroup \
  --gallery-name myImageGallery \
  --location eastus
```

Create an image definition. This describes the image's properties:

```bash
# Create an image definition in the gallery
az sig image-definition create \
  --resource-group myResourceGroup \
  --gallery-name myImageGallery \
  --gallery-image-definition myWebApp \
  --publisher MyCompany \
  --offer WebApp \
  --sku Production \
  --os-type Linux \
  --os-state Generalized \
  --hyper-v-generation V2 \
  --description "Web application server image with nginx and Node.js"
```

Now create an image version from your generalized VM:

```bash
# Get the VM resource ID
VM_ID=$(az vm show \
  --resource-group myResourceGroup \
  --name myTemplateVM \
  --query id \
  --output tsv)

# Create an image version in the gallery
az sig image-version create \
  --resource-group myResourceGroup \
  --gallery-name myImageGallery \
  --gallery-image-definition myWebApp \
  --gallery-image-version 1.0.0 \
  --managed-image $VM_ID \
  --target-regions "eastus=2" "westus2=1" "westeurope=1" \
  --storage-account-type Standard_LRS
```

The `--target-regions` parameter specifies which regions to replicate to and how many replicas to keep in each region. The number after `=` is the replica count. More replicas in a region allow higher throughput when creating many VMs simultaneously.

## Step 6: Deploy VMs from the Gallery Image

Create VMs using the gallery image:

```bash
# Deploy a VM from the gallery image - specific version
az vm create \
  --resource-group myResourceGroup \
  --name webServer1 \
  --image "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/galleries/myImageGallery/images/myWebApp/versions/1.0.0" \
  --size Standard_D2s_v5 \
  --admin-username azureuser \
  --generate-ssh-keys

# Or use 'latest' to always get the newest version
az vm create \
  --resource-group myResourceGroup \
  --name webServer2 \
  --image "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/galleries/myImageGallery/images/myWebApp/versions/latest" \
  --size Standard_D2s_v5 \
  --admin-username azureuser \
  --generate-ssh-keys
```

## Managing Image Versions

Over time, you will create new versions as your application evolves. List existing versions:

```bash
# List all versions of an image definition
az sig image-version list \
  --resource-group myResourceGroup \
  --gallery-name myImageGallery \
  --gallery-image-definition myWebApp \
  --output table
```

Delete old versions to save storage costs:

```bash
# Delete an old image version
az sig image-version delete \
  --resource-group myResourceGroup \
  --gallery-name myImageGallery \
  --gallery-image-definition myWebApp \
  --gallery-image-version 1.0.0
```

## Automating Image Creation with Packer

For repeatable image builds, HashiCorp Packer is the industry standard. Packer can create Azure images from a configuration file:

```json
{
  "builders": [{
    "type": "azure-arm",
    "subscription_id": "{{user `subscription_id`}}",
    "managed_image_resource_group_name": "myResourceGroup",
    "managed_image_name": "myAppImage-{{timestamp}}",
    "os_type": "Linux",
    "image_publisher": "Canonical",
    "image_offer": "0001-com-ubuntu-server-jammy",
    "image_sku": "22_04-lts-gen2",
    "location": "eastus",
    "vm_size": "Standard_D2s_v5"
  }],
  "provisioners": [{
    "type": "shell",
    "inline": [
      "sudo apt update && sudo apt upgrade -y",
      "sudo apt install -y nginx nodejs npm",
      "sudo systemctl enable nginx"
    ]
  }]
}
```

Run the build with:

```bash
# Build the image using Packer
packer build myimage.json
```

Packer handles the entire lifecycle: creates a temporary VM, runs your provisioning scripts, generalizes the VM, captures the image, and cleans up the temporary resources. This is much more reliable than doing it manually and integrates well with CI/CD pipelines.

## Best Practices

1. **Version your images with semantic versioning.** Use major.minor.patch format (1.0.0, 1.1.0, 2.0.0) to track changes clearly.
2. **Test before deploying.** Always create a test VM from a new image version and verify it works before updating production.
3. **Keep a changelog.** Document what changed in each image version so you can troubleshoot issues later.
4. **Set replication to complete before deploying.** Image version creation returns before replication to all target regions is finished. Wait for replication to complete before deploying VMs in remote regions.
5. **Use lifecycle policies.** Automatically delete image versions older than a certain age to control storage costs.

## Wrapping Up

Capturing generalized images is the foundation of scalable VM management on Azure. The process is straightforward - prepare the VM, deprovision it, capture the image, and store it in a gallery. With Azure Compute Gallery, you get versioning, multi-region replication, and sharing capabilities that make it practical for teams and organizations of any size. Combine this with Packer for automated builds, and you have a solid image management pipeline.
