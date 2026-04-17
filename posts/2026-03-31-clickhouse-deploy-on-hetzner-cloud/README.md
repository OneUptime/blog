# How to Deploy ClickHouse on Hetzner Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hetzner, Cloud, Deployment, Linux

Description: Deploy ClickHouse on Hetzner Cloud with dedicated servers or cloud instances, volume configuration, firewall rules, and cost-effective storage for analytics.

---

Hetzner Cloud offers some of the best price-to-performance ratios in Europe for analytics workloads. ClickHouse runs excellently on Hetzner's dedicated root servers and cloud instances.

## Choosing an Instance Type

Hetzner Cloud server types suitable for ClickHouse:

- **CX52** - 16 vCPU, 32 GB RAM, good for smaller datasets
- **CCX63** - 48 vCPU, 192 GB RAM, dedicated CPUs for production
- **CPX51** - AMD based, great price/performance
- **Dedicated Root Servers** (AX162-R) - AMD EPYC 9454P 48 cores, 256 GB DDR5 ECC RAM, NVMe storage

## Creating a Server

Using the Hetzner CLI (`hcloud`):

```bash
hcloud server create \
  --name clickhouse-prod \
  --type ccx33 \
  --image ubuntu-22.04 \
  --location nbg1 \
  --ssh-key your-key \
  --network your-private-network
```

## Creating and Attaching a Volume

```bash
hcloud volume create \
  --name clickhouse-data \
  --size 500 \
  --location nbg1

hcloud volume attach clickhouse-data \
  --server clickhouse-prod
```

Format and mount:

```bash
sudo mkfs.xfs /dev/disk/by-id/scsi-0HC_Volume_*
sudo mkdir -p /var/lib/clickhouse
sudo mount /dev/disk/by-id/scsi-0HC_Volume_* /var/lib/clickhouse
sudo chown -R clickhouse:clickhouse /var/lib/clickhouse

# Add to fstab using the volume's disk ID
DISK_ID=$(ls /dev/disk/by-id/scsi-0HC_Volume_*)
echo "$DISK_ID /var/lib/clickhouse xfs defaults,noatime 0 2" | sudo tee -a /etc/fstab
```

## Installing ClickHouse on Ubuntu

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

## Firewall Rules

Hetzner Cloud has a built-in firewall. Apply rules using the CLI:

```bash
hcloud firewall create --name clickhouse-fw

hcloud firewall add-rule clickhouse-fw \
  --direction in --protocol tcp --port 8123 \
  --source-ips "10.0.0.0/8"

hcloud firewall add-rule clickhouse-fw \
  --direction in --protocol tcp --port 9000 \
  --source-ips "10.0.0.0/8"

hcloud firewall add-rule clickhouse-fw \
  --direction in --protocol tcp --port 22 \
  --source-ips "your.management.ip/32"

hcloud firewall apply-to-server clickhouse-fw \
  --server clickhouse-prod
```

## ClickHouse Configuration

Configure ClickHouse to listen only on the private network interface:

```xml
<clickhouse>
  <listen_host>10.0.0.5</listen_host>
  <max_connections>2000</max_connections>
</clickhouse>
```

## Backup Strategy

Use Hetzner Object Storage (S3-compatible) or `clickhouse-backup` with rsync to a Hetzner Storage Box:

```bash
clickhouse-backup create my-backup
rsync -avz /var/lib/clickhouse/backup/my-backup/ \
  user@your-storage-box.your-storagebox.de:./clickhouse-backups/
```

## Summary

Hetzner Cloud provides outstanding cost efficiency for ClickHouse deployments. Use CCX (dedicated) instances for production, attach Hetzner volumes for persistent storage, apply firewall rules to limit access to private networks, and back up to Hetzner Object Storage or a Storage Box.
