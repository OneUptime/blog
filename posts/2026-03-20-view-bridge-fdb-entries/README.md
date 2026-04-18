# How to View Bridge FDB (Forwarding Database) Entries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bridge, FDB, Forwarding Database, Networking, Troubleshooting

Description: View and manage the Linux bridge forwarding database (FDB) to inspect MAC address to port mappings learned by the bridge.

## Introduction

The bridge forwarding database (FDB) is the MAC address table that a Linux bridge uses to make forwarding decisions. Like a hardware switch, the bridge learns which MAC addresses are reachable through which ports and stores them in the FDB. Inspecting the FDB helps troubleshoot connectivity issues and verify that the bridge is learning correctly.

## View All FDB Entries

```bash
# Show all FDB entries

bridge fdb show

# Show entries for a specific bridge
bridge fdb show br br0

# Show entries for a specific interface/port
bridge fdb show dev eth0
```

## Interpret FDB Output

```text
aa:bb:cc:dd:ee:11 dev eth0 master br0
aa:bb:cc:dd:ee:22 dev tap0 master br0 self
33:33:00:00:00:01 dev br0 self permanent
ff:ff:ff:ff:ff:ff dev eth0 master br0 permanent
```

Key fields:
- `dev` - which interface this MAC was learned on
- `master br0` - this entry belongs to bridge br0
- `permanent` - static entry (not aged out)
- No `permanent` - dynamic entry (learned, will age out)
- `self` - entry on the bridge itself

## Filter FDB by MAC Address

```bash
# Check if a specific MAC is in the FDB
bridge fdb show | grep "aa:bb:cc:dd:ee:11"
```

## Add a Static FDB Entry

```bash
# Add a permanent (static) FDB entry
# Forces traffic to aa:bb:cc:dd:ee:11 to go out eth0
bridge fdb add aa:bb:cc:dd:ee:11 dev eth0 master br0 permanent
```

## Delete an FDB Entry

```bash
# Delete a specific FDB entry
bridge fdb del aa:bb:cc:dd:ee:11 dev eth0 master br0
```

## Check FDB Aging Time

The FDB aging time controls how long dynamic entries are kept:

```bash
# Check current aging time (seconds)
cat /sys/class/net/br0/bridge/ageing_time

# Set aging time to 300 seconds (5 minutes)
ip link set br0 type bridge ageing_time 300

# Or set to 0 to disable aging (keep entries permanently)
ip link set br0 type bridge ageing_time 0
```

## Troubleshoot Missing FDB Entries

If a host is not reachable through the bridge, check if its MAC is in the FDB:

```bash
# Step 1: Generate traffic from the target host (e.g., ping the gateway)
# Step 2: Check if the MAC appears in the FDB
bridge fdb show br br0 | grep -v "permanent"

# If MAC is missing, the bridge has not seen traffic from that host
# Check physical connectivity and that the interface is up
bridge link show
```

## Flush the FDB

```bash
# Flush all dynamic FDB entries (bridge will relearn)
bridge fdb flush dev br0

# Or using the sysfs flush attribute
echo 1 > /sys/class/net/br0/bridge/flush
```

## Conclusion

The bridge FDB is the MAC-to-port table that drives forwarding decisions. Use `bridge fdb show br br0` to inspect learned entries and verify that the bridge is associating MAC addresses with the correct ports. Static entries can be added with `bridge fdb add` for hosts that should always use a specific port. Monitor FDB entries to diagnose bridge connectivity issues.
