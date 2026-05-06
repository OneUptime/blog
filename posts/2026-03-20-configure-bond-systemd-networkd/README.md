# How to Configure a Bond with systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, systemd-networkd, Bonding, Network Bonding, LACP, Networking, Configuration

Description: Configure network interface bonding using systemd-networkd .netdev and .network files, supporting active-backup, LACP, and other bonding modes.

## Introduction

systemd-networkd creates bond interfaces via `.netdev` files and attaches member interfaces via `.network` files with `Bond=bond0`. This provides bonding configuration that persists across reboots without additional tools.

## Step 1: Create the Bond Device (.netdev)

```ini
# /etc/systemd/network/10-bond0.netdev

[NetDev]
Name=bond0
Kind=bond

[Bond]
Mode=active-backup
MIIMonitorSec=100ms
UpDelaySec=200ms
DownDelaySec=200ms
```

## Step 2: Configure the Bond IP Address (.network)

```ini
# /etc/systemd/network/10-bond0.network
[Match]
Name=bond0

[Network]
Address=192.168.1.10/24
Gateway=192.168.1.1
DNS=8.8.8.8
```

## Step 3: Attach Member Interfaces

```ini
# /etc/systemd/network/20-eth0.network
[Match]
Name=eth0

[Network]
Bond=bond0
```

```ini
# /etc/systemd/network/21-eth1.network
[Match]
Name=eth1

[Network]
Bond=bond0
```

## Apply and Verify

```bash
# Restart to create the bond
systemctl restart systemd-networkd

# Check bond status
cat /proc/net/bonding/bond0

# Show IP address
ip addr show bond0

# Check interface status
networkctl status bond0
```

## LACP (802.3ad) Bonding

```ini
# /etc/systemd/network/10-bond0.netdev
[NetDev]
Name=bond0
Kind=bond

[Bond]
Mode=802.3ad
MIIMonitorSec=100ms
LACPTransmitRate=fast
TransmitHashPolicy=layer3+4
```

This mode requires the connected switch ports to be configured for 802.3ad/LACP.

## Round-Robin Bonding

```ini
[Bond]
Mode=balance-rr
MIIMonitorSec=100ms
```

This mode generally requires the connected switch ports to be grouped into the same logical link.

## DHCP on Bond Interface

```ini
# /etc/systemd/network/10-bond0.network
[Match]
Name=bond0

[Network]
DHCP=ipv4
```

## Bond Mode Reference

| Mode Name | Value | Description |
|---|---|---|
| balance-rr | 0 | Round-robin |
| active-backup | 1 | Failover only |
| balance-xor | 2 | XOR hashing |
| broadcast | 3 | All interfaces |
| 802.3ad | 4 | LACP |
| balance-tlb | 5 | Adaptive TX |
| balance-alb | 6 | Adaptive TX + IPv4 RX |

## Conclusion

systemd-networkd bond configuration requires a `.netdev` with `Kind=bond` and bond parameters, a `.network` for the bond IP, and per-member `.network` files with `Bond=bond0`. Use `cat /proc/net/bonding/bond0` to verify member status and active interface.
