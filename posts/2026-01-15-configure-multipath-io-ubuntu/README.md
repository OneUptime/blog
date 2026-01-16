# How to Configure Multipath I/O on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Multipath, MPIO, Storage, SAN, Tutorial

Description: Complete guide to configuring device-mapper multipath on Ubuntu for redundant storage paths.

---

## Introduction

In enterprise storage environments, ensuring continuous access to data is paramount. Multipath I/O (MPIO) is a fault-tolerance and performance enhancement technique that creates multiple physical paths between a server and its storage devices. This guide provides comprehensive instructions for configuring device-mapper multipath on Ubuntu systems.

## Understanding Multipath I/O Concepts

### What is Multipath I/O?

Multipath I/O allows a server to use multiple physical connections to access the same storage device. Instead of seeing multiple separate disks, the operating system presents a single logical device that aggregates all available paths.

### Key Components

- **Path**: A single physical connection between the host and storage (HBA port to storage controller port)
- **Path Group**: A collection of paths that can be used together based on the configured policy
- **Multipath Device**: The virtual device created by aggregating multiple paths to the same physical LUN
- **Device Mapper (DM)**: The Linux kernel framework that creates and manages multipath devices
- **multipathd**: The userspace daemon that monitors paths and manages failover

### How It Works

```
                    +------------------+
                    |    Application   |
                    +--------+---------+
                             |
                    +--------+---------+
                    | Multipath Device |
                    |   /dev/mapper/   |
                    +--------+---------+
                             |
            +----------------+----------------+
            |                |                |
    +-------+-------+ +------+------+ +------+------+
    |    Path 1     | |   Path 2    | |   Path 3    |
    | /dev/sdb      | | /dev/sdc    | | /dev/sdd    |
    +-------+-------+ +------+------+ +------+------+
            |                |                |
    +-------+-------+ +------+------+ +------+------+
    |    HBA 1      | |   HBA 1     | |   HBA 2    |
    +-------+-------+ +------+------+ +------+------+
            |                |                |
            +----------------+----------------+
                             |
                    +--------+---------+
                    |   Storage Array  |
                    |      (LUN)       |
                    +------------------+
```

## When and Why to Use Multipath

### Use Cases

1. **High Availability**: Eliminate single points of failure in the storage path
2. **Performance**: Aggregate bandwidth across multiple paths
3. **SAN Environments**: Standard practice for iSCSI and Fibre Channel storage
4. **Virtualization Hosts**: Essential for VM storage resilience
5. **Database Servers**: Ensure continuous data access for critical applications

### Benefits

- **Fault Tolerance**: Automatic failover when a path fails
- **Load Balancing**: Distribute I/O across multiple paths
- **Transparent Recovery**: Applications continue without interruption
- **Improved Throughput**: Potential for increased aggregate bandwidth

### When NOT to Use Multipath

- Single-path storage configurations (local disks, single-attached storage)
- Development environments where complexity outweighs benefits
- Systems without redundant HBAs or network paths

## Prerequisites

### Hardware Requirements

- Multiple Host Bus Adapters (HBAs) for Fibre Channel, or multiple network interfaces for iSCSI
- SAN storage array with multiple controller ports
- Proper zoning (FC) or network configuration (iSCSI)

### Software Requirements

- Ubuntu 20.04 LTS, 22.04 LTS, or 24.04 LTS
- Root or sudo access
- iSCSI initiator or FC HBA drivers installed

### Verify Your Environment

```bash
# Check for multiple paths to the same LUN
# You should see multiple devices with the same size and WWID
lsblk -o NAME,SIZE,TYPE,TRAN,VENDOR,MODEL

# For iSCSI, verify sessions
sudo iscsiadm -m session -P 3

# For Fibre Channel, check HBA status
ls /sys/class/fc_host/
cat /sys/class/fc_host/host*/port_state
```

## Installing Multipath Tools

### Install the Required Packages

```bash
# Update package lists
sudo apt update

# Install multipath-tools and dependencies
sudo apt install -y multipath-tools multipath-tools-boot

# For iSCSI environments, also install
sudo apt install -y open-iscsi

# For Fibre Channel, install HBA utilities if needed
sudo apt install -y sg3-utils lsscsi
```

