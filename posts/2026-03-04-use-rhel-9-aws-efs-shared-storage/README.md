# How to Use RHEL with AWS EFS for Shared Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, AWS, EFS, NFS, Shared Storage, Linux

Description: Mount and configure AWS Elastic File System (EFS) on RHEL instances for shared, scalable NFS storage across multiple servers.

---

AWS Elastic File System (EFS) provides scalable NFS storage that can be shared across multiple RHEL instances. This guide covers creating an EFS filesystem and mounting it on RHEL with proper performance and security settings.

## Step 1: Create an EFS Filesystem

```bash
# Create the EFS filesystem

EFS_ID=$(aws efs create-file-system \
  --performance-mode generalPurpose \
  --throughput-mode elastic \
  --encrypted \
  --tags Key=Name,Value=rhel9-shared \
  --query 'FileSystemId' --output text)

echo "EFS ID: $EFS_ID"

# Create mount targets in each availability zone
for SUBNET_ID in subnet-aaa subnet-bbb; do
  aws efs create-mount-target \
    --file-system-id $EFS_ID \
    --subnet-id $SUBNET_ID \
    --security-groups sg-efs-access
done
```

## Step 2: Install the EFS Mount Helper

```bash
# On your RHEL instances
sudo dnf install -y amazon-efs-utils nfs-utils

# Verify the EFS utilities are installed
rpm -q amazon-efs-utils
```

## Step 3: Mount the EFS Filesystem

```bash
# Create the mount point
sudo mkdir -p /mnt/efs

# Mount using the EFS mount helper (recommended)
# The tls option enables encryption in transit
sudo mount -t efs -o tls $EFS_ID:/ /mnt/efs

# For persistent mounting, add to /etc/fstab
echo "$EFS_ID:/ /mnt/efs efs _netdev,tls 0 0" | sudo tee -a /etc/fstab

# Verify the mount
df -hT /mnt/efs
```

## Step 4: Configure EFS Access Points

```bash
# Create an access point for application data
AP_ID=$(aws efs create-access-point \
  --file-system-id $EFS_ID \
  --posix-user "Uid=1000,Gid=1000" \
  --root-directory "Path=/app-data,CreationInfo={OwnerUid=1000,OwnerGid=1000,Permissions=755}" \
  --query 'AccessPointId' --output text)

# Mount using the access point
sudo mkdir -p /mnt/app-data
sudo mount -t efs -o tls,accesspoint=$AP_ID $EFS_ID:/ /mnt/app-data
```

## Step 5: Optimize NFS Performance

```bash
# The EFS mount helper version 1.33.2 and later sets read_ahead_kb automatically.
# If you are not using that version, set read_ahead_kb to 15 MB after mounting.
device_number=$(stat -c '%d' /mnt/efs)
((major = ($device_number & 0xFFF00) >> 8))
((minor = ($device_number & 0xFF) | (($device_number >> 12) & 0xFFF00)))
sudo bash -c "echo 15000 > /sys/class/bdi/$major:$minor/read_ahead_kb"

# Verify NFS mount options
nfsstat -m
```

## Step 6: Set Up Shared Content

```bash
# Create a shared directory structure
sudo mkdir -p /mnt/efs/{shared-configs,app-data,logs}
sudo chmod 775 /mnt/efs/shared-configs
sudo chmod 775 /mnt/efs/app-data

# Test write from one instance
echo "Test from $(hostname)" | sudo tee /mnt/efs/shared-configs/test.txt

# Verify read from another instance
cat /mnt/efs/shared-configs/test.txt
```

## Conclusion

AWS EFS provides a simple way to share storage across multiple RHEL instances. The EFS mount helper with TLS encryption ensures data is protected in transit, and access points give you fine-grained control over who can access what. EFS elastic throughput mode automatically adjusts performance based on your workload, making it suitable for a wide range of shared storage use cases.
