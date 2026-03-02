# How to Configure OVS Bonding on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Open vSwitch, Bonding, High Availability

Description: Configure network interface bonding with Open vSwitch on Ubuntu for link aggregation, failover, and load balancing across multiple physical NICs.

---

OVS bonding combines multiple physical network interfaces into a single logical link. This gives you either increased bandwidth (link aggregation), high availability (active-backup failover), or both. OVS bonding is different from kernel bonding (`bonding` module) - it runs entirely in OVS and is managed through `ovs-vsctl`. The main advantage is tight integration with OVS features like VLAN trunking and OpenFlow.

## OVS Bonding Modes

OVS supports three bonding modes:

| Mode | Description |
|---|---|
| `active-backup` | One link active, others standby. Automatic failover. |
| `balance-slb` | Load balance based on source MAC and VLAN. No LACP required. |
| `balance-tcp` | Load balance based on IP source/destination. Requires LACP. |

`active-backup` is the safest choice for simple failover. `balance-slb` works without switch configuration. `balance-tcp` gives the best load distribution but requires 802.3ad LACP support on the connected switch.

## Creating a Bond in OVS

```bash
# Ensure OVS is installed
sudo apt install openvswitch-switch

# Create a bridge and add a bond with two interfaces in one command
sudo ovs-vsctl add-br br0 \
  -- add-bond br0 bond0 eth0 eth1 \
  bond_mode=active-backup

# Verify the configuration
sudo ovs-vsctl show
```

Expected output showing the bond:

```
Bridge br0
    Port bond0
        Interface eth0
        Interface eth1
            type: system
    Port br0
        Interface br0
            type: internal
```

## Configuring Active-Backup Mode

Active-backup is the simplest and most compatible mode. One interface handles all traffic; the other takes over if the primary fails.

```bash
# Create bond with active-backup mode
sudo ovs-vsctl add-br br-uplink
sudo ovs-vsctl add-bond br-uplink bond-uplink eth0 eth1 \
  bond_mode=active-backup \
  other_config:bond-detect-mode=carrier

# Set the primary interface (optional - OVS picks one if not set)
sudo ovs-vsctl set port bond-uplink other_config:active-slave=eth0

# Set a shorter failover detection interval (milliseconds)
sudo ovs-vsctl set port bond-uplink other_config:bond-miimon-interval=100

# Verify configuration
sudo ovs-vsctl list port bond-uplink
```

## Configuring Balance-SLB Mode

Source Load Balancing (SLB) distributes traffic based on the source MAC address and VLAN. Each source sends all its traffic through one interface, but different sources may use different interfaces.

```bash
# Create bond with balance-slb mode
sudo ovs-vsctl add-bond br0 bond0 eth0 eth1 \
  bond_mode=balance-slb

# Set rebalance interval (milliseconds) - OVS periodically rebalances flow distribution
sudo ovs-vsctl set port bond0 other_config:bond-rebalance-interval=10000

# View the bond status
sudo ovs-appctl bond/show bond0
```

## Configuring Balance-TCP Mode (LACP)

TCP load balancing requires LACP negotiation with the connected switch. This mode provides the best performance and true per-flow load balancing.

```bash
# Create bond with balance-tcp and LACP enabled
sudo ovs-vsctl add-bond br0 bond0 eth0 eth1 \
  bond_mode=balance-tcp \
  lacp=active

# Configure LACP parameters
sudo ovs-vsctl set port bond0 \
  other_config:lacp-time=fast \
  other_config:lacp-fallback-ab=true

# Set LACP system priority (lower = higher priority)
sudo ovs-vsctl set open_vswitch . \
  other_config:system-id=aa:bb:cc:dd:ee:ff \
  other_config:lacp-system-priority=100

# View LACP status
sudo ovs-appctl lacp/show bond0
```

Your physical switch must also be configured for LACP/802.3ad on the ports connected to this server. The `lacp-fallback-ab` option tells OVS to fall back to active-backup if LACP negotiation fails, which prevents complete network outage if the switch is not configured for LACP.

## Verifying Bond Status

