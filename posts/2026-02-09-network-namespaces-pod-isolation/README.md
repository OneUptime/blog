# How to Use Network Namespaces for Pod Isolation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Network Namespaces, Linux, Isolation, Networking

Description: Master Linux network namespaces to understand how Kubernetes isolates pod networking, including creating custom namespaces, configuring interfaces, and troubleshooting namespace-related issues.

---

Network namespaces are the Linux kernel feature that enables network isolation in containers and Kubernetes pods. Each namespace has its own network stack including interfaces, routing tables, firewall rules, and socket state. This isolation is what allows pods to have independent IP addresses and network configurations while running on the same physical host.

Understanding network namespaces is fundamental to debugging Kubernetes networking. When you troubleshoot pod connectivity, you're actually working with namespace isolation. Tools like kubectl exec enter a pod's namespace, CNI plugins create and configure namespaces, and networking issues often stem from incorrect namespace setup or routing between namespaces.

## Creating and Managing Network Namespaces

Create a simple network namespace:

```bash
# Create a new network namespace
ip netns add blue

# List all namespaces
ip netns list

# Execute command in namespace
ip netns exec blue ip addr show

# Only loopback interface exists, and it's DOWN
# 1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN
```

Each namespace starts with only a loopback interface in DOWN state. You must explicitly configure interfaces and bring them up.

## Configuring Interfaces in Namespaces

Set up the loopback interface:

```bash
# Enter namespace and configure loopback
ip netns exec blue ip link set lo up
ip netns exec blue ip addr show lo

# Test loopback connectivity
ip netns exec blue ping -c 3 127.0.0.1
```

## Connecting Namespaces with veth Pairs

Veth (virtual ethernet) pairs act like a virtual network cable connecting two namespaces:

```bash
# Create two namespaces
ip netns add red
ip netns add green

# Create veth pair
ip link add veth-red type veth peer name veth-green

# Move one end to red namespace
ip link set veth-red netns red

# Move other end to green namespace
ip link set veth-green netns green

# Configure IP addresses
ip netns exec red ip addr add 10.0.1.1/24 dev veth-red
ip netns exec green ip addr add 10.0.1.2/24 dev veth-green

# Bring interfaces up
ip netns exec red ip link set veth-red up
ip netns exec red ip link set lo up
ip netns exec green ip link set veth-green up
ip netns exec green ip link set lo up

# Test connectivity
ip netns exec red ping -c 3 10.0.1.2
ip netns exec green ping -c 3 10.0.1.1
```

## Connecting Namespace to Host Network

Use a bridge to connect namespace to host:

```bash
# Create namespace
ip netns add container1

# Create bridge on host
ip link add br0 type bridge
ip link set br0 up
ip addr add 10.0.2.1/24 dev br0

# Create veth pair
ip link add veth-container type veth peer name veth-host

# Move container end to namespace
ip link set veth-container netns container1

# Attach host end to bridge
ip link set veth-host master br0
ip link set veth-host up

# Configure container interface
ip netns exec container1 ip addr add 10.0.2.10/24 dev veth-container
ip netns exec container1 ip link set veth-container up
ip netns exec container1 ip link set lo up

# Add default route in container
ip netns exec container1 ip route add default via 10.0.2.1

# Test connectivity to host
ip netns exec container1 ping -c 3 10.0.2.1

# Enable IP forwarding on host
sysctl -w net.ipv4.ip_forward=1

# Add NAT for external connectivity
iptables -t nat -A POSTROUTING -s 10.0.2.0/24 -j MASQUERADE

# Test external connectivity
ip netns exec container1 ping -c 3 8.8.8.8
```

## Understanding Pod Network Namespaces

View Kubernetes pod namespaces:

```bash
# Find pod container ID
CONTAINER_ID=$(kubectl get pod nginx -o jsonpath='{.status.containerStatuses[0].containerID}' | cut -d'/' -f3)

# Get PID of container
PID=$(crictl inspect $CONTAINER_ID | jq -r '.info.pid')

# View network namespace
ls -l /proc/$PID/ns/net

# Enter pod's network namespace
nsenter -t $PID -n ip addr show

# View pod's routing table
nsenter -t $PID -n ip route show

# View pod's iptables rules (if any)
nsenter -t $PID -n iptables -L -n
```

## Debugging with nsenter

nsenter lets you enter a namespace for debugging:

```bash
# Enter all namespaces of a process
nsenter -t $PID -a /bin/bash

# Enter only network namespace
nsenter -t $PID -n /bin/bash

# Common debugging commands in namespace:
ip addr show
ip route show
ip link show
iptables -L -n
netstat -tunlp
ss -tunlp
tcpdump -i eth0
```

## Finding Orphaned Namespaces

Kubernetes sometimes leaves orphaned namespaces:

```bash
# List all network namespaces
ip netns list

# List namespaces in /var/run/netns
ls -l /var/run/netns/

# Find namespaces from running containers
for pid in $(ps aux | grep containerd | awk '{print $2}'); do
  ls -l /proc/$pid/ns/net 2>/dev/null
done

# Clean up orphaned namespace
ip netns delete orphaned-ns
```