### Enable and Start the Service

```bash
# Enable multipathd to start at boot
sudo systemctl enable multipathd

# Start the multipath daemon
sudo systemctl start multipathd

# Verify the service is running
sudo systemctl status multipathd
```

## Discovering Paths and Devices

### Initial Discovery

```bash
# Scan for new SCSI devices
sudo rescan-scsi-bus.sh

# Or manually trigger a rescan
for host in /sys/class/scsi_host/host*; do
    echo "- - -" | sudo tee $host/scan
done

# List all SCSI devices
lsscsi -t

# Show device WWIDs (World Wide Identifiers)
sudo /lib/udev/scsi_id -g -u /dev/sdb
```

### View Multipath Topology

```bash
# Display multipath topology
sudo multipath -ll

# Show all available paths
sudo multipathd show paths

# Display detailed path information
sudo multipathd show paths format "%w %d %t %s %c"

# List all multipath devices
sudo multipath -v2 -ll
```

### Understanding WWID

The World Wide Identifier (WWID) uniquely identifies a LUN across all paths:

```bash
# Get WWID for a specific device
sudo /lib/udev/scsi_id --whitelisted --device=/dev/sdb

# Output example: 3600508b4000156d70001200000b10000
# This WWID will be the same for all paths to this LUN
```

## Configuring /etc/multipath.conf

The main configuration file is `/etc/multipath.conf`. Ubuntu includes a template at `/usr/share/doc/multipath-tools/examples/`.

### Basic Configuration Structure

```bash
# Create or edit the multipath configuration
sudo nano /etc/multipath.conf
```

### Complete Configuration Example

