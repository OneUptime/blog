# How to Configure Azure Batch Pool with Custom VM Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Batch, Custom Images, VM Image, Shared Image Gallery, HPC, Pool Configuration

Description: A step-by-step guide to creating and using custom VM images for Azure Batch pools, including building images with Packer and using Azure Compute Gallery.

---

The default marketplace images for Azure Batch pools include a base operating system and the Batch node agent, but they do not include your application's dependencies. If your tasks need Python libraries, CUDA drivers, custom software, or specific OS configurations, you have two choices: install everything via a start task (which runs on every node, every time), or create a custom VM image with everything pre-installed. Custom images make pool creation faster and more reliable because nodes boot ready to work.

## Why Use Custom Images?

Start tasks are fine for installing a few packages, but they have limitations:

- They run on every node in the pool, every time a node is provisioned
- A complex start task can take 10-20 minutes, delaying when nodes become available
- Network issues during start tasks can cause nodes to fail
- You are repeating the same installation work across every node

Custom images solve these problems by baking the dependencies into the image itself. Nodes boot in minutes instead of waiting for lengthy installations.

## Step 1: Create a Base VM

Start by creating a VM that you will use to build your custom image.

```bash
# Create a VM from a marketplace image
az vm create \
  --name batch-image-builder \
  --resource-group batch-rg \
  --location eastus \
  --image "Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest" \
  --size Standard_D4s_v3 \
  --admin-username azureuser \
  --generate-ssh-keys
```

## Step 2: Install Your Dependencies

SSH into the VM and install everything your Batch tasks need.

```bash
# SSH into the VM
ssh azureuser@<public-ip>

# Install system dependencies
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y \
  python3-pip \
  python3-venv \
  ffmpeg \
  imagemagick \
  build-essential \
  libopenblas-dev

# Install Python packages
pip3 install numpy pandas scipy scikit-learn pillow

# Install custom software
wget https://example.com/my-tool-v2.tar.gz
tar xzf my-tool-v2.tar.gz
sudo mv my-tool /usr/local/bin/

# Clean up to reduce image size
sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/*
rm -rf /tmp/*
```

Important: Do not install the Azure Batch node agent. Azure Batch installs it automatically when the node joins the pool.

## Step 3: Deprovision and Generalize the VM

Before capturing the image, deprovision the VM to remove machine-specific information.

```bash
# On the VM, run the deprovision command
sudo waagent -deprovision+user -force
exit
```

Then deallocate and generalize from your local machine.

```bash
# Deallocate the VM
az vm deallocate \
  --name batch-image-builder \
  --resource-group batch-rg

# Generalize the VM (cannot be undone)
az vm generalize \
  --name batch-image-builder \
  --resource-group batch-rg
```

## Step 4: Create an Azure Compute Gallery Image

Azure Compute Gallery (formerly Shared Image Gallery) is the recommended way to manage and distribute custom images. It supports versioning, replication across regions, and access control.

```bash
# Create an Azure Compute Gallery
az sig create \
  --resource-group batch-rg \
  --gallery-name batchImageGallery

# Create an image definition
az sig image-definition create \
  --resource-group batch-rg \
  --gallery-name batchImageGallery \
  --gallery-image-definition batch-worker-ubuntu \
  --publisher MyOrg \
  --offer BatchWorker \
  --sku Ubuntu2204 \
  --os-type Linux \
  --os-state generalized \
  --hyper-v-generation V2

# Get the VM resource ID
VM_ID=$(az vm show \
  --name batch-image-builder \
  --resource-group batch-rg \
  --query "id" -o tsv)

# Create an image version from the generalized VM
az sig image-version create \
  --resource-group batch-rg \
  --gallery-name batchImageGallery \
  --gallery-image-definition batch-worker-ubuntu \
  --gallery-image-version 1.0.0 \
  --managed-image $VM_ID \
  --target-regions eastus westus2 \
  --replica-count 1
```

The `--target-regions` flag replicates the image to multiple regions, so you can create Batch pools in any of those regions without cross-region image copying.

## Step 5: Create a Batch Pool with the Custom Image

Now use the gallery image when creating your Batch pool.

```bash
# Get the image version ID
IMAGE_ID=$(az sig image-version show \
  --resource-group batch-rg \
  --gallery-name batchImageGallery \
  --gallery-image-definition batch-worker-ubuntu \
  --gallery-image-version 1.0.0 \
  --query "id" -o tsv)

# Create a Batch pool using the custom image
az batch pool create \
  --id custom-image-pool \
  --vm-size Standard_D4s_v3 \
  --target-dedicated-nodes 5 \
  --image $IMAGE_ID \
  --node-agent-sku-id "batch.node.ubuntu 22.04"
```

