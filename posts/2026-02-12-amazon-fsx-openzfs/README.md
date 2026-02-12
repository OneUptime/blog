# How to Set Up Amazon FSx for OpenZFS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, FSx, OpenZFS, Storage, NFS

Description: Learn how to set up Amazon FSx for OpenZFS with its powerful snapshot, clone, and compression features for Linux and macOS workloads on AWS.

---

FSx for OpenZFS brings one of the most respected file systems in the industry to AWS as a managed service. ZFS is legendary for its data integrity guarantees, efficient snapshots, cloning, compression, and overall reliability. If you're running Linux or macOS workloads and need NFS storage with features that go well beyond basic file serving, FSx for OpenZFS is worth a serious look.

It sits between EFS (simple, managed, elastic) and FSx for NetApp ONTAP (enterprise, multi-protocol) in terms of complexity and features. You get the performance and data management features of ZFS without having to manage the underlying infrastructure.

## Why FSx for OpenZFS

Here's what makes it compelling:

- **ZFS data integrity**: Checksumming on all data and metadata, with automatic repair of silent data corruption
- **Efficient snapshots**: Copy-on-write snapshots that are instant and space-efficient
- **Clones**: Writable clones from snapshots in seconds, regardless of data size
- **Compression**: ZFS compression (LZ4, ZSTD) built in, often improving throughput while saving space
- **NFS v3 and v4**: Native NFS support for Linux and macOS clients
- **Up to 1 million IOPS**: For workloads that need serious random I/O performance
- **Low latency**: Sub-millisecond latencies for cached data

## When to Use OpenZFS

Good fits for FSx for OpenZFS:

- **Linux/macOS NFS workloads** that need more performance than EFS
- **DevOps and CI/CD** where fast cloning accelerates build and test pipelines
- **Database workloads** that need consistent, high IOPS
- **EDA (Electronic Design Automation)** tools that are validated on ZFS
- **Migrating from on-premises ZFS** to AWS

Not ideal for:
- Windows workloads (use FSx for Windows or ONTAP)
- Multi-protocol needs (use ONTAP)
- Workloads that need elastic storage that grows automatically (use EFS)

## Creating the File System

Basic single-AZ deployment:

```bash
# Create FSx for OpenZFS file system
aws fsx create-file-system \
  --file-system-type OPENZFS \
  --storage-capacity 256 \
  --storage-type SSD \
  --subnet-ids "subnet-0aaa111" \
  --security-group-ids "sg-0zfs123" \
  --open-zfs-configuration '{
    "DeploymentType": "SINGLE_AZ_2",
    "ThroughputCapacity": 160,
    "RootVolumeConfiguration": {
      "DataCompressionType": "LZ4",
      "NfsExports": [{
        "ClientConfigurations": [{
          "Clients": "10.0.0.0/16",
          "Options": ["rw", "crossmnt", "no_root_squash"]
        }]
      }]
    },
    "DiskIopsConfiguration": {
      "Mode": "AUTOMATIC"
    }
  }' \
  --tags '[{"Key": "Name", "Value": "openzfs-storage"}]'
```

Multi-AZ deployment for high availability:

```bash
# Create Multi-AZ FSx for OpenZFS
aws fsx create-file-system \
  --file-system-type OPENZFS \
  --storage-capacity 512 \
  --storage-type SSD \
  --subnet-ids "subnet-0aaa111" "subnet-0bbb222" \
  --security-group-ids "sg-0zfs123" \
  --open-zfs-configuration '{
    "DeploymentType": "MULTI_AZ_1",
    "ThroughputCapacity": 320,
    "PreferredSubnetId": "subnet-0aaa111",
    "RootVolumeConfiguration": {
      "DataCompressionType": "ZSTD",
      "NfsExports": [{
        "ClientConfigurations": [{
          "Clients": "10.0.0.0/16",
          "Options": ["rw", "crossmnt", "no_root_squash"]
        }]
      }]
    }
  }' \
  --tags '[{"Key": "Name", "Value": "openzfs-ha"}]'
```

Parameters to note:

- **ThroughputCapacity**: 64, 128, 160, 256, 320, 512, 1024, 2048, 3072, or 4096 MB/s
- **DataCompressionType**: `LZ4` (fast, moderate compression), `ZSTD` (better compression, slightly more CPU), or `NONE`
- **DiskIopsConfiguration**: `AUTOMATIC` (3 IOPS per GB, up to 400,000) or `USER_PROVISIONED`

## Security Group Setup

OpenZFS needs NFS ports:

