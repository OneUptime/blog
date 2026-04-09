# How to Troubleshoot Ceph Monitors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitor, Troubleshooting, Quorum

Description: Diagnose and resolve common Ceph monitor issues including quorum loss, clock skew, Paxos errors, and monitor database corruption using systematic troubleshooting steps.

---

## Understanding Ceph Monitor Quorum

Ceph monitors use the Paxos distributed consensus algorithm to maintain a consistent view of cluster state. A Ceph cluster requires a majority of monitors to be operational to form quorum:

```text
Number of monitors | Quorum required | Max failures
1                  | 1               | 0
2                  | 2               | 0 (both must be up)
3                  | 2               | 1
5                  | 3               | 2
```

When quorum is lost, the cluster cannot accept new writes.

## Quick Health Check

```bash
# Overall cluster status
ceph -s

# Monitor-specific status
ceph mon stat

# Quorum status and member info
ceph quorum_status --format json-pretty | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('Quorum members:', data.get('quorum_names'))
print('All monitors:', [m['name'] for m in data.get('monmap', {}).get('mons', [])])
"
```

## Issue: Clock Skew

Clock skew is one of the most common monitor problems. Ceph requires clocks to be within 0.05 seconds (50ms) of each other.

```bash
# Check clock skew warnings
ceph health detail | grep -i clock

# Check time on all monitor hosts
for mon in mon1 mon2 mon3; do
  echo "$mon: $(ssh $mon date)"
done

# Fix: sync NTP on all hosts
systemctl restart chronyd  # or ntpd
chronyc tracking
```

Configure NTP properly:

```bash
# Ensure chrony or ntpd is running and synchronized
timedatectl status
timedatectl set-ntp true
chronyc sources -v
```

## Issue: Monitor Not Joining Quorum

If a monitor is not joining the quorum after restart:

```bash
# Check monitor daemon status
systemctl status ceph-mon@<mon-name>

# View monitor logs
journalctl -u ceph-mon@<mon-name> --since "30 minutes ago" | tail -100

# Check if the monitor can reach its peers
ceph mon getmap
ceph mon stat
```

Common causes:
- Clock skew (see above)
- Firewall blocking port 3300 or 6789
- Incorrect monitor address in monmap

```bash
# Test monitor port connectivity
nc -vz mon2-ip 3300
nc -vz mon2-ip 6789
```

## Issue: Monitor Disk Full

If the monitor's data directory fills up:

```bash
# Check disk usage on monitor hosts
df -h /var/lib/ceph/mon/

# Check monitor database size
du -sh /var/lib/ceph/mon/<cluster>-<id>/store.db/

# Compact the monitor database
ceph tell mon.<id> compact
# Or via admin socket
ceph daemon mon.<id> compact
```

Enable automatic compaction:

```bash
ceph config set mon mon_compact_on_start true
ceph config set mon mon_compact_on_trim true
```

## Issue: Paxos Errors

Paxos errors appear in logs as "Paxos: unfresh" or similar. This typically occurs after a network partition or abnormal cluster shutdown.

```bash
# Check for Paxos errors
journalctl -u ceph-mon@mon1 | grep -i paxos

# Force a trim on the Paxos log (last resort)
ceph daemon mon.mon1 compact
```

If the monitor has fallen behind significantly:

```bash
# On the lagging monitor, check its epoch vs cluster
ceph tell mon.* mon_status
```

## Issue: Monmap Mismatch

If a monitor has an incorrect monmap (after IP changes, node replacements):

```bash
# Extract and view current monmap
ceph mon getmap -o /tmp/monmap
monmaptool /tmp/monmap --print

# Or use the ceph command
ceph mon dump
```

If you need to update a monitor's IP:

```bash
# Remove the old monitor entry
ceph mon remove <mon-name>

# Add with new address
ceph mon add <mon-name> <new-ip>:6789
```

## Recovering from Complete Quorum Loss

If all monitors are down (total cluster outage):

```bash
# On the monitor host with the most up-to-date data:

# Stop all monitors
systemctl stop ceph-mon@mon1
systemctl stop ceph-mon@mon2
systemctl stop ceph-mon@mon3

# Extract the monmap from the most current monitor
ceph-mon -i mon1 --extract-monmap /tmp/monmap

# Remove the other monitors from the monmap so mon1 can form quorum alone
monmaptool /tmp/monmap --rm mon2
monmaptool /tmp/monmap --rm mon3

# Inject the modified monmap back into the monitor store
ceph-mon -i mon1 --inject-monmap /tmp/monmap

# Start the single monitor (it will now form quorum by itself)
systemctl start ceph-mon@mon1

# Once healthy, re-add the other monitors
ceph mon add mon2 <mon2-ip>:6789
ceph mon add mon3 <mon3-ip>:6789
systemctl start ceph-mon@mon2
systemctl start ceph-mon@mon3
```

## Monitoring Monitor Health

```bash
# Continuous monitoring
watch -n 5 ceph mon stat

# Check monitor election history
ceph daemon mon.mon1 mon_status | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('State:', data.get('state'))
print('Quorum:', data.get('quorum_names'))
print('Epoch:', data.get('monmap', {}).get('epoch'))
"
```

## Monitor Logs in Rook/Kubernetes

```bash
# Get monitor pod names
kubectl -n rook-ceph get pods -l app=rook-ceph-mon

# View logs for a specific monitor
kubectl -n rook-ceph logs rook-ceph-mon-a-<pod-id> --tail=100

# Check monitor quorum via toolbox
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph quorum_status
```

## Summary

Troubleshooting Ceph monitors follows a systematic approach: check quorum status with `ceph mon stat`, inspect clock skew, verify network connectivity between monitors, check disk space, and review monitor daemon logs for Paxos errors. Clock skew is the most common cause of monitor issues - ensure NTP/chrony is synchronized across all monitor nodes. For complete quorum loss, extract the monmap, reduce it to a single monitor, and inject it back so that monitor can form quorum alone before re-adding the others. In Rook, access monitor logs via `kubectl logs` and check quorum from the toolbox pod.