The `--node-agent-sku-id` must match the OS of your custom image. Use `az batch pool supported-images list` to find the correct agent SKU.

## Step 6: Automate Image Building with Packer

Manually building images is fine for one-off tasks, but for repeatable, version-controlled image builds, use Packer.

Create a Packer template.

```json
{
  "variables": {
    "client_id": "{{env `ARM_CLIENT_ID`}}",
    "client_secret": "{{env `ARM_CLIENT_SECRET`}}",
    "subscription_id": "{{env `ARM_SUBSCRIPTION_ID`}}",
    "tenant_id": "{{env `ARM_TENANT_ID`}}"
  },
  "builders": [
    {
      "type": "azure-arm",
      "client_id": "{{user `client_id`}}",
      "client_secret": "{{user `client_secret`}}",
      "subscription_id": "{{user `subscription_id`}}",
      "tenant_id": "{{user `tenant_id`}}",
      "managed_image_resource_group_name": "batch-rg",
      "managed_image_name": "batch-worker-{{timestamp}}",
      "os_type": "Linux",
      "image_publisher": "Canonical",
      "image_offer": "0001-com-ubuntu-server-jammy",
      "image_sku": "22_04-lts",
      "location": "eastus",
      "vm_size": "Standard_D4s_v3"
    }
  ],
  "provisioners": [
    {
      "type": "shell",
      "inline": [
        "sudo apt-get update",
        "sudo apt-get install -y python3-pip ffmpeg imagemagick",
        "pip3 install numpy pandas scipy scikit-learn",
        "sudo apt-get clean",
        "sudo rm -rf /var/lib/apt/lists/*"
      ]
    },
    {
      "type": "shell",
      "inline": [
        "sudo /usr/sbin/waagent -force -deprovision+user && export HISTSIZE=0 && sync"
      ]
    }
  ]
}
```

Build the image with Packer.

```bash
# Build the custom image using Packer
packer build batch-image.json
```

## Step 7: Update Images with Versioning

When you need to update dependencies, create a new image version instead of replacing the old one.

```bash
# Create a new version of the image
az sig image-version create \
  --resource-group batch-rg \
  --gallery-name batchImageGallery \
  --gallery-image-definition batch-worker-ubuntu \
  --gallery-image-version 1.1.0 \
  --managed-image "/subscriptions/{sub-id}/resourceGroups/batch-rg/providers/Microsoft.Compute/images/batch-worker-new" \
  --target-regions eastus westus2
```

Then update the pool to use the new version. Note that existing nodes keep the old image. New nodes provisioned after the update use the new image.

## Image Build Pipeline

Here is the recommended workflow for managing custom images.

```mermaid
graph LR
    A[Source Code + Packer Template] --> B[CI Pipeline]
    B --> C[Packer Build]
    C --> D[Managed Image]
    D --> E[Azure Compute Gallery]
    E --> F[Batch Pool Creation]
    F --> G[Compute Nodes Ready]
```

## Best Practices

1. **Keep images small.** Every GB in the image adds time to node provisioning. Remove unnecessary packages, logs, and caches before capturing.

2. **Version your images.** Use semantic versioning (1.0.0, 1.1.0, 2.0.0) so you can track which version is running on which pool.

3. **Test images before production use.** Create a small test pool with 1-2 nodes, run your tasks, and verify everything works before scaling up.

4. **Use Compute Gallery for multi-region deployments.** Replicating images to the regions where you create pools avoids slow cross-region image copies during pool creation.

5. **Automate image builds in CI/CD.** Use Packer in your CI pipeline to build new images automatically when dependencies change.

## Troubleshooting

**Nodes stuck in "unusable" state:** The node agent SKU might not match the image OS. Verify you are using the correct `node-agent-sku-id`.

**Image not found during pool creation:** Check that the Batch account has access to the Compute Gallery. For cross-subscription setups, you need explicit RBAC role assignments.

**Long pool creation times:** If the image is large or not replicated to the pool's region, provisioning is slower. Replicate the image to the target region and reduce image size.

**Start task still needed after custom image:** Some configuration that changes per-pool (like setting up environment-specific files) should stay in the start task. Use the custom image for static dependencies and the start task for dynamic configuration.

## Summary

Custom VM images for Azure Batch pools eliminate the overhead of installing dependencies on every node at startup. Build an image with your software pre-installed, store it in Azure Compute Gallery for versioning and regional replication, and reference it when creating pools. Automate the image build process with Packer and a CI pipeline so you can update dependencies reliably. The upfront effort of creating custom images pays off quickly in faster pool provisioning and more reliable node startup.