```bash
# Create security group for OpenZFS
ZFS_SG=$(aws ec2 create-security-group \
  --group-name "fsx-openzfs-sg" \
  --description "Security group for FSx for OpenZFS" \
  --vpc-id "vpc-0abc123" \
  --query "GroupId" \
  --output text)

# NFS
aws ec2 authorize-security-group-ingress \
  --group-id "$ZFS_SG" --protocol tcp --port 2049 \
  --source-group "sg-0clients"

aws ec2 authorize-security-group-ingress \
  --group-id "$ZFS_SG" --protocol udp --port 2049 \
  --source-group "sg-0clients"

# NFS mountd and portmapper (for NFSv3)
aws ec2 authorize-security-group-ingress \
  --group-id "$ZFS_SG" --protocol tcp --port 111 \
  --source-group "sg-0clients"

aws ec2 authorize-security-group-ingress \
  --group-id "$ZFS_SG" --protocol udp --port 111 \
  --source-group "sg-0clients"

aws ec2 authorize-security-group-ingress \
  --group-id "$ZFS_SG" --protocol tcp --port 20001-20003 \
  --source-group "sg-0clients"

aws ec2 authorize-security-group-ingress \
  --group-id "$ZFS_SG" --protocol udp --port 20001-20003 \
  --source-group "sg-0clients"
```

## Creating Child Volumes

The file system comes with a root volume. Create child volumes for different purposes:

```bash
# Create a child volume for application data
aws fsx create-volume \
  --volume-type OPENZFS \
  --name "app-data" \
  --open-zfs-configuration '{
    "ParentVolumeId": "fsvol-0root123",
    "DataCompressionType": "LZ4",
    "NfsExports": [{
      "ClientConfigurations": [{
        "Clients": "10.0.0.0/16",
        "Options": ["rw", "no_root_squash"]
      }]
    }],
    "UserAndGroupQuotas": [
      {
        "Type": "USER",
        "Id": 1000,
        "StorageCapacityQuotaGiB": 100
      }
    ],
    "RecordSizeKiB": 128
  }' \
  --tags '[{"Key": "Name", "Value": "app-data"}]'
```

Create a volume optimized for database workloads:

```bash
# Database-optimized volume with small record size
aws fsx create-volume \
  --volume-type OPENZFS \
  --name "database" \
  --open-zfs-configuration '{
    "ParentVolumeId": "fsvol-0root123",
    "DataCompressionType": "NONE",
    "RecordSizeKiB": 8,
    "NfsExports": [{
      "ClientConfigurations": [{
        "Clients": "10.0.1.0/24",
        "Options": ["rw", "sync", "no_root_squash"]
      }]
    }]
  }'
```

The `RecordSizeKiB` parameter is crucial for performance:
- **8 or 16 KiB** for databases (matches typical database page sizes)
- **128 KiB** (default) for general workloads
- **1024 KiB** for large sequential I/O (video, backups)

## Mounting the File System

On Linux:

```bash
# Install NFS client
sudo yum install -y nfs-utils  # Amazon Linux / RHEL
# or
sudo apt-get install -y nfs-common  # Ubuntu

# Get the DNS name
DNS_NAME=$(aws fsx describe-file-systems \
  --file-system-ids "fs-0abc123" \
  --query "FileSystems[0].DNSName" \
  --output text)

# Mount the root volume
sudo mkdir -p /mnt/zfs
sudo mount -t nfs \
  -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport \
  ${DNS_NAME}:/fsx/ /mnt/zfs

# Mount a child volume
sudo mkdir -p /mnt/app-data
sudo mount -t nfs \
  -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport \
  ${DNS_NAME}:/fsx/app-data /mnt/app-data
```

On macOS (for developer workstations):

```bash
# Mount on macOS
sudo mkdir -p /mnt/zfs
sudo mount -t nfs \
  -o resvport,nfsvers=4.1 \
  fs-0abc123.fsx.us-east-1.amazonaws.com:/fsx/ /mnt/zfs
```

## Working with Snapshots

ZFS snapshots are one of its best features. They're instant, space-efficient, and don't impact performance.

```bash
# Create a snapshot
aws fsx create-snapshot \
  --name "before-deployment-v2.5" \
  --volume-id "fsvol-0abc123" \
  --tags '[{"Key": "Purpose", "Value": "pre-deployment"}]'

# List snapshots for a volume
aws fsx describe-snapshots \
  --filters "Name=volume-id,Values=fsvol-0abc123" \
  --query "Snapshots[].{Name:Name,Created:CreationTime,Id:SnapshotId}" \
  --output table
```

Users can access snapshots directly through the `.zfs/snapshot` directory:

```bash
# Browse snapshots on the mounted volume
ls /mnt/zfs/.zfs/snapshot/

# Restore a specific file from a snapshot
cp /mnt/zfs/.zfs/snapshot/before-deployment-v2.5/config.yaml /mnt/zfs/config.yaml
```

