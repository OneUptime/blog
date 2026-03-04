# How to Use tc (Traffic Control) with Docker Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Traffic Control, tc, Networking, QoS, Linux, Containers

Description: Shape, limit, and simulate network conditions for Docker containers using Linux tc (traffic control) with practical examples.

---

Linux tc (traffic control) lets you shape, schedule, and police network traffic at the kernel level. When applied to Docker containers, tc gives you fine-grained control over bandwidth, latency, packet loss, and jitter. This is useful for two main scenarios: enforcing bandwidth limits in production and simulating degraded network conditions during testing.

This guide covers both use cases with real tc commands and Docker configurations you can apply immediately.

## How tc Works with Docker

Docker containers use virtual Ethernet (veth) pairs. Each container has a veth interface on the host side. You apply tc rules to this host-side veth interface to control the container's traffic.

```bash
# Start a test container
docker run -d --name tc-demo nginx:alpine

# Find the container's veth interface on the host
CONTAINER_PID=$(docker inspect tc-demo --format '{{.State.Pid}}')
VETH_INDEX=$(sudo nsenter -t $CONTAINER_PID -n cat /sys/class/net/eth0/iflink)
VETH_NAME=$(ip link show | grep "^${VETH_INDEX}:" | awk '{print $2}' | cut -d@ -f1)
echo "Container veth: $VETH_NAME"
```

Alternatively, find the veth by matching the container's interface:

```bash
# Another method: search veth interfaces by peer index
PEER_IFINDEX=$(docker exec tc-demo cat /sys/class/net/eth0/ifindex)
ip link show | grep -B1 "link-netns"
```

## Bandwidth Limiting

Limit a container's outgoing bandwidth using the tbf (Token Bucket Filter) qdisc:

```bash
# Limit outgoing bandwidth to 10 Mbps with a 32KB buffer
sudo tc qdisc add dev $VETH_NAME root tbf rate 10mbit burst 32kbit latency 400ms
```

Breaking down the parameters:

- `rate 10mbit` - Maximum sustained bandwidth
- `burst 32kbit` - Maximum burst size above the rate
- `latency 400ms` - Maximum time a packet can wait in the queue

Verify the rule is active:

```bash
# Show tc rules on the container's veth
sudo tc qdisc show dev $VETH_NAME
```

Test the bandwidth limit:

```bash
# Install iperf3 server on another machine, then test from the container
docker exec tc-demo apk add iperf3
docker exec tc-demo iperf3 -c <server-ip> -t 10
# Should show approximately 10 Mbps throughput
```

## Simulating Network Latency

Add artificial latency using the netem (Network Emulator) qdisc:

```bash
# Add 100ms latency to all outgoing packets
sudo tc qdisc add dev $VETH_NAME root netem delay 100ms
```

Add latency with jitter (variation) for more realistic simulation:

```bash
# Add 100ms delay with 20ms jitter and normal distribution
sudo tc qdisc add dev $VETH_NAME root netem delay 100ms 20ms distribution normal
```

Verify the latency:

```bash
# Ping from the container to measure added latency
docker exec tc-demo ping -c 5 8.8.8.8
# RTT should be approximately 100ms higher than baseline
```

## Simulating Packet Loss

Drop a percentage of packets to simulate unreliable networks:

```bash
# Drop 5% of outgoing packets randomly
sudo tc qdisc add dev $VETH_NAME root netem loss 5%

# Drop with a correlation (packets tend to be lost in bursts)
sudo tc qdisc add dev $VETH_NAME root netem loss 5% 25%
```

The correlation parameter (25%) means if a packet was lost, the next packet has a 25% higher chance of also being lost. This simulates bursty packet loss more realistically than pure random loss.

## Combining Multiple Conditions

Real network problems involve multiple issues simultaneously. Chain netem conditions together:

```bash
# Simulate a poor mobile connection: latency + jitter + packet loss + bandwidth limit
sudo tc qdisc add dev $VETH_NAME root handle 1: netem delay 150ms 30ms loss 2%
sudo tc qdisc add dev $VETH_NAME parent 1: handle 2: tbf rate 3mbit burst 32kbit latency 400ms
```

This creates a parent netem qdisc for latency/loss and a child tbf qdisc for bandwidth shaping.

## Simulating Network Conditions by Profile

Create scripts for common network profiles:

