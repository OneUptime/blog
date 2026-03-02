# How to Set Up Garage S3-Compatible Storage on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, S3, Self-Hosted

Description: Step-by-step guide to installing and configuring Garage, a lightweight S3-compatible distributed object storage system, on Ubuntu servers.

---

Running your own S3-compatible object storage gives you control over where your data lives, eliminates per-request pricing, and removes dependency on external cloud providers. Garage is a lightweight, distributed object storage system designed specifically to run on commodity hardware, even across geographically separated nodes. It implements the S3 API, so any existing tool or application that talks to AWS S3 works with Garage out of the box.

This guide walks through a single-node Garage installation on Ubuntu, which is a good starting point before expanding to a multi-node cluster.

## Why Garage

Several self-hosted S3-compatible solutions exist - MinIO is the most popular - but Garage has some distinct characteristics:

- Written in Rust, so it is memory-efficient and has a small binary footprint
- Designed for geo-distributed deployments with weak consistency model
- Single binary with no external dependencies
- Handles node failures gracefully without manual intervention
- Apache 2.0 licensed with no enterprise-only features

For small teams or homelabs, Garage's simplicity is its main appeal.

## Prerequisites

- Ubuntu 22.04 or 24.04 server
- At least 1 GB RAM, 2+ GB recommended
- Storage volume mounted at a known path (e.g., `/data`)
- Open firewall ports: 3900 (API), 3901 (S3), 3902 (web), 3903 (admin)

## Installing Garage

Download the latest binary from the Garage releases page. As of early 2026, the current stable release is in the v1.x series:

```bash
# Download the Garage binary (check releases page for latest version)
wget https://garagehq.deuxfleurs.fr/_releases/v1.0.1/x86_64-unknown-linux-musl/garage -O /tmp/garage

# Move to /usr/local/bin and make executable
sudo mv /tmp/garage /usr/local/bin/garage
sudo chmod +x /usr/local/bin/garage

# Verify the binary works
garage --version
```

## Creating the Garage User and Directories

Running Garage as a dedicated user is good practice:

```bash
# Create system user for Garage
sudo useradd --system --no-create-home --shell /bin/false garage

# Create data and metadata directories
sudo mkdir -p /data/garage/data
sudo mkdir -p /data/garage/meta
sudo mkdir -p /etc/garage

# Set ownership
sudo chown -R garage:garage /data/garage
sudo chown -R garage:garage /etc/garage
```

## Configuring Garage

Garage uses a TOML configuration file. Create it at `/etc/garage/garage.toml`:

```bash
sudo nano /etc/garage/garage.toml
```

```toml
# Garage configuration file

# RPC port for internal cluster communication
rpc_bind_addr = "0.0.0.0:3900"

# A secret key for cluster authentication - generate with: openssl rand -hex 32
rpc_secret = "your_generated_secret_here"

# Directory for database metadata
metadata_dir = "/data/garage/meta"

# Directory for object data storage
data_dir = "/data/garage/data"

[s3_api]
# S3 API bind address and port
api_bind_addr = "0.0.0.0:3901"

# S3 region identifier (can be any string)
s3_region = "us-east-1"

# Root domain for virtual-hosted-style S3 URLs (optional)
# s3_root_domain = ".s3.example.com"

[s3_web]
# Web endpoint for static website hosting (optional)
bind_addr = "0.0.0.0:3902"
root_domain = ".web.example.com"
index = "index.html"

[admin]
# Admin API port
api_bind_addr = "0.0.0.0:3903"
```

Generate a strong RPC secret and update the config:

```bash
# Generate a random 32-byte hex secret
openssl rand -hex 32
```

Replace `your_generated_secret_here` with the output.

## Creating a systemd Service

```bash
sudo nano /etc/systemd/system/garage.service
```

```ini
[Unit]
Description=Garage S3-compatible object storage
After=network.target
Documentation=https://garagehq.deuxfleurs.fr/documentation/

[Service]
Type=simple
User=garage
Group=garage

# Path to the config file
ExecStart=/usr/local/bin/garage -c /etc/garage/garage.toml server

# Restart on failure
Restart=on-failure
RestartSec=5

# Resource limits
LimitNOFILE=65536

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/data/garage

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now garage

# Verify it started
sudo systemctl status garage
```

## Setting Up the Cluster Node

Garage needs to know about its node topology before you can use it. Even for a single-node setup, you must set a zone and capacity:

