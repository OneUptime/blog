# How to Understand Docker Network Namespaces

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Networking, Network Namespaces, Linux, Containers, Kernel

Description: Explore how Docker uses Linux network namespaces to isolate container networking, with hands-on inspection techniques.

---

Network namespaces are the Linux kernel feature that makes container networking possible. Each Docker container gets its own network namespace, which gives it a private view of the network stack: its own interfaces, routing tables, iptables rules, and socket tables. From inside a container, it looks like a standalone machine with its own networking. From the host, it is just another namespace linked through virtual Ethernet pairs.

Understanding network namespaces helps you debug connectivity issues, optimize network performance, and build advanced networking configurations that Docker's high-level tools do not directly support.

## What Is a Network Namespace?

A network namespace is a kernel construct that provides an isolated copy of the network stack. Each namespace has:

- Its own network interfaces (lo, eth0, etc.)
- Its own routing table
- Its own iptables/nftables rules
- Its own socket table
- Its own /proc/net entries

The host has a default (root) namespace. Docker creates additional namespaces for each container.

```bash
# List network namespaces visible to the ip command
sudo ip netns list
```

You might see nothing here even with running containers. That is because Docker does not register its namespaces in the standard `/var/run/netns/` directory. We will fix that shortly.

## Locating Docker Container Namespaces

Docker stores namespace references in `/proc/<pid>/ns/net`. Find a container's namespace:

```bash
# Start a test container
docker run -d --name ns-demo nginx:alpine

# Get the container's process ID on the host
CONTAINER_PID=$(docker inspect ns-demo --format '{{.State.Pid}}')
echo "Container PID: $CONTAINER_PID"

# View the namespace file descriptor
ls -la /proc/$CONTAINER_PID/ns/net
```

To make the namespace visible to `ip netns` commands, create a symbolic link:

```bash
# Create the netns directory if it does not exist
sudo mkdir -p /var/run/netns

# Link the container's namespace so ip netns can see it
sudo ln -sf /proc/$CONTAINER_PID/ns/net /var/run/netns/ns-demo

# Now it appears in the namespace list
sudo ip netns list
```

## Inspecting a Container's Network Namespace

Once linked, you can run commands inside the namespace:

```bash
# List all interfaces in the container's namespace
sudo ip netns exec ns-demo ip addr show

# View the routing table inside the container's namespace
sudo ip netns exec ns-demo ip route show

# Check open ports inside the container namespace
sudo ip netns exec ns-demo ss -tlnp
```

Compare this with what Docker shows:

```bash
# Docker's view of the container network
docker exec ns-demo ip addr show
docker exec ns-demo ip route show
```

Both approaches show the same information. The `ip netns exec` method works even when the container does not have networking tools installed.

## How Docker Creates Network Namespaces

When Docker starts a container, the process follows these steps:

1. Create a new network namespace
2. Create a veth (virtual Ethernet) pair
3. Move one end of the veth pair into the new namespace
4. Attach the other end to the bridge (docker0 or a custom bridge)
5. Assign an IP address to the interface inside the namespace
6. Set up the default route pointing to the bridge gateway
7. Configure DNS resolution (usually 127.0.0.11)

You can replicate this manually to understand each step:

```bash
# Step 1: Create a network namespace
sudo ip netns add manual-container

# Step 2: Create a veth pair
sudo ip link add veth-host type veth peer name veth-container

# Step 3: Move one end into the namespace
sudo ip link set veth-container netns manual-container

# Step 4: Attach the host end to docker0 bridge
sudo ip link set veth-host master docker0
sudo ip link set veth-host up

# Step 5: Assign an IP inside the namespace
sudo ip netns exec manual-container ip addr add 172.17.0.100/16 dev veth-container
sudo ip netns exec manual-container ip link set veth-container up
sudo ip netns exec manual-container ip link set lo up

# Step 6: Set up the default route
sudo ip netns exec manual-container ip route add default via 172.17.0.1

# Step 7: Test connectivity
sudo ip netns exec manual-container ping -c 3 8.8.8.8
```

## Comparing Namespaces Between Containers

Inspect how different network modes affect namespaces:

```bash
# Bridge mode (default) - gets its own namespace
docker run -d --name bridge-container nginx:alpine
BRIDGE_PID=$(docker inspect bridge-container --format '{{.State.Pid}}')

# Host mode - shares the host namespace
docker run -d --name host-container --network host nginx:alpine
HOST_PID=$(docker inspect host-container --format '{{.State.Pid}}')

# Compare namespace identifiers
sudo readlink /proc/$BRIDGE_PID/ns/net
# net:[4026532456] - unique namespace

sudo readlink /proc/$HOST_PID/ns/net
# net:[4026531840] - same as the host (inode number matches)

sudo readlink /proc/1/ns/net
# net:[4026531840] - host's namespace for comparison
```

