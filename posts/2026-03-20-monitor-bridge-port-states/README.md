# How to Monitor Bridge Port States

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bridge, STP, Port State, Linux, Brctl, Monitoring, Networking

Description: Learn how to monitor Linux bridge port states including STP forwarding/blocking states, port statistics, and how to set up alerts when bridge port states change.

---

Monitoring bridge port states helps detect STP topology changes, blocked ports, and traffic anomalies that can cause connectivity issues.

## Viewing Port States

```bash
# Show all bridge ports and their states

bridge link show

# Output:
# 2: eth0 master br0 state forwarding priority 32 cost 4
# 3: eth1 master br0 state forwarding priority 32 cost 4
# 4: tap0 master br0 state forwarding priority 32 cost 100

# STP-specific states
brctl showstp br0

# Port states: disabled, listening, learning, forwarding, blocking
```

## Viewing Port Statistics

```bash
# Show per-port statistics
bridge -s link show

# Or check /sys for individual port stats
cat /sys/class/net/br0/brif/eth0/port_id
cat /sys/class/net/br0/brif/eth0/state

# State values:
# 0 = disabled
# 1 = listening
# 2 = learning
# 3 = forwarding
# 4 = blocking
```

## Monitoring Forwarding Database (FDB)

```bash
# Show learned MAC addresses per port
bridge fdb show br br0

# Output:
# aa:bb:cc:dd:ee:01 dev tap0 master br0 permanent
# aa:bb:cc:dd:ee:02 dev eth0 master br0

# Filter by port
bridge fdb show dev eth0

# Count entries per port
bridge fdb show br br0 | awk '{print $3}' | sort | uniq -c
```

## Detecting STP Topology Changes

```bash
# Check topology change count
brctl showstp br0 | grep "topology change"
# topology change count    5
# topology change timer    0.00

# Increasing count indicates STP is reconverging (possible flapping)
```

## Monitoring Port State Changes

```bash
# Watch for bridge link state changes via netlink
bridge monitor link

# Or use udev rules for bridge port state change events
```

## Shell Script: Alert on Port State Change

```bash
#!/bin/bash
# /usr/local/bin/monitor-bridge.sh

BRIDGE="br0"
PORTS=$(ls /sys/class/net/$BRIDGE/brif/)

while true; do
  for port in $PORTS; do
    STATE=$(cat /sys/class/net/$BRIDGE/brif/$port/state 2>/dev/null)
    case $STATE in
      4) echo "ALERT: $port is BLOCKING (STP)" ;;
      0) echo "ALERT: $port is DISABLED" ;;
      3) : ;; # forwarding = normal
    esac
  done
  sleep 5
done
```

## Prometheus Monitoring

```bash
# node_exporter exposes bridge stats via /proc/net/dev
# Custom metric via textfile collector:
echo "bridge_port_state{bridge=\"br0\",port=\"eth0\"} $(cat /sys/class/net/br0/brif/eth0/state)" \
  > /var/lib/prometheus/textfile/bridge.prom
```

## Key Takeaways

- `bridge link show` gives a quick view of all ports and their STP states.
- Port state 3 (forwarding) is normal; state 4 (blocking) means STP has blocked the port to prevent a loop.
- Increasing `topology change count` in `brctl showstp` indicates STP reconvergence events - investigate flapping links.
- Read `/sys/class/net/br0/brif/<port>/state` for machine-readable port state (0-4) suitable for monitoring scripts.
