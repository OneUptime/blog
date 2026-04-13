# How to Deploy MongoDB on AWS EC2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, AWS, EC2, Deployment, Infrastructure

Description: Learn how to deploy MongoDB on an AWS EC2 instance with proper storage configuration, security groups, and authentication setup.

---

## Introduction

Deploying MongoDB on AWS EC2 gives you full control over instance type, storage, and configuration. While MongoDB Atlas is the managed option, running MongoDB directly on EC2 is common for cost optimization, compliance requirements, or when you need custom configurations not available in managed offerings.

## Launch an EC2 Instance

Choose an instance type appropriate for your workload. For production MongoDB:

- **General purpose**: `m6i.large` or higher (2+ vCPUs, 8+ GB RAM)
- **Memory-optimized**: `r6i.large` for large working sets
- **Storage-optimized**: `i4i.xlarge` for NVMe storage

Use the AWS CLI to launch an instance:

```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type m6i.large \
  --key-name my-keypair \
  --security-group-ids sg-0abc12345 \
  --subnet-id subnet-0def67890 \
  --block-device-mappings '[{"DeviceName":"/dev/xvdf","Ebs":{"VolumeSize":200,"VolumeType":"gp3","Iops":3000}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=mongodb-primary}]'
```

Use a dedicated EBS gp3 volume for MongoDB data rather than the root volume.

## Configure the Storage Volume

SSH into the instance and prepare the data volume:

```bash
sudo mkfs.xfs /dev/xvdf
sudo mkdir -p /data/mongodb
sudo mount /dev/xvdf /data/mongodb
echo '/dev/xvdf /data/mongodb xfs defaults,noatime 0 0' | sudo tee -a /etc/fstab
```

Using XFS and setting `noatime` is recommended by MongoDB for best performance.

## Install MongoDB

```bash
cat <<'EOF' | sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2023/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF

sudo yum install -y mongodb-org
sudo chown -R mongod:mongod /data/mongodb
```

## Configure MongoDB

Edit `/etc/mongod.conf`:

```yaml
storage:
  dbPath: /data/mongodb
  journal:
    enabled: true
  engine: wiredTiger

net:
  port: 27017
  bindIp: 0.0.0.0

security:
  authorization: enabled

systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
```

Restrict `bindIp` to your application server's private IP in production rather than `0.0.0.0`.

## Create an Admin User and Start MongoDB

```bash
sudo systemctl start mongod
sudo systemctl enable mongod

mongosh <<'EOF'
use admin
db.createUser({
  user: "admin",
  pwd: "strongpassword",
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
})
EOF
```

## Configure Security Groups

Allow MongoDB traffic only from your application servers:

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc12345 \
  --protocol tcp \
  --port 27017 \
  --source-group sg-appserver-security-group
```

Never expose port 27017 to `0.0.0.0/0` in production.

## Summary

Deploying MongoDB on EC2 involves selecting an appropriate instance type, configuring a dedicated EBS gp3 volume formatted with XFS, installing MongoDB from the official repository, and enabling authentication. Security groups should restrict port 27017 access to known application servers only. For production deployments, also configure replica sets with at least three nodes for high availability.