Containers sharing a network (like pods in Kubernetes):

```bash
# First container creates the namespace
docker run -d --name shared-net-a nginx:alpine

# Second container joins the first container's namespace
docker run -d --name shared-net-b --network container:shared-net-a alpine sleep 3600

# Both containers see the same interfaces
docker exec shared-net-a ip addr show eth0
docker exec shared-net-b ip addr show eth0
# Same IP address on both
```

## Namespace-Level Debugging

When Docker's high-level tools cannot explain a networking problem, drop into the namespace:

```bash
# Capture packets in a specific container's namespace
CONTAINER_PID=$(docker inspect ns-demo --format '{{.State.Pid}}')
sudo nsenter -t $CONTAINER_PID -n tcpdump -i eth0 -c 10 -n

# Check iptables rules inside the namespace
sudo nsenter -t $CONTAINER_PID -n iptables -L -n

# View connection tracking table
sudo nsenter -t $CONTAINER_PID -n conntrack -L 2>/dev/null

# Test DNS resolution from the namespace
sudo nsenter -t $CONTAINER_PID -n nslookup google.com 127.0.0.11
```

The `nsenter` command is powerful because it lets you use host tools inside the container's namespace. This is valuable when the container image does not include debugging utilities.

## Network Namespace Lifecycle

Namespaces are created when a container starts and destroyed when it exits. Watch this in action:

```bash
# Monitor namespace creation and deletion
sudo watch -n 1 'ls -la /proc/*/ns/net 2>/dev/null | wc -l'

# In another terminal, start and stop containers
docker run --rm --name lifecycle-test alpine sleep 5
```

If a container's network namespace is deleted while you have a reference to it (through `/var/run/netns/`), the reference becomes stale:

```bash
# Clean up stale namespace links
for ns in $(sudo ip netns list 2>/dev/null | awk '{print $1}'); do
    if ! sudo ip netns exec "$ns" true 2>/dev/null; then
        echo "Removing stale namespace: $ns"
        sudo rm -f /var/run/netns/$ns
    fi
done
```

## Advanced: Custom Namespace Networking

Build custom networking topologies by manipulating namespaces directly:

```bash
# Create two namespaces connected by a veth pair (direct link, no bridge)
sudo ip netns add ns-alpha
sudo ip netns add ns-beta

# Create the connecting veth pair
sudo ip link add veth-alpha type veth peer name veth-beta

# Assign each end to a namespace
sudo ip link set veth-alpha netns ns-alpha
sudo ip link set veth-beta netns ns-beta

# Configure IP addresses
sudo ip netns exec ns-alpha ip addr add 10.0.0.1/24 dev veth-alpha
sudo ip netns exec ns-alpha ip link set veth-alpha up
sudo ip netns exec ns-alpha ip link set lo up

sudo ip netns exec ns-beta ip addr add 10.0.0.2/24 dev veth-beta
sudo ip netns exec ns-beta ip link set veth-beta up
sudo ip netns exec ns-beta ip link set lo up

# Test direct connectivity
sudo ip netns exec ns-alpha ping -c 3 10.0.0.2
```

This approach lets you build topologies that Docker's network drivers do not support, such as mesh networks or ring topologies between containers.

## Performance Implications

Network namespaces add minimal overhead. The kernel handles namespace switching efficiently because it is just swapping pointer references to network stack data structures. The real performance cost comes from the virtual interfaces (veth pairs) and bridge forwarding, not from the namespace isolation itself.

Measure the overhead:

```bash
# Baseline: host-to-host loopback latency
ping -c 100 127.0.0.1 -q

# Container namespace: container-to-bridge latency
docker exec ns-demo ping -c 100 172.17.0.1 -q
```

The difference is typically 20-50 microseconds per packet, which is negligible for most applications.

## Cleanup

Remove the test resources:

```bash
# Remove containers
docker rm -f ns-demo bridge-container host-container shared-net-a shared-net-b

# Remove manual namespaces
sudo ip netns del manual-container
sudo ip netns del ns-alpha
sudo ip netns del ns-beta

# Remove stale symlinks
sudo rm -f /var/run/netns/ns-demo
```

## Conclusion

Network namespaces are the foundation of Docker container networking. Every container networking concept, from bridge networks to published ports to network isolation, builds on top of namespace isolation. Knowing how to inspect and manipulate namespaces directly gives you debugging capabilities beyond what Docker's CLI provides. Use `nsenter` and `ip netns exec` when Docker-level troubleshooting hits a wall, and you will find the root cause faster.
