# How to Use Azure Shared Image Gallery to Distribute VM Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Shared Image Gallery, VM Images, Image Management, Cloud Infrastructure, DevOps

Description: A practical guide to creating and managing Azure Shared Image Gallery for distributing custom VM images across regions and subscriptions.

---

If you have ever built a custom VM image in Azure and then needed to use it in multiple regions or share it across subscriptions, you know the manual process is painful. You end up copying VHDs between storage accounts, dealing with SAS tokens, and managing versions by hand. Azure Shared Image Gallery (now called Azure Compute Gallery) solves this by giving you a structured way to store, version, replicate, and share VM images.

I started using Shared Image Gallery after spending an afternoon manually copying a golden image to six different regions for a multi-region deployment. That was the last time I did it the hard way.

## How Shared Image Gallery Works

The structure has three levels:

1. **Gallery**: The top-level container. Think of it as a repository or registry.
2. **Image Definition**: A logical grouping within the gallery. It describes the image metadata - OS type, publisher, offer, SKU - but does not contain the actual image bits.
3. **Image Version**: The actual image content. Each version is a snapshot of a VM or managed image that can be replicated to multiple Azure regions.

This hierarchy means you can have multiple versions of the same image (for rollback), replicate each version to whatever regions you need, and share the gallery with other subscriptions or tenants.

## Creating a Gallery

Start by creating the gallery resource:

```bash
# Create a resource group for the gallery
az group create --name imageGalleryRG --location eastus

# Create the gallery
az sig create \
  --resource-group imageGalleryRG \
  --gallery-name myImageGallery \
  --description "Golden images for production workloads"
```

## Creating an Image Definition

Next, create an image definition. This is the template that describes what kind of images the definition holds:

```bash
# Create an image definition for Ubuntu-based app servers
az sig image-definition create \
  --resource-group imageGalleryRG \
  --gallery-name myImageGallery \
  --gallery-image-definition ubuntu-appserver \
  --publisher myOrg \
  --offer appserver \
  --sku 22.04-LTS \
  --os-type Linux \
  --os-state Generalized \
  --description "Ubuntu 22.04 with app server stack pre-installed"
```

A few important choices here:

**os-state**: Choose between `Generalized` and `Specialized`. Generalized images have been through sysprep (Windows) or waagent deprovisioning (Linux) and can be used to create new VMs with unique identities. Specialized images are exact copies, keeping the hostname, users, and machine identity intact.

**Hyper-V generation**: If your image uses Gen2, add `--hyper-v-generation V2` to the command.

## Building a Source Image

Before you can create an image version, you need a source. The typical workflow is to create a VM, configure it exactly how you want, and then capture it.

```bash
# Create a VM to use as the source
az vm create \
  --resource-group imageGalleryRG \
  --name sourceVM \
  --image Ubuntu2204 \
  --size Standard_D2s_v5 \
  --admin-username azureuser \
  --generate-ssh-keys

# SSH in and install your software stack
ssh azureuser@<public-ip>

# Inside the VM - install your applications
# sudo apt update && sudo apt install -y nginx nodejs npm
# Configure everything as needed

# When done, deprovision the VM for generalization
sudo waagent -deprovision+user -force
exit

# Deallocate and generalize the VM
az vm deallocate --resource-group imageGalleryRG --name sourceVM
az vm generalize --resource-group imageGalleryRG --name sourceVM
```

## Creating an Image Version

Now capture the VM into the gallery as an image version:

```bash
# Get the source VM's resource ID
SOURCE_VM_ID=$(az vm show \
  --resource-group imageGalleryRG \
  --name sourceVM \
  --query id -o tsv)

# Create an image version with replication to multiple regions
az sig image-version create \
  --resource-group imageGalleryRG \
  --gallery-name myImageGallery \
  --gallery-image-definition ubuntu-appserver \
  --gallery-image-version 1.0.0 \
  --managed-image $SOURCE_VM_ID \
  --target-regions "eastus=2" "westus2=1" "westeurope=1" \
  --replica-count 1
```

The `--target-regions` parameter is where the magic happens. The format is `region=replica-count`. In this example, the image gets replicated to three regions: East US with 2 replicas, West US 2 with 1 replica, and West Europe with 1 replica. More replicas in a region means more simultaneous VM deployments can pull from the image without throttling.

## Deploying VMs from Gallery Images

Once the image version is replicated, you can create VMs from it in any target region:

```bash
# Create a VM from the gallery image in West Europe
az vm create \
  --resource-group myAppRG \
  --name appserver-01 \
  --image "/subscriptions/<sub-id>/resourceGroups/imageGalleryRG/providers/Microsoft.Compute/galleries/myImageGallery/images/ubuntu-appserver/versions/1.0.0" \
  --location westeurope \
  --size Standard_D2s_v5 \
  --admin-username azureuser \
  --generate-ssh-keys

# Or use the 'latest' version shorthand
az vm create \
  --resource-group myAppRG \
  --name appserver-02 \
  --image "/subscriptions/<sub-id>/resourceGroups/imageGalleryRG/providers/Microsoft.Compute/galleries/myImageGallery/images/ubuntu-appserver" \
  --location eastus \
  --size Standard_D2s_v5 \
  --admin-username azureuser \
  --generate-ssh-keys
```