```bash
# Get the node ID
sudo -u garage garage -c /etc/garage/garage.toml node id
```

The output will look like:

```
Garage node ID: a1b2c3d4e5f6...@<your-ip>:3900
```

Note the node ID (the hex string before the `@`), then set the node's zone and capacity:

```bash
# Apply node configuration
# Zone: datacenter or geographic zone identifier
# Capacity: storage capacity in GB this node contributes
sudo -u garage garage -c /etc/garage/garage.toml layout assign \
  <node-id> \
  --zone dc1 \
  --capacity 100

# Review the proposed layout
sudo -u garage garage -c /etc/garage/garage.toml layout show

# Apply the layout
sudo -u garage garage -c /etc/garage/garage.toml layout apply \
  --version 1
```

Verify the cluster status:

```bash
sudo -u garage garage -c /etc/garage/garage.toml status
```

## Creating Buckets and Access Keys

### Create a Bucket

```bash
# Create a bucket named "my-bucket"
sudo -u garage garage -c /etc/garage/garage.toml bucket create my-bucket

# List buckets
sudo -u garage garage -c /etc/garage/garage.toml bucket list
```

### Create Access Credentials

```bash
# Create an access key
sudo -u garage garage -c /etc/garage/garage.toml key create my-key

# The command outputs an Access Key ID and Secret Access Key - save these
```

Example output:

```
Key name: my-key
Key ID: GK3514...
Secret key: 7a9b2c...
```

### Grant Bucket Permissions

```bash
# Grant read and write access on the bucket to the key
sudo -u garage garage -c /etc/garage/garage.toml bucket allow \
  my-bucket \
  --read \
  --write \
  --key my-key
```

## Accessing Garage with the AWS CLI

Configure the AWS CLI to use your Garage instance:

```bash
# Install the AWS CLI if not already installed
sudo apt install awscli -y

# Configure credentials
aws configure set aws_access_key_id GK3514...
aws configure set aws_secret_access_key 7a9b2c...
aws configure set default.region us-east-1
```

Now use the `--endpoint-url` flag to point at your Garage instance:

```bash
# List buckets
aws s3 ls --endpoint-url http://127.0.0.1:3901

# Upload a file
aws s3 cp /etc/hostname s3://my-bucket/hostname.txt \
  --endpoint-url http://127.0.0.1:3901

# Download a file
aws s3 cp s3://my-bucket/hostname.txt /tmp/hostname-from-garage.txt \
  --endpoint-url http://127.0.0.1:3901

# List objects in a bucket
aws s3 ls s3://my-bucket/ --endpoint-url http://127.0.0.1:3901
```

## Using Garage with rclone

For bulk transfers or backup operations, rclone is a popular choice:

```bash
# Install rclone
sudo apt install rclone -y

# Create rclone configuration
rclone config create garage s3 \
  provider Other \
  access_key_id GK3514... \
  secret_access_key 7a9b2c... \
  endpoint http://127.0.0.1:3901 \
  acl private
```

Then use it:

```bash
# Sync a local directory to Garage
rclone sync /var/backups garage:my-bucket/backups/

# List remote contents
rclone ls garage:my-bucket
```

## Firewall Configuration

If exposing Garage beyond localhost, configure UFW:

```bash
# Allow S3 API port from trusted networks only
sudo ufw allow from 10.0.0.0/8 to any port 3901 proto tcp

# Allow admin port from management hosts only
sudo ufw allow from 192.168.1.0/24 to any port 3903 proto tcp

# Block public access to internal RPC port
# Port 3900 should generally not be exposed unless running a cluster
```

## Monitoring Garage

The admin API provides metrics in Prometheus format:

```bash
# Check cluster health via admin API
curl -s http://127.0.0.1:3903/v1/health | python3 -m json.tool

# Get Prometheus metrics
curl -s http://127.0.0.1:3903/metrics
```

You can scrape the `/metrics` endpoint with Prometheus and combine it with an alerting platform like [OneUptime](https://oneuptime.com) to get notified when storage usage approaches capacity or node health degrades.

## Summary

Garage provides a capable, self-hosted S3-compatible storage layer on Ubuntu with minimal dependencies and a straightforward setup process. Once running, any tool that supports the S3 API - `aws s3`, `rclone`, `s3cmd`, MinIO clients, or application SDKs - works without modification. Start with a single node and expand to a multi-zone cluster as your storage needs grow.
