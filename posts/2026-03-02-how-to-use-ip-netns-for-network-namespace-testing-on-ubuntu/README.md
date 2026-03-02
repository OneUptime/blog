# How to Use ip netns for Network Namespace Testing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Network Namespaces, Linux Kernel

Description: Learn how to create and manage Linux network namespaces with ip netns on Ubuntu, enabling isolated network environments for testing and development.

---

Network namespaces are a Linux kernel feature that lets you create isolated network stacks - each namespace has its own interfaces, routing tables, firewall rules, and socket space. Containers use namespaces heavily, but you can also use them directly with `ip netns` for network testing, development, and experimentation without needing Docker or virtual machines.

## Why Use Network Namespaces

Network namespaces are useful when you need to:

- Test routing or firewall configurations without affecting the host
- Simulate multi-host network topologies on a single machine
- Run services that would normally conflict on the same port
- Debug networking by creating isolated environments
- Test VPN or tunnel configurations

Everything that happens inside a namespace is isolated from other namespaces and the host network.

## Basic Namespace Operations

```bash
# Create a new network namespace
sudo ip netns add testns

# List all namespaces
sudo ip netns list

# Run a command inside a namespace
sudo ip netns exec testns ip addr

# Get a shell inside a namespace
sudo ip netns exec testns bash

# Delete a namespace
sudo ip netns delete testns
```

When you create a namespace, it starts empty - just a loopback interface that's down:

```bash
# Show interfaces inside the namespace
sudo ip netns exec testns ip link show
# 1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN

# Bring up loopback inside the namespace
sudo ip netns exec testns ip link set lo up
```

## Creating a Connected Pair of Namespaces

To simulate communication between two hosts, create two namespaces connected by a virtual Ethernet pair (veth). A veth pair is always created in pairs - traffic sent into one end comes out the other.

```bash
# Create two namespaces
sudo ip netns add ns1
sudo ip netns add ns2

# Create a veth pair
sudo ip link add veth1 type veth peer name veth2

# Move each end into its respective namespace
sudo ip link set veth1 netns ns1
sudo ip link set veth2 netns ns2

# Assign IP addresses inside each namespace
sudo ip netns exec ns1 ip addr add 10.0.0.1/24 dev veth1
sudo ip netns exec ns2 ip addr add 10.0.0.2/24 dev veth2

# Bring up the interfaces in both namespaces
sudo ip netns exec ns1 ip link set veth1 up
sudo ip netns exec ns2 ip link set veth2 up

# Bring up loopback in both
sudo ip netns exec ns1 ip link set lo up
sudo ip netns exec ns2 ip link set lo up
```

Test connectivity:

```bash
# Ping from ns1 to ns2
sudo ip netns exec ns1 ping 10.0.0.2

# Ping from ns2 to ns1
sudo ip netns exec ns2 ping 10.0.0.1
```

## Connecting a Namespace to the Host Network

To give a namespace access to the internet through the host:

```bash
# Create namespace and veth pair
sudo ip netns add internet-ns
sudo ip link add veth-host type veth peer name veth-ns

# Move namespace end into the namespace
sudo ip link set veth-ns netns internet-ns

# Configure host-side interface
sudo ip addr add 172.16.0.1/24 dev veth-host
sudo ip link set veth-host up

# Configure namespace-side interface
sudo ip netns exec internet-ns ip addr add 172.16.0.2/24 dev veth-ns
sudo ip netns exec internet-ns ip link set veth-ns up
sudo ip netns exec internet-ns ip link set lo up

# Add default route in namespace pointing to host
sudo ip netns exec internet-ns ip route add default via 172.16.0.1

# Enable IP forwarding on host
echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward

# Add NAT rule so namespace traffic goes out through host's internet connection
# Replace eth0 with your actual internet-connected interface
sudo iptables -t nat -A POSTROUTING -s 172.16.0.0/24 -o eth0 -j MASQUERADE

# Configure DNS in namespace
sudo ip netns exec internet-ns bash -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'

# Test internet access from namespace
sudo ip netns exec internet-ns curl -s https://httpbin.org/ip
```

## Building a Three-Node Topology

For more complex testing, create a bridge-based topology:

