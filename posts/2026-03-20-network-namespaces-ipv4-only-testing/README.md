# How to Use Network Namespaces for IPv4-Only Connectivity Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Namespaces, IPv4, Testing, Linux, Netns, Isolation, Connectivity

Description: Learn how to use Linux network namespaces to create isolated IPv4-only testing environments that simulate specific network conditions without affecting host connectivity.

---

Network namespaces provide a lightweight way to test IPv4 connectivity in isolation - simulating specific topologies, testing firewall rules, or verifying application behavior without network virtualization overhead.

## Use Cases for IPv4-Only Namespace Testing

- Test application behavior when IPv6 is unavailable
- Simulate network segmentation for security testing
- Test routing configurations before deploying to hardware
- Reproduce customer connectivity issues in isolation

## Creating an IPv4-Only Test Namespace

```bash
# Create namespace

ip netns add ipv4-test

# Bring up loopback (required for localhost connectivity)
ip netns exec ipv4-test ip link set lo up

# Verify: no external IPv6 addresses by default in new namespaces
ip netns exec ipv4-test ip -6 addr show
# (only ::1/128 on lo - the kernel adds this automatically when lo is brought up)
```

## Disabling IPv6 in the Namespace

```bash
# Disable IPv6 inside the namespace
ip netns exec ipv4-test sysctl -w net.ipv6.conf.all.disable_ipv6=1
ip netns exec ipv4-test sysctl -w net.ipv6.conf.default.disable_ipv6=1
```

## Setting Up IPv4-Only Connectivity

```bash
# Create veth pair
ip link add veth-host4 type veth peer name veth-ns4

# Move veth-ns4 into namespace
ip link set veth-ns4 netns ipv4-test

# Configure IPv4 only (no IPv6)
ip addr add 10.99.0.1/30 dev veth-host4
ip link set veth-host4 up

ip netns exec ipv4-test ip addr add 10.99.0.2/30 dev veth-ns4
ip netns exec ipv4-test ip link set veth-ns4 up
ip netns exec ipv4-test ip route add default via 10.99.0.1
```

## Testing Application Behavior in IPv4-Only Environment

```bash
# Test DNS resolution (DNS queries themselves travel over IPv4)
ip netns exec ipv4-test dig +short example.com A    # Should return IPv4
ip netns exec ipv4-test dig +short example.com AAAA  # Still returns AAAA records - DNS resolution is unaffected by local IPv6 disablement; only application connections to IPv6 addresses will fail

# Test HTTP client with IPv4 only
ip netns exec ipv4-test curl -4 http://example.com

# Test your own service
ip netns exec ipv4-test curl -4 http://10.99.0.1:8080/health
```

## Simulating Network Conditions (tc netem)

```bash
# Add latency and packet loss inside namespace
ip netns exec ipv4-test tc qdisc add dev veth-ns4 root netem \
  delay 100ms 20ms \
  loss 2%

# Test application response to network degradation
ip netns exec ipv4-test ping 10.99.0.1

# Remove netem
ip netns exec ipv4-test tc qdisc del dev veth-ns4 root
```

## Running a Server in the Namespace

```bash
# Start a Python HTTP server inside the namespace
ip netns exec ipv4-test python3 -m http.server 8080 &

# Access it from host
curl http://10.99.0.2:8080
```

## Cleanup

```bash
ip netns del ipv4-test
# veth pair is automatically deleted when namespace is removed
```

## Key Takeaways

- New network namespaces start with only a loopback interface; all other interfaces must be explicitly added.
- Disable IPv6 with `sysctl net.ipv6.conf.all.disable_ipv6=1` inside the namespace for strict IPv4-only testing.
- Use `tc netem` inside the namespace to simulate latency, loss, and jitter for resilience testing.
- Namespaces are ephemeral: they and their interfaces disappear when deleted, leaving no permanent host configuration.
