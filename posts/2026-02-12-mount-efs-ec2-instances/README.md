# How to Mount EFS on EC2 Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, EC2, Storage, NFS

Description: Learn how to mount an Amazon EFS file system on EC2 instances using the EFS mount helper and NFS, with options for encryption in transit and automatic mounting on boot.

---

You've created an EFS file system and set up mount targets. Now it's time to actually mount it on your EC2 instances. There are two ways to do this: the EFS mount helper (recommended) or a standard NFS mount. The mount helper handles TLS encryption, IAM authorization, and automatic retries, so it's the better option in almost every case.

Let's walk through both approaches, plus how to make the mount persist across reboots and how to optimize performance.

## Prerequisites

Before you mount, double check these things:

1. Your EFS file system has a mount target in the same Availability Zone as your EC2 instance
2. The instance's security group allows outbound traffic on port 2049
3. The EFS mount target's security group allows inbound traffic on port 2049 from your instance's security group
4. The instance has an IAM role with EFS permissions (if using IAM authorization)

If you haven't created an EFS file system yet, see our guide on [creating an Amazon EFS file system](https://oneuptime.com/blog/post/2026-02-12-amazon-efs-file-system/view).

## Installing the EFS Mount Helper

The EFS mount helper (`amazon-efs-utils`) comes pre-installed on Amazon Linux 2 and Amazon Linux 2023. For other distributions, you'll need to install it.

On Amazon Linux / Amazon Linux 2:

```bash
# Usually already installed, but just in case
sudo yum install -y amazon-efs-utils
```

On Ubuntu/Debian:

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y git binutils rustc cargo pkg-config libssl-dev

# Clone and install the package
git clone https://github.com/aws/efs-utils
cd efs-utils
./build-deb.sh
sudo apt-get install -y ./build/amazon-efs-utils*deb
```

On RHEL/CentOS:

```bash
sudo yum install -y git rpm-build make
git clone https://github.com/aws/efs-utils
cd efs-utils
make rpm
sudo yum install -y ./build/amazon-efs-utils*rpm
```

## Mounting with the EFS Mount Helper

The mount helper simplifies the mount command and adds encryption support. Here's the basic mount:

```bash
# Create the mount point
sudo mkdir -p /mnt/efs

# Mount using the EFS mount helper
sudo mount -t efs fs-0abc123def456789:/ /mnt/efs
```

That's it. The mount helper resolves the correct mount target for your AZ automatically. No need to look up IP addresses.

To mount with encryption in transit (TLS):

```bash
# Mount with TLS encryption
sudo mount -t efs -o tls fs-0abc123def456789:/ /mnt/efs
```

To mount with IAM authorization (requires the instance to have an IAM role with EFS permissions):

```bash
# Mount with IAM authorization and TLS
sudo mount -t efs -o tls,iam fs-0abc123def456789:/ /mnt/efs
```

## Mounting with Standard NFS

If you can't or don't want to use the mount helper, standard NFS works fine:

```bash
# Create the mount point
sudo mkdir -p /mnt/efs

# Mount using NFS
# Replace the DNS name with your EFS file system's DNS
sudo mount -t nfs4 \
  -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport \
  fs-0abc123def456789.efs.us-east-1.amazonaws.com:/ \
  /mnt/efs
```

The mount options explained:

- **nfsvers=4.1** - Use NFS version 4.1 (required for EFS)
- **rsize=1048576** - Read buffer size of 1 MB (maximizes throughput)
- **wsize=1048576** - Write buffer size of 1 MB
- **hard** - Retries NFS requests indefinitely (don't use soft - it can cause data corruption)
- **timeo=600** - 60-second timeout before retrying
- **retrans=2** - Retry twice before the timeout
- **noresvport** - Don't use a reserved port (allows more concurrent connections)

## Making the Mount Persist Across Reboots

A regular mount command won't survive a reboot. You need to add an entry to `/etc/fstab`.

For the mount helper:

```bash
# Add to /etc/fstab for automatic mounting on boot
echo "fs-0abc123def456789:/ /mnt/efs efs _netdev,tls 0 0" | sudo tee -a /etc/fstab
```

For standard NFS:

```bash
# Add NFS mount to /etc/fstab
echo "fs-0abc123def456789.efs.us-east-1.amazonaws.com:/ /mnt/efs nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport,_netdev 0 0" | sudo tee -a /etc/fstab
```

The `_netdev` option is critical - it tells the system to wait for network availability before trying to mount. Without it, the mount will fail on boot because the network isn't up yet.

Test your fstab entry without rebooting:

```bash
# Unmount first if already mounted
sudo umount /mnt/efs