```conf
# /etc/multipath.conf
# Multipath configuration for Ubuntu
# Last modified: 2026-01-15

# =============================================================================
# DEFAULTS SECTION
# Global settings that apply to all multipath devices unless overridden
# =============================================================================
defaults {
    # -------------------------------------------------------------------------
    # Basic Operation Settings
    # -------------------------------------------------------------------------

    # Enable multipath functionality (yes/no)
    # Set to "no" to disable multipath globally
    user_friendly_names yes

    # Find all available paths to each multipath device
    # Options: "yes" = discover all paths, "no" = only use configured paths
    find_multipaths yes

    # -------------------------------------------------------------------------
    # Path Selection and Load Balancing
    # -------------------------------------------------------------------------

    # Path grouping policy determines how paths are organized
    # Options:
    #   failover      - One path active, others standby (safest)
    #   multibus      - All paths active, round-robin (best throughput)
    #   group_by_serial - Group by target serial number
    #   group_by_prio   - Group by path priority
    #   group_by_node_name - Group by target node WWN
    path_grouping_policy multibus

    # Path selector algorithm for choosing between paths in a group
    # Options:
    #   "round-robin 0"    - Distribute I/O evenly
    #   "queue-length 0"   - Send to path with shortest queue
    #   "service-time 0"   - Send to path with best service time
    path_selector "round-robin 0"

    # -------------------------------------------------------------------------
    # Failover and Recovery Settings
    # -------------------------------------------------------------------------

    # How to handle failback when a failed path recovers
    # Options:
    #   immediate - Failback immediately when path recovers
    #   manual    - Require manual intervention to failback
    #   followover - Failback only if active path fails
    #   <seconds> - Wait specified seconds before failback
    failback immediate

    # Number of I/O operations before switching to next path (load balancing)
    # Lower values = more even distribution, higher values = better cache usage
    rr_min_io_rq 1

    # -------------------------------------------------------------------------
    # Path Monitoring Settings
    # -------------------------------------------------------------------------

    # Interval (seconds) between path health checks
    polling_interval 5

    # Path checker method to verify path health
    # Options:
    #   tur          - SCSI Test Unit Ready (recommended for most arrays)
    #   readsector0  - Read first sector
    #   directio     - Direct I/O test
    path_checker tur

    # -------------------------------------------------------------------------
    # Timeout and Retry Settings
    # -------------------------------------------------------------------------

    # Number of failed path checks before marking path as failed
    no_path_retry 5

    # Flush multipath device maps on daemon shutdown (yes/no)
    flush_on_last_del yes

    # Maximum number of open file descriptors
    max_fds 8192

    # -------------------------------------------------------------------------
    # Queue Settings
    # -------------------------------------------------------------------------

    # What to do when all paths fail
    # Options:
    #   queue   - Queue I/O until a path recovers
    #   fail    - Fail I/O immediately
    #   <N>     - Queue for N seconds, then fail
    no_path_retry queue
}

# =============================================================================
# BLACKLIST SECTION
# Devices to exclude from multipath management
# Critical: Always blacklist local disks and non-SAN devices
# =============================================================================
blacklist {
    # -------------------------------------------------------------------------
    # Blacklist by Device Node
    # -------------------------------------------------------------------------

    # Exclude local SATA/SAS boot drives
    devnode "^sda$"

    # Exclude NVMe devices (typically local storage)
    devnode "^nvme"

    # Exclude RAM disks
    devnode "^ram[0-9]*"

    # Exclude loop devices
    devnode "^loop[0-9]*"

    # Exclude CD/DVD drives
    devnode "^sr[0-9]*"

    # Exclude floppy drives
    devnode "^fd[0-9]*"

    # Exclude device mapper devices (to avoid recursion)
    devnode "^dm-[0-9]*"

    # Exclude md RAID devices
    devnode "^md[0-9]*"

    # -------------------------------------------------------------------------
    # Blacklist by WWID
    # -------------------------------------------------------------------------

    # Example: Blacklist a specific device by its WWID
    # wwid "3600508b4000156d70001200000000000"

    # -------------------------------------------------------------------------
    # Blacklist by Vendor/Product
    # -------------------------------------------------------------------------

    # Exclude USB storage devices
    device {
        vendor "USB"
        product "*"
    }

    # Exclude ATA/SATA drives (usually local)
    device {
        vendor "ATA"
        product "*"
    }

    # Exclude VMware virtual disks if not using multipath in VM
    # device {
    #     vendor "VMware"
    #     product "Virtual disk"
    # }
}

# =============================================================================
# BLACKLIST EXCEPTIONS
# Devices to include even if they match a blacklist rule
# =============================================================================
blacklist_exceptions {
    # Example: Include a specific WWID even if vendor is blacklisted
    # wwid "3600508b4000156d70001200000b10000"

    # Example: Include specific vendor/product combination
    # device {
    #     vendor "VENDOR"
    #     product "PRODUCT"
    # }
}

# =============================================================================
# DEVICE SECTION
# Hardware-specific settings for different storage arrays
# These override defaults for specific vendor/product combinations
# =============================================================================
devices {
    # -------------------------------------------------------------------------
    # Dell EMC PowerStore / Unity
    # -------------------------------------------------------------------------
    device {
        vendor "DellEMC"
        product "PowerStore"
        path_grouping_policy group_by_prio
        path_selector "round-robin 0"
        path_checker tur
        features "0"
        hardware_handler "1 alua"
        prio alua
        failback immediate
        rr_weight uniform
        no_path_retry queue
    }

    # -------------------------------------------------------------------------
    # NetApp ONTAP
    # -------------------------------------------------------------------------
    device {
        vendor "NETAPP"
        product "LUN.*"
        path_grouping_policy group_by_prio
        path_selector "round-robin 0"
        path_checker tur
        features "3 queue_if_no_path pg_init_retries 50"
        hardware_handler "1 alua"
        prio alua
        failback immediate
        rr_weight uniform
        no_path_retry 5
        dev_loss_tmo 30
    }

    # -------------------------------------------------------------------------
    # HPE 3PAR / Primera / Alletra
    # -------------------------------------------------------------------------
    device {
        vendor "3PARdata"
        product "VV"
        path_grouping_policy group_by_prio
        path_selector "round-robin 0"
        path_checker tur
        features "0"
        hardware_handler "1 alua"
        prio alua
        failback immediate
        rr_weight uniform
        no_path_retry 18
    }

    # -------------------------------------------------------------------------
    # Pure Storage FlashArray
    # -------------------------------------------------------------------------
    device {
        vendor "PURE"
        product "FlashArray"
        path_grouping_policy group_by_prio
        path_selector "round-robin 0"
        path_checker tur
        features "0"
        hardware_handler "1 alua"
        prio alua
        failback immediate
        rr_weight uniform
        no_path_retry 10
        fast_io_fail_tmo 10
        dev_loss_tmo 60
    }

    # -------------------------------------------------------------------------
    # IBM FlashSystem / Storwize
    # -------------------------------------------------------------------------
    device {
        vendor "IBM"
        product "2145"
        path_grouping_policy group_by_prio
        path_selector "round-robin 0"
        path_checker tur
        features "1 queue_if_no_path"
        hardware_handler "1 alua"
        prio alua
        failback immediate
        rr_weight uniform
        no_path_retry 5
    }

    # -------------------------------------------------------------------------
    # Generic iSCSI Target (for testing)
    # -------------------------------------------------------------------------
    device {
        vendor "LIO-ORG"
        product ".*"
        path_grouping_policy multibus
        path_selector "round-robin 0"
        path_checker tur
        features "0"
        prio const
        failback immediate
        rr_weight uniform
        no_path_retry 12
    }
}

# =============================================================================
# MULTIPATHS SECTION
# Per-LUN configuration and alias assignments
# Define friendly names and specific settings for individual LUNs
# =============================================================================
multipaths {
    # -------------------------------------------------------------------------
    # Example: Database LUN with custom settings
    # -------------------------------------------------------------------------
    multipath {
        # WWID of the LUN (get with: /lib/udev/scsi_id -g -u /dev/sdX)
        wwid 3600508b4000156d70001200000b10000

        # Friendly alias name (appears as /dev/mapper/db_data)
        alias db_data

        # Override default path grouping for this LUN
        path_grouping_policy failover

        # Custom failback setting
        failback manual

        # Disable path retry (fail immediately if all paths down)
        no_path_retry fail
    }

    # -------------------------------------------------------------------------
    # Example: High-performance storage LUN
    # -------------------------------------------------------------------------
    multipath {
        wwid 3600508b4000156d70001200000b20000
        alias app_storage
        path_grouping_policy multibus
        path_selector "service-time 0"
        failback immediate
        rr_min_io_rq 4
    }

    # -------------------------------------------------------------------------
    # Example: Backup LUN (lower priority)
    # -------------------------------------------------------------------------
    multipath {
        wwid 3600508b4000156d70001200000b30000
        alias backup_lun
        path_grouping_policy failover
        failback 60
        no_path_retry 3
    }
}
```

