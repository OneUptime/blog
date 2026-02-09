# How to Understand Docker Bridge Network Internals

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Networking, Bridge Network, Linux, Containers, Virtual Networking

Description: Deep dive into how Docker bridge networking works internally, covering virtual interfaces, routing, and packet flow.

---

Every Docker container you run connects to a network. By default, that network is a Linux bridge called `docker0`. Most developers use Docker networking without thinking about what happens under the hood. But when containers cannot reach each other, when port conflicts arise, or when performance degrades, you need to understand the internals.

This guide takes you through the layers of Docker bridge networking, from the virtual Ethernet pairs to the routing tables that make container communication possible.

## What Is a Linux Bridge?

A Linux bridge is a virtual Layer 2 network switch implemented in the kernel. It forwards Ethernet frames between connected interfaces, just like a physical switch forwards frames between ports. Docker creates a bridge named `docker0` at installation time and connects each container to it using virtual Ethernet pairs.

Inspect the default bridge:

```bash
# View the docker0 bridge interface and its configuration
ip addr show docker0
```

Typical output:

```
4: docker0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP
    link/ether 02:42:a8:6f:3e:01 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
```

The bridge has an IP address (172.17.0.1) and acts as the default gateway for containers on this network.

## Virtual Ethernet Pairs (veth)

When Docker starts a container, it creates a virtual Ethernet pair (veth pair). Think of it as a virtual network cable with a plug on each end:

- One end goes inside the container (typically named `eth0`)
- The other end attaches to the bridge on the host

```bash
# Start a container and inspect the veth pairs
docker run -d --name bridge-test nginx:alpine

# List all veth interfaces on the host
ip link show type veth
```

You can match a container's network interface to its host-side veth:

```bash
# Get the container's interface index
docker exec bridge-test cat /sys/class/net/eth0/iflink

# Find the matching veth on the host (the number should match)
ip link show | grep "^[0-9]*:"
```

## How Packets Flow Between Containers

When Container A sends a packet to Container B, the path looks like this:

```mermaid
graph LR
    A[Container A eth0] --> VA[veth-A on host]
    VA --> B0[docker0 bridge]
    B0 --> VB[veth-B on host]
    VB --> B[Container B eth0]
```

The bridge learns MAC addresses from incoming frames and builds a forwarding table, exactly like a physical switch. View the bridge's MAC address table:

```bash
# Show the bridge forwarding database (MAC address table)
bridge fdb show br docker0
```

## Inspecting Bridge Network Details

Docker provides high-level network inspection:

```bash
# View the default bridge network configuration
docker network inspect bridge
```

This shows the subnet, gateway, connected containers, and driver options. For deeper inspection, use Linux bridge utilities:

```bash
# Install bridge utilities if not present
sudo apt-get install bridge-utils

# Show all interfaces connected to docker0
brctl show docker0

# Show the Spanning Tree Protocol state
brctl showstp docker0
```

## Creating Custom Bridge Networks

The default `docker0` bridge has limitations. Custom bridge networks add DNS resolution between containers and better isolation:

```bash
# Create a custom bridge network with specific subnet
docker network create \
  --driver bridge \
  --subnet 10.10.0.0/24 \
  --gateway 10.10.0.1 \
  --opt com.docker.network.bridge.name=custom-br0 \
  my-network
```

Verify the new bridge exists at the Linux level:

```bash
# Confirm the custom bridge was created
ip addr show custom-br0

# Show bridge details
brctl show custom-br0
```

## Container DNS on Custom Bridges

Containers on custom bridge networks get automatic DNS resolution. Docker runs an embedded DNS server at 127.0.0.11 inside each container:

```bash
# Start two containers on the custom network
docker run -d --name web --network my-network nginx:alpine
docker run -d --name client --network my-network alpine sleep 3600

# Resolve the web container by name from the client
docker exec client nslookup web
# Server: 127.0.0.11
# Name: web
# Address: 10.10.0.2
```

