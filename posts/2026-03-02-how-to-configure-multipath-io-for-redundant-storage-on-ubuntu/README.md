# How to Configure Multipath I/O for Redundant Storage on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, Multipath, MPIO, High Availability

Description: Configure Linux Multipath I/O (MPIO) on Ubuntu to provide redundant, high-availability access to SAN storage through multiple network or Fibre Channel paths.

---

Multipath I/O (MPIO) is a technique that creates redundant paths between a server and its storage. If one path fails - due to a network switch failure, HBA issue, or storage controller outage - I/O automatically fails over to another path without interrupting running applications. Beyond redundancy, multiple active paths can also aggregate bandwidth for higher storage throughput.

On Ubuntu, the `multipath-tools` package provides the Device Mapper Multipath daemon (`multipathd`) that handles path management.

## How Multipath Works

When a storage device is visible through multiple paths (e.g., two HBAs connecting to two storage controllers), Linux sees multiple block devices representing the same physical disk. Without multipath, the OS treats these as separate disks, which causes data corruption if both are written to. `multipathd` detects that these paths lead to the same LUN using the device's WWID (World Wide Identifier) and creates a single logical device (`/dev/mapper/mpathX`) that the OS uses.

## Installing multipath-tools

```bash
sudo apt update
sudo apt install multipath-tools -y

# Enable and start the daemon
sudo systemctl enable --now multipathd
```

## Discovering Existing Paths

After connecting your storage (via iSCSI, FC, or SAS), list the detected paths:

```bash
# Show all multipath devices
sudo multipath -ll

# List all block devices and their paths
lsblk

# Show disk identifiers
sudo multipath -v3 2>&1 | head -50
```

## Basic Configuration

The main configuration file is `/etc/multipath.conf`. Ubuntu ships a minimal default, but you'll want to customize it:

```bash
# Generate a baseline configuration
sudo multipath -T > /etc/multipath.conf.generated

# View the current effective configuration
sudo multipathd show config
```

A typical `/etc/multipath.conf` for iSCSI paths:

```
defaults {
    # Use device name from udev rather than just numbers
    user_friendly_names yes

    # Default path grouping policy
    path_grouping_policy multibus

    # Path selector: round-robin distributes I/O across paths
    path_selector "round-robin 0"

    # Number of I/Os before switching to next path in round-robin
    rr_min_io 100

    # How often to check paths (seconds)
    polling_interval 5

    # Fail a path after 3 missed checks
    path_checker readsector0
    no_path_retry fail

    # Retain SCSI ordering
    retain_attached_hw_handler yes
}

blacklist {
    # Exclude local disks from multipath (avoid accidentally multipathing the root disk)
    devnode "^sda"
    devnode "^sr[0-9]*"

    # Exclude by device type - only want SCSI disk type 0
    device {
        vendor ".*"
        product ".*"
        # Uncomment to blacklist all - then whitelist specific devices below
    }
}

multipaths {
    # Optional: assign a friendly alias to a specific WWID
    multipath {
        wwid 360000000000000001
        alias data_vol_01
    }
}

devices {
    # EMC storage settings example
    device {
        vendor "EMC"
        product "SYMMETRIX"
        path_grouping_policy multibus
        getuid_callout "/lib/udev/scsi_id --whitelisted --device=/dev/%n"
        path_selector "round-robin 0"
        path_checker readsector0
        no_path_retry 6
    }
}
```

## Applying Configuration Changes

```bash
# After editing multipath.conf, reload the configuration
sudo multipathd reconfigure

# Or restart the daemon
sudo systemctl restart multipathd

# Verify the changes took effect
sudo multipath -ll
```

## Understanding multipath -ll Output

```bash
sudo multipath -ll
```

Example output:
```
mpatha (360000000000000001) dm-0 VENDOR,PRODUCT
size=50G features='0' hwhandler='0' wp=rw
|-+- policy='round-robin 0' prio=1 status=active
| `- 2:0:0:0 sdb 8:16 active ready running
`-+- policy='round-robin 0' prio=1 status=enabled
  `- 3:0:0:0 sdc 8:32 active ready running
```

- `mpatha` - the multipath device name (or alias if configured)
- `dm-0` - the device mapper device
- `sdb`, `sdc` - the two underlying paths to the same LUN
- `active ready running` - both paths are healthy and active

## Path Grouping Policies

Different policies suit different scenarios:

```
# All paths in one group - simplest, all active simultaneously
path_grouping_policy multibus

# Failover only - one active path, others on standby
path_grouping_policy failover

# Group by priority - useful for active/passive storage controllers
path_grouping_policy group_by_prio
```

For active-active storage arrays, use `multibus`. For active-passive (where only one controller handles I/O at a time), use `group_by_prio` with appropriate path priorities.

## Using the Multipath Device

Once configured, use the `/dev/mapper/mpathX` device (or your alias) just like any block device:

```bash
# Create a filesystem on the multipath device
sudo mkfs.xfs /dev/mapper/mpatha

# Mount it
sudo mkdir -p /mnt/storage
sudo mount /dev/mapper/mpatha /mnt/storage

# Verify
df -h /mnt/storage
```

For `/etc/fstab`, use the WWID or UUID, not the device name, since `/dev/mapper/mpatha` assignments can shift:

```bash
# Get the device UUID
sudo blkid /dev/mapper/mpatha

# /etc/fstab entry
# UUID=xxxx-xxxx /mnt/storage xfs defaults,_netdev 0 0
```

## Simulating Path Failures

Test your configuration by deliberately failing a path:

```bash
# Bring down one of the underlying interfaces (for iSCSI)
sudo ip link set eth1 down

# Check multipath status - one path should show as failed
sudo multipath -ll

# Watch I/O continue on the remaining path
iostat -x 2 5

# Restore the path
sudo ip link set eth1 up

# Multipathd should automatically re-add the path when it recovers
watch -n 2 'sudo multipath -ll'
```

## Managing Paths with multipathd

The `multipathd` interactive console provides real-time management:

```bash
# Launch interactive console
sudo multipathd -k

# Inside the console:
# show paths        - list all paths and their status
# show maps         - list all multipath devices
# show maps stats   - I/O statistics per device
# fail path sdb     - manually fail a path for testing
# reinstate path sdb - bring a path back
# quit
```

## Handling New LUNs

When new LUNs are added to the storage array:

```bash
# Rescan SCSI bus for new devices
sudo rescan-scsi-bus.sh
# Or manually:
echo "- - -" | sudo tee /sys/class/scsi_host/host*/scan

# Force multipath to recognize new devices
sudo multipath -F  # flush current maps
sudo multipath     # rebuild maps with new devices

# Verify new multipath device appeared
sudo multipath -ll
```

## Removing a Multipath Device

When decommissioning a LUN:

```bash
# Unmount and stop using the device first
sudo umount /mnt/storage

# Flush the multipath map
sudo multipath -f mpatha

# Log out from iSCSI targets (if applicable)
sudo iscsiadm --mode node --targetname iqn.example.storage.lun1 --logout
```

## Troubleshooting

```bash
# Check multipathd logs
sudo journalctl -u multipathd -f

# Verbose path discovery
sudo multipath -v3

# Check if a specific device is claimed by multipath
sudo multipath -v2

# If paths show as 'failed' but the device is accessible:
sudo multipathd -k
> show paths  # Look for the failed path
> reinstate path sdb

# If multipathd is not starting:
sudo multipathd -d -v5  # Run in debug mode, foreground
```

Multipath I/O is a foundational component of any high-availability storage architecture. Combined with proper LVM configuration on top of multipath devices, you get resilient storage that tolerates single path failures without downtime.
