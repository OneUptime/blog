# How to Deploy MongoDB on DigitalOcean Droplets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, DigitalOcean, Droplet, Deployment, Infrastructure

Description: Learn how to deploy MongoDB on DigitalOcean Droplets with block storage volumes, firewall configuration, and authentication setup.

---

## Introduction

DigitalOcean Droplets are simple, cost-effective virtual machines well-suited for self-managed MongoDB deployments. Combining a Droplet with a block storage volume gives you flexible, resizable storage separate from the boot disk.

## Create a Droplet

Use the DigitalOcean CLI (`doctl`) to create a Droplet:

```bash
doctl compute droplet create mongodb-primary \
  --region nyc3 \
  --size s-4vcpu-8gb \
  --image ubuntu-22-04-x64 \
  --ssh-keys $(doctl compute ssh-key list --format ID --no-header)
```

For production, use at least `m-4vcpu-32gb` (memory-optimized) so MongoDB's working set fits in RAM.

## Attach Block Storage

Create and attach a volume for MongoDB data:

```bash
doctl compute volume create mongodb-data \
  --region nyc3 \
  --size 100GiB \
  --fs-type xfs

VOLUME_ID=$(doctl compute volume list --format ID --no-header | head -1)
DROPLET_ID=$(doctl compute droplet list --format ID --no-header | head -1)

doctl compute volume-action attach $VOLUME_ID $DROPLET_ID
```

## Prepare the Volume and Install MongoDB

SSH into the Droplet:

```bash
sudo mkdir -p /data/mongodb
sudo mount -o defaults,noatime /dev/disk/by-id/scsi-0DO_Volume_mongodb-data /data/mongodb
echo '/dev/disk/by-id/scsi-0DO_Volume_mongodb-data /data/mongodb xfs defaults,noatime,nofail 0 2' | sudo tee -a /etc/fstab
```

Install MongoDB:

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt-get update && sudo apt-get install -y mongodb-org

sudo chown -R mongodb:mongodb /data/mongodb
```

## Configure MongoDB

Edit `/etc/mongod.conf`:

```yaml
storage:
  dbPath: /data/mongodb

net:
  port: 27017
  bindIp: 127.0.0.1,10.110.0.5

security:
  authorization: enabled
```

Replace `10.110.0.5` with the Droplet's private network IP.

## Configure Firewall

Create a DigitalOcean Cloud Firewall:

```bash
doctl compute firewall create \
  --name mongodb-firewall \
  --droplet-ids $DROPLET_ID \
  --inbound-rules "protocol:tcp,ports:27017,droplet_id:$APP_DROPLET_ID" \
  --inbound-rules "protocol:tcp,ports:22,address:0.0.0.0/0" \
  --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0"
```

This allows MongoDB connections only from the specific application Droplet.

## Start MongoDB and Create Admin User

```bash
sudo systemctl start mongod && sudo systemctl enable mongod

mongosh admin --eval "
db.createUser({
  user: 'dbadmin',
  pwd: 'ReplaceWithStrongPassword!',
  roles: [{ role: 'root', db: 'admin' }]
});
"
```

## Enable Automatic Backups

DigitalOcean block storage snapshots protect your data:

```bash
doctl compute volume snapshot $VOLUME_ID \
  --snapshot-name "mongodb-data-$(date +%Y%m%d)"
```

Automate this with a cron job or DigitalOcean scheduled functions.

## Summary

Deploying MongoDB on DigitalOcean Droplets combines an appropriately sized Droplet with a block storage volume formatted as XFS. Configure MongoDB to bind only to the private network IP and use DigitalOcean Cloud Firewalls to restrict port 27017 access to specific application Droplets. Enable authentication and take regular block storage snapshots for backup. For production, use the private network (`--vpc-uuid`) to ensure inter-Droplet traffic stays within DigitalOcean's network.
