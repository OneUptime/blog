# How to Set Up Network Namespaces for Testing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Linux, Containers, Testing

Description: A comprehensive guide to using Linux network namespaces on Ubuntu for isolated network testing, including virtual ethernet pairs, routing, and practical testing scenarios.

---

Network namespaces are one of the Linux kernel features that power container networking. Each namespace gets its own network stack - interfaces, routing tables, firewall rules, and sockets. Processes running in a namespace can only see and use the interfaces in that namespace.

For testing, namespaces are invaluable. You can simulate multi-host topologies, test firewall rules, validate routing changes, and debug networking problems on a single machine without touching the physical network or spinning up VMs.

## Why Use Namespaces for Testing

- No VMs required - namespaces are lightweight
- Test routing configurations before deploying to real hardware
- Simulate network failures (drop an interface, add latency)
- Reproduce complex multi-host networking scenarios locally
- Test firewall rules in isolation before applying them

## Basic Namespace Operations

```bash
# Create a new network namespace named "test1"
sudo ip netns add test1

# List all namespaces
ip netns list

# Run a command inside the namespace
sudo ip netns exec test1 ip link list
# You'll see only the loopback interface initially

# Run a shell inside the namespace
sudo ip netns exec test1 bash
```

The new namespace has no interfaces except loopback, which is down by default:

```bash
# Inside the namespace - bring up loopback
sudo ip netns exec test1 ip link set lo up

# Verify
sudo ip netns exec test1 ip addr
```

## Connecting Namespaces with Virtual Ethernet Pairs

Virtual ethernet (veth) pairs are like a virtual patch cable - packets entering one end exit the other. This is how you connect namespaces.

```bash
# Create two namespaces
sudo ip netns add ns1
sudo ip netns add ns2

# Create a veth pair (veth0 and veth1 are connected)
sudo ip link add veth0 type veth peer name veth1

# Move each end into a namespace
sudo ip link set veth0 netns ns1
sudo ip link set veth1 netns ns2

# Configure IPs in each namespace
sudo ip netns exec ns1 ip addr add 192.168.10.1/24 dev veth0
sudo ip netns exec ns2 ip addr add 192.168.10.2/24 dev veth1

# Bring the interfaces up in both namespaces
sudo ip netns exec ns1 ip link set lo up
sudo ip netns exec ns1 ip link set veth0 up

sudo ip netns exec ns2 ip link set lo up
sudo ip netns exec ns2 ip link set veth1 up
```

Test connectivity between namespaces:

```bash
# Ping ns2 from ns1
sudo ip netns exec ns1 ping -c 4 192.168.10.2
```

## Creating a Three-Namespace Topology with a Router

This simulates two networks connected by a router:

```text
ns-client (10.0.1.2) <---> ns-router <---> ns-server (10.0.2.2)
                    (10.0.1.1)   (10.0.2.1)
```

```bash
# Create namespaces
sudo ip netns add ns-client
sudo ip netns add ns-router
sudo ip netns add ns-server

# Create veth pairs for each network segment
sudo ip link add veth-cr-client type veth peer name veth-cr-router  # client-router link
sudo ip link add veth-rs-router type veth peer name veth-rs-server  # router-server link

# Move interfaces into namespaces
sudo ip link set veth-cr-client netns ns-client
sudo ip link set veth-cr-router netns ns-router
sudo ip link set veth-rs-router netns ns-router
sudo ip link set veth-rs-server netns ns-server

# Configure client side
sudo ip netns exec ns-client ip addr add 10.0.1.2/24 dev veth-cr-client
sudo ip netns exec ns-client ip link set lo up
sudo ip netns exec ns-client ip link set veth-cr-client up

# Add default route pointing to router
sudo ip netns exec ns-client ip route add default via 10.0.1.1

# Configure router
sudo ip netns exec ns-router ip addr add 10.0.1.1/24 dev veth-cr-router
sudo ip netns exec ns-router ip addr add 10.0.2.1/24 dev veth-rs-router
sudo ip netns exec ns-router ip link set lo up
sudo ip netns exec ns-router ip link set veth-cr-router up
sudo ip netns exec ns-router ip link set veth-rs-router up

# Enable IP forwarding in the router namespace
sudo ip netns exec ns-router sysctl -w net.ipv4.ip_forward=1

# Configure server side
sudo ip netns exec ns-server ip addr add 10.0.2.2/24 dev veth-rs-server
sudo ip netns exec ns-server ip link set lo up
sudo ip netns exec ns-server ip link set veth-rs-server up
sudo ip netns exec ns-server ip route add default via 10.0.2.1
```

Test end-to-end routing:

```bash
# Ping server from client through the router
sudo ip netns exec ns-client ping -c 4 10.0.2.2

# Trace the path
sudo ip netns exec ns-client traceroute 10.0.2.2
```

## Connecting a Namespace to the Host Network

Sometimes you want a namespace to access the internet through the host:

```bash
# Create namespace and veth pair
sudo ip netns add ns-external
sudo ip link add veth-ext type veth peer name veth-host

# Move one end into the namespace
sudo ip link set veth-ext netns ns-external

# Configure the host side
sudo ip addr add 192.168.100.1/24 dev veth-host
sudo ip link set veth-host up

# Configure the namespace side
sudo ip netns exec ns-external ip addr add 192.168.100.2/24 dev veth-ext
sudo ip netns exec ns-external ip link set lo up
sudo ip netns exec ns-external ip link set veth-ext up
sudo ip netns exec ns-external ip route add default via 192.168.100.1

# Enable NAT on the host to forward namespace traffic to the internet
sudo iptables -t nat -A POSTROUTING -s 192.168.100.0/24 -j MASQUERADE
sudo sysctl -w net.ipv4.ip_forward=1

# Test internet access from the namespace
sudo ip netns exec ns-external curl -s ifconfig.me
```

