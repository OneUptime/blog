# How to Configure a Bridge with systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bridge, systemd-networkd, Networking, KVM, Virtualization, Configuration

Description: Configure a persistent network bridge using systemd-networkd .netdev and .network files for declarative bridge configuration on systemd-based Linux systems.

## Introduction

systemd-networkd manages bridges through `.netdev` files (defining the bridge device) and `.network` files (configuring IP and bridge ports). This approach is declarative, persistent, and integrates naturally with systemd's boot process.

## Step 1: Create the Bridge .netdev File

```ini
# /etc/systemd/network/10-br0.netdev

[NetDev]
Name=br0
Kind=bridge

[Bridge]
# Disable STP when the topology has no Layer 2 loops
STP=no
```

## Step 2: Create the Bridge .network File

```ini
# /etc/systemd/network/10-br0.network
[Match]
Name=br0

[Network]
# Assign static IP to the bridge
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8
DNS=1.1.1.1
```

## Step 3: Create Port .network Files

Each interface that joins the bridge needs a `.network` file declaring the bridge:

```ini
# /etc/systemd/network/20-eth0.network
[Match]
Name=eth0

[Network]
# This makes eth0 a bridge port
Bridge=br0
```

## Apply the Configuration

```bash
# Restart networkd
systemctl restart systemd-networkd

# Verify bridge is up
networkctl list
networkctl status br0

# Check bridge ports
bridge link show
```

## Bridge with DHCP

```ini
# /etc/systemd/network/10-br0.network
[Match]
Name=br0

[Network]
DHCP=ipv4

[DHCPv4]
UseDNS=true
UseNTP=true
```

## Bridge with STP Enabled

```ini
# /etc/systemd/network/10-br0.netdev
[NetDev]
Name=br0
Kind=bridge

[Bridge]
STP=yes
ForwardDelaySec=4
HelloTimeSec=2
MaxAgeSec=12
Priority=32768
```

## Multiple Ports

```ini
# /etc/systemd/network/20-eth1.network
[Match]
Name=eth1

[Network]
Bridge=br0
```

## Verify with networkctl

```bash
# Show bridge status
networkctl status br0

# Show all interfaces
networkctl list

# Check logs
journalctl -u systemd-networkd -n 50
```

## Conclusion

systemd-networkd bridge configuration uses a `.netdev` file to define the bridge and `.network` files to assign IPs and connect ports. Ports are added to the bridge by setting `Bridge=br0` in their `.network` file. Configuration is persistent automatically. Use `networkctl status br0` to verify the bridge state and `bridge link show` to check port states.
