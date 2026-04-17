# How to Deploy ClickHouse on DigitalOcean

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, DigitalOcean, Droplet, Deployment, Linux

Description: Deploy ClickHouse on DigitalOcean Droplets with block storage, firewall configuration, and Spaces object storage for automated backups.

---

DigitalOcean provides cost-effective infrastructure for ClickHouse deployments. Droplets with block storage and Spaces object storage give you a complete deployment solution at a fraction of the cost of hyperscaler equivalents.

## Choosing a Droplet Size

For production ClickHouse:

- **Memory-Optimized**: `m-16vcpu-128gb` - Best for large working sets
- **CPU-Optimized**: `c-16` - For compute-intensive query workloads
- **Premium AMD**: `m3-8vcpu-64gb` - Good price/performance balance

For development: `s-4vcpu-8gb` is sufficient.

## Creating the Droplet

Using the DigitalOcean CLI (`doctl`):

```bash
doctl compute droplet create clickhouse-prod \
  --size m-16vcpu-128gb \
  --image ubuntu-22-04-x64 \
  --region nyc3 \
  --ssh-keys $(doctl compute ssh-key list --format ID --no-header | head -1) \
  --vpc-uuid your-vpc-uuid \
  --no-wait
```

## Attaching Block Storage

```bash
# Create a volume
doctl compute volume create clickhouse-data \
  --size 500GiB \
  --region nyc3 \
  --fs-type xfs

# Attach to Droplet
doctl compute volume-action attach \
  $(doctl compute volume list --format ID --no-header | head -1) \
  --droplet-id $(doctl compute droplet list --format ID --no-header | head -1)
```

Mount the volume inside the Droplet:

```bash
# DigitalOcean volumes appear as /dev/sda or /dev/disk/by-id/scsi-...
sudo mkdir -p /var/lib/clickhouse
sudo mount /dev/sda /var/lib/clickhouse
sudo chown -R clickhouse:clickhouse /var/lib/clickhouse
echo '/dev/sda /var/lib/clickhouse xfs defaults,noatime 0 2' | sudo tee -a /etc/fstab
```

## Installing ClickHouse

```bash
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg
curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' | \
  sudo gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg
ARCH=$(dpkg --print-architecture)
echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg arch=${ARCH}] https://packages.clickhouse.com/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/clickhouse.list
sudo apt-get update && sudo apt-get install -y clickhouse-server clickhouse-client
sudo systemctl enable --now clickhouse-server
```

## Firewall Configuration

```bash
# Create a firewall
doctl compute firewall create \
  --name clickhouse-fw \
  --inbound-rules "protocol:tcp,ports:22,address:your.ip.address/32 protocol:tcp,ports:8123,address:10.0.0.0/8 protocol:tcp,ports:9000,address:10.0.0.0/8" \
  --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0 protocol:udp,ports:all,address:0.0.0.0/0"

# Apply to Droplet
doctl compute firewall add-droplets \
  $(doctl compute firewall list --format ID --no-header | head -1) \
  --droplet-ids $(doctl compute droplet list --format ID --no-header | head -1)
```

## Backup to Spaces

DigitalOcean Spaces is S3-compatible, so ClickHouse's S3 backup functionality works directly:

```sql
BACKUP DATABASE mydb
TO S3(
  'https://nyc3.digitaloceanspaces.com/my-backups/clickhouse/',
  'spaces_key_id',
  'spaces_secret_key'
);
```

## Summary

Deploying ClickHouse on DigitalOcean uses memory-optimized Droplets with attached block storage for persistent data, firewall rules that restrict access to internal VPC addresses and your management IP, and Spaces for S3-compatible backup storage. DigitalOcean's simple pricing model makes it easy to predict costs for ClickHouse deployments.
