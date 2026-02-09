# How to Configure Docker Containers with Custom MTU Settings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Networking, MTU, Containers, DevOps, Troubleshooting

Description: Learn how to configure custom MTU settings for Docker networks and containers to fix packet fragmentation and connectivity issues.

---

MTU stands for Maximum Transmission Unit - the largest packet size that can be sent over a network interface without fragmentation. Docker defaults to an MTU of 1500 bytes, which matches standard Ethernet. But if your underlying network uses a smaller MTU (common with VPNs, overlay networks, and some cloud providers), Docker's default causes problems. Packets get silently dropped, connections stall, and you spend hours chasing what looks like a firewall issue when it is actually an MTU mismatch.

## Understanding the MTU Problem

When a Docker container sends a packet larger than the physical network's MTU, one of two things happens. If the "Don't Fragment" (DF) bit is set (which TCP typically does), the packet gets dropped and an ICMP "Fragmentation Needed" message is supposed to be sent back. If that ICMP message gets blocked by a firewall (a very common configuration), the sender never learns about the problem. This is called a "black hole" - the connection appears to hang.

Classic symptoms of MTU issues:
- Small requests (like pings and DNS) work fine
- Large transfers stall or time out
- SSH connections work but SCP transfers hang
- HTTP responses work for small pages but fail for large ones
- TLS handshakes fail because the certificate chain is too large for one packet

Check your host's current MTU:

```bash
# Show the MTU for all network interfaces on the host
ip link show | grep mtu
```

Check Docker's default bridge MTU:

```bash
# Show the MTU on Docker's default bridge
ip link show docker0 | grep mtu
```

## Setting MTU on a Custom Docker Network

When creating a Docker network, specify the MTU with the driver option:

```bash
# Create a Docker network with MTU 1400 (suitable for most VPN environments)
docker network create \
  --driver bridge \
  --opt com.docker.network.driver.mtu=1400 \
  my-network
```

Verify the network was created with the correct MTU:

```bash
# Inspect the network to confirm MTU setting
docker network inspect my-network --format '{{json .Options}}'
```

Start containers on this network and they will inherit the MTU:

```bash
# Run a container on the custom network
docker run --rm --network my-network alpine ip link show eth0
```

The output shows `mtu 1400` on the container's eth0 interface.

## Setting MTU for the Default Bridge Network

To change the MTU on Docker's default bridge network, edit the Docker daemon configuration:

```bash
# Edit the Docker daemon configuration
sudo nano /etc/docker/daemon.json
```

Add the MTU setting:

```json
{
  "mtu": 1400
}
```

Restart Docker to apply:

```bash
# Restart the Docker daemon
sudo systemctl restart docker
```

Verify the change:

```bash
# Check the new MTU on docker0
ip link show docker0 | grep mtu
```

Every container started on the default bridge network will now use MTU 1400.

## Setting MTU in Docker Compose

In Docker Compose, set the MTU on a per-network basis:

```yaml
# docker-compose.yml with custom MTU
services:
  web:
    image: nginx:latest
    networks:
      - app-net

  api:
    image: my-api:latest
    networks:
      - app-net

networks:
  app-net:
    driver: bridge
    driver_opts:
      com.docker.network.driver.mtu: "1400"
```

All containers on `app-net` will use MTU 1400.

## Finding the Correct MTU Value

The right MTU depends on your network infrastructure. Here is how to find it.

### Method 1: Ping with DF Bit

Send increasingly large ICMP packets with the Don't Fragment bit set until they fail:

```bash
# Test from the Docker host to an external server
# Start with 1472 (1500 MTU - 28 bytes for IP/ICMP headers)
ping -M do -s 1472 -c 1 8.8.8.8

# If that fails, try smaller sizes
ping -M do -s 1400 -c 1 8.8.8.8
ping -M do -s 1372 -c 1 8.8.8.8
```

The largest packet size that succeeds, plus 28 bytes for headers, is your path MTU.

### Method 2: Check the Underlying Network

Different network types have different MTUs:

| Network Type | Typical MTU |
|-------------|-------------|
| Standard Ethernet | 1500 |
| WireGuard VPN | 1420 |
| OpenVPN (UDP) | 1400 |
| VXLAN overlay | 1450 |
| GRE tunnel | 1476 |
| PPPoE (DSL) | 1492 |
| AWS (some instances) | 9001 (jumbo frames) |

