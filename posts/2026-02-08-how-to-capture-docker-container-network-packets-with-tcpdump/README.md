# How to Capture Docker Container Network Packets with tcpdump

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Networking, tcpdump, Debugging, Containers, DevOps

Description: Learn how to capture and analyze network packets from Docker containers using tcpdump for troubleshooting and debugging.

---

When network communication between Docker containers breaks, logs alone rarely tell the full story. You need to see what is actually happening on the wire. Packet capture with tcpdump lets you inspect every TCP handshake, DNS query, HTTP request, and malformed packet that flows through a container's network interface. This guide covers multiple approaches to capturing packets from Docker containers.

## Method 1: Running tcpdump Inside the Container

The simplest approach is to run tcpdump directly inside the target container. This works if the container's image includes tcpdump or if you can install it.

Install and run tcpdump in a running container:

```bash
# Install tcpdump in a Debian/Ubuntu-based container
docker exec my-app apt-get update && docker exec my-app apt-get install -y tcpdump

# Capture all packets on eth0 inside the container
docker exec my-app tcpdump -i eth0 -n
```

The `-n` flag prevents DNS resolution of IP addresses, which speeds up the output and avoids generating extra DNS traffic.

Capture only HTTP traffic:

```bash
# Capture only TCP traffic on port 80 (HTTP)
docker exec my-app tcpdump -i eth0 -n 'tcp port 80'
```

Save the capture to a file for later analysis in Wireshark:

```bash
# Write packets to a pcap file inside the container
docker exec my-app tcpdump -i eth0 -n -w /tmp/capture.pcap -c 1000

# Copy the capture file to the host
docker cp my-app:/tmp/capture.pcap ./capture.pcap
```

The `-c 1000` flag stops capture after 1000 packets. Without it, tcpdump runs until you press Ctrl+C.

## Method 2: Using a Sidecar Container

Many production images do not include tcpdump and you should not install packages in running production containers. Instead, attach a separate "sidecar" container that shares the target container's network namespace.

```bash
# Attach a tcpdump sidecar to the target container's network
docker run --rm -it \
  --network container:my-app \
  nicolaka/netshoot \
  tcpdump -i eth0 -n
```

The `nicolaka/netshoot` image is a purpose-built networking troubleshooting image that includes tcpdump, curl, nslookup, traceroute, and dozens of other diagnostic tools. By using `--network container:my-app`, the sidecar shares the exact same network interfaces as the target container.

This approach has major advantages:
- No changes to the running container
- No package installation needed
- The sidecar can be removed when debugging is complete
- Works with minimal and distroless images

Filter for specific traffic in the sidecar:

```bash
# Capture only DNS queries (UDP port 53) from the target container
docker run --rm -it \
  --network container:my-app \
  nicolaka/netshoot \
  tcpdump -i eth0 -n 'udp port 53'
```

## Method 3: Capturing from the Host

Every container's network interface has a corresponding virtual ethernet (veth) pair on the host. You can capture packets on the host side.

Find the container's veth interface:

```bash
# Get the PID of the container's main process
PID=$(docker inspect --format '{{.State.Pid}}' my-app)

# Find the interface index from inside the container's namespace
IFLINK=$(nsenter -t $PID -n cat /sys/class/net/eth0/iflink)

# Find the matching veth on the host
VETH=$(ip link | grep "^${IFLINK}:" | awk -F'[ @]' '{print $2}')
echo "Capture on host interface: $VETH"
```

Now capture packets on that interface:

```bash
# Capture packets on the container's veth interface from the host
sudo tcpdump -i $VETH -n -w container-traffic.pcap
```

This method does not require any access to the container at all. It works even if the container runs as a non-root user with no shell.

## Method 4: Capturing on a Docker Network Bridge

To see all traffic on a Docker network (not just one container), capture on the bridge interface:

```bash
# Find the bridge interface for a custom Docker network
BRIDGE=$(docker network inspect my-network --format '{{.Options.com.docker.network.bridge.name}}')
echo "Bridge interface: $BRIDGE"

# If the above is empty, find it through brctl or ip link
# Custom networks typically use br-<first12chars_of_network_id>
NETWORK_ID=$(docker network inspect my-network --format '{{.Id}}')
BRIDGE="br-${NETWORK_ID:0:12}"

# Capture all traffic on the Docker network
sudo tcpdump -i $BRIDGE -n
```

This shows all inter-container traffic on that network, which is useful for debugging service-to-service communication issues.

## Practical Debugging Scenarios

### Debugging DNS Resolution Failures

Container DNS issues are common. Capture DNS traffic to see what is happening:

```bash
# Capture DNS traffic from a container
docker run --rm -it \
  --network container:my-app \
  nicolaka/netshoot \
  tcpdump -i eth0 -n 'udp port 53' -vv
```

