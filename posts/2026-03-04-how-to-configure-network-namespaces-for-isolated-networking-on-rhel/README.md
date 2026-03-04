# How to Configure Network Namespaces for Isolated Networking on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Network Namespaces, Networking, Isolation, Linux

Description: Learn how to create and manage network namespaces on RHEL to provide isolated network environments for testing and security.

---

Network namespaces provide isolated network stacks, each with its own interfaces, routing tables, and firewall rules. They are the foundation of container networking and are useful for testing and multi-tenant configurations.

## Creating a Network Namespace

```bash
# Create a new network namespace
sudo ip netns add ns1

# List all network namespaces
ip netns list

# Run a command inside the namespace
sudo ip netns exec ns1 ip link show
```

## Connecting Namespaces with veth Pairs

Virtual Ethernet (veth) pairs connect two namespaces:

```bash
# Create a veth pair
sudo ip link add veth0 type veth peer name veth1

# Move one end into the namespace
sudo ip link set veth1 netns ns1

# Configure the host end
sudo ip addr add 10.0.0.1/24 dev veth0
sudo ip link set veth0 up

# Configure the namespace end
sudo ip netns exec ns1 ip addr add 10.0.0.2/24 dev veth1
sudo ip netns exec ns1 ip link set veth1 up
sudo ip netns exec ns1 ip link set lo up
```

## Testing Connectivity

```bash
# Ping from host to namespace
ping -c 3 10.0.0.2

# Ping from namespace to host
sudo ip netns exec ns1 ping -c 3 10.0.0.1
```

## Providing Internet Access to a Namespace

```bash
# Set default route in the namespace
sudo ip netns exec ns1 ip route add default via 10.0.0.1

# Enable IP forwarding on the host
sudo sysctl -w net.ipv4.ip_forward=1

# Add NAT rule for the namespace traffic
sudo iptables -t nat -A POSTROUTING -s 10.0.0.0/24 -o ens192 -j MASQUERADE

# Test internet access from the namespace
sudo ip netns exec ns1 ping -c 3 8.8.8.8
```

## Connecting Two Namespaces

```bash
# Create a second namespace
sudo ip netns add ns2

# Create a veth pair between ns1 and ns2
sudo ip link add veth-ns1 type veth peer name veth-ns2

# Assign each end to its namespace
sudo ip link set veth-ns1 netns ns1
sudo ip link set veth-ns2 netns ns2

# Configure IP addresses
sudo ip netns exec ns1 ip addr add 10.1.0.1/24 dev veth-ns1
sudo ip netns exec ns1 ip link set veth-ns1 up
sudo ip netns exec ns2 ip addr add 10.1.0.2/24 dev veth-ns2
sudo ip netns exec ns2 ip link set veth-ns2 up

# Test
sudo ip netns exec ns1 ping -c 3 10.1.0.2
```

## Cleaning Up

```bash
# Delete namespaces (also removes associated veth pairs)
sudo ip netns delete ns1
sudo ip netns delete ns2
```

Network namespaces are persistent until explicitly deleted or the system reboots. They do not survive reboots unless you create systemd services or scripts to recreate them.
