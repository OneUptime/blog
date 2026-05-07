# How to Set the ARP Monitoring Interval for Network Bonds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bonding, ARP Monitoring, Linux, Network Reliability, Arp_interval, Arp_ip_target, IPv4

Description: Learn how to configure ARP monitoring for Linux bond interfaces as an alternative to MII monitoring, enabling faster and more accurate link failure detection at the network layer.

---

ARP monitoring sends ARP requests to specific targets to detect link failures. Unlike MII monitoring (which only checks physical link state), ARP monitoring also detects upstream connectivity failures.

## ARP Monitoring vs. MII Monitoring

| Feature | MII (miimon) | ARP (arp_interval) |
|---------|-------------|-------------------|
| Detects cable disconnect | Yes | Yes |
| Detects switch port down | Yes | Yes |
| Detects upstream failure | No | Yes |
| Requires target IP | No | Yes |
| Works with all modes | Yes | No |

## Configuring ARP Monitoring

```bash
# /etc/network/interfaces (Debian)

auto bond0
iface bond0 inet static
  address 10.0.0.10
  netmask 255.255.255.0
  gateway 10.0.0.1
  bond-slaves eth0 eth1
  bond-mode active-backup
  # ARP probe every 1000ms
  bond-arp-interval 1000
  # Target to ARP probe (usually gateway)
  bond-arp-ip-target 10.0.0.1
  # Multiple targets for redundancy:
  # bond-arp-ip-target 10.0.0.1 10.0.0.2
```

## systemd-networkd Configuration

```ini
# /etc/systemd/network/bond0.netdev
[NetDev]
Name=bond0
Kind=bond

[Bond]
Mode=active-backup
ARPIntervalSec=1000ms
# Space-separated list
ARPIPTargets=10.0.0.1 10.0.0.2
# Validate only active slave
ARPValidate=active
AllSlavesActive=false
```

## nmcli Configuration

```bash
nmcli connection modify bond0 \
  bond.options "mode=active-backup,arp_interval=1000,arp_ip_target=10.0.0.1"
nmcli connection up bond0
```

## ARP Validate Modes

```bash
# arp_validate controls validation/filtering behavior:
# none          - no validation or filtering (default)
# active        - validate only the active slave
# backup        - validate only backup slaves
# all           - validate all slaves
# filter        - use only ARP traffic for link monitoring; no validation
# filter_active - filter on all slaves, validate only the active slave
# filter_backup - filter on all slaves, validate only backup slaves

# /etc/network/interfaces
bond-arp-validate all
```

## Verifying ARP Monitoring

```bash
# Check current ARP monitoring settings
cat /proc/net/bonding/bond0 | grep -E "ARP|arp"

# Output:
# ARP Polling Interval (ms): 1000
# ARP IP target/s (n.n.n.n form): 10.0.0.1

# Watch for failover: disconnect a NIC and observe
watch -n 1 "cat /proc/net/bonding/bond0 | grep -E 'Active|MII|ARP'"
```

## Simulating Failover with ARP Monitoring

```bash
# Disable eth0 (primary slave)
ip link set eth0 down

# After a few missed ARP polls (default arp_missed_max=2), eth1 should become active
watch -n 0.5 "cat /proc/net/bonding/bond0 | grep 'Active Slave'"

# Re-enable
ip link set eth0 up
```

## Key Takeaways

- ARP monitoring detects network-level failures (lost gateway connectivity) that MII monitoring misses.
- Set `arp_ip_target` to the gateway IP; if the gateway is unreachable, the slave is considered failed.
- Use multiple ARP targets (`arp_ip_target=10.0.0.1,10.0.0.2`) for redundancy; in active-backup mode with ARP validation enabled, the default is to keep a slave up as long as any target responds.
- ARP interval of 1000ms (1 second) provides fast detection, but actual failover timing also depends on `arp_missed_max`; set `arp_validate=all` for active/backup validation.