## Simulating Network Conditions

Linux Traffic Control (`tc`) lets you add delay, packet loss, and bandwidth limits:

```bash
# Add 50ms delay to the veth interface in ns-client
sudo ip netns exec ns-client tc qdisc add dev veth-cr-client root netem delay 50ms

# Add packet loss (5%)
sudo ip netns exec ns-client tc qdisc add dev veth-cr-client root netem loss 5%

# Add delay with jitter (50ms +/- 10ms)
sudo ip netns exec ns-client tc qdisc add dev veth-cr-client root netem delay 50ms 10ms

# Remove the qdisc
sudo ip netns exec ns-client tc qdisc del dev veth-cr-client root

# Show current qdiscs
sudo ip netns exec ns-client tc qdisc show dev veth-cr-client
```

## Running Servers in Namespaces

You can run actual network services in namespaces for testing:

```bash
# Start a simple HTTP server in ns-server
sudo ip netns exec ns-server python3 -m http.server 8080 &

# Test connectivity from ns-client
sudo ip netns exec ns-client curl http://10.0.2.2:8080

# Start a Netcat listener in ns-server
sudo ip netns exec ns-server nc -l 9999 &

# Connect from ns-client
sudo ip netns exec ns-client nc 10.0.2.2 9999
```

## Testing Firewall Rules in Namespaces

Namespaces have their own iptables state, perfect for testing firewall rules:

```bash
# In ns-router, add a firewall rule to block port 80 from client
sudo ip netns exec ns-router iptables -A FORWARD \
  -p tcp --dport 80 \
  -s 10.0.1.0/24 \
  -j DROP

# Test - this should fail
sudo ip netns exec ns-client curl http://10.0.2.2:80

# Remove the rule
sudo ip netns exec ns-router iptables -D FORWARD \
  -p tcp --dport 80 \
  -s 10.0.1.0/24 \
  -j DROP
```

## Using a Bash Script to Build Test Topologies

Automate the setup to rebuild topologies quickly:

```bash
#!/bin/bash
# setup-test-network.sh - creates a test topology and tears it down

setup() {
    echo "Setting up test network..."

    # Create namespaces
    ip netns add ns-client
    ip netns add ns-router
    ip netns add ns-server

    # Create veth pairs
    ip link add veth-cl type veth peer name veth-rt1
    ip link add veth-rt2 type veth peer name veth-sv

    # Move to namespaces
    ip link set veth-cl netns ns-client
    ip link set veth-rt1 netns ns-router
    ip link set veth-rt2 netns ns-router
    ip link set veth-sv netns ns-server

    # Configure client
    ip netns exec ns-client ip addr add 10.0.1.2/24 dev veth-cl
    ip netns exec ns-client ip link set lo up && ip netns exec ns-client ip link set veth-cl up
    ip netns exec ns-client ip route add default via 10.0.1.1

    # Configure router
    ip netns exec ns-router ip addr add 10.0.1.1/24 dev veth-rt1
    ip netns exec ns-router ip addr add 10.0.2.1/24 dev veth-rt2
    ip netns exec ns-router ip link set lo up
    ip netns exec ns-router ip link set veth-rt1 up
    ip netns exec ns-router ip link set veth-rt2 up
    ip netns exec ns-router sysctl -qw net.ipv4.ip_forward=1

    # Configure server
    ip netns exec ns-server ip addr add 10.0.2.2/24 dev veth-sv
    ip netns exec ns-server ip link set lo up && ip netns exec ns-server ip link set veth-sv up
    ip netns exec ns-server ip route add default via 10.0.2.1

    echo "Test network ready. Test with:"
    echo "  ip netns exec ns-client ping 10.0.2.2"
}

teardown() {
    echo "Tearing down test network..."
    ip netns del ns-client 2>/dev/null
    ip netns del ns-router 2>/dev/null
    ip netns del ns-server 2>/dev/null
    # veth pairs are deleted automatically when their namespace is deleted
    echo "Done."
}

case "$1" in
    up) setup ;;
    down) teardown ;;
    *) echo "Usage: $0 {up|down}" ;;
esac
```

```bash
sudo bash setup-test-network.sh up
# Test your scenarios
sudo bash setup-test-network.sh down
```

## Namespace Persistence

Namespaces created with `ip netns add` persist until explicitly deleted or the system reboots. Named namespaces are stored as bind mounts in `/var/run/netns/`:

```bash
ls /var/run/netns/
```

To delete namespaces:

```bash
sudo ip netns del ns-client
sudo ip netns del ns-router
sudo ip netns del ns-server
```

Deleting a namespace automatically removes all its interfaces and releases all resources. Veth pairs connected to the deleted namespace also disappear.

## Troubleshooting

**Command fails "Cannot open network namespace":**
```bash
# Check if the namespace exists
ip netns list

# Verify the netns filesystem is mounted
ls /var/run/netns/
```

**Ping works but curl does not:**
```bash
# Check if DNS resolves inside the namespace
sudo ip netns exec ns-client nslookup google.com

# Add a DNS server to the namespace
sudo ip netns exec ns-client bash -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'
```

**NAT not working for external access:**
```bash
# Verify MASQUERADE rule is in place
sudo iptables -t nat -L POSTROUTING -n -v

# Check IP forwarding is on the host
sysctl net.ipv4.ip_forward
```

Network namespaces are the foundation of how Docker, containerd, and Kubernetes implement container networking. Understanding them directly gives you much better insight into why container networking behaves the way it does and how to debug it when things go wrong.
