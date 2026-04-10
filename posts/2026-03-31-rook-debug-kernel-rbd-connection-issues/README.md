# How to Debug Kernel RBD Connection Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, RBD, Kernel, Troubleshooting, Debugging, Network

Description: Diagnose and fix kernel RBD device mapping failures, connection timeouts, and I/O errors using dmesg, sysfs, and Ceph diagnostic tools.

---

## Common RBD Connection Issues

Kernel RBD connection problems typically fall into these categories:

- Device mapping fails (cannot reach monitors)
- Device maps but I/O fails (OSD connectivity)
- I/O hangs or times out during operation
- Reconnect loops after network disruption

## Step 1: Check dmesg for Errors

Always start with kernel messages:

```bash
dmesg | grep -i rbd | tail -30
dmesg | grep -i ceph | tail -30
```

Common messages:

```yaml
rbd: error mapping block device: -5
libceph: mon0 10.0.0.10:6789 failed to open socket: -111
libceph: unable to connect to any monitors
```

## Step 2: Test Monitor Connectivity

Verify TCP connectivity to each monitor:

```bash
# Test each monitor (default port 6789 for v1, 3300 for v2)
for mon in 10.0.0.10 10.0.0.11 10.0.0.12; do
  echo -n "$mon:6789 - "
  nc -zv -w 3 $mon 6789 2>&1 | tail -1
done
```

## Step 3: Verify Keyring and Permissions

```bash
# Test authentication manually
ceph --conf /etc/ceph/ceph.conf \
     --keyring /etc/ceph/ceph.client.admin.keyring \
     -n client.admin \
     status
```

Incorrect permissions on the keyring file are a common cause:

```bash
ls -la /etc/ceph/ceph.client.admin.keyring
# Should be readable by root only (600)
sudo chmod 600 /etc/ceph/ceph.client.admin.keyring
```

## Step 4: Check OSD Connectivity

After mapping, if I/O fails, check OSD reachability:

```bash
# Find a specific OSD's address
ceph osd find 0

# Test connectivity to a specific OSD
nc -zv 10.0.0.20 6800
```

## Step 5: Inspect RBD Sysfs State

For an already-mapped device:

```bash
# List mapped devices and their state
ls /sys/bus/rbd/devices/

# Check details of device 0
cat /sys/bus/rbd/devices/0/pool
cat /sys/bus/rbd/devices/0/name
cat /sys/bus/rbd/devices/0/client_id
```

## Step 6: Reproduce with Debug Logging

Enable verbose RBD logging temporarily:

```bash
echo "module rbd +p" | sudo tee /sys/kernel/debug/dynamic_debug/control
echo "module libceph +p" | sudo tee /sys/kernel/debug/dynamic_debug/control
```

Then attempt the operation and capture dmesg:

```bash
dmesg -w &
rbd device map mypool/myimage
```

Disable debug logging after:

```bash
echo "module rbd -p" | sudo tee /sys/kernel/debug/dynamic_debug/control
echo "module libceph -p" | sudo tee /sys/kernel/debug/dynamic_debug/control
```

## Step 7: Check for Blacklisted Clients

If a client was previously crashed, Ceph may have blacklisted it:

```bash
ceph osd blacklist ls
# Or on newer Ceph:
ceph osd blocklist ls
```

Remove the blacklist entry:

```bash
ceph osd blocklist rm <client-addr>
```

## Summary

Kernel RBD debugging starts with `dmesg` for kernel-level errors, then progresses to testing monitor TCP connectivity, verifying keyring permissions, and checking OSD reachability. Enable dynamic kernel debug logging for verbose connection traces. If I/O hangs after a client crash, check the Ceph blocklist for the client's IP and remove the entry.
