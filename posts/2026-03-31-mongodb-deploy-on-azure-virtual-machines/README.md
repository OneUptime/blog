# How to Deploy MongoDB on Azure Virtual Machines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Azure, Virtual Machine, Deployment, Infrastructure

Description: Learn how to deploy MongoDB on Azure Virtual Machines with managed disks, network security groups, and authentication configuration.

---

## Introduction

Deploying MongoDB on Azure Virtual Machines gives you full control over your database configuration while taking advantage of Azure's global infrastructure. This approach is common when you need custom MongoDB configurations, specific compliance requirements, or want to avoid the cost premium of fully managed services.

## Create a Virtual Machine

Use the Azure CLI to create a VM suitable for MongoDB:

```bash
az vm create \
  --resource-group myResourceGroup \
  --name mongodb-vm \
  --image Ubuntu2204 \
  --size Standard_D4s_v3 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --vnet-name myVnet \
  --subnet mySubnet \
  --public-ip-address "" \
  --nsg myMongoNSG
```

Using `--public-ip-address ""` avoids assigning a public IP - connect via a bastion host or VPN instead.

## Add a Managed Data Disk

Attach a Premium SSD for MongoDB data:

```bash
az vm disk attach \
  --resource-group myResourceGroup \
  --vm-name mongodb-vm \
  --name mongodb-data-disk \
  --new \
  --size-gb 256 \
  --sku Premium_LRS
```

## Prepare the Disk and Install MongoDB

SSH into the VM and configure the disk:

```bash
sudo parted /dev/sdc --script mklabel gpt mkpart xfsdata 0% 100%
sudo mkfs.xfs /dev/sdc1
sudo mkdir -p /data/mongodb
sudo mount /dev/sdc1 /data/mongodb
echo '/dev/sdc1 /data/mongodb xfs defaults,noatime 0 0' | sudo tee -a /etc/fstab
sudo chown -R mongodb:mongodb /data/mongodb
```

Install MongoDB 7.0:

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt-get update && sudo apt-get install -y mongodb-org
```

## Configure MongoDB

Update `/etc/mongod.conf`:

```yaml
storage:
  dbPath: /data/mongodb

net:
  port: 27017
  bindIp: 127.0.0.1,10.0.0.4

security:
  authorization: enabled

replication:
  replSetName: "rs0"
```

Set `bindIp` to localhost and the VM's private IP only.

## Configure Network Security Group

Restrict inbound port 27017 to your application subnet:

```bash
az network nsg rule create \
  --resource-group myResourceGroup \
  --nsg-name myMongoNSG \
  --name AllowMongoDB \
  --priority 300 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 27017 \
  --source-address-prefixes 10.0.1.0/24
```

## Start MongoDB and Create Admin User

```bash
sudo systemctl start mongod
sudo systemctl enable mongod

mongosh --eval "
rs.initiate();
"

mongosh --eval "
use admin;
db.createUser({
  user: 'admin',
  pwd: 'SecurePassword123!',
  roles: [{ role: 'userAdminAnyDatabase', db: 'admin' }]
});
"
```

## Summary

Deploying MongoDB on Azure VMs involves creating a VM without a public IP, attaching a Premium SSD managed disk formatted with XFS, installing MongoDB from the official repository, and configuring authentication and network security group rules. Bind MongoDB to the VM's private IP only and restrict NSG access to your application subnet. For high availability, deploy a three-node replica set across Azure Availability Zones.
