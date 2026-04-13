# How to Deploy MongoDB on Linode/Akamai

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Linode, Akamai, Deployment, Infrastructure

Description: Learn how to deploy MongoDB on Linode (now Akamai Cloud) with block storage, firewall rules, and authentication configuration.

---

## Introduction

Linode, now part of Akamai Cloud, offers competitive pricing and straightforward infrastructure for self-managed MongoDB deployments. Its block storage volumes, private network, and cloud firewall make it easy to set up a secure MongoDB instance alongside your application servers.

## Create a Linode Instance

Use the Linode CLI to create a Linode for MongoDB:

```bash
linode-cli linodes create \
  --label mongodb-primary \
  --region us-east \
  --type g6-standard-4 \
  --image linode/ubuntu22.04 \
  --root_pass "TemporaryRootPassword!" \
  --private_ip true
```

The `--private_ip true` flag allocates a private network IP for secure inter-server communication.

## Create and Attach Block Storage

```bash
linode-cli volumes create \
  --label mongodb-data \
  --size 100 \
  --region us-east

linode-cli volumes attach VOLUME_ID --linode_id LINODE_ID
```

Replace `VOLUME_ID` and `LINODE_ID` with the values from the create output.

## Prepare Storage and Install MongoDB

SSH into the Linode and set up the volume:

```bash
sudo mkfs.xfs /dev/disk/by-id/scsi-0Linode_Volume_mongodb-data
sudo mkdir -p /data/mongodb
sudo mount /dev/disk/by-id/scsi-0Linode_Volume_mongodb-data /data/mongodb
echo '/dev/disk/by-id/scsi-0Linode_Volume_mongodb-data /data/mongodb xfs defaults,noatime 0 2' | sudo tee -a /etc/fstab
sudo useradd -r mongodb
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

Edit `/etc/mongod.conf`:

```yaml
storage:
  dbPath: /data/mongodb
  engine: wiredTiger

net:
  port: 27017
  bindIp: 127.0.0.1,192.168.128.5

security:
  authorization: enabled

replication:
  replSetName: "rs0"
```

Replace `192.168.128.5` with your Linode's private IP address (visible in the Linode dashboard under Networking).

## Configure Cloud Firewall

Create a Linode Cloud Firewall to restrict MongoDB access:

```bash
linode-cli firewalls create \
  --label mongodb-firewall \
  --rules.inbound '[{"action":"ACCEPT","protocol":"TCP","ports":"27017","addresses":{"ipv4":["192.168.128.0/24"]}}]' \
  --rules.inbound_policy DENY \
  --rules.outbound_policy ACCEPT
```

Assign the firewall to your MongoDB and application Linodes from the dashboard or via:

```bash
linode-cli firewalls device-create FIREWALL_ID \
  --id LINODE_ID \
  --type linode
```

## Start MongoDB and Create Admin User

```bash
sudo systemctl start mongod && sudo systemctl enable mongod

mongosh --eval "rs.initiate()"

mongosh admin --eval "
db.createUser({
  user: 'admin',
  pwd: 'StrongMongoPassword!',
  roles: [{ role: 'root', db: 'admin' }]
});
"
```

## Summary

Deploying MongoDB on Linode/Akamai involves creating a Linode with a private IP, attaching a block storage volume formatted with XFS, installing MongoDB from the official repository, and configuring the Linode Cloud Firewall to allow port 27017 only from your application subnet. Binding MongoDB to the private IP keeps database traffic off the public internet. For high availability, deploy three Linodes as a replica set within the same region using the private network.
