# How to Add Multiple IPv4 Addresses to a Single Network Interface on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, IPv4, ip command, Virtual IP, Network Configuration

Description: Add multiple IPv4 addresses to a single Linux network interface using ip addr add, including secondary addresses, label aliases, and how to make them persistent.

## Introduction

Linux allows a single physical interface to host multiple IPv4 addresses simultaneously. This is used for virtual hosting, service migration, failover testing, and multi-tenant configurations. The `ip` command handles this natively without requiring virtual interface aliases.

## Adding a Second IP Address

```bash
# If the interface does not already have an address, add one first

sudo ip addr add 192.168.1.100/24 dev eth0

# Add a second address to the same interface
sudo ip addr add 192.168.1.101/24 dev eth0

# Add a third from a different subnet
sudo ip addr add 10.0.0.5/8 dev eth0

# Verify all addresses
ip -4 addr show dev eth0
```

Output:

```text
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP>
    inet 192.168.1.100/24 brd 192.168.1.255 scope global eth0
    inet 192.168.1.101/24 brd 192.168.1.255 scope global secondary eth0
    inet 10.0.0.5/8 brd 10.255.255.255 scope global secondary eth0
```

Additional IPv4 addresses are typically marked **secondary**.

## Using Labels for Identification

Labels help identify the purpose of each address:

```bash
# Add address with a label (format: interface:suffix)
sudo ip addr add 192.168.1.110/24 dev eth0 label eth0:web
sudo ip addr add 192.168.1.111/24 dev eth0 label eth0:db

# View labeled addresses
ip addr show dev eth0 label 'eth0:*'
```

## Practical Use Case: Virtual Hosting

A web server hosting multiple websites on different IPs:

```bash
# Add one IP per virtual host
sudo ip addr add 192.168.1.201/24 dev eth0 label eth0:site1
sudo ip addr add 192.168.1.202/24 dev eth0 label eth0:site2
sudo ip addr add 192.168.1.203/24 dev eth0 label eth0:site3
```

Then bind each service to its specific IP.

## Removing a Specific Secondary Address

```bash
# Remove one specific address without affecting others
sudo ip addr del 192.168.1.101/24 dev eth0
```

## Making Multiple Addresses Persistent

**Netplan (Ubuntu):**

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 192.168.1.100/24
        - 192.168.1.101/24
        - 10.0.0.5/8
      routes:
        - to: default
          via: 192.168.1.1
```

**Debian /etc/network/interfaces:**

```text
auto eth0
iface eth0 inet static
    address 192.168.1.100/24
    gateway 192.168.1.1

iface eth0 inet static
    address 192.168.1.101/24

iface eth0 inet static
    address 192.168.1.102/24
```

## Adding Many IPs with a Loop

```bash
# Add IPs 192.168.1.200 through 192.168.1.220
for i in $(seq 200 220); do
    sudo ip addr add "192.168.1.${i}/24" dev eth0
done
```

## Conclusion

Adding multiple IPv4 addresses to an interface is straightforward with `ip addr add`. Use labels for clarity, use Netplan or `interfaces` files for persistence, and use loops when provisioning many addresses at once.