## Creating Clones from Snapshots

Clones are writable, instant copies of a snapshot. They share data blocks with the original and only store differences.

```bash
# Create a clone from a snapshot
aws fsx create-volume \
  --volume-type OPENZFS \
  --name "dev-clone" \
  --open-zfs-configuration '{
    "ParentVolumeId": "fsvol-0root123",
    "OriginSnapshot": {
      "SnapshotARN": "arn:aws:fsx:us-east-1:123456789012:snapshot/fss-0snap123",
      "CopyStrategy": "CLONE"
    },
    "NfsExports": [{
      "ClientConfigurations": [{
        "Clients": "10.0.0.0/16",
        "Options": ["rw", "no_root_squash"]
      }]
    }]
  }'
```

This is perfect for creating development or testing environments from production data. A 500 GB volume clone takes seconds and initially uses zero additional storage.

## Terraform Configuration

```hcl
resource "aws_fsx_openzfs_file_system" "main" {
  storage_capacity    = 256
  subnet_ids          = [var.subnet_id]
  deployment_type     = "SINGLE_AZ_2"
  throughput_capacity = 160
  storage_type        = "SSD"
  security_group_ids  = [aws_security_group.zfs.id]

  root_volume_configuration {
    data_compression_type = "LZ4"

    nfs_exports {
      client_configurations {
        clients = "10.0.0.0/16"
        options = ["rw", "crossmnt", "no_root_squash"]
      }
    }
  }

  tags = {
    Name        = "openzfs-storage"
    Environment = var.environment
  }
}

resource "aws_fsx_openzfs_volume" "app_data" {
  name             = "app_data"
  parent_volume_id = aws_fsx_openzfs_file_system.main.root_volume_id

  data_compression_type = "LZ4"
  record_size_kib       = 128

  nfs_exports {
    client_configurations {
      clients = "10.0.0.0/16"
      options = ["rw", "no_root_squash"]
    }
  }

  user_and_group_quotas {
    id                         = 1000
    storage_capacity_quota_gib = 100
    type                       = "USER"
  }

  tags = {
    Name = "app-data"
  }
}

resource "aws_security_group" "zfs" {
  name_prefix = "fsx-openzfs-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [var.client_security_group_id]
    description     = "NFS"
  }

  ingress {
    from_port       = 111
    to_port         = 111
    protocol        = "tcp"
    security_groups = [var.client_security_group_id]
    description     = "Portmapper"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Compression Performance

ZFS compression is worth enabling for almost every workload. Here's why:

- **LZ4**: Nearly zero CPU overhead. Compresses typical data 2-3x. Can actually improve throughput because less data needs to be read from disk.
- **ZSTD**: Moderate CPU overhead. Compresses 3-5x for typical data. Better for cold storage or when storage costs dominate.

To check compression effectiveness after loading data:

```bash
# On a mounted volume, check compression ratio
# ZFS reports this through the .zfs interface
# You can also check via CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace "AWS/FSx" \
  --metric-name "StorageCapacityUtilization" \
  --dimensions "Name=FileSystemId,Value=fs-0abc123" \
  --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --period 3600 \
  --statistics Average
```

## Monitoring

Key CloudWatch metrics to watch:

```bash
# Create alarms for critical metrics
# Storage utilization
aws cloudwatch put-metric-alarm \
  --alarm-name "openzfs-storage-high" \
  --namespace "AWS/FSx" \
  --metric-name "StorageCapacityUtilization" \
  --dimensions "Name=FileSystemId,Value=fs-0abc123" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 3 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-alerts"

# Throughput utilization
aws cloudwatch put-metric-alarm \
  --alarm-name "openzfs-throughput-high" \
  --namespace "AWS/FSx" \
  --metric-name "ThroughputUtilization" \
  --dimensions "Name=FileSystemId,Value=fs-0abc123" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 6 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-alerts"
```

## Best Practices

1. **Enable compression** (LZ4 minimum) on every volume. The CPU cost is negligible and the space savings are real.
2. **Set RecordSizeKiB** based on your I/O pattern. Wrong record size is the most common performance mistake.
3. **Use snapshots liberally** - they're nearly free and provide valuable recovery points.
4. **Use clones for dev/test** instead of copying data.
5. **Monitor storage utilization** - unlike EFS, OpenZFS doesn't auto-grow. Plan your capacity.
6. **Use Multi-AZ for production** to get automatic failover.

## Wrapping Up

FSx for OpenZFS combines ZFS's proven reliability and features with AWS's managed service model. You get instant snapshots, writable clones, built-in compression, and data integrity guarantees without managing any infrastructure. For Linux NFS workloads that need more than EFS offers - whether in performance, features, or data management capabilities - OpenZFS is a strong choice.
