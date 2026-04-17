# How to Deploy ClickHouse on AWS EC2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, AWS, EC2, Deployment, Linux

Description: Deploy a production-ready ClickHouse instance on AWS EC2, covering instance selection, storage configuration, security groups, and performance tuning.

---

AWS EC2 gives you full control over ClickHouse deployment without the abstraction overhead of managed services. This guide walks through selecting the right instance, configuring storage, and tuning for production performance.

## Choosing the Right EC2 Instance

ClickHouse is CPU and memory intensive. Recommended instance families:

- **r6i or r7i** - Memory optimized, ideal for large working sets
- **c6i or c7i** - Compute optimized, good for query-heavy workloads
- **i3en or i4i** - Storage optimized with NVMe, excellent for I/O intensive use cases

A starting point for a single-node production instance is `r6i.4xlarge` (16 vCPU, 128 GB RAM).

## Setting Up the EC2 Instance

```bash
# Launch instance, then SSH in
ssh -i your-key.pem ec2-user@your-instance-ip

# Install ClickHouse on Amazon Linux / RHEL
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://packages.clickhouse.com/rpm/clickhouse.repo
sudo yum install -y clickhouse-server clickhouse-client

sudo systemctl enable clickhouse-server
sudo systemctl start clickhouse-server
```

## EBS Volume Configuration

Use separate EBS volumes for data and logs. GP3 volumes offer good price/performance:

```bash
# Format and mount the data volume
sudo mkfs.xfs /dev/nvme1n1
sudo mkdir -p /var/lib/clickhouse
sudo mount /dev/nvme1n1 /var/lib/clickhouse
sudo chown -R clickhouse:clickhouse /var/lib/clickhouse

# Add to /etc/fstab for persistence
echo '/dev/nvme1n1 /var/lib/clickhouse xfs defaults,noatime 0 2' | sudo tee -a /etc/fstab
```

Use the `noatime` mount option to reduce unnecessary I/O.

## Security Group Configuration

ClickHouse requires these ports:

```text
8123  - HTTP interface
9000  - Native TCP protocol
9009  - Inter-server replication
9440  - Native TCP over TLS
8443  - HTTPS interface
```

Restrict access to your application subnet. Never expose ClickHouse directly to the public internet.

## OS Tuning for ClickHouse

```bash
# Increase file descriptor limits
echo "clickhouse soft nofile 262144" | sudo tee -a /etc/security/limits.conf
echo "clickhouse hard nofile 262144" | sudo tee -a /etc/security/limits.conf

# Disable transparent huge pages
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag

# Tune network stack
sudo sysctl -w net.core.rmem_max=134217728
sudo sysctl -w net.core.wmem_max=134217728
```

## ClickHouse Configuration

Edit `/etc/clickhouse-server/config.d/production.xml`:

```xml
<clickhouse>
  <listen_host>0.0.0.0</listen_host>
  <max_connections>4096</max_connections>
  <max_concurrent_queries>100</max_concurrent_queries>
  <uncompressed_cache_size>8589934592</uncompressed_cache_size>
  <mark_cache_size>5368709120</mark_cache_size>
</clickhouse>
```

## Setting Up an IAM Role for S3 Backups

Attach an IAM role to the EC2 instance with S3 write access so ClickHouse can run backups without static credentials. Enable instance-metadata credentials in the server config:

```xml
<clickhouse>
  <s3>
    <my_backup_endpoint>
      <endpoint>https://my-bucket.s3.amazonaws.com/backups/</endpoint>
      <use_environment_credentials>true</use_environment_credentials>
    </my_backup_endpoint>
  </s3>
</clickhouse>
```

Then run a backup that uses the matching endpoint:

```sql
BACKUP TABLE mydb.events TO S3('https://my-bucket.s3.amazonaws.com/backups/events', '', '');
```

## Summary

Deploying ClickHouse on AWS EC2 involves choosing a memory or compute optimized instance, configuring EBS volumes with XFS and noatime, setting OS-level tuning parameters, restricting network access via security groups, and using an IAM role for S3 backup access. This approach gives you full control over the ClickHouse environment.
