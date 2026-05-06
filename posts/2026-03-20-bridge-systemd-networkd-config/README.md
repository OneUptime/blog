# How to Configure a Network Bridge with systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Linux, systemd-networkd, Bridge, Virtualization, Network Configuration

Description: Learn how to create and configure a network bridge using systemd-networkd for virtual machine and container networking on Linux.

---

A network bridge is a Layer 2 device that connects multiple network segments. On Linux, bridges are commonly used to give VMs and containers access to the physical network. systemd-networkd manages bridges through `.netdev` and `.network` files.

---

## Create the Bridge Device (.netdev)

```ini
# /etc/systemd/network/10-br0.netdev

[NetDev]
Name=br0
Kind=bridge

[Bridge]
STP=yes
ForwardDelaySec=4s
HelloTimeSec=2s
MaxAgeSec=20s
```

---

## Add a Physical Interface to the Bridge

```ini
# /etc/systemd/network/20-eth0-bridge.network
[Match]
Name=eth0

[Network]
Bridge=br0
```

---

## Configure the Bridge Interface

```ini
# /etc/systemd/network/30-br0.network
[Match]
Name=br0

[Network]
Address=192.168.1.20/24
Gateway=192.168.1.1
DNS=8.8.8.8
DHCP=no
```

---

## DHCP Bridge Configuration

```ini
# /etc/systemd/network/30-br0.network
[Match]
Name=br0

[Network]
DHCP=yes
```

---

## Apply and Verify

```bash
sudo systemctl restart systemd-networkd

# Check bridge status
networkctl status br0
bridge link show
bridge fdb show

# Verify connectivity
ping 192.168.1.1
```

---

## Use the Bridge for libvirt/KVM VMs

```bash
# Define a bridge network in libvirt
virsh net-define /dev/stdin <<'EOF'
<network>
  <name>br0-net</name>
  <forward mode="bridge"/>
  <bridge name="br0"/>
</network>
EOF

virsh net-start br0-net
virsh net-autostart br0-net
```

---

## Summary

Create a bridge with a `.netdev` file, attach physical interfaces using `.network` files with `Bridge=br0`, and configure the bridge's IP in another `.network` file. Enable STP when there is a possibility of Layer 2 loops. The bridge gives VMs and containers the same Layer 2 access as physical hosts on the network.