### Apply Configuration Changes

```bash
# Validate configuration syntax
sudo multipath -t

# Reload multipath configuration
sudo systemctl reload multipathd

# Or restart the daemon
sudo systemctl restart multipathd

# Reconfigure all multipath devices
sudo multipath -r

# Display the new topology
sudo multipath -ll
```

## Blacklisting Local Devices

Proper blacklisting prevents multipath from managing local disks, which can cause boot issues.

### Identify Local Devices

```bash
# List all block devices with transport type
lsblk -o NAME,SIZE,TYPE,TRAN,VENDOR,MODEL,SERIAL

# Get WWIDs of all devices
for disk in /dev/sd[a-z]; do
    echo -n "$disk: "
    sudo /lib/udev/scsi_id -g -u $disk 2>/dev/null || echo "N/A"
done
```

### Blacklist Methods

```conf
# Method 1: By device node (simplest but may break if device names change)
blacklist {
    devnode "^sda$"
}

# Method 2: By WWID (most reliable)
blacklist {
    wwid "3600508b4000000000000000000000001"
}

# Method 3: By vendor/product (good for all devices of a type)
blacklist {
    device {
        vendor "ATA"
        product ".*"
    }
}

# Method 4: By property
blacklist {
    property "(SCSI_IDENT_|ID_WWN)"
}
```

### Verify Blacklisting

