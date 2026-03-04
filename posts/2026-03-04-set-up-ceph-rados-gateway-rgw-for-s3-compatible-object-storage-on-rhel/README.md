# How to Set Up Ceph RADOS Gateway (RGW) for S3-Compatible Object Storage on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ceph, RGW, S3, Object Storage

Description: Deploy the Ceph RADOS Gateway on RHEL to provide an S3-compatible object storage API, allowing applications to store and retrieve objects using standard S3 clients.

---

The RADOS Gateway (RGW) is a Ceph component that provides RESTful APIs compatible with Amazon S3 and OpenStack Swift. It translates HTTP requests into Ceph RADOS operations.

## Deploy RGW with cephadm

```bash
# Deploy a single RGW instance
sudo ceph orch apply rgw mystore --placement="1 node1"

# Or deploy multiple RGW instances for high availability
sudo ceph orch apply rgw mystore --placement="2 node1 node2"
```

Verify the RGW daemon is running:

```bash
# List RGW daemons
sudo ceph orch ls --service-type rgw

# Check daemon status
sudo ceph orch ps --daemon-type rgw
```

## Open Firewall Ports

RGW listens on port 80 by default (or 443 for TLS):

```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

## Create an S3 User

```bash
# Create a user for S3 access
sudo radosgw-admin user create \
    --uid="s3user" \
    --display-name="S3 User" \
    --access-key="MYACCESSKEY123" \
    --secret-key="MYSECRETKEY456"

# Verify the user was created
sudo radosgw-admin user info --uid="s3user"
```

## Test with the AWS CLI

Install and configure the AWS CLI to connect to your RGW:

```bash
# Install the AWS CLI
sudo dnf install -y awscli

# Configure credentials
aws configure set aws_access_key_id MYACCESSKEY123
aws configure set aws_secret_access_key MYSECRETKEY456
aws configure set default.region us-east-1

# Create a bucket
aws --endpoint-url http://node1:80 s3 mb s3://mybucket

# Upload a file
aws --endpoint-url http://node1:80 s3 cp /tmp/testfile.txt s3://mybucket/

# List bucket contents
aws --endpoint-url http://node1:80 s3 ls s3://mybucket/
```

## Configure RGW for HTTPS

Set up TLS using a certificate:

```bash
# Import the certificate and key into Ceph
sudo ceph config set client.rgw.mystore.node1 rgw_frontends \
    "beast port=443 ssl_port=443 ssl_certificate=/etc/ceph/rgw.pem"
```

## Set Bucket Quotas

```bash
# Set a quota on a user
sudo radosgw-admin quota set --quota-scope=user --uid=s3user \
    --max-size=100G --max-objects=100000

# Enable the quota
sudo radosgw-admin quota enable --quota-scope=user --uid=s3user
```

## Check RGW Status

```bash
# View RGW bucket stats
sudo radosgw-admin bucket stats --bucket=mybucket

# Check usage
sudo radosgw-admin usage show --uid=s3user
```

With RGW running, any S3-compatible client or application can store objects on your Ceph cluster.
