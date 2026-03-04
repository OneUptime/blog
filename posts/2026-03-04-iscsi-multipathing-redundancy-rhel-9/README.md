# How to Use iSCSI Multipathing for Redundancy on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, iSCSI, Multipathing, DM-Multipath, Redundancy, Linux

Description: Configure iSCSI with DM-Multipath on RHEL to provide redundant paths to iSCSI storage, improving availability and performance.

---

iSCSI multipathing uses multiple network paths between the initiator and target to provide redundancy and optionally load balancing. If one network path fails, I/O continues over the remaining paths without interruption. This requires multiple network interfaces on the initiator, the target, or both.

## Architecture

```
Initiator                          Target
+-----------+                      +-----------+
| eth0      |----(Network A)------>| eth0      |
| 10.0.1.10 |                     | 10.0.1.20 |
|           |                      |           |
| eth1      |----(Network B)------>| eth1      |
| 10.0.2.10 |                     | 10.0.2.20 |
+-----------+                      +-----------+
```

## Prerequisites

- Target with two network interfaces and two portals configured
- Initiator with two network interfaces on separate subnets
- DM-Multipath installed on the initiator

## Step 1: Configure the Target with Multiple Portals

In targetcli, add portals for both network interfaces:

```bash
sudo targetcli
```

```
cd /iscsi/iqn.2024.com.example:target1/tpg1/portals
delete 0.0.0.0 3260
create 10.0.1.20 3260
create 10.0.2.20 3260
saveconfig
exit
```

## Step 2: Install DM-Multipath on the Initiator

```bash
sudo dnf install -y device-mapper-multipath
```

Generate the default configuration:

```bash
sudo mpathconf --enable --with_multipathd y
```

## Step 3: Configure iSCSI Interfaces

Create separate iSCSI interfaces for each network path:

```bash
# Create iface for eth0
sudo iscsiadm -m iface -I iface0 --op=new
sudo iscsiadm -m iface -I iface0 --op=update -n iface.net_ifacename -v eth0

# Create iface for eth1
sudo iscsiadm -m iface -I iface1 --op=new
sudo iscsiadm -m iface -I iface1 --op=update -n iface.net_ifacename -v eth1
```

Verify the interfaces:

```bash
sudo iscsiadm -m iface
```

## Step 4: Discover Targets Through Both Interfaces

```bash
sudo iscsiadm -m discovery -t sendtargets -p 10.0.1.20:3260 -I iface0
sudo iscsiadm -m discovery -t sendtargets -p 10.0.2.20:3260 -I iface1
```

## Step 5: Log In Through Both Paths

```bash
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 10.0.1.20:3260 -I iface0 --login
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 10.0.2.20:3260 -I iface1 --login
```

Check that two sessions exist:

```bash
sudo iscsiadm -m session
```

You should see two entries, one for each path.

## Step 6: Configure Multipath

Edit `/etc/multipath.conf`:

```bash
sudo tee /etc/multipath.conf << 'MPCONF'
defaults {
    user_friendly_names yes
    find_multipaths yes
    path_grouping_policy failover
    path_selector "round-robin 0"
    failback immediate
    no_path_retry 5
}
MPCONF
```

Restart multipathd:

```bash
sudo systemctl restart multipathd
```

## Step 7: Verify Multipath

```bash
sudo multipath -ll
```

Expected output:

```
mpatha (360000000000000001) dm-0 LIO-ORG,disk0
size=10G features='0' hwhandler='1 alua' wp=rw
|-+- policy='round-robin 0' prio=50 status=active
| `- 3:0:0:0 sdb 8:16 active ready running
`-+- policy='round-robin 0' prio=50 status=enabled
  `- 4:0:0:0 sdc 8:32 active ready running
```

Both paths should show as "active" and "running."

## Step 8: Use the Multipath Device

Use `/dev/mapper/mpatha` instead of individual disks:

```bash
sudo mkfs.xfs /dev/mapper/mpatha
sudo mkdir -p /mnt/iscsi-mp
sudo mount /dev/mapper/mpatha /mnt/iscsi-mp
```

In fstab:

```bash
echo '/dev/mapper/mpatha /mnt/iscsi-mp xfs defaults,_netdev 0 0' | sudo tee -a /etc/fstab
```

## Testing Failover

```bash
# Check current path status
sudo multipath -ll

# Bring down one network interface
sudo ip link set eth1 down

# Verify I/O continues
dd if=/dev/mapper/mpatha of=/dev/null bs=1M count=10

# Check multipath status (one path should be faulty)
sudo multipath -ll

# Restore the interface
sudo ip link set eth1 up

# Paths should recover
sudo multipath -ll
```

## Conclusion

iSCSI multipathing with DM-Multipath provides network redundancy for iSCSI storage. With two or more independent network paths, the loss of a single path does not disrupt I/O. Always use the multipath device (`/dev/mapper/mpathX`) rather than individual SCSI devices to benefit from the redundancy.