```bash
# Check which devices are blacklisted
sudo multipathd show config local

# List devices and their multipath status
sudo multipath -v3 2>&1 | grep -E "(blacklist|whitelist)"
```

## Path Grouping Policies

### Available Policies

| Policy | Description | Use Case |
|--------|-------------|----------|
| `failover` | One active path, others standby | Maximum safety, active-passive arrays |
| `multibus` | All paths active simultaneously | Active-active arrays, maximum throughput |
| `group_by_serial` | Group by target serial | Multi-target configurations |
| `group_by_prio` | Group by path priority | ALUA-enabled arrays |
| `group_by_node_name` | Group by target WWN | Complex SAN topologies |

### Configuring Path Groups

```conf
defaults {
    # For active-active arrays (like Pure Storage, some NetApp)
    path_grouping_policy multibus

    # For active-passive arrays (like older EMC, HP EVA)
    # path_grouping_policy failover

    # For ALUA-enabled arrays (most modern arrays)
    # path_grouping_policy group_by_prio
}
```

### View Path Group Status

```bash
# Show path groups for all devices
sudo multipath -ll

# Example output:
# mpath0 (3600508b...) dm-2 NETAPP,LUN
# size=100G features='3 queue_if_no_path pg_init_retries 50' hwhandler='1 alua'
# `-+- policy='round-robin 0' prio=50 status=active
#   |- 1:0:0:1 sdb 8:16 active ready running
#   `- 2:0:0:1 sdc 8:32 active ready running
```

## Failover and Load Balancing Modes

### Failover Mode (Active-Passive)

```conf
defaults {
    path_grouping_policy failover
    path_selector "round-robin 0"
    failback immediate
}
```

In failover mode:
- One path is active at a time
- If the active path fails, the next available path takes over
- Best for active-passive storage arrays

### Load Balancing Mode (Active-Active)

```conf
defaults {
    path_grouping_policy multibus
    path_selector "round-robin 0"
    rr_min_io_rq 1
}
```

In load balancing mode:
- All paths are active simultaneously
- I/O is distributed across all paths
- Best for active-active storage arrays

### Path Selector Algorithms

```conf
# Round-robin: Equal distribution across paths
path_selector "round-robin 0"

# Queue-length: Prefer path with shortest I/O queue
path_selector "queue-length 0"

# Service-time: Prefer path with best response time
path_selector "service-time 0"
```

### ALUA (Asymmetric Logical Unit Access)

Modern arrays use ALUA to indicate optimal paths:

```conf
devices {
    device {
        vendor "NETAPP"
        product "LUN.*"
        hardware_handler "1 alua"
        prio alua
        path_grouping_policy group_by_prio
    }
}
```

## Alias Configuration

### Setting Up Aliases

Aliases provide meaningful names for multipath devices:

```conf
multipaths {
    multipath {
        wwid 3600508b4000156d70001200000010000
        alias oracle_data
    }
    multipath {
        wwid 3600508b4000156d70001200000020000
        alias oracle_redo
    }
    multipath {
        wwid 3600508b4000156d70001200000030000
        alias postgres_data
    }
}
```

### Using user_friendly_names

```conf
defaults {
    # Automatically assign names like mpath0, mpath1, etc.
    user_friendly_names yes
}
```

### Access Multipath Devices

```bash
# After configuration, devices are available at:
ls -la /dev/mapper/

# Example output:
# lrwxrwxrwx 1 root root 7 Jan 15 10:00 oracle_data -> ../dm-2
# lrwxrwxrwx 1 root root 7 Jan 15 10:00 oracle_redo -> ../dm-3
# lrwxrwxrwx 1 root root 7 Jan 15 10:00 postgres_data -> ../dm-4

# Use aliases in mount commands, fstab, etc.
sudo mount /dev/mapper/oracle_data /mnt/oracle
```

## Filesystem and LVM on Multipath

### Creating a Filesystem on Multipath Device

```bash
# Format the multipath device
sudo mkfs.ext4 /dev/mapper/oracle_data

# Or for XFS (recommended for large files)
sudo mkfs.xfs /dev/mapper/oracle_data

# Create mount point
sudo mkdir -p /data/oracle

