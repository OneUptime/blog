# How to Configure a Network Team with nmcli

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Teaming, nmcli, Linux, RHEL, Teamd, Active-Backup, LACP, Redundancy

Description: Learn how to configure a network team (teamd) on RHEL/CentOS using nmcli for link aggregation and redundancy as an alternative to traditional bonding.

---

Network teaming uses `teamd` (a userspace daemon) for flexible link aggregation. nmcli provides the simplest interface for managing team interfaces on RHEL/CentOS.

## Creating an Active-Backup Team

```bash
# Step 1: Create the team master interface

nmcli connection add type team \
  ifname team0 \
  con-name team0 \
  team.config '{"runner": {"name": "activebackup"}, "link_watch": {"name": "ethtool"}}'

# Step 2: Set IP address
nmcli connection modify team0 \
  ipv4.method manual \
  ipv4.addresses "10.0.0.10/24" \
  ipv4.gateway "10.0.0.1" \
  ipv4.dns "10.0.0.1"

# Step 3: Add port 1 (eth0)
nmcli connection add type ethernet \
  ifname eth0 \
  con-name team0-port1 \
  master team0

# Step 4: Add port 2 (eth1)
nmcli connection add type ethernet \
  ifname eth1 \
  con-name team0-port2 \
  master team0

# Step 5: Activate
nmcli connection up team0
nmcli connection up team0-port1
nmcli connection up team0-port2
```

## Creating a LACP (802.3ad) Team

```bash
nmcli connection add type team \
  ifname team0-lacp \
  con-name team0-lacp \
  team.config '{
    "runner": {
      "name": "lacp",
      "active": true,
      "fast_rate": true,
      "tx_hash": ["eth", "ip", "l4"]
    },
    "link_watch": {"name": "ethtool"}
  }'
```

## Creating a Round-Robin Team

```bash
nmcli connection add type team \
  ifname team0-rr \
  con-name team0-rr \
  team.config '{"runner": {"name": "roundrobin"}}'
```

## Viewing Team Status

```bash
# Show team state
teamdctl team0 state

# Show active port
teamdctl team0 state item get runner.active_port

# Show running config including ports
teamdctl team0 config dump

# Show full JSON state
teamdctl team0 state dump
```

## Modifying Team Runner

```bash
# Change runner type (requires deleting and recreating)
nmcli connection delete team0

# Or modify config inline
nmcli connection modify team0 \
  team.config '{"runner": {"name": "loadbalance"}}'
nmcli connection up team0
```

## Adding ARP Link Watch

```bash
nmcli connection modify team0 \
  team.config '{
    "runner": {"name": "activebackup"},
    "link_watch": {
      "name": "arp_ping",
      "interval": 1000,
      "missed_max": 3,
      "target_host": "10.0.0.1"
    }
  }'
nmcli connection up team0
```

## Verifying Configuration

```bash
# Show all team connections
nmcli connection show | grep team

# Show team interface details
nmcli device show team0

# Verify slave interfaces
nmcli connection show | grep master

# Check IP address
ip addr show team0

# Check for failover (take eth0 down)
ip link set eth0 down
teamdctl team0 state | grep "active port"
```

## Key Takeaways

- Use `nmcli connection add type team` with a JSON `team.config` to create team interfaces.
- Ports are added with `type ethernet` and `master team0` - they have no IP of their own.
- `teamdctl team0 state` provides real-time team state including active port and link watch results.
- LACP requires switch-side LACP configuration; `active: true` and `fast_rate: true` for faster convergence.
