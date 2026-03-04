# How to Add Block Devices to an Existing Stratis Pool on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Stratis, Storage, Linux

Description: Learn how to expand Stratis pool capacity by adding new block devices on RHEL, including preparation, adding data devices, and monitoring pool growth.

---

One of Stratis's key features is the ability to easily expand storage capacity by adding new block devices to an existing pool. When a pool approaches its capacity limit, you can add additional disks without any downtime or data migration. This guide covers the process on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- An existing Stratis pool
- One or more new block devices to add
- Stratis daemon running

## Step 1: Check Current Pool Status

Before adding devices, assess the current pool capacity:

```bash
sudo stratis pool list
```

Output:

```bash
Name       Total / Used / Free           Properties   UUID   Alerts
datapool   50 GiB / 35 GiB / 15 GiB     ~Ca,~Cr      abc...
```

Check existing block devices:

```bash
sudo stratis blockdev list datapool
```

## Step 2: Identify New Block Devices

List all block devices:

```bash
lsblk
```

Verify the new device is not in use:

```bash
sudo blkid /dev/sdd
sudo pvs /dev/sdd
```

## Step 3: Prepare the New Block Device

Ensure the device has no existing signatures:

```bash
sudo wipefs -a /dev/sdd
```

If the device has partitions, remove them:

```bash
sudo wipefs -a /dev/sdd
sudo sgdisk --zap-all /dev/sdd
```

## Step 4: Add the Block Device to the Pool

Add a single device:

```bash
sudo stratis pool add-data datapool /dev/sdd
```

Add multiple devices at once:

```bash
sudo stratis pool add-data datapool /dev/sdd /dev/sde
```

## Step 5: Verify the Expansion

Check the updated pool size:

```bash
sudo stratis pool list
```

The total pool size should now include the capacity of the new device(s).

List all block devices in the pool:

```bash
sudo stratis blockdev list datapool
```

## Step 6: Verify Filesystem Access

All existing filesystems in the pool automatically have access to the new capacity:

```bash
sudo stratis filesystem list datapool
df -h /documents /projects
```

No additional steps are needed. Stratis's thin provisioning automatically makes the new space available to all filesystems in the pool.

## Adding Cache Devices vs. Data Devices

Stratis distinguishes between two types of devices:

### Data Devices

Regular storage devices that provide capacity:

```bash
sudo stratis pool add-data datapool /dev/sdd
```

### Cache Devices

Fast devices (typically SSDs) used as a caching tier:

```bash
sudo stratis pool init-cache datapool /dev/nvme0n1
```

To add more cache devices later:

```bash
sudo stratis pool add-cache datapool /dev/nvme1n1
```

Cache devices improve read performance by caching frequently accessed data on faster storage.

## Monitoring After Expansion

Set up monitoring to track pool usage:

```bash
# Quick status check
sudo stratis pool list

# Detailed block device information
sudo stratis blockdev list datapool

# Per-filesystem usage
sudo stratis filesystem list datapool
```

Create a monitoring script:

```bash
sudo tee /usr/local/bin/stratis-check.sh << 'SCRIPT'
#!/bin/bash
POOL="datapool"
THRESHOLD=85

# Get pool usage percentage
TOTAL=$(stratis pool list | grep "$POOL" | awk '{print $3}' | sed 's/GiB//')
USED=$(stratis pool list | grep "$POOL" | awk '{print $5}' | sed 's/GiB//')

if [ -n "$TOTAL" ] && [ -n "$USED" ]; then
    PERCENT=$(echo "$USED $TOTAL" | awk '{printf "%.0f", ($1/$2)*100}')
    if [ "$PERCENT" -ge "$THRESHOLD" ]; then
        echo "WARNING: Stratis pool $POOL is ${PERCENT}% full" | \
          logger -t stratis-monitor -p user.warning
    fi
fi
SCRIPT
sudo chmod +x /usr/local/bin/stratis-check.sh
```

## Important Considerations

### Cannot Remove Devices

Currently, Stratis does not support removing data devices from a pool. Once a device is added, it becomes a permanent member. Plan your pool membership carefully.

### Device Size Matters

Stratis works best when all data devices in a pool are similar in size. Mixing very different sizes is supported but may not distribute data optimally.

### Device Type Consistency

While you can mix HDDs and SSDs as data devices, it is better to keep data devices consistent and use SSDs as cache devices instead.

### No RAID in Stratis

Stratis does not provide redundancy. If any data device in the pool fails, the pool and all its filesystems are lost. Use hardware RAID or mdraid underneath Stratis if you need redundancy.

## Conclusion

Adding block devices to an existing Stratis pool on RHEL is a simple, non-disruptive operation that immediately increases the available capacity for all filesystems in the pool. The process requires no downtime, no data migration, and no filesystem resizing. Just remember that device removal is not supported, so plan pool membership carefully and monitor usage to add capacity before pools fill up.
