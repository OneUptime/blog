# How to Use Docker none Network Mode and Manually Configure IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, None-network, IPv4, Container, Security

Description: Use Docker's none network mode to create fully isolated containers, then manually configure IPv4 networking for precise control over container network namespaces.

## Introduction

Docker's `none` network mode creates a container with no network interfaces except the loopback (`lo`). This is useful for security-sensitive workloads, batch jobs that don't need network access, or situations where you want to manually wire the container into a specific network namespace.

## When to Use none Network Mode

- Security-critical containers that must be network-isolated
- Data processing jobs that read/write files but don't need networking
- Manual network namespace configuration for advanced setups
- Testing application behavior without network access

## Running a Container with none Network

```bash
# Launch a container with no networking

docker run -d --name my-container --network none alpine tail -f /dev/null

# Open a shell inside the running container
docker exec -it my-container sh

# Inside the container, only loopback is present
ip addr show
# Output: only lo (127.0.0.1)
```

## Manually Adding a Network Interface with nsenter

To manually configure IPv4, you need to work with the container's network namespace using `nsenter` or `ip netns`.

First, find the container's PID and network namespace:

```bash
# Get the container PID
CONTAINER_PID=$(docker inspect --format '{{.State.Pid}}' my-container)

# The network namespace path
NS_PATH="/proc/${CONTAINER_PID}/ns/net"
echo "Network namespace: ${NS_PATH}"
```

Create a veth pair and move one end into the container's namespace:

```bash
# Create a veth pair on the host
sudo ip link add veth-host type veth peer name veth-ctr

# Move the container end into the container's network namespace
sudo ip link set veth-ctr netns ${CONTAINER_PID}

# Configure the host end
sudo ip link set veth-host up
sudo ip addr add 172.30.0.1/24 dev veth-host

# Configure the container end using nsenter
sudo nsenter -t ${CONTAINER_PID} -n -- ip link set veth-ctr up
sudo nsenter -t ${CONTAINER_PID} -n -- ip addr add 172.30.0.2/24 dev veth-ctr

# Optional: add a default route if the host will forward traffic for the container
sudo nsenter -t ${CONTAINER_PID} -n -- ip route add default via 172.30.0.1 dev veth-ctr
```

## Verifying the Configuration

```bash
# Check the container's new network config
sudo nsenter -t ${CONTAINER_PID} -n -- ip addr show
sudo nsenter -t ${CONTAINER_PID} -n -- ip route show

# Test connectivity from the host to the container
ping -c 1 172.30.0.2
```

## Use Case: Custom CNI-Like Setup

This approach mirrors the low-level mechanics CNI plugins in Kubernetes use to configure pod networking - creating veth pairs and configuring the pod-side interface inside the target network namespace.

## Security Considerations

```bash
# If the host is forwarding traffic for the container, allow only a specific forwarded destination
sudo iptables -I FORWARD 1 -s 172.30.0.2 -d 10.0.0.5 -j ACCEPT
sudo iptables -I FORWARD 2 -s 172.30.0.2 -j DROP
```

## Conclusion

The `none` network mode combined with manual namespace configuration gives maximum control over container networking. It is used in CNI implementations, security-hardened deployments, and anywhere that default Docker networking is insufficient.
