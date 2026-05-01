# How to Limit Container Bandwidth Using Docker and tc on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Traffic Control, tc, Bandwidth, Networking, IPv4, Linux

Description: Limit outbound and inbound bandwidth for Docker containers using Linux tc (traffic control) commands to prevent containers from saturating shared network links.

## Introduction

Docker does not natively provide bandwidth limiting per container, but Linux's `tc` (traffic control) subsystem does. By applying `tc` rules to the veth interfaces that Docker creates for each container, you can enforce per-container rate limits.

## Finding the Container's veth Interface

Each Docker container gets a veth pair - one end inside the container, one on the host. Find the host-side veth:

```bash
# Get the container's network interface index

CONTAINER_IFINDEX=$(docker exec my-container cat /sys/class/net/eth0/iflink)

# Find the matching veth on the host
HOST_VETH=$(ip link show | awk -F': ' "\$1 == ${CONTAINER_IFINDEX} {print \$2}" | cut -d@ -f1)
echo "Container veth on host: ${HOST_VETH}"

# Alternative: grep for veth interfaces
ip link show type veth
```

## Limiting Outbound Bandwidth with an IFB Device

A root qdisc on the host-side veth shapes packets leaving that host interface, which means traffic going into the container. To limit outbound IPv4 traffic from the container, redirect packets arriving on the host-side veth ingress path to an Intermediate Functional Block (IFB) device and shape them there:

```bash
# Load the ifb kernel module
sudo modprobe ifb numifbs=1

# Bring up the IFB interface
sudo ip link set dev ifb0 up

# Add ingress qdisc to the host-side veth
sudo tc qdisc add dev ${HOST_VETH} ingress

# Redirect all IPv4 ingress traffic to ifb0
sudo tc filter add dev ${HOST_VETH} parent ffff: protocol ip u32 \
  match u32 0 0 \
  action mirred egress redirect dev ifb0

# Apply the outbound rate limit on ifb0
sudo tc qdisc add dev ifb0 root handle 1: tbf \
  rate 10mbit \
  burst 32kb \
  latency 400ms
```

This filter matches IPv4 traffic. If the container also uses IPv6, add a corresponding `protocol ipv6` filter.

## Limiting Inbound Bandwidth with tc

Apply a Token Bucket Filter (TBF) to the host-side veth to limit inbound traffic to the container to 5 Mbit/s:

```bash
# Add root qdisc to the veth interface
sudo tc qdisc add dev ${HOST_VETH} root handle 1: tbf \
  rate 5mbit \
  burst 32kb \
  latency 400ms

# Verify the qdisc was added
sudo tc qdisc show dev ${HOST_VETH}
```

## Testing the Bandwidth Limit

```bash
# Replace these example endpoints with real test hosts you control
docker exec -it my-container iperf3 -c iperf-server.example.com

# Or test download speed from inside the container
docker exec -it my-container curl -o /dev/null http://speedtest.example.com/100mb.bin
```

## Removing the Limits

```bash
# Remove the inbound limit
sudo tc qdisc del dev ${HOST_VETH} root

# Remove the outbound redirect and IFB qdisc
sudo tc qdisc del dev ${HOST_VETH} ingress
sudo tc qdisc del dev ifb0 root
```

## Using Docker Compose with a Pre-Limit Script

For reproducible inbound limits, run a script after the stack starts:

```bash
#!/bin/bash
# limit-bandwidth.sh
CONTAINER_NAME="my-app"
RATE="10mbit"
IFINDEX=$(docker exec ${CONTAINER_NAME} cat /sys/class/net/eth0/iflink)
VETH=$(ip link show | awk -F': ' "\$1 == ${IFINDEX} {print \$2}" | cut -d@ -f1)
sudo tc qdisc add dev ${VETH} root handle 1: tbf rate ${RATE} burst 32kb latency 400ms
echo "Applied inbound ${RATE} limit to ${VETH} for ${CONTAINER_NAME}"
```

## Conclusion

Using `tc` on Docker's veth interfaces enables precise per-container bandwidth limits. On the host-side veth, a root qdisc shapes traffic into the container, while IFB redirection is used to shape traffic coming out of it. While not a native Docker feature, this approach integrates cleanly with existing Linux traffic control tooling and can be automated alongside container lifecycle management.
