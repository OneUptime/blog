# How to Install ClickHouse on Amazon Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Amazon Linux, AWS, Installation, RPM

Description: Install ClickHouse on Amazon Linux 2 and Amazon Linux 2023 using the official RPM repository, with EC2 instance store and EBS configuration tips.

---

Amazon Linux is the default OS for many AWS deployments. Installing ClickHouse on Amazon Linux 2 and Amazon Linux 2023 follows a similar pattern to CentOS but with some AWS-specific optimizations.

## Installing on Amazon Linux 2023

```bash
# Amazon Linux 2023 uses dnf
sudo dnf install -y dnf-plugins-core

# Add the ClickHouse repository
sudo tee /etc/yum.repos.d/clickhouse.repo << 'EOF'
[clickhouse-stable]
name=ClickHouse - Stable Repository
baseurl=https://packages.clickhouse.com/rpm/stable/
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://packages.clickhouse.com/rpm/stable/repodata/repomd.xml.key
enabled=1
EOF

sudo dnf install -y clickhouse-server clickhouse-client
```

## Installing on Amazon Linux 2

```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://packages.clickhouse.com/rpm/clickhouse.repo
sudo yum install -y clickhouse-server clickhouse-client
```

## Starting the Service

```bash
sudo systemctl enable clickhouse-server
sudo systemctl start clickhouse-server
clickhouse-client --query "SELECT version()"
```

## Using EC2 Instance Store (NVMe)

EC2 instances with local NVMe storage (i3, i4i families) offer the best I/O performance for ClickHouse. Configure ClickHouse to use the NVMe drive:

```bash
# Find NVMe device
lsblk | grep nvme

# Format with XFS
sudo mkfs.xfs /dev/nvme1n1
sudo mkdir -p /var/lib/clickhouse
sudo mount /dev/nvme1n1 /var/lib/clickhouse
sudo chown -R clickhouse:clickhouse /var/lib/clickhouse
```

Note: Instance store is ephemeral. Always use ClickHouse replication or S3 backup when using instance store storage.

## Using EBS for Persistent Storage

For persistent storage, mount an EBS volume:

```bash
# Attach gp3 EBS volume in AWS console, then:
sudo mkfs.xfs /dev/xvdf
sudo mkdir -p /var/lib/clickhouse
sudo mount /dev/xvdf /var/lib/clickhouse
sudo chown -R clickhouse:clickhouse /var/lib/clickhouse

# Get UUID for fstab
UUID=$(blkid -s UUID -o value /dev/xvdf)
echo "UUID=$UUID /var/lib/clickhouse xfs defaults,noatime 0 2" | \
  sudo tee -a /etc/fstab
```

## OS Tuning

```bash
# File descriptor limits
sudo tee /etc/security/limits.d/clickhouse.conf << 'EOF'
clickhouse soft nofile 262144
clickhouse hard nofile 262144
EOF

# Disable transparent huge pages
sudo tee /etc/systemd/system/disable-thp.service << 'EOF'
[Unit]
Description=Disable Transparent Huge Pages
After=sysinit.target local-fs.target
Before=clickhouse-server.service
[Service]
Type=oneshot
ExecStart=/bin/sh -c "echo never > /sys/kernel/mm/transparent_hugepage/enabled && echo never > /sys/kernel/mm/transparent_hugepage/defrag"
RemainAfterExit=yes
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now disable-thp
```

## IAM Role for S3 Backups

When running on EC2 with an IAM role attached, ClickHouse can use the instance metadata for S3 authentication:

```sql
BACKUP DATABASE mydb
TO S3('s3://my-backup-bucket/clickhouse/', 'auto', 'auto');
```

## Summary

Installing ClickHouse on Amazon Linux uses the RPM repository and `dnf` or `yum`. For best performance, use local NVMe instance store with replication, or gp3 EBS volumes for simpler deployments. Attach an IAM role with S3 permissions to enable passwordless backup operations.
