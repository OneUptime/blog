# How to Deploy RHEL on Microsoft Azure with Marketplace Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Azure, Cloud, Deployments, Marketplace, Linux

Description: Deploy RHEL virtual machines on Microsoft Azure using marketplace images, including sizing, networking, and initial configuration with cloud-init.

---

Azure Marketplace provides official RHEL images maintained by Red Hat. These images come pre-configured with the Azure Linux Agent and cloud-init for seamless Azure integration.

## Finding RHEL Images on Azure

```bash
# List available RHEL images
az vm image list --publisher RedHat --offer RHEL --sku 9_4 --all --output table

# Find the latest RHEL.4 image
az vm image list \
  --publisher RedHat \
  --offer RHEL \
  --sku 9_4 \
  --all \
  --query "[?contains(urn, 'RHEL:9_4')].{URN:urn, Version:version}" \
  --output table
```

## Creating a RHEL VM

```bash
# Create a resource group
az group create --name rhel-prod-rg --location eastus

# Create a RHEL VM
az vm create \
  --resource-group rhel-prod-rg \
  --name rhel-server-01 \
  --image RedHat:RHEL:9_4:latest \
  --size Standard_D4s_v5 \
  --admin-username azadmin \
  --ssh-key-values ~/.ssh/id_rsa.pub \
  --os-disk-size-gb 64 \
  --data-disk-sizes-gb 128 \
  --vnet-name rhel-vnet \
  --subnet default \
  --nsg-rule SSH \
  --public-ip-address rhel-server-01-ip
```

## Using Cloud-Init for Configuration

Create a cloud-init configuration file:

```yaml
# cloud-init-azure.yaml
#cloud-config

package_update: true
packages:
  - nginx
  - firewalld
  - vim-enhanced

write_files:
  - path: /etc/nginx/conf.d/default.conf
    content: |
      server {
        listen 80;
        server_name _;
        root /var/www/html;
      }

runcmd:
  - systemctl enable --now nginx
  - systemctl enable --now firewalld
  - firewall-cmd --permanent --add-service=http
  - firewall-cmd --permanent --add-service=https
  - firewall-cmd --reload
```

Deploy with cloud-init:

```bash
az vm create \
  --resource-group rhel-prod-rg \
  --name rhel-web-01 \
  --image RedHat:RHEL:9_4:latest \
  --size Standard_B2s \
  --admin-username azadmin \
  --ssh-key-values ~/.ssh/id_rsa.pub \
  --custom-data cloud-init-azure.yaml
```

## Configuring NSG Rules

```bash
# Allow HTTP and HTTPS traffic
az network nsg rule create \
  --resource-group rhel-prod-rg \
  --nsg-name rhel-web-01NSG \
  --name AllowHTTP \
  --priority 1001 \
  --protocol Tcp \
  --destination-port-ranges 80 443 \
  --access Allow

# Open additional ports as needed
az network nsg rule create \
  --resource-group rhel-prod-rg \
  --nsg-name rhel-web-01NSG \
  --name AllowPostgres \
  --priority 1002 \
  --protocol Tcp \
  --destination-port-ranges 5432 \
  --access Allow \
  --source-address-prefixes 10.0.0.0/16
```

## Post-Deployment Verification

```bash
# SSH into the VM
ssh azadmin@$(az vm show --resource-group rhel-prod-rg --name rhel-web-01 -d --query publicIps -o tsv)

# Verify RHEL version
cat /etc/redhat-release

# Check subscription (PAYG images are auto-registered)
sudo subscription-manager status

# Verify Azure Agent is running
sudo systemctl status waagent
```