```bash
# Create three namespaces
sudo ip netns add host-a
sudo ip netns add host-b
sudo ip netns add host-c

# Create a bridge on the host to connect them
sudo ip link add br0 type bridge
sudo ip link set br0 up
sudo ip addr add 10.1.0.1/24 dev br0

# Create veth pairs for each namespace
sudo ip link add veth-a type veth peer name veth-a-br
sudo ip link add veth-b type veth peer name veth-b-br
sudo ip link add veth-c type veth peer name veth-c-br

# Move namespace ends into their namespaces
sudo ip link set veth-a netns host-a
sudo ip link set veth-b netns host-b
sudo ip link set veth-c netns host-c

# Add bridge ends to the bridge
sudo ip link set veth-a-br master br0
sudo ip link set veth-b-br master br0
sudo ip link set veth-c-br master br0

# Bring up bridge-side interfaces
sudo ip link set veth-a-br up
sudo ip link set veth-b-br up
sudo ip link set veth-c-br up

# Configure each namespace
for ns in host-a host-b host-c; do
  sudo ip netns exec $ns ip link set lo up
done

sudo ip netns exec host-a ip addr add 10.1.0.10/24 dev veth-a
sudo ip netns exec host-a ip link set veth-a up
sudo ip netns exec host-a ip route add default via 10.1.0.1

sudo ip netns exec host-b ip addr add 10.1.0.20/24 dev veth-b
sudo ip netns exec host-b ip link set veth-b up
sudo ip netns exec host-b ip route add default via 10.1.0.1

sudo ip netns exec host-c ip addr add 10.1.0.30/24 dev veth-c
sudo ip netns exec host-c ip link set veth-c up
sudo ip netns exec host-c ip route add default via 10.1.0.1
```

Now all three namespaces can communicate through the bridge:

```bash
# Test connectivity between namespaces
sudo ip netns exec host-a ping 10.1.0.20
sudo ip netns exec host-b ping 10.1.0.30
```

## Running Services in Namespaces

You can run actual services inside namespaces:

```bash
# Start a web server in ns1
sudo ip netns exec ns1 python3 -m http.server 8080 &

# Access it from ns2
sudo ip netns exec ns2 curl http://10.0.0.1:8080/

# Run iperf3 bandwidth test between namespaces
# Server in ns1
sudo ip netns exec ns1 iperf3 -s &

# Client in ns2
sudo ip netns exec ns2 iperf3 -c 10.0.0.1
```

## Monitoring Namespace Traffic

```bash
# Capture traffic on a namespace interface
sudo ip netns exec ns1 tcpdump -i veth1 -n

# Capture on the host-side of the veth pair
sudo tcpdump -i veth-host -n

# Show routing table inside namespace
sudo ip netns exec ns1 ip route

# Show ARP table inside namespace
sudo ip netns exec ns1 ip neigh
```

## Cleanup

```bash
# Delete namespaces (also removes interfaces that were moved into them)
sudo ip netns delete ns1
sudo ip netns delete ns2

# Delete bridge
sudo ip link delete br0

# Remove iptables NAT rules added earlier
sudo iptables -t nat -D POSTROUTING -s 172.16.0.0/24 -o eth0 -j MASQUERADE

# List remaining namespaces to confirm cleanup
ip netns list
```

Network namespaces persist until explicitly deleted or the machine reboots. They're not preserved across reboots unless you add the creation commands to startup scripts.

## Persisting Namespaces

To recreate namespaces at boot, add your setup commands to a systemd service or a network script. A simple approach:

```bash
# Create a setup script
cat > /usr/local/bin/setup-netns.sh << 'EOF'
#!/bin/bash
ip netns add testns
ip link add veth-test type veth peer name veth-testns
ip link set veth-testns netns testns
ip addr add 10.200.0.1/24 dev veth-test
ip link set veth-test up
ip netns exec testns ip addr add 10.200.0.2/24 dev veth-testns
ip netns exec testns ip link set veth-testns up
ip netns exec testns ip link set lo up
EOF

chmod +x /usr/local/bin/setup-netns.sh
```

Then create a systemd unit to run it at boot. Network namespaces are lightweight, isolated, and require no virtualization overhead - making them excellent for network testing without spinning up VMs.
