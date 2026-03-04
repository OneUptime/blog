# How to Configure Network Namespaces for Isolated Networking on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Networking

Description: Step-by-step guide on configure network namespaces for isolated networking on rhel 9 with practical examples and commands.

---

Network namespaces on RHEL 9 provide isolated networking environments for testing and containerization.

## Create a Network Namespace

```bash
sudo ip netns add test-ns
```

## List Namespaces

```bash
ip netns list
```

## Run Commands in a Namespace

```bash
sudo ip netns exec test-ns ip addr show
sudo ip netns exec test-ns ip link show
```

## Connect Namespaces with veth Pairs

```bash
# Create veth pair
sudo ip link add veth0 type veth peer name veth1

# Move one end to the namespace
sudo ip link set veth1 netns test-ns

# Configure addresses
sudo ip addr add 10.0.0.1/24 dev veth0
sudo ip link set veth0 up

sudo ip netns exec test-ns ip addr add 10.0.0.2/24 dev veth1
sudo ip netns exec test-ns ip link set veth1 up
sudo ip netns exec test-ns ip link set lo up
```

## Test Connectivity

```bash
ping -c 4 10.0.0.2
sudo ip netns exec test-ns ping -c 4 10.0.0.1
```

## Provide Internet Access to Namespace

```bash
# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# Add NAT rule
sudo iptables -t nat -A POSTROUTING -s 10.0.0.0/24 -o eth0 -j MASQUERADE

# Add default route in namespace
sudo ip netns exec test-ns ip route add default via 10.0.0.1
```

## Delete a Namespace

```bash
sudo ip netns delete test-ns
```

## Conclusion

Network namespaces on RHEL 9 provide isolated networking for testing, development, and container implementations. Use veth pairs to connect namespaces and configure routing for internet access.

