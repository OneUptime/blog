# How to Create an Azure Virtual Machine Using the Azure CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machine, Azure CLI, Cloud Computing, IaaS, DevOps, Infrastructure

Description: Step-by-step guide to creating an Azure Virtual Machine using the Azure CLI with practical examples and best practices.

---

The Azure portal is fine for a quick click-through, but if you are managing infrastructure at scale, you will want to reach for the Azure CLI. It is scriptable, repeatable, and a lot faster once you know the commands. In this guide, I will walk through the entire process of creating a virtual machine on Azure using the CLI, from installing the tool to verifying your VM is running.

## Prerequisites

Before you begin, make sure you have the following ready:

- An active Azure subscription. If you do not have one, you can sign up for a free account that comes with $200 in credits.
- The Azure CLI installed on your local machine. You can install it on macOS, Linux, or Windows.
- A terminal or command prompt where you can run commands.

## Installing the Azure CLI

If you have not installed the Azure CLI yet, here is how to get it on the most common platforms.

On macOS using Homebrew:

```bash
# Install Azure CLI via Homebrew package manager
brew update && brew install azure-cli
```

On Ubuntu or Debian-based Linux:

```bash
# Use Microsoft's install script for Debian/Ubuntu
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

On Windows, you can download the MSI installer from the official Microsoft documentation page, or if you use winget:

```bash
# Install using Windows Package Manager
winget install -e --id Microsoft.AzureCLI
```

Verify the installation by checking the version:

```bash
# Confirm the CLI is installed and check its version
az version
```

## Logging In

Before you can create any resources, you need to authenticate:

```bash
# Open a browser-based login flow to authenticate
az login
```

This command opens a browser window where you sign in with your Azure credentials. Once authenticated, the CLI stores your session locally. If you are working on a headless server, use `az login --use-device-code` instead, which gives you a code to enter at a URL from any browser.

After logging in, verify your active subscription:

```bash
# List all subscriptions and show which one is currently active
az account show --output table
```

If you have multiple subscriptions, set the one you want to use:

```bash
# Set the active subscription by name or ID
az account set --subscription "My Subscription Name"
```

## Creating a Resource Group

Every Azure resource lives inside a resource group. Think of it as a folder that groups related resources together. You can delete the entire group later to clean up everything at once.

```bash
# Create a new resource group in the East US region
az group create \
  --name myResourceGroup \
  --location eastus
```

Pick a location close to your users or your other infrastructure. You can list all available locations with:

```bash
# Show all Azure regions available for your subscription
az account list-locations --output table
```

## Choosing a VM Image

Azure has a marketplace full of VM images. You can search for available images using the CLI:

```bash
# List popular VM images from the marketplace
az vm image list --output table
```

This shows a curated list of common images. For a more exhaustive search, add the `--all` flag along with filters:

```bash
# Search for all Ubuntu Server 22.04 LTS images from Canonical
az vm image list \
  --offer 0001-com-ubuntu-server-jammy \
  --publisher Canonical \
  --sku 22_04-lts-gen2 \
  --all \
  --output table
```

For this guide, we will use `Ubuntu2204` as our image, which is one of the built-in aliases.

## Choosing a VM Size

VM sizes determine how much CPU, memory, and temporary storage your VM gets. List the available sizes in your chosen region:

```bash
# List all VM sizes available in East US
az vm list-sizes --location eastus --output table
```

For a basic general-purpose VM, `Standard_B2s` is a reasonable starting point. It gives you 2 vCPUs and 4 GB of RAM, which is enough for development workloads and light production use.

## Creating the Virtual Machine

Now for the main event. This single command creates the VM along with all the supporting resources like a virtual network, subnet, public IP, and network security group:

```bash
# Create an Ubuntu VM with SSH key authentication
az vm create \
  --resource-group myResourceGroup \
  --name myVM \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --output json
```

Let me break down what each flag does:

- `--resource-group`: The resource group we created earlier.
- `--name`: The name for your virtual machine.
- `--image`: The OS image to use. `Ubuntu2204` is an alias for Ubuntu 22.04 LTS.
- `--size`: The VM size that determines compute resources.
- `--admin-username`: The username for the administrator account.
- `--generate-ssh-keys`: Creates an SSH key pair if one does not already exist at `~/.ssh/id_rsa`.

The command will take a minute or two. When it finishes, you will see JSON output that includes the public IP address of your new VM.

## Connecting to Your VM

Grab the public IP from the creation output, or query for it:

```bash
# Get the public IP address of the VM
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --show-details \
  --query publicIps \
  --output tsv
```

Then SSH into the machine:

```bash
# Connect to the VM via SSH
ssh azureuser@<your-public-ip>
```

If the SSH key was generated by Azure, it will already be in your `~/.ssh` directory, so the connection should work without any extra configuration.

## Opening Ports

By default, only SSH (port 22) is open. If you are running a web server, you will need to open ports 80 and 443:

```bash
# Open port 80 for HTTP traffic
az vm open-port \
  --resource-group myResourceGroup \
  --name myVM \
  --port 80 \
  --priority 1010

# Open port 443 for HTTPS traffic
az vm open-port \
  --resource-group myResourceGroup \
  --name myVM \
  --port 443 \
  --priority 1020
```

Each rule needs a unique priority number. Lower numbers mean higher priority.

## Managing the VM Lifecycle

Once your VM is running, you will frequently need to stop, start, or restart it.

```bash
# Stop the VM (deallocates compute resources to stop billing)
az vm deallocate --resource-group myResourceGroup --name myVM

# Start the VM back up
az vm start --resource-group myResourceGroup --name myVM

# Restart the VM
az vm restart --resource-group myResourceGroup --name myVM

# Check the current power state
az vm get-instance-view \
  --resource-group myResourceGroup \
  --name myVM \
  --query instanceView.statuses[1].displayStatus \
  --output tsv
```

Note the difference between `az vm stop` and `az vm deallocate`. The `stop` command shuts down the OS but keeps the VM allocated, which means you still get billed for compute. The `deallocate` command releases the compute resources entirely, so you only pay for storage.

## Using Custom Data for Initialization

If you want the VM to run a setup script on first boot, use the `--custom-data` flag with a cloud-init script:

```bash
# Create the VM with a cloud-init script that installs nginx
az vm create \
  --resource-group myResourceGroup \
  --name myWebServer \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --custom-data cloud-init.yaml
```

Here is an example `cloud-init.yaml` file:

```yaml
#cloud-config
# Install and start nginx on first boot
package_upgrade: true
packages:
  - nginx
runcmd:
  - systemctl start nginx
  - systemctl enable nginx
```

This is extremely useful for automating your provisioning process.

## Cleaning Up

When you are done experimenting, delete the entire resource group to remove all associated resources:

```bash
# Delete the resource group and all resources inside it
az group delete --name myResourceGroup --yes --no-wait
```

The `--no-wait` flag returns immediately instead of waiting for the deletion to complete, which can take several minutes.

## Wrapping Up

Creating Azure VMs from the CLI is straightforward once you get the hang of it. The real power comes from scripting these commands into repeatable workflows. You can put them in a bash script, embed them in a CI/CD pipeline, or use them as the foundation before moving to something like Terraform or Bicep. Start with the CLI to understand what is happening under the hood, and then graduate to infrastructure-as-code tools when your needs grow. The important thing is that every step is documented, version-controlled, and reproducible.
