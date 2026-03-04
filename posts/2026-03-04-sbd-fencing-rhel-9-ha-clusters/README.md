# How to Configure SBD Fencing for RHEL HA Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SBD, Fencing, STONITH, Pacemaker, High Availability, Cluster, Linux

Description: Learn how to configure SBD (STONITH Block Device) fencing for RHEL high availability clusters when traditional fencing hardware is not available.

---

SBD (STONITH Block Device) provides a fencing mechanism for Pacemaker clusters on RHEL using shared storage instead of hardware fencing devices like IPMI. Each node monitors a shared device for poison pill messages, and a node fences itself when instructed.

## Prerequisites

- A RHEL Pacemaker cluster
- Shared storage accessible from all nodes (iSCSI, SAN, or shared disk)
- The shared device must have low latency and high reliability

## Understanding SBD

SBD works by:

1. Each node writes heartbeat messages to the shared device
2. When a node needs to be fenced, a "poison pill" is written for it
3. The SBD daemon on the target node reads the poison pill and self-fences (reboots or powers off)
4. The watchdog timer provides a backup in case the SBD daemon hangs

## Step 1: Install SBD

On all nodes:

```bash
sudo dnf install sbd -y
```

## Step 2: Identify the Shared Device

Find the shared storage device on all nodes:

```bash
lsblk
```

Use a small dedicated partition or LUN. Example: `/dev/sdc`

Verify it is the same device on all nodes by checking the device serial or WWID:

```bash
udevadm info --query=all --name=/dev/sdc | grep ID_SERIAL
```

## Step 3: Initialize the SBD Device

From one node only:

```bash
sudo sbd -d /dev/sdc create
```

Verify the SBD header:

```bash
sudo sbd -d /dev/sdc dump
```

## Step 4: Configure SBD

On all nodes, edit `/etc/sysconfig/sbd`:

```bash
sudo tee /etc/sysconfig/sbd << 'CONF'
SBD_DEVICE="/dev/sdc"
SBD_DELAY_START=no
SBD_PACEMAKER=yes
SBD_STARTMODE=always
SBD_WATCHDOG_DEV=/dev/watchdog
SBD_WATCHDOG_TIMEOUT=5
CONF
```

## Step 5: Configure the Watchdog

The hardware watchdog provides a backup fencing mechanism. Load the watchdog module:

```bash
sudo modprobe softdog
echo softdog | sudo tee /etc/modules-load.d/softdog.conf
```

For production, use a hardware watchdog if available:

```bash
ls /dev/watchdog
```

## Step 6: Enable and Start SBD

On all nodes:

```bash
sudo systemctl enable sbd
```

Do not start SBD manually. It starts with the cluster.

## Step 7: Configure Pacemaker to Use SBD

Create the cluster with SBD:

```bash
sudo pcs cluster setup my-cluster node1 node2 --watchdog /dev/watchdog
```

Or add SBD to an existing cluster:

```bash
sudo pcs stonith create sbd-fencing fence_sbd \
    devices=/dev/sdc \
    op monitor interval=30s

sudo pcs property set stonith-enabled=true
sudo pcs property set stonith-watchdog-timeout=10
```

## Step 8: Start the Cluster

```bash
sudo pcs cluster start --all
```

## Step 9: Verify SBD

Check SBD status on each node:

```bash
sudo sbd -d /dev/sdc list
```

Check the SBD message slot for each node:

```bash
sudo sbd -d /dev/sdc message node1
sudo sbd -d /dev/sdc message node2
```

Both should show "clear".

## Testing SBD Fencing

Send a test message (this will fence the target node):

```bash
sudo sbd -d /dev/sdc message node2 test
```

Or use pcs:

```bash
sudo pcs stonith fence node2
```

Verify the node was fenced and recovered:

```bash
sudo pcs status
```

## Multiple SBD Devices

For redundancy, use multiple SBD devices:

```bash
sudo sbd -d /dev/sdc -d /dev/sdd create
```

Update the configuration:

```bash
SBD_DEVICE="/dev/sdc;/dev/sdd"
```

With two devices, one must agree for fencing. With three, two must agree (majority).

## Conclusion

SBD fencing on RHEL provides a reliable STONITH mechanism when hardware fencing is not available. The combination of shared storage messaging and hardware watchdog ensures that failed nodes are properly fenced. Always use a reliable shared storage device and test fencing before going to production.
