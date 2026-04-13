# How to Deploy MongoDB on Oracle Cloud Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Oracle Cloud, OCI, Deployment, Infrastructure

Description: Learn how to deploy MongoDB on Oracle Cloud Infrastructure using Compute instances, Block Volumes, and security list rules.

---

## Introduction

Oracle Cloud Infrastructure (OCI) offers a generous free tier and competitive pricing for Compute instances. Deploying MongoDB on OCI Compute gives you a fully self-managed setup with Oracle's fast block storage and private networking capabilities.

## Create an OCI Compute Instance

Use the OCI CLI to create a VM:

```bash
oci compute instance launch \
  --compartment-id $COMPARTMENT_ID \
  --availability-domain "AD-1" \
  --shape "VM.Standard.E4.Flex" \
  --shape-config '{"ocpus": 2, "memoryInGBs": 16}' \
  --image-id $UBUNTU_2204_IMAGE_ID \
  --subnet-id $PRIVATE_SUBNET_ID \
  --assign-public-ip false \
  --display-name "mongodb-primary" \
  --ssh-authorized-keys-file ~/.ssh/id_rsa.pub
```

Use a private subnet to avoid exposing MongoDB to the internet.

## Attach a Block Volume

Create and attach a block volume for MongoDB data:

```bash
oci bv volume create \
  --compartment-id $COMPARTMENT_ID \
  --availability-domain "AD-1" \
  --display-name "mongodb-data" \
  --size-in-gbs 200 \
  --vpus-per-gb 10

oci compute volume-attachment attach \
  --instance-id $INSTANCE_ID \
  --type iscsi \
  --volume-id $VOLUME_ID
```

## Connect the iSCSI Volume

After attaching, SSH into the instance and connect the iSCSI target:

```bash
sudo iscsiadm -m node -o new -T $IQN -p $IP:$PORT
sudo iscsiadm -m node -o update -T $IQN -n node.startup -v automatic
sudo iscsiadm -m node -T $IQN -p $IP:$PORT -l

sudo mkfs.xfs /dev/sdb
sudo mkdir -p /data/mongodb
sudo mount /dev/sdb /data/mongodb
echo '/dev/sdb /data/mongodb xfs defaults,noatime,_netdev 0 2' | sudo tee -a /etc/fstab
sudo chown -R mongodb:mongodb /data/mongodb
```

The OCI Console provides the exact `iscsiadm` commands when you select the attached volume.

## Install MongoDB

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
  bindIp: 127.0.0.1,10.0.1.10

security:
  authorization: enabled
```

## Update Security List Rules

In OCI, add an ingress rule in your VCN security list:

```bash
oci network security-list update \
  --security-list-id $SECURITY_LIST_ID \
  --ingress-security-rules '[{
    "source": "10.0.2.0/24",
    "protocol": "6",
    "tcpOptions": {
      "destinationPortRange": {"min": 27017, "max": 27017}
    },
    "isStateless": false
  }]'
```

## Start MongoDB and Create Admin

```bash
sudo systemctl start mongod && sudo systemctl enable mongod

mongosh admin --eval "
db.createUser({
  user: 'admin',
  pwd: 'StrongOCIPassword!',
  roles: [{ role: 'root', db: 'admin' }]
});
"
```

## Summary

Deploying MongoDB on OCI involves launching a Compute instance in a private subnet, attaching and connecting a Block Volume via iSCSI, installing MongoDB from the official repository, and configuring security list rules to allow port 27017 only from your application subnet. OCI's Block Volumes with higher VPUs-per-GB settings deliver consistent IOPS suitable for production MongoDB workloads.