# Mount the filesystem
sudo mount /dev/mapper/oracle_data /data/oracle

# Add to /etc/fstab for persistent mount
echo '/dev/mapper/oracle_data /data/oracle ext4 _netdev,defaults 0 2' | sudo tee -a /etc/fstab
```

### Using LVM on Multipath

```bash
# Create Physical Volume on multipath device
sudo pvcreate /dev/mapper/oracle_data

# Create Volume Group
sudo vgcreate vg_oracle /dev/mapper/oracle_data

# Create Logical Volume
sudo lvcreate -l 100%FREE -n lv_data vg_oracle

# Create filesystem
sudo mkfs.xfs /dev/vg_oracle/lv_data

# Mount
sudo mkdir -p /oracle/data
sudo mount /dev/vg_oracle/lv_data /oracle/data
```

### LVM Configuration for Multipath

Edit `/etc/lvm/lvm.conf` to use multipath devices:

```conf
# /etc/lvm/lvm.conf

devices {
    # Only scan multipath devices, not underlying paths
    filter = [ "a|^/dev/mapper/mpath.*|", "a|^/dev/mapper/oracle.*|", "r|.*|" ]

    # Preferred names for device-mapper devices
    preferred_names = [ "^/dev/mapper/", "^/dev/dm-" ]

    # Obtain device list from udev
    obtain_device_list_from_udev = 1
}
```

Apply changes:

```bash
# Update LVM cache
sudo vgscan
sudo pvscan
```

## Monitoring and Troubleshooting

### Monitoring Commands

```bash
# View multipath status
sudo multipath -ll

# Monitor path status continuously
watch -n 2 'sudo multipathd show paths format "%w %d %s %c %t"'

# Show detailed path information
sudo multipathd show paths

# Display multipath topology
sudo multipathd show topology

# Check daemon status
sudo multipathd show daemon

# View multipath configuration
sudo multipathd show config
```

### Interpreting Path States

| State | Description | Action |
|-------|-------------|--------|
| `active` | Path is available and in use | Normal |
| `ready` | Path is available for I/O | Normal |
| `running` | Path checker is running | Normal |
| `faulty` | Path has failed checks | Investigate |
| `shaky` | Path is unstable | Monitor closely |
| `ghost` | Path exists but not ready | Check storage |

### Common Issues and Solutions

#### Issue: Paths showing as "faulty"

```bash
# Check path status
sudo multipathd show paths

# Force path check
sudo multipathd reconfigure

# Remove and re-add paths
sudo multipathd remove path /dev/sdb
sudo multipathd add path /dev/sdb
```

#### Issue: Device not appearing in multipath

```bash
# Check if device is blacklisted
sudo multipath -v3 /dev/sdb 2>&1 | grep blacklist

# Verify WWID
sudo /lib/udev/scsi_id -g -u /dev/sdb

# Manually add device
sudo multipath -a /dev/sdb
```

#### Issue: Boot failures with multipath

```bash
# Regenerate initramfs with multipath
sudo update-initramfs -u -k all

# Verify multipath module is loaded
lsmod | grep dm_multipath

# Check boot messages
journalctl -b | grep -i multipath
```

### Log Analysis

```bash
# View multipath daemon logs
sudo journalctl -u multipathd -f

# Check system logs for path changes
sudo dmesg | grep -i "multipath\|dm-"

# Enable debug logging temporarily
sudo multipathd -v4
```

### Performance Monitoring

```bash
# I/O statistics for multipath devices
iostat -x 2 /dev/dm-*

# Detailed path statistics
sudo multipathd show paths format "%w %d %t %s %c %D %S"

# Monitor with dstat
dstat -d --disk-util --disk-tps
```

## Testing Failover

### Manual Path Failure Test

```bash
# Identify current active paths
sudo multipath -ll

# Simulate path failure (careful in production!)
# Method 1: Offline a path
sudo multipathd fail path /dev/sdb

# Method 2: Block the device
sudo blockdev --setro /dev/sdb

# Verify failover occurred
sudo multipath -ll

# Restore the path
sudo multipathd reinstate path /dev/sdb
```

### Automated Failover Verification

```bash
#!/bin/bash
# failover_test.sh - Test multipath failover