On the default bridge, DNS resolution does not work. Containers must use IP addresses or legacy `--link` flags (which are deprecated).

## IP Address Management (IPAM)

Docker manages IP addresses for containers using its built-in IPAM driver. Each network has a subnet, and Docker assigns addresses from that pool:

```bash
# See how addresses are allocated on a network
docker network inspect my-network --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'
```

You can also assign static IPs:

```bash
# Run a container with a specific IP address
docker run -d \
  --name static-web \
  --network my-network \
  --ip 10.10.0.100 \
  nginx:alpine
```

## Port Publishing and NAT

When you publish a port with `-p 8080:80`, Docker does two things:

1. Creates an iptables DNAT rule to redirect host port 8080 to the container's IP on port 80
2. Starts a docker-proxy process that listens on the host port

```bash
# Start a container with a published port
docker run -d --name web -p 8080:80 nginx:alpine

# View the iptables NAT rules Docker created
sudo iptables -t nat -L DOCKER -n -v

# Check the docker-proxy process
ps aux | grep docker-proxy
```

The iptables rule handles most traffic. The docker-proxy covers edge cases like hairpin NAT (when a container tries to reach itself through the published port).

## Inter-Container Communication (ICC)

By default, containers on the same bridge can communicate freely. You can disable this:

```bash
# Create a network with inter-container communication disabled
docker network create \
  --driver bridge \
  --opt com.docker.network.bridge.enable_icc=false \
  isolated-network
```

With ICC disabled, containers on the same bridge cannot talk to each other unless explicit port mappings allow it. This adds a layer of isolation for security-sensitive workloads.

## MTU Configuration

The Maximum Transmission Unit (MTU) affects packet fragmentation and performance. Docker defaults to 1500 bytes, but VPN tunnels and overlay networks may require smaller MTUs:

```bash
# Create a network with a custom MTU value
docker network create \
  --driver bridge \
  --opt com.docker.network.driver.mtu=1400 \
  vpn-network
```

Verify the MTU inside a container:

```bash
# Check the MTU from inside a container
docker run --rm --network vpn-network alpine ip link show eth0
```

## Debugging Bridge Network Issues

When containers cannot communicate, work through this checklist:

```bash
# 1. Verify the container is attached to the expected network
docker inspect bridge-test --format '{{json .NetworkSettings.Networks}}'

# 2. Check if the bridge interface is UP on the host
ip link show docker0

# 3. Test connectivity from inside the container
docker exec bridge-test ping -c 3 172.17.0.1

# 4. Check iptables rules for dropped packets
sudo iptables -L FORWARD -n -v | grep DROP

# 5. Watch packets on the bridge with tcpdump
sudo tcpdump -i docker0 -n -c 20
```

## Bridge Network Performance

Bridge networking adds minimal overhead for most workloads. The veth pair and bridge forwarding add a few microseconds of latency per packet. For latency-sensitive applications, consider these alternatives:

- **Host networking** (`--network host`) eliminates the bridge entirely
- **Macvlan networks** give containers direct access to the physical network
- **IPVLAN networks** share the host's MAC address for simpler L2 setups

Benchmark the bridge overhead:

```bash
# Run iperf3 server in one container
docker run -d --name iperf-server --network my-network networkstatic/iperf3 -s

# Run iperf3 client in another container on the same network
docker run --rm --network my-network networkstatic/iperf3 -c iperf-server -t 10
```

## Cleanup

Remove test resources after experimenting:

```bash
# Stop and remove all test containers
docker rm -f bridge-test web client static-web iperf-server

# Remove the custom network
docker network rm my-network isolated-network vpn-network
```

## Conclusion

Docker bridge networking is built on well-understood Linux primitives: bridges, veth pairs, iptables rules, and kernel routing. Understanding these internals helps you diagnose connectivity issues, optimize performance, and make informed decisions about which Docker network driver to use. Most applications work fine with bridge networking. When they do not, knowing the packet flow from container to bridge to host gives you the tools to figure out why.