The `-vv` flag shows verbose DNS packet details, including query names, response codes, and resolved addresses.

Look for:
- Queries with no responses (DNS server unreachable)
- NXDOMAIN responses (name does not exist)
- Queries going to unexpected DNS servers

### Debugging HTTP Connection Issues

Capture HTTP traffic to see request and response details:

```bash
# Capture HTTP traffic and display packet contents as ASCII
docker run --rm -it \
  --network container:my-app \
  nicolaka/netshoot \
  tcpdump -i eth0 -n -A 'tcp port 80'
```

The `-A` flag prints packet payloads as ASCII text. For HTTP (not HTTPS), you can read the full request and response headers.

### Debugging TLS Handshake Failures

For HTTPS traffic, you cannot read the encrypted payload, but you can see the TLS handshake:

```bash
# Capture TLS handshake packets on port 443
docker run --rm -it \
  --network container:my-app \
  nicolaka/netshoot \
  tcpdump -i eth0 -n 'tcp port 443 and (tcp[((tcp[12:1] & 0xf0) >> 2):1] = 0x16)'
```

This filter matches TLS handshake records (content type 0x16). Save the capture and open it in Wireshark for detailed TLS analysis.

### Debugging Database Connection Issues

Check if your application container is actually reaching the database:

```bash
# Capture traffic between the app and PostgreSQL (port 5432)
docker run --rm -it \
  --network container:my-app \
  nicolaka/netshoot \
  tcpdump -i eth0 -n 'tcp port 5432'
```

Look for:
- SYN packets with no SYN-ACK (connection refused or unreachable)
- RST packets (connection reset)
- Successful three-way handshake (SYN, SYN-ACK, ACK)

## Filtering Techniques

tcpdump's filtering language (BPF) is powerful. Here are filters useful for container debugging:

```bash
# Capture traffic to/from a specific IP address
tcpdump -i eth0 -n 'host 172.18.0.5'

# Capture traffic between two specific containers
tcpdump -i eth0 -n 'host 172.18.0.5 and host 172.18.0.3'

# Capture only SYN packets (new connections)
tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-syn != 0'

# Capture only RST packets (connection resets)
tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-rst != 0'

# Capture ICMP packets (pings)
tcpdump -i eth0 -n 'icmp'

# Capture packets larger than 1000 bytes
tcpdump -i eth0 -n 'greater 1000'
```

## Saving and Analyzing Captures

For complex issues, capture packets to a file and analyze them with Wireshark:

```bash
# Capture 10 seconds of traffic to a pcap file
docker run --rm \
  --network container:my-app \
  -v $(pwd):/captures \
  nicolaka/netshoot \
  timeout 10 tcpdump -i eth0 -n -w /captures/debug.pcap
```

The pcap file is saved to your current directory. Open it in Wireshark for visual analysis:

```bash
# Open the capture in Wireshark (if installed on your machine)
wireshark debug.pcap
```

## Automating Packet Capture

Create a script that starts packet capture when a specific condition occurs:

```bash
#!/bin/bash
# auto-capture.sh - Start packet capture when a container becomes unhealthy

CONTAINER="my-app"
CAPTURE_DIR="/var/log/captures"
mkdir -p "$CAPTURE_DIR"

while true; do
    # Check container health status
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null)

    if [ "$HEALTH" = "unhealthy" ]; then
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        echo "Container unhealthy - starting capture"

        # Capture 30 seconds of traffic
        docker run --rm \
          --network "container:$CONTAINER" \
          -v "$CAPTURE_DIR:/captures" \
          nicolaka/netshoot \
          timeout 30 tcpdump -i eth0 -n -w "/captures/${TIMESTAMP}.pcap"

        echo "Capture saved to ${CAPTURE_DIR}/${TIMESTAMP}.pcap"
    fi

    sleep 10
done
```

## Docker Compose Integration

Add a tcpdump sidecar to your Docker Compose file for debugging:

```yaml
# docker-compose.debug.yml - Add tcpdump sidecar for debugging
services:
  tcpdump:
    image: nicolaka/netshoot
    network_mode: "service:app"
    command: tcpdump -i eth0 -n -w /captures/debug.pcap
    volumes:
      - ./captures:/captures
    depends_on:
      - app
```

Run it alongside your application:

```bash
# Start the main stack plus the debug sidecar
docker compose -f docker-compose.yml -f docker-compose.debug.yml up
```

## Summary

Packet capture is one of the most powerful debugging tools for container networking. Use a sidecar container with `nicolaka/netshoot` for the cleanest approach. Capture from the host if you need zero impact on the container. Filter aggressively to reduce noise. And save captures to pcap files for detailed analysis in Wireshark. When logs and metrics cannot explain a networking issue, tcpdump always can.