```bash
#!/bin/bash
# tc-profiles.sh - Apply network condition profiles to Docker containers

CONTAINER=$1
PROFILE=$2

# Find the container's veth interface
CONTAINER_PID=$(docker inspect $CONTAINER --format '{{.State.Pid}}')
VETH_INDEX=$(sudo nsenter -t $CONTAINER_PID -n cat /sys/class/net/eth0/iflink)
VETH_NAME=$(ip link show | grep "^${VETH_INDEX}:" | awk '{print $2}' | cut -d@ -f1)

# Remove any existing rules
sudo tc qdisc del dev $VETH_NAME root 2>/dev/null

case $PROFILE in
    "4g-good")
        # Good 4G connection
        sudo tc qdisc add dev $VETH_NAME root handle 1: netem delay 40ms 10ms
        sudo tc qdisc add dev $VETH_NAME parent 1: tbf rate 30mbit burst 64kbit latency 300ms
        ;;
    "4g-poor")
        # Poor 4G connection
        sudo tc qdisc add dev $VETH_NAME root handle 1: netem delay 150ms 40ms loss 1%
        sudo tc qdisc add dev $VETH_NAME parent 1: tbf rate 5mbit burst 32kbit latency 400ms
        ;;
    "3g")
        # 3G connection
        sudo tc qdisc add dev $VETH_NAME root handle 1: netem delay 300ms 100ms loss 2%
        sudo tc qdisc add dev $VETH_NAME parent 1: tbf rate 1mbit burst 16kbit latency 500ms
        ;;
    "satellite")
        # Satellite internet (high latency, decent bandwidth)
        sudo tc qdisc add dev $VETH_NAME root handle 1: netem delay 600ms 50ms loss 0.5%
        sudo tc qdisc add dev $VETH_NAME parent 1: tbf rate 20mbit burst 64kbit latency 800ms
        ;;
    "lossy")
        # Very lossy network for stress testing
        sudo tc qdisc add dev $VETH_NAME root netem loss 10% 50% delay 50ms 20ms
        ;;
    "clear")
        # Remove all traffic shaping
        echo "All tc rules removed from $VETH_NAME"
        ;;
    *)
        echo "Usage: $0 <container-name> <4g-good|4g-poor|3g|satellite|lossy|clear>"
        exit 1
        ;;
esac

echo "Applied '$PROFILE' profile to container '$CONTAINER' (veth: $VETH_NAME)"
```

Use it:

```bash
# Apply the 3G profile to a container
chmod +x tc-profiles.sh
sudo ./tc-profiles.sh tc-demo 3g

# Clear all shaping
sudo ./tc-profiles.sh tc-demo clear
```

## Applying tc to Docker Networks

Shape traffic for an entire Docker network instead of individual containers:

```bash
# Find the bridge interface for a Docker network
BRIDGE=$(docker network inspect my-network --format '{{index .Options "com.docker.network.bridge.name"}}')
# If no custom name, find it by network ID
BRIDGE="br-$(docker network inspect my-network --format '{{.Id}}' | cut -c1-12)"

# Apply bandwidth limit to all traffic on the network
sudo tc qdisc add dev $BRIDGE root tbf rate 100mbit burst 128kbit latency 400ms
```

## Using tc Inside Containers

You can also apply tc from inside a container, but it requires the NET_ADMIN capability:

```bash
# Run a container with NET_ADMIN capability
docker run -d --name tc-inside --cap-add=NET_ADMIN nginx:alpine

# Install tc tools inside the container
docker exec tc-inside apk add iproute2

# Apply tc rules from inside the container
docker exec tc-inside tc qdisc add dev eth0 root netem delay 100ms
```

## Docker Compose with Traffic Shaping

Automate tc rules with a helper container:

```yaml
# docker-compose.yml - Application with traffic shaping for testing
services:
  app:
    image: my-web-app:latest
    networks:
      - test-net
    cap_add:
      - NET_ADMIN

  # Apply tc rules on startup
  traffic-shaper:
    image: alpine:latest
    network_mode: "service:app"
    cap_add:
      - NET_ADMIN
    entrypoint: >
      sh -c "apk add iproute2 &&
             tc qdisc add dev eth0 root netem delay 100ms 20ms loss 1% &&
             echo 'Traffic shaping applied' &&
             sleep infinity"

networks:
  test-net:
    driver: bridge
```

## Monitoring tc Rules

Inspect and monitor traffic shaping in real-time:

```bash
# Show detailed statistics for tc rules
sudo tc -s qdisc show dev $VETH_NAME

# Show class statistics
sudo tc -s class show dev $VETH_NAME

# Watch statistics update in real-time
watch -n 1 "sudo tc -s qdisc show dev $VETH_NAME"
```

The statistics show sent bytes, sent packets, dropped packets, and overlimits (packets that exceeded the rate and were delayed).

## Removing tc Rules

Clean up when done testing:

```bash
# Remove all tc rules from the interface
sudo tc qdisc del dev $VETH_NAME root

# Verify rules are cleared
sudo tc qdisc show dev $VETH_NAME
# Should show the default pfifo_fast or fq_codel qdisc
```

## Use Case: Testing Application Resilience

A practical example - test how your application handles a degrading network:

```bash
# Start with good conditions
sudo tc qdisc add dev $VETH_NAME root netem delay 10ms

# Run your test suite
sleep 30

# Gradually degrade: add more latency
sudo tc qdisc change dev $VETH_NAME root netem delay 100ms

sleep 30

# Add packet loss
sudo tc qdisc change dev $VETH_NAME root netem delay 100ms loss 5%

sleep 30

# Simulate near-complete failure
sudo tc qdisc change dev $VETH_NAME root netem delay 500ms loss 30%

# Observe how your application handles each phase
```

## Conclusion

tc gives you precise control over network conditions for Docker containers. Use it in production to enforce bandwidth limits and QoS policies. Use it in testing to verify that your applications handle real-world network degradation gracefully. The commands are straightforward: netem for latency, loss, and jitter; tbf for bandwidth shaping. Apply them to the container's host-side veth interface, and the container experiences the simulated conditions transparently. Combined with automated test scripts, tc turns network resilience testing from guesswork into a repeatable practice.