When you do not specify a version, Azure automatically uses the latest version. This is convenient for automation but can be surprising if you publish a new version that has issues. For production, I recommend pinning to a specific version.

## Managing Versions

Over time, you will accumulate image versions. Here is how to manage them:

```bash
# List all versions of an image definition
az sig image-version list \
  --resource-group imageGalleryRG \
  --gallery-name myImageGallery \
  --gallery-image-definition ubuntu-appserver \
  --query "[].{Version:name, Date:publishingProfile.publishedDate, Regions:publishingProfile.targetRegions[].name}" \
  -o table

# Update replication targets for an existing version
az sig image-version update \
  --resource-group imageGalleryRG \
  --gallery-name myImageGallery \
  --gallery-image-definition ubuntu-appserver \
  --gallery-image-version 1.0.0 \
  --target-regions "eastus=2" "westus2=1" "westeurope=1" "southeastasia=1"

# Set an end-of-life date for an old version
az sig image-version update \
  --resource-group imageGalleryRG \
  --gallery-name myImageGallery \
  --gallery-image-definition ubuntu-appserver \
  --gallery-image-version 1.0.0 \
  --end-of-life-date 2026-06-01

# Delete an old version
az sig image-version delete \
  --resource-group imageGalleryRG \
  --gallery-name myImageGallery \
  --gallery-image-definition ubuntu-appserver \
  --gallery-image-version 1.0.0
```

## Sharing Across Subscriptions and Tenants

One of the most useful features is sharing. You can share a gallery with other subscriptions in the same tenant, or even with external tenants.

### Sharing Within the Same Tenant

Use RBAC to grant access to other subscriptions:

```bash
# Grant Reader access to a specific subscription's service principal
az role assignment create \
  --role "Reader" \
  --assignee <service-principal-id> \
  --scope "/subscriptions/<source-sub>/resourceGroups/imageGalleryRG/providers/Microsoft.Compute/galleries/myImageGallery"
```

### Community Gallery

For broader sharing, you can publish your gallery as a community gallery. This makes images available to anyone with the gallery's public name, without needing RBAC assignments.

```bash
# Enable community gallery sharing
az sig share enable-community \
  --resource-group imageGalleryRG \
  --gallery-name myImageGallery \
  --publisher-uri "https://myorg.com" \
  --publisher-email "images@myorg.com" \
  --eula "https://myorg.com/eula" \
  --public-name-prefix "myorg"
```

## Automating Image Builds

For production workflows, you should automate image creation. Azure Image Builder integrates with Shared Image Gallery to build images on a schedule or triggered by CI/CD.

Here is a simplified Image Builder template that builds and publishes to a gallery:

```json
{
  "type": "Microsoft.VirtualMachineImages/imageTemplates",
  "apiVersion": "2022-02-14",
  "location": "eastus",
  "properties": {
    "source": {
      "type": "PlatformImage",
      "publisher": "Canonical",
      "offer": "0001-com-ubuntu-server-jammy",
      "sku": "22_04-lts-gen2",
      "version": "latest"
    },
    "customize": [
      {
        "type": "Shell",
        "name": "InstallPackages",
        "inline": [
          "sudo apt update",
          "sudo apt install -y nginx nodejs npm",
          "sudo systemctl enable nginx"
        ]
      }
    ],
    "distribute": [
      {
        "type": "SharedImage",
        "galleryImageId": "/subscriptions/<sub-id>/resourceGroups/imageGalleryRG/providers/Microsoft.Compute/galleries/myImageGallery/images/ubuntu-appserver",
        "runOutputName": "ubuntu-appserver",
        "replicationRegions": ["eastus", "westus2", "westeurope"]
      }
    ]
  }
}
```

## Versioning Strategy

I recommend a semantic versioning approach for image versions:

- **Major version** (1.0.0 to 2.0.0): OS upgrade or breaking changes to the software stack
- **Minor version** (1.0.0 to 1.1.0): New software packages added or significant configuration changes
- **Patch version** (1.0.0 to 1.0.1): Security patches and minor updates

This makes it easy to communicate what changed between versions and helps teams decide when to update their deployments.

## Cost Considerations

Shared Image Gallery charges for storage of each replica in each region. If you have 10 image versions, each replicated to 5 regions with 2 replicas each, that is 100 copies of your image stored. Old versions add up. Set end-of-life dates and clean up versions you no longer need.

The replication itself is free - you only pay for storage. But the storage costs for managed disk snapshots can be meaningful at scale.

## Monitoring Image Deployments

When teams across your organization use shared gallery images, you want visibility into which versions are deployed where. Azure Resource Graph can help with this:

```bash
# Find all VMs created from a specific gallery image
az graph query -q "
  Resources
  | where type == 'microsoft.compute/virtualmachines'
  | where properties.storageProfile.imageReference.id contains 'myImageGallery'
  | project name, resourceGroup, location,
    imageVersion=properties.storageProfile.imageReference.id
"
```

Pairing this with OneUptime monitoring on your deployed VMs gives you end-to-end visibility from image publication to running workload health.

## Wrapping Up

Azure Shared Image Gallery turns ad-hoc image management into a structured, scalable process. Create a gallery, define your image types, publish versions with multi-region replication, and share with whoever needs access. Automate the build pipeline with Image Builder, version your images deliberately, and clean up old versions to control costs. Once the gallery is set up, deploying consistent VMs across any region becomes a one-liner.
