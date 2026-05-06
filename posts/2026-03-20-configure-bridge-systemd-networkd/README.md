# How to Configure a Bridge with systemd-networkd - Configure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, systemd-networkd, Bridge, Networking, Configuration, KVM

Description: Configure a Linux network bridge using systemd-networkd .netdev and .network files, attaching physical interfaces and assigning an IP address to the bridge.

## Introduction

A Linux bridge created by systemd-networkd uses a `.netdev` file for the bridge device and `.network` files for the bridge (when assigning IP configuration to it) and each member interface (to attach them to the bridge). This is commonly used for KVM virtual machine networking.

## Step 1: Create the Bridge Device (.netdev)

```ini
# /etc/systemd/network/10-br0.netdev

[NetDev]
Name=br0
Kind=bridge

[Bridge]
STP=yes
```

## Step 2: Configure the Bridge IP Address (.network)

```ini
# /etc/systemd/network/10-br0.network
[Match]
Name=br0

[Network]
Address=192.168.1.10/24
Gateway=192.168.1.1
DNS=8.8.8.8
```

## Step 3: Attach Physical Interface to the Bridge

```ini
# /etc/systemd/network/20-eth0.network
[Match]
Name=eth0

[Network]
# Assign eth0 as a bridge member - no IP on eth0 itself
Bridge=br0
```

## Apply and Verify

```bash
# Restart to create and configure the bridge
systemctl restart systemd-networkd

# Verify bridge is created and members attached
ip link show br0
bridge link show

# Show IP address on the bridge
ip addr show br0

# Check status
networkctl status br0
```

## DHCP on the Bridge

```ini
# /etc/systemd/network/10-br0.network
[Match]
Name=br0

[Network]
DHCP=ipv4
```

## Bridge with Multiple Members

```ini
# /etc/systemd/network/20-eth0.network
[Match]
Name=eth0

[Network]
Bridge=br0
```

```ini
# /etc/systemd/network/21-eth1.network
[Match]
Name=eth1

[Network]
Bridge=br0
```

## Bridge with STP Tuning

```ini
# /etc/systemd/network/10-br0.netdev
[NetDev]
Name=br0
Kind=bridge

[Bridge]
STP=yes
HelloTimeSec=2
MaxAgeSec=20
ForwardDelaySec=4
```

## Conclusion

systemd-networkd creates bridges via a `.netdev` file defining `Kind=bridge`, a `.network` file assigning IP to the bridge, and separate `.network` files for each member interface using `Bridge=br0`. Verify with `bridge link show` and `networkctl status br0`.