### Method 3: Automated Path MTU Discovery

Use tracepath to discover the path MTU:

```bash
# Discover the path MTU to a destination
tracepath 8.8.8.8
```

The output includes the detected MTU for each hop.

## Common Cloud Provider Scenarios

### AWS with VPC

AWS supports jumbo frames (MTU 9001) within a VPC, but traffic leaving the VPC is limited to MTU 1500. If your containers communicate only within the VPC, you can use jumbo frames:

```bash
# Create a network with jumbo frame MTU for AWS intra-VPC traffic
docker network create --opt com.docker.network.driver.mtu=8981 aws-internal
```

### GCP with VPN

Google Cloud VPN connections typically use MTU 1460:

```bash
# Create a network suitable for GCP VPN
docker network create --opt com.docker.network.driver.mtu=1460 gcp-network
```

### Azure

Azure VMs default to MTU 1500, but accelerated networking and some configurations use different values. Check with:

```bash
# Check the MTU on an Azure VM
ip link show eth0 | grep mtu
```

## Docker Overlay Networks

Docker Swarm overlay networks add VXLAN encapsulation overhead (50 bytes). If your physical MTU is 1500, the overlay MTU should be 1450:

```bash
# Create an overlay network with correct MTU
docker network create \
  --driver overlay \
  --opt com.docker.network.driver.mtu=1450 \
  my-overlay
```

In Docker Compose (Swarm mode):

```yaml
networks:
  overlay-net:
    driver: overlay
    driver_opts:
      com.docker.network.driver.mtu: "1450"
```

## Diagnosing MTU Issues in Running Containers

If you suspect an MTU problem in a running container, here are diagnostic steps:

```bash
# Check the container's current MTU
docker exec my-app ip link show eth0 | grep mtu

# Test connectivity with specific packet sizes from inside the container
docker exec my-app ping -M do -s 1400 -c 3 8.8.8.8

# Check for packet fragmentation
docker exec my-app cat /proc/net/snmp | grep -A 1 "Ip:"
```

Look at the "FragFails" counter in `/proc/net/snmp`. If it is incrementing, packets are being dropped due to fragmentation issues.

You can also use tcpdump to spot ICMP "Fragmentation Needed" messages:

```bash
# Watch for ICMP fragmentation messages
docker run --rm --network container:my-app nicolaka/netshoot \
  tcpdump -i eth0 -n 'icmp and icmp[0] = 3 and icmp[1] = 4'
```

## Changing MTU on a Running Container

You can change the MTU on a running container's interface without restarting it, but the container needs NET_ADMIN capability:

```bash
# Change MTU on a running container's eth0
docker exec my-app ip link set eth0 mtu 1400
```

This is a temporary change. The MTU resets if the container restarts. For a permanent fix, set the MTU on the Docker network.

## Automation Script

Here is a script that tests and applies the optimal MTU:

```bash
#!/bin/bash
# find-optimal-mtu.sh - Find and apply the optimal MTU for a Docker network

TARGET=${1:-"8.8.8.8"}
NETWORK_NAME=${2:-"optimized-net"}

echo "Finding optimal MTU to $TARGET..."

# Binary search for the largest working MTU
LOW=500
HIGH=1500

while [ $((HIGH - LOW)) -gt 1 ]; do
    MID=$(( (HIGH + LOW) / 2 ))
    # Test with ping: packet size + 28 bytes of headers = total MTU
    if ping -M do -s $MID -c 1 -W 2 "$TARGET" > /dev/null 2>&1; then
        LOW=$MID
    else
        HIGH=$MID
    fi
done

OPTIMAL_MTU=$((LOW + 28))
echo "Optimal MTU: $OPTIMAL_MTU"

# Create a Docker network with the optimal MTU
docker network create \
  --opt "com.docker.network.driver.mtu=$OPTIMAL_MTU" \
  "$NETWORK_NAME"

echo "Created network '$NETWORK_NAME' with MTU $OPTIMAL_MTU"
```

## Summary

MTU mismatches cause some of the most confusing networking issues in Docker environments. The symptoms look like firewall problems or random timeouts, but the fix is simple: set the MTU to match your underlying network. Use `docker network create --opt com.docker.network.driver.mtu=VALUE` for custom networks, or set it globally in `/etc/docker/daemon.json`. Always test with large pings to verify connectivity after making MTU changes, and remember to account for encapsulation overhead in overlay and VPN environments.
