# How to Deploy MongoDB on Google Compute Engine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GCP, Compute Engine, Deployment, Infrastructure

Description: Learn how to deploy MongoDB on Google Compute Engine with persistent SSD disks, firewall rules, and authentication configuration.

---

## Introduction

Google Compute Engine (GCE) offers flexible VM configurations for running self-managed MongoDB. Deploying on GCE is a good choice when your application stack is already on Google Cloud and you want low-latency connections to other GCP services like BigQuery or Cloud Storage.

## Create a Compute Engine VM

Use the `gcloud` CLI to create a VM optimized for MongoDB:

```bash
gcloud compute instances create mongodb-primary \
  --zone=us-central1-a \
  --machine-type=n2-standard-4 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-ssd \
  --no-address \
  --subnet=default \
  --tags=mongodb-server
```

Using `--no-address` prevents a public IP from being assigned.

## Add a Persistent SSD for Data

Attach a separate disk for MongoDB data:

```bash
gcloud compute disks create mongodb-data \
  --zone=us-central1-a \
  --size=200GB \
  --type=pd-ssd

gcloud compute instances attach-disk mongodb-primary \
  --disk=mongodb-data \
  --zone=us-central1-a \
  --device-name=mongodb-data
```

## Format and Mount the Disk

SSH into the instance and prepare the disk:

```bash
sudo mkfs.xfs /dev/disk/by-id/google-mongodb-data
sudo mkdir -p /data/mongodb
sudo mount /dev/disk/by-id/google-mongodb-data /data/mongodb
echo '/dev/disk/by-id/google-mongodb-data /data/mongodb xfs defaults,noatime 0 0' | sudo tee -a /etc/fstab
```

## Install MongoDB

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
  engine: wiredTiger

net:
  port: 27017
  bindIp: 127.0.0.1,10.128.0.2

security:
  authorization: enabled

operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp
```

Replace `10.128.0.2` with your instance's internal IP.

## Configure Firewall Rules

Create a firewall rule allowing port 27017 only from your application servers:

```bash
gcloud compute firewall-rules create allow-mongodb \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:27017 \
  --source-tags=app-server \
  --target-tags=mongodb-server
```

This rule allows only VMs tagged `app-server` to reach MongoDB.

## Start MongoDB and Create Admin User

```bash
sudo systemctl start mongod
sudo systemctl enable mongod

mongosh admin --eval "
db.createUser({
  user: 'admin',
  pwd: 'SecureAdminPwd!',
  roles: [{ role: 'root', db: 'admin' }]
})
"
```

## Summary

Deploying MongoDB on Google Compute Engine involves creating a VM without an external IP, attaching a persistent SSD disk formatted with XFS, installing MongoDB from the official package repository, and configuring firewall rules that restrict port 27017 access to application server tags. Enable slow operation profiling to catch performance issues early. For production, deploy a three-member replica set across multiple zones for high availability.