MPATH_DEV="oracle_data"
TEST_FILE="/data/oracle/test_file"

echo "Starting failover test for $MPATH_DEV"

# Start I/O in background
dd if=/dev/zero of=$TEST_FILE bs=1M count=1000 oflag=direct &
DD_PID=$!

sleep 5

# Get first path
FIRST_PATH=$(sudo multipathd show paths format "%d" | grep -v "dev" | head -1)

echo "Failing path: $FIRST_PATH"
sudo multipathd fail path /dev/$FIRST_PATH

sleep 10

# Verify I/O continues
if kill -0 $DD_PID 2>/dev/null; then
    echo "I/O continues after failover - SUCCESS"
else
    echo "I/O stopped - FAILURE"
fi

# Restore path
echo "Restoring path: $FIRST_PATH"
sudo multipathd reinstate path /dev/$FIRST_PATH

# Wait for dd to complete
wait $DD_PID

# Verify final status
sudo multipath -ll $MPATH_DEV
```

## Best Practices

### Configuration Best Practices

1. **Always blacklist local disks** to prevent boot issues
2. **Use vendor-specific settings** from your storage vendor's documentation
3. **Test failover** before going to production
4. **Use aliases** for meaningful device names
5. **Set appropriate timeouts** based on your SAN fabric design

### Operational Best Practices

1. **Monitor path status** regularly
2. **Keep multipath-tools updated** for bug fixes and new array support
3. **Document your configuration** including WWIDs and aliases
4. **Test configuration changes** in a non-production environment first
5. **Integrate with monitoring systems** for proactive alerting

### Security Best Practices

1. **Restrict access** to multipath configuration files
2. **Use CHAP authentication** for iSCSI
3. **Implement proper zoning** in FC environments
4. **Audit path changes** through logging

## Quick Reference

### Essential Commands

```bash
# View topology
sudo multipath -ll

# Reconfigure
sudo multipath -r

# Add new device
sudo multipath -a /dev/sdX

# Remove device
sudo multipath -f mpath_name

# Flush all unused maps
sudo multipath -F

# Show configuration
sudo multipathd show config

# Interactive mode
sudo multipathd -k
```

### Service Management

```bash
# Start/stop/restart
sudo systemctl start multipathd
sudo systemctl stop multipathd
sudo systemctl restart multipathd

# Enable/disable at boot
sudo systemctl enable multipathd
sudo systemctl disable multipathd

# Check status
sudo systemctl status multipathd
```

## Conclusion

Configuring multipath I/O on Ubuntu provides essential redundancy and performance benefits for enterprise storage environments. By following this guide, you can implement a robust multipath configuration that ensures continuous data access even when individual storage paths fail.

Key takeaways:
- Always blacklist local devices to prevent conflicts
- Use vendor-specific settings for optimal performance
- Test failover thoroughly before production deployment
- Monitor path status continuously for proactive issue detection
- Document your configuration for easier troubleshooting

With proper multipath configuration, your Ubuntu servers will have resilient, high-performance connections to your SAN storage infrastructure.

---

## Monitor Your Infrastructure with OneUptime

While multipath I/O provides path redundancy, comprehensive monitoring is essential for maintaining a healthy storage infrastructure. [OneUptime](https://oneuptime.com) offers powerful monitoring capabilities that can help you:

- **Real-time Path Monitoring**: Track the status of all multipath devices and receive instant alerts when paths fail
- **Performance Metrics**: Monitor I/O latency, throughput, and queue depths across your storage infrastructure
- **Custom Alerting**: Set up sophisticated alert rules based on path state changes, performance degradation, or capacity thresholds
- **Historical Analysis**: Review path failover events and performance trends to identify potential issues before they impact production
- **Integration Support**: Connect with your existing tools through webhooks, APIs, and native integrations

With OneUptime, you can ensure your multipath configuration is performing optimally and catch potential storage issues before they affect your applications. Sign up for a free trial at [oneuptime.com](https://oneuptime.com) to start monitoring your Ubuntu infrastructure today.
