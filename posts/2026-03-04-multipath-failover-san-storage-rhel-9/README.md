# How to Set Up Multipath Failover for SAN Storage on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DM-Multipath, SAN, Failover, Storage, Linux

Description: Configure DM-Multipath failover policies on RHEL so that SAN storage I/O automatically switches to a healthy path when the active path fails.

---

Failover is the most common multipath policy for SAN storage. In failover mode, all I/O goes through a single active path. If that path fails, I/O automatically switches to the next available path. This is simpler and more predictable than load balancing, and it is the default for most storage arrays.

## Failover vs Load Balancing

- **Failover (active/passive)**: One path handles all I/O. Others are standby. Simpler, works with all storage arrays.
- **Load balancing (active/active)**: I/O is distributed across multiple paths. Higher throughput but requires array support.

## Configuring Failover Policy

Edit `/etc/multipath.conf`:

```bash
sudo vi /etc/multipath.conf
```

Set the failover policy in the defaults section:

```bash
defaults {
    user_friendly_names yes
    find_multipaths yes
    path_grouping_policy failover
    failback immediate
    no_path_retry 5
}
```

Key failover settings:

- `path_grouping_policy failover`: Each path is in its own group. Only one group is active.
- `failback immediate`: Switch back to the preferred path as soon as it recovers.
- `no_path_retry 5`: Retry I/O 5 times before failing when all paths are down.

Apply the configuration:

```bash
sudo multipathd reconfigure
```

## Failback Options

The `failback` setting controls what happens when a failed path recovers:

```bash
# Switch back to the preferred path immediately
failback immediate

# Never switch back automatically (stay on current path)
failback manual

# Wait N seconds before switching back
failback 30
```

For storage arrays that have preferred ports, `immediate` failback ensures I/O returns to the optimal path quickly. For arrays where all ports are equal, `manual` avoids unnecessary path switches.

## Setting Path Priorities

For active/passive arrays, set path priorities so the preferred path is always used first:

```bash
multipaths {
    multipath {
        wwid 3600508b4000c4a37
        alias san_lun0
        path_grouping_policy failover
        failback immediate
    }
}
```

Some arrays report path priorities through ALUA (Asymmetric Logical Unit Access). To use ALUA:

```bash
devices {
    device {
        vendor "DGC"
        product ".*"
        path_grouping_policy group_by_prio
        prio alua
        failback immediate
    }
}
```

## Testing Failover

### Check Current Path Status

```bash
sudo multipath -ll
```

Note which path is active (status=active) and which are standby (status=enabled).

### Simulate a Path Failure

```bash
# Find the SCSI host for one path
sudo iscsiadm -m session -P 3

# Take down one path (example using network interface)
sudo ip link set eth1 down

# Or offline a SCSI device
echo offline | sudo tee /sys/block/sdb/device/state
```

### Verify Failover

```bash
# Check that I/O continues
dd if=/dev/mapper/mpatha of=/dev/null bs=1M count=10

# Check multipath status
sudo multipath -ll
```

The previously standby path should now be active.

### Restore the Path

```bash
sudo ip link set eth1 up

# Or bring the SCSI device back online
echo running | sudo tee /sys/block/sdb/device/state

# Rescan
sudo multipathd reconfigure
sudo multipath -ll
```

If failback is set to `immediate`, I/O should switch back to the original path.

## Monitoring Failover Events

```bash
# Watch multipathd events
sudo multipathd show paths format "%d %t %T %s"

# Check system journal for path changes
sudo journalctl -u multipathd -f

# Check kernel messages
sudo dmesg | grep -i multipath
```

## Handling All-Paths-Down

When all paths fail, the `no_path_retry` setting determines behavior:

```bash
# Queue I/O for N retries, then fail
no_path_retry 5

# Queue I/O indefinitely (risky - can hang applications)
no_path_retry queue

# Fail immediately when no paths are available
no_path_retry fail
```

For most production systems, a finite retry count (e.g., 5 or 10) is the safest option. It gives time for paths to recover without hanging applications indefinitely.

## Conclusion

Failover is the safest multipath policy for SAN storage. Configure it with `path_grouping_policy failover` and set an appropriate `failback` policy based on your storage array type. Test failover regularly to ensure paths switch correctly and applications continue without interruption.
