# How to Deploy ClickHouse on Linode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Linode, Akamai, Deployment, Linux

Description: Deploy ClickHouse on Linode (Akamai Cloud) with high-memory instances, block storage volumes, firewall configuration, and Object Storage for backups.

---

Linode, now part of Akamai Cloud, offers straightforward Linux instances with predictable pricing that makes it a practical choice for ClickHouse deployments. High-memory instances and Object Storage provide everything you need.

## Choosing a Linode Plan

For ClickHouse, the High Memory plans work best:

- **Linode 64GB** - 16 vCPU, 64 GB RAM - Development and small production
- **Linode 128GB** - 32 vCPU, 128 GB RAM - Medium production workloads
- **Dedicated CPU** - For consistent query performance without CPU bursting

## Creating the Linode

Using the Linode CLI:

```bash
linode-cli linodes create \
  --type g7-highmem-16 \
  --region us-east \
  --image linode/ubuntu22.04 \
  --label clickhouse-prod \
  --root_pass 'your-secure-root-password' \
  --private_ip true
```

Enable private IP to avoid routing traffic through the public internet.

## Installing ClickHouse

```bash
# SSH into your Linode
ssh root@your-linode-ip

sudo apt-get install -y apt-transport-https ca-certificates curl gnupg
curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' | \
  sudo gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/clickhouse.list
sudo apt-get update && sudo apt-get install -y clickhouse-server clickhouse-client
sudo systemctl enable --now clickhouse-server
```

## Adding Block Storage

```bash
linode-cli volumes create \
  --label clickhouse-data \
  --size 500 \
  --region us-east
```

Attach from the Linode Cloud Manager, then mount:

```bash
sudo mkfs.ext4 /dev/disk/by-id/scsi-0Linode_Volume_clickhouse-data
sudo mkdir -p /var/lib/clickhouse
sudo mount /dev/disk/by-id/scsi-0Linode_Volume_clickhouse-data /var/lib/clickhouse
sudo chown -R clickhouse:clickhouse /var/lib/clickhouse

echo '/dev/disk/by-id/scsi-0Linode_Volume_clickhouse-data /var/lib/clickhouse ext4 defaults,noatime 0 2' | \
  sudo tee -a /etc/fstab
```

## Firewall Configuration

Use Linode's Cloud Firewall to secure the instance:

```bash
linode-cli firewalls create \
  --label clickhouse-fw \
  --rules.inbound '[{"action":"ACCEPT","protocol":"TCP","ports":"22","addresses":{"ipv4":["your.ip/32"]}},{"action":"ACCEPT","protocol":"TCP","ports":"8123","addresses":{"ipv4":["10.0.0.0/8"]}},{"action":"ACCEPT","protocol":"TCP","ports":"9000","addresses":{"ipv4":["10.0.0.0/8"]}}]' \
  --rules.inbound_policy "DROP" \
  --rules.outbound_policy "ACCEPT"
```

## Configuring ClickHouse

Bind ClickHouse to the private IP to avoid exposure on the public interface:

```xml
<clickhouse>
  <listen_host>192.168.x.x</listen_host>
</clickhouse>
```

## Backup to Linode Object Storage

Linode Object Storage is S3-compatible:

```sql
BACKUP DATABASE mydb
TO S3(
  'https://us-east-1.linodeobjects.com/my-bucket/clickhouse/',
  'your_access_key',
  'your_secret_key'
);
```

## Summary

Deploying ClickHouse on Linode uses High Memory instances for analytics workloads, block storage with ext4 and noatime for persistent data, Linode Cloud Firewall to restrict access, and the S3-compatible Linode Object Storage API for automated backups. Linode's transparent pricing makes cost estimation straightforward.