```bash
# Show bond status and which interfaces are active
sudo ovs-appctl bond/show

# Sample output for active-backup bond:
# ---- bond0 ----
# bond_mode: active-backup
# updelay: 0 ms
# downdelay: 0 ms
# lacp_status: off
# active slave mac: aa:bb:cc:dd:ee:ff(eth0)
#
# slave eth0: enabled
#   active slave
#   may_enable: true
#
# slave eth1: enabled
#   may_enable: true

# Show per-interface statistics
sudo ovs-ofctl dump-ports br0

# Show LACP details (for balance-tcp mode)
sudo ovs-appctl lacp/show
```

## Configuring Bond on Netplan

For persistent OVS bond configuration that survives reboots, use Netplan.

```yaml
# /etc/netplan/01-ovs-bond.yaml
network:
  version: 2
  renderer: openvswitch
  ethernets:
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false
  bonds:
    bond0:
      interfaces: [eth0, eth1]
      parameters:
        mode: active-backup
        mii-monitor-interval: 100
      dhcp4: false
  bridges:
    br-uplink:
      interfaces: [bond0]
      dhcp4: true
      openvswitch: {}
```

Note: Netplan's OVS renderer creates OVS bonds differently from kernel bonds. The `renderer: openvswitch` line is required for OVS-managed bonds.

```bash
sudo netplan apply
```

## Testing Failover

```bash
# While traffic is flowing, bring down the active interface
sudo ip link set eth0 down

# Watch the bond status change (active slave switches to eth1)
sudo watch -n 1 "ovs-appctl bond/show bond0"

# Verify traffic continues flowing
ping -c 10 8.8.8.8

# Bring eth0 back up
sudo ip link set eth0 up

# Check if OVS rebalances or returns to the primary
sudo ovs-appctl bond/show bond0
```

## Adjusting Failover Timing

The time OVS takes to detect a link failure and fail over depends on the detection mode.

```bash
# Carrier detection mode (fast - detects physical link down immediately)
sudo ovs-vsctl set port bond0 other_config:bond-detect-mode=carrier

# MII monitoring mode (active probing)
sudo ovs-vsctl set port bond0 other_config:bond-detect-mode=miimon

# MII monitoring interval (check every 100ms)
sudo ovs-vsctl set port bond0 other_config:bond-miimon-interval=100

# Updelay: wait this long before activating a recovered link (ms)
# Prevents flapping if a link bounces
sudo ovs-vsctl set port bond0 other_config:updelay=200

# Downdelay: wait this long before marking a link as down (ms)
sudo ovs-vsctl set port bond0 other_config:downdelay=200
```

## Removing a Bond

```bash
# Remove the bond port (and its member interfaces)
sudo ovs-vsctl del-port br0 bond0

# Verify removal
sudo ovs-vsctl show

# The physical interfaces (eth0, eth1) are released from OVS
# and can be reconfigured for standalone use
```

## Monitoring Bond Health

For production environments, monitor bond state with a simple script.

```bash
#!/bin/bash
# bond-monitor.sh - Alert on bond member failures

BOND_NAME="bond0"
LOG_FILE="/var/log/ovs-bond-monitor.log"

check_bond() {
    status=$(ovs-appctl bond/show "$BOND_NAME" 2>&1)
    slave_count=$(echo "$status" | grep -c "^slave")
    active_count=$(echo "$status" | grep -c "enabled")

    echo "$(date): $BOND_NAME - $active_count/$slave_count members active" >> "$LOG_FILE"

    if [ "$active_count" -lt "$slave_count" ]; then
        echo "$(date): WARNING - Bond member down on $BOND_NAME" | \
          tee -a "$LOG_FILE" | mail -s "Bond Alert on $(hostname)" admin@example.com
    fi
}

check_bond
```

```bash
# Schedule the check every minute
echo "*/1 * * * * /path/to/bond-monitor.sh" | sudo crontab -
```

OVS bonding integrates cleanly with other OVS features like VLAN trunking, QoS, and OpenFlow, making it the preferred bonding solution in any environment already using OVS for virtual networking.
