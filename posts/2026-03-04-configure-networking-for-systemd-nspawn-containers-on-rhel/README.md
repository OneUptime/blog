# How to Configure Networking for systemd-nspawn Containers on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd-nspawn, Networking, Containers, Linux

Description: Configure different networking modes for systemd-nspawn containers on RHEL, including private virtual ethernet, host networking, and bridged setups.

---

systemd-nspawn supports multiple networking modes. By default, containers share the host network stack, but you can isolate them with virtual ethernet pairs or bridge them to your physical network.

## Host Networking (Default)

When you run nspawn without network flags, the container shares the host network:

```bash
# Container uses host networking by default
sudo systemd-nspawn -bD /var/lib/machines/mycontainer
```

Inside the container, `ip addr` will show the same interfaces as the host.

## Private Virtual Ethernet (veth)

The `--network-veth` flag creates a virtual ethernet pair between host and container:

```bash
# Boot with an isolated virtual ethernet interface
sudo systemd-nspawn -bD /var/lib/machines/mycontainer --network-veth
```

On the host, a new interface named `ve-mycontainer` appears. Configure it:

```bash
# On the host, assign an IP to the veth endpoint
sudo ip addr add 10.0.0.1/24 dev ve-mycontainer
sudo ip link set ve-mycontainer up

# Enable IP forwarding for NAT
sudo sysctl -w net.ipv4.ip_forward=1

# Set up masquerading so the container can reach the internet
sudo firewall-cmd --zone=trusted --add-interface=ve-mycontainer
sudo firewall-cmd --zone=public --add-masquerade
```

Inside the container, configure the `host0` interface:

```bash
# Inside the container
ip addr add 10.0.0.2/24 dev host0
ip link set host0 up
ip route add default via 10.0.0.1
```

## Bridged Networking

To place the container on the same LAN as the host, use a bridge:

```bash
# Create a bridge on the host using nmcli
sudo nmcli connection add type bridge ifname br0 con-name br0
sudo nmcli connection add type bridge-slave ifname enp1s0 master br0
sudo nmcli connection modify br0 ipv4.method auto
sudo nmcli connection up br0
```

Then boot the container attached to the bridge:

```bash
# Boot with the container connected to br0
sudo systemd-nspawn -bD /var/lib/machines/mycontainer --network-bridge=br0
```

Inside the container, use DHCP or assign a static IP to the `host0` interface.

## Persistent Configuration via nspawn File

Create `/etc/systemd/nspawn/mycontainer.nspawn`:

```ini
[Network]
# Use private veth
VirtualEthernet=yes
# Or use a bridge
# Bridge=br0
```

```bash
# Start with machinectl using the saved config
sudo machinectl start mycontainer
```

These networking options let you choose the right isolation level for each container on your RHEL system.
