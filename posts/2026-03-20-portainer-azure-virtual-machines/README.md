# How to Deploy Portainer on Azure Virtual Machines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure, Virtual Machine, Docker, Cloud, Self-Hosted, DevOps

Description: Deploy Portainer on an Azure Virtual Machine with Network Security Group rules, managed disks, and optional Azure Container Registry integration.

## Introduction

Azure Virtual Machines provide a reliable platform for running Portainer in the cloud. With Azure's Network Security Groups, Managed Disks, and integration with Azure Container Registry (ACR), you can build a production-ready container management environment. This guide covers VM creation, security configuration, and Azure-specific integrations.

## Prerequisites

- Azure subscription with VM creation permissions
- Azure CLI installed (optional)
- SSH key pair

## Step 1: Create the Virtual Machine

### Via Azure Portal

1. Navigate to **Virtual Machines > Create**
2. Configure:
   - **Subscription**: Your subscription
   - **Resource Group**: Create new: `portainer-rg`
   - **Name**: `portainer-vm`
   - **Region**: Choose closest region
   - **Image**: Ubuntu Server 24.04 LTS
   - **Size**: `Standard_B2s` (2 vCPU, 4GB RAM) minimum
3. Under **Administrator account**, select **SSH public key**
4. Upload or paste your public key
5. Under **Inbound port rules**, select **SSH (22)**
6. Click **Review + create**

### Via Azure CLI

```bash
# Login to Azure

az login

# Create resource group
az group create \
  --name portainer-rg \
  --location eastus

# Create VM
az vm create \
  --resource-group portainer-rg \
  --name portainer-vm \
  --image Ubuntu2404 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard
```

## Step 2: Configure Network Security Group

### Via Portal

1. Go to your VM's **Networking** settings
2. Click **Add inbound port rule**
3. Add rules:
   - Priority 310: TCP 9443 from your IP
   - Priority 320: TCP 9000 from your IP (optional, legacy HTTP only)
   - Priority 330: TCP 80 from Internet (if needed)
   - Priority 340: TCP 443 from Internet (if needed)

### Via Azure CLI

```bash
# Get your public IP
MY_IP=$(curl -s https://checkip.amazonaws.com)

# Add Portainer HTTPS rule
az network nsg rule create \
  --resource-group portainer-rg \
  --nsg-name portainer-vmNSG \
  --name AllowPortainer9443 \
  --protocol tcp \
  --priority 310 \
  --destination-port-range 9443 \
  --source-address-prefixes ${MY_IP}/32 \
  --access allow

# Optional: add legacy HTTP access on port 9000 only if you plan to publish it
az network nsg rule create \
  --resource-group portainer-rg \
  --nsg-name portainer-vmNSG \
  --name AllowPortainer9000 \
  --protocol tcp \
  --priority 320 \
  --destination-port-range 9000 \
  --source-address-prefixes ${MY_IP}/32 \
  --access allow
```

## Step 3: Install Docker on the VM

```bash
# SSH to the VM
ssh azureuser@<vm-public-ip>

# Update packages and install Docker from Docker's apt repository
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker

# Optional: run Docker without sudo in the current shell
sudo usermod -aG docker $USER
newgrp docker
```

## Step 4: Attach a Managed Data Disk

```bash
# Via Azure CLI, attach a 64GB Premium SSD
az vm disk attach \
  --resource-group portainer-rg \
  --vm-name portainer-vm \
  --name portainer-data-disk \
  --size-gb 64 \
  --sku Premium_LRS \
  --new

# On the VM, format and mount
sudo lsblk
# Replace /dev/sdc below if your new data disk uses a different device name
sudo parted /dev/sdc --script mklabel gpt mkpart primary ext4 0% 100%
sudo mkfs.ext4 /dev/sdc1
sudo partprobe /dev/sdc1
sudo mkdir -p /data
sudo mount /dev/sdc1 /data
DATA_UUID=$(sudo blkid -s UUID -o value /dev/sdc1)
echo "UUID=${DATA_UUID} /data ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
sudo mount -a

# Configure Docker to use data disk
sudo mkdir -p /data/docker
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "data-root": "/data/docker"
}
EOF
sudo systemctl restart docker
```

## Step 5: Deploy Portainer

```bash
docker volume create portainer_data

# Add -p 9000:9000 only if you need legacy HTTP access.
docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 6: Integrate with Azure Container Registry

```bash
# Login to ACR
az acr login --name yourregistryname

# If you want to use admin credentials in Portainer, enable the admin user
az acr update --name yourregistryname --admin-enabled true

# Get the login server and credentials for Portainer
az acr show --name yourregistryname --query loginServer -o tsv
az acr credential show --name yourregistryname
```

In Portainer, add ACR as a registry:
1. Navigate to **Registries > Add registry**
2. Select **Azure**
3. Enter your ACR login server, for example the value returned by `az acr show --name yourregistryname --query loginServer -o tsv`
4. Enter the username and password from the credentials output

## Step 7: Configure Auto-Shutdown (Cost Savings)

For development VMs, configure auto-shutdown:

```bash
# Time is in UTC by default.
az vm auto-shutdown \
  --resource-group portainer-rg \
  --name portainer-vm \
  --time 2300 \
  --email yourname@example.com
```

## Conclusion

Portainer on Azure VM provides a straightforward cloud container management solution with familiar Azure security controls. Managed Disks ensure data persistence and support snapshots, while Azure Container Registry integration enables private image management. Network Security Groups keep Portainer access restricted to authorized sources.
