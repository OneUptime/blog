# How to Limit Network Bandwidth for Docker Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Networking, Bandwidth, Traffic Shaping, DevOps, Containers

Description: Learn how to limit and control network bandwidth for Docker containers using tc, Docker plugins, and proxy-based throttling approaches.

---

Docker does not include a built-in bandwidth limiting flag like it does for CPU and memory. If you want to throttle a container's network throughput, you need to use Linux traffic control (tc), network plugins, or proxy-based approaches. This guide covers all the practical methods to control how much bandwidth your containers consume.

## Why Limit Bandwidth?

Bandwidth limiting is useful in several scenarios:

- **Testing:** Simulate slow network conditions to see how your application handles them.
- **Fair sharing:** Prevent one container from consuming all available bandwidth on a shared host.
- **Cost control:** On cloud instances with metered bandwidth, throttling prevents runaway data transfer costs.
- **Compliance:** Some environments require traffic shaping for regulatory reasons.

## Method 1: Using tc (Traffic Control) Inside the Container

The Linux `tc` command is the most direct way to shape traffic. You can run it inside a container if the container has the `NET_ADMIN` capability.

Start a container with `NET_ADMIN` capability:

```bash
# Start an Ubuntu container with network admin capabilities
docker run -d \
  --name throttled-app \
  --cap-add NET_ADMIN \
  ubuntu:22.04 \
  sleep infinity
```

Now apply a bandwidth limit using tc inside the container:

```bash
# Limit outbound bandwidth to 1 Mbit/s on eth0
docker exec throttled-app tc qdisc add dev eth0 root tbf \
  rate 1mbit burst 32kbit latency 400ms
```

This command adds a Token Bucket Filter (tbf) to the container's eth0 interface:
- `rate 1mbit` sets the maximum throughput
- `burst 32kbit` allows short bursts above the rate limit
- `latency 400ms` sets the maximum time a packet can wait in the queue

Test the limit:

```bash
# Install curl and test download speed
docker exec throttled-app apt-get update && docker exec throttled-app apt-get install -y curl
docker exec throttled-app curl -o /dev/null -w "Speed: %{speed_download} bytes/sec\n" \
  http://speedtest.tele2.net/10MB.zip
```

The download speed should be approximately 125KB/s (1 Mbit/s = 125 KBytes/s).

To remove the limit:

```bash
# Remove the bandwidth restriction
docker exec throttled-app tc qdisc del dev eth0 root
```

## Method 2: Applying tc from the Host

You do not have to grant `NET_ADMIN` to the container. Instead, apply tc rules from the host on the container's virtual ethernet interface.

Find the container's veth interface on the host:

```bash
# Get the container's PID
PID=$(docker inspect --format '{{.State.Pid}}' throttled-app)

# Find the interface index inside the container's network namespace
IFINDEX=$(nsenter -t $PID -n ip link show eth0 | head -1 | awk -F: '{print $1}')

# Find the matching veth interface on the host
VETH=$(ip link | grep "if${IFINDEX}:" | awk -F: '{print $2}' | tr -d ' ')
echo "Host veth interface: $VETH"
```

Apply bandwidth limits on the host side:

```bash
# Limit bandwidth on the host's veth interface (controls container's inbound)
sudo tc qdisc add dev $VETH root tbf \
  rate 5mbit burst 64kbit latency 400ms
```

This approach is more secure because the container does not need elevated capabilities.

## Method 3: Using Wondershaper in a Container

Wondershaper is a simpler wrapper around tc. You can install and use it inside a container:

```bash
# Start a container with NET_ADMIN for traffic shaping
docker run -d --name shaped-app --cap-add NET_ADMIN ubuntu:22.04 sleep infinity

# Install wondershaper
docker exec shaped-app apt-get update
docker exec shaped-app apt-get install -y wondershaper

# Limit eth0 to 1024 Kbps download and 512 Kbps upload
docker exec shaped-app wondershaper eth0 1024 512
```

To remove the limit:

```bash
# Clear the wondershaper rules
docker exec shaped-app wondershaper clear eth0
```

## Method 4: Using Docker Compose with a tc Entrypoint

You can bake bandwidth limits into a Docker Compose setup by running tc commands at container startup:

```yaml
# docker-compose.yml with bandwidth limiting
services:
  app:
    image: my-app:latest
    cap_add:
      - NET_ADMIN
    entrypoint: >
      sh -c "
        tc qdisc add dev eth0 root tbf rate 10mbit burst 64kbit latency 400ms;
        exec my-app-binary
      "
```