## Namespace Resource Limits

Set namespace-specific resource limits:

```bash
# Create namespace with traffic control
ip netns add limited

# Add veth pair
ip link add veth-limited type veth peer name veth-limited-host
ip link set veth-limited netns limited

# Configure addresses
ip netns exec limited ip addr add 10.0.3.10/24 dev veth-limited
ip netns exec limited ip link set veth-limited up
ip netns exec limited ip link set lo up

ip addr add 10.0.3.1/24 dev veth-limited-host
ip link set veth-limited-host up

# Apply bandwidth limit (10 Mbps)
ip netns exec limited tc qdisc add dev veth-limited root tbf rate 10mbit burst 32kbit latency 400ms

# Test bandwidth
# From limited namespace
ip netns exec limited iperf3 -c 10.0.3.1
```

## Namespace Routing and Policies

Configure complex routing in namespaces:

```bash
# Create namespace
ip netns add router

# Add multiple interfaces
ip link add veth-wan type veth peer name veth-wan-ns
ip link add veth-lan type veth peer name veth-lan-ns

ip link set veth-wan-ns netns router
ip link set veth-lan-ns netns router

# Configure WAN side
ip addr add 192.168.1.1/24 dev veth-wan
ip link set veth-wan up

ip netns exec router ip addr add 192.168.1.2/24 dev veth-wan-ns
ip netns exec router ip link set veth-wan-ns up

# Configure LAN side
ip addr add 10.0.10.1/24 dev veth-lan
ip link set veth-lan up

ip netns exec router ip addr add 10.0.10.254/24 dev veth-lan-ns
ip netns exec router ip link set veth-lan-ns up
ip netns exec router ip link set lo up

# Enable forwarding in router namespace
ip netns exec router sysctl -w net.ipv4.ip_forward=1

# Add routes
ip netns exec router ip route add default via 192.168.1.1

# Add NAT in router namespace
ip netns exec router iptables -t nat -A POSTROUTING -s 10.0.10.0/24 -o veth-wan-ns -j MASQUERADE
```

## Monitoring Namespace Network Activity

Monitor network activity in namespaces:

```bash
# Watch interface statistics
ip netns exec container1 watch -n 1 'ip -s link show'

# Capture packets in namespace
ip netns exec container1 tcpdump -i veth-container -w capture.pcap

# Monitor connections
ip netns exec container1 ss -tunap

# View socket statistics
ip netns exec container1 ss -s

# Track network namespaces system-wide
watch -n 1 'lsns -t net'
```

## Troubleshooting Namespace Issues

### Problem: Can't reach pod from host

```bash
# Find pod namespace
kubectl get pod nginx -o wide
NODE=$(kubectl get pod nginx -o jsonpath='{.spec.nodeName}')

# SSH to node
ssh $NODE

# Get pod IP
POD_IP=$(kubectl get pod nginx -o jsonpath='{.status.podIP}')

# Check if route exists on host
ip route show | grep $POD_IP

# If missing, check CNI configuration
cat /etc/cni/net.d/*.conf

# Check if pod namespace exists
PID=$(crictl inspect $(kubectl get pod nginx -o jsonpath='{.status.containerStatuses[0].containerID}' | cut -d'/' -f3) | jq -r '.info.pid')
ls -l /proc/$PID/ns/net
```

### Problem: Namespace interface not working

```bash
# Check if interface is up
ip netns exec container1 ip link show

# Verify IP configuration
ip netns exec container1 ip addr show

# Test loopback
ip netns exec container1 ping -c 3 127.0.0.1

# Check routing table
ip netns exec container1 ip route show

# Verify connectivity to gateway
ip netns exec container1 ping -c 3 <gateway-ip>

# Check veth peer exists
ip link show | grep veth
```

### Problem: DNS not working in namespace

```bash
# Check DNS configuration
ip netns exec container1 cat /etc/resolv.conf

# Test DNS resolution
ip netns exec container1 nslookup google.com

# If DNS server is in different namespace, check routing
ip netns exec container1 ping -c 3 <dns-server-ip>

# Verify DNS port is accessible
ip netns exec container1 nc -vz <dns-server-ip> 53
```

## Best Practices

1. **Clean up namespaces**: Delete unused namespaces to avoid leaks
2. **Use nsenter for debugging**: Easier than kubectl exec for low-level issues
3. **Monitor namespace count**: High counts indicate leaks
4. **Set proper MTU**: Match physical network MTU minus encapsulation
5. **Enable IP forwarding**: Required for routing between namespaces
6. **Use unique namespace names**: Avoid conflicts
7. **Document namespace purpose**: Track what each namespace is for

Network namespaces provide the isolation foundation for Kubernetes networking. Understanding how to create, configure, and troubleshoot namespaces is essential for mastering container networking and diagnosing complex connectivity issues.