# Mount everything in fstab
sudo mount -a

# Verify it's mounted
df -h /mnt/efs
```

## Mounting at Boot with User Data

For Auto Scaling groups or launch templates, include the mount in your user data script:

```bash
#!/bin/bash
# Install EFS utils if not present
if ! command -v mount.efs &> /dev/null; then
    yum install -y amazon-efs-utils
fi

# Create mount point
mkdir -p /mnt/efs

# Add fstab entry
echo "fs-0abc123def456789:/ /mnt/efs efs _netdev,tls 0 0" >> /etc/fstab

# Mount
mount -a

# Verify
if mountpoint -q /mnt/efs; then
    echo "EFS mounted successfully"
else
    echo "EFS mount failed" >&2
    exit 1
fi
```

## Mounting a Subdirectory

You don't have to mount the root of the file system. You can mount a specific subdirectory:

```bash
# Mount a subdirectory
sudo mount -t efs fs-0abc123def456789:/app/data /mnt/app-data
```

This is useful when different applications share the same EFS file system but each gets its own directory. You can also use EFS Access Points for this - see our guide on [EFS access points for application-specific access](https://oneuptime.com/blog/post/2026-02-12-efs-access-points-application-specific-access/view).

## Mounting on Multiple Instances

The whole point of EFS is shared access. Mount it on as many instances as you need:

```bash
# On instance 1
sudo mount -t efs -o tls fs-0abc123def456789:/ /mnt/shared

# On instance 2
sudo mount -t efs -o tls fs-0abc123def456789:/ /mnt/shared

# On instance 3
sudo mount -t efs -o tls fs-0abc123def456789:/ /mnt/shared
```

Files written on one instance are visible on all others within a few seconds (EFS provides close-to-open consistency).

## Performance Optimization

EFS performance depends on a few factors. Here are some tips:

**Use larger I/O sizes**: The default rsize and wsize of 1 MB is optimal. Don't reduce them.

**Parallelize your workload**: EFS throughput scales with the number of concurrent connections and threads. A single-threaded copy will be slow. Use parallel tools:

```bash
# Parallel copy with multiple threads
# Install fpart and fpsync for parallel file operations
sudo yum install -y fpart

# Copy with 16 parallel threads
fpsync -n 16 /source/directory/ /mnt/efs/destination/
```

**Use the right performance mode**: General Purpose is fine for most workloads. Only use Max I/O if you have thousands of instances accessing the file system concurrently and can tolerate slightly higher latencies.

**Monitor throughput**: Keep an eye on your burst credit balance if using bursting throughput mode. When credits run out, throughput drops to the baseline.

```bash
# Check burst credit balance via CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace "AWS/EFS" \
  --metric-name "BurstCreditBalance" \
  --dimensions "Name=FileSystemId,Value=fs-0abc123def456789" \
  --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --period 300 \
  --statistics Average
```

## Troubleshooting Common Issues

**Mount hangs or times out**: Usually a security group issue. Verify that port 2049 is open between your instance and the mount target.

```bash
# Test NFS port connectivity
telnet fs-0abc123def456789.efs.us-east-1.amazonaws.com 2049
```

**Permission denied**: Check that the EFS file system policy allows your instance's IAM role, or that you're not using IAM authorization without the iam mount option.

**Stale file handle**: This happens if the EFS file system was deleted and recreated with the same name but a different ID. Unmount and remount.

```bash
# Force unmount a stale mount
sudo umount -f /mnt/efs
sudo mount -t efs -o tls fs-0abc123def456789:/ /mnt/efs
```

**Slow performance**: Check if you've run out of burst credits. Also verify you're using the recommended mount options (1 MB rsize/wsize, hard mount).

## Verifying the Mount

After mounting, verify everything works:

```bash
# Check mount is active
mount | grep efs

# Check available space (EFS shows as very large since it auto-scales)
df -h /mnt/efs

# Test write and read
echo "Hello from $(hostname)" | sudo tee /mnt/efs/test-$(hostname).txt
cat /mnt/efs/test-*.txt
```

## Wrapping Up

Mounting EFS on EC2 is straightforward once you have the security groups right. Use the EFS mount helper for the best experience - it handles TLS, IAM auth, and AZ-aware DNS resolution automatically. Always add your mounts to `/etc/fstab` with the `_netdev` option so they survive reboots. And if performance matters, parallelize your I/O and monitor your burst credits.