The `exec` at the end replaces the shell process with the application, so the app runs as PID 1 and receives signals properly.

## Method 5: Simulating Network Conditions with netem

For testing purposes, you might want to simulate more than just bandwidth limits. The `netem` (Network Emulation) qdisc lets you add latency, packet loss, and jitter.

Add 100ms of latency to a container's network:

```bash
# Add 100ms latency with 10ms jitter to the container
docker exec throttled-app tc qdisc add dev eth0 root netem \
  delay 100ms 10ms
```

Combine bandwidth limiting with latency:

```bash
# First add the netem qdisc for latency
docker exec throttled-app tc qdisc add dev eth0 root handle 1: netem \
  delay 50ms 10ms

# Then add tbf as a child qdisc for bandwidth limiting
docker exec throttled-app tc qdisc add dev eth0 parent 1:1 handle 10: tbf \
  rate 1mbit burst 32kbit latency 400ms
```

Simulate packet loss:

```bash
# Drop 5% of packets randomly
docker exec throttled-app tc qdisc add dev eth0 root netem loss 5%
```

Simulate a terrible mobile connection:

```bash
# Simulate 3G-like conditions: slow, high latency, some packet loss
docker exec throttled-app tc qdisc add dev eth0 root handle 1: netem \
  delay 200ms 50ms loss 2%
docker exec throttled-app tc qdisc add dev eth0 parent 1:1 handle 10: tbf \
  rate 384kbit burst 16kbit latency 400ms
```

## Method 6: Using Pumba for Container Network Chaos

Pumba is a chaos testing tool for Docker that can add network delays and bandwidth limits without manual tc commands:

```bash
# Install pumba
docker pull gaiaadm/pumba

# Add 500ms delay to the target container's network for 60 seconds
docker run -d \
  --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba netem \
  --duration 60s \
  delay --time 500 \
  throttled-app

# Limit bandwidth using pumba with rate control
docker run -d \
  --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba netem \
  --duration 120s \
  rate --rate 1mbit \
  throttled-app
```

## Verifying Bandwidth Limits

Always verify your limits are working. Here are several ways to test:

```bash
# Simple download speed test
docker exec throttled-app curl -o /dev/null -w "Download: %{speed_download} B/s\n" \
  http://speedtest.tele2.net/1MB.zip

# Use iperf3 for accurate bandwidth measurement
# Start an iperf3 server in one container
docker run -d --name iperf-server --network test-net networkstatic/iperf3 -s

# Run an iperf3 client from the throttled container
docker exec throttled-app apt-get install -y iperf3
docker exec throttled-app iperf3 -c iperf-server -t 10
```

## Monitoring Bandwidth Usage

View current tc rules on a container:

```bash
# Show all queueing disciplines on the container's interface
docker exec throttled-app tc qdisc show dev eth0

# Show detailed statistics for the tc rules
docker exec throttled-app tc -s qdisc show dev eth0
```

The statistics output shows how many packets were sent, dropped, and how many bytes passed through each qdisc.

## Per-Container Bandwidth Script

Here is a reusable script to apply bandwidth limits to any container:

```bash
#!/bin/bash
# limit-bandwidth.sh - Apply bandwidth limit to a Docker container
# Usage: ./limit-bandwidth.sh <container_name> <rate> [burst] [latency]

CONTAINER=$1
RATE=${2:-"10mbit"}
BURST=${3:-"64kbit"}
LATENCY=${4:-"400ms"}

if [ -z "$CONTAINER" ]; then
    echo "Usage: $0 <container_name> <rate> [burst] [latency]"
    echo "Example: $0 my-app 5mbit 32kbit 400ms"
    exit 1
fi

# Apply the bandwidth limit inside the container
docker exec "$CONTAINER" tc qdisc replace dev eth0 root tbf \
  rate "$RATE" burst "$BURST" latency "$LATENCY"

echo "Bandwidth limit applied to $CONTAINER: rate=$RATE burst=$BURST latency=$LATENCY"
```

Make it executable and use it:

```bash
chmod +x limit-bandwidth.sh
./limit-bandwidth.sh my-app 5mbit
```

## Summary

Docker does not offer a native bandwidth limiting flag, but Linux provides plenty of tools to fill the gap. Use `tc` with Token Bucket Filter for straightforward rate limiting. Use `netem` for simulating realistic network conditions in testing. Apply limits from the host side if you do not want to grant `NET_ADMIN` to containers. For chaos testing, Pumba wraps the complexity of tc in a friendlier interface. Whichever method you choose, always verify with actual bandwidth measurements.
