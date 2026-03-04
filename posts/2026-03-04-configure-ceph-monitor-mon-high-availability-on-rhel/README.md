# How to Configure Ceph Monitor (MON) High Availability on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ceph, MON, High Availability, Storage

Description: Set up multiple Ceph Monitor daemons across RHEL nodes to achieve quorum-based high availability and prevent cluster outages from a single monitor failure.

---

Ceph Monitors maintain the cluster map and manage consensus. A single monitor is a single point of failure. Running an odd number of monitors (3 or 5) ensures quorum is maintained even if a node goes down.

## Check Current Monitor Status

```bash
# See current monitors
sudo ceph mon stat

# Detailed monitor map
sudo ceph mon dump

# Check quorum status
sudo ceph quorum_status --format json-pretty
```

## Deploy Additional Monitors with cephadm

If you bootstrapped with a single monitor, add more:

```bash
# Set the number of monitors to deploy (cephadm will place them automatically)
sudo ceph orch apply mon 3

# Or specify which hosts should run monitors
sudo ceph orch apply mon "node1,node2,node3"
```

cephadm will deploy monitor daemons on the specified hosts and add them to the quorum.

## Manually Add a Monitor

If you need more control over placement:

```bash
# Add a monitor on a specific host and IP
sudo ceph orch daemon add mon node2:192.168.1.11

# Verify the new monitor joined quorum
sudo ceph mon stat
```

## Verify Quorum

After adding monitors, confirm they are all in quorum:

```bash
# Check the quorum members
sudo ceph quorum_status --format json-pretty | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('Quorum members:', data['quorum_names'])
print('Leader:', data['quorum_leader_name'])
"
```

## Remove a Monitor

If you need to remove a failed or decommissioned monitor:

```bash
# Remove the monitor daemon
sudo ceph orch daemon rm mon.node3

# Verify it was removed
sudo ceph mon stat
```

## Monitor Network Configuration

Monitors should communicate on a dedicated network if possible. Set the public network in the Ceph configuration:

```bash
# Set the public network for monitor communication
sudo ceph config set mon public_network 192.168.1.0/24
```

## Firewall Rules for Monitors

Open the required ports on all monitor nodes:

```bash
# Monitor ports (v1 and v2 messenger)
sudo firewall-cmd --permanent --add-port=6789/tcp
sudo firewall-cmd --permanent --add-port=3300/tcp
sudo firewall-cmd --reload
```

## Monitor Health Checks

Watch for monitor-related health warnings:

```bash
# Check for MON-specific health issues
sudo ceph health detail | grep -i mon

# View monitor performance
sudo ceph daemon mon.node1 perf dump
```

With three or five monitors distributed across separate hosts, your Ceph cluster maintains quorum even if one monitor node fails.
