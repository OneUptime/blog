# How to Create and Manage Network Namespaces with ip netns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, ip command, iproute2, Network Namespaces, Container, Networking

Description: Create, list, delete, and manage Linux network namespaces using ip netns, including executing commands inside namespaces and moving interfaces between them.

## Introduction

`ip netns` manages Linux network namespaces - isolated network stacks with their own interfaces, routing tables, iptables rules, and sockets. They are the foundation of container networking. Each namespace is independent; creating one gives you a separate network environment, typically with only loopback until you add interfaces.

## Create a Network Namespace

```bash
# Create a new network namespace named "test"

ip netns add test

# List all namespaces
ip netns list
```

## Execute Commands Inside a Namespace

```bash
# Run a command in the 'test' namespace
ip netns exec test ip link show

# Run a shell inside the namespace
ip netns exec test bash

# Any command inside sees only that namespace's network
ip netns exec test ip route show
```

## Move an Interface into a Namespace

```bash
# Create a veth pair
ip link add veth0 type veth peer name veth1

# Move veth1 into the 'test' namespace
ip link set veth1 netns test

# Configure inside the namespace
ip netns exec test ip addr add 10.0.0.2/24 dev veth1
ip netns exec test ip link set veth1 up
ip netns exec test ip link set lo up

# Configure the host end
ip addr add 10.0.0.1/24 dev veth0
ip link set veth0 up
```

## Test Connectivity

```bash
# Ping from namespace to host
ip netns exec test ping -c 3 10.0.0.1

# Ping from host to namespace
ping -c 3 10.0.0.2
```

## Run a Process Inside a Namespace

```bash
# Start a web server in the namespace
ip netns exec test python3 -m http.server 8080 &

# Access it from the host
curl http://10.0.0.2:8080
```

## List Processes in a Namespace

```bash
# Show the named namespace handles under /var/run/netns/
ls -la /var/run/netns/

# Find PIDs in a namespace
ip netns pids test
```

## Delete a Namespace

```bash
# Delete the namespace
ip netns del test

# If no processes are still using it, the namespace is freed
# Physical devices move back to the initial namespace; veth devices in it are destroyed
```

## Identify a Process's Namespace

```bash
# Check which namespace process 1234 is in
readlink /proc/1234/ns/net

# Compare to PID 1's namespace (typically the initial namespace on a host)
readlink /proc/1/ns/net
```

## Common Use Patterns

```bash
# Test a service in isolation
ip netns add isolated
ip link add veth-host type veth peer name veth-isolated
ip link set veth-isolated netns isolated
ip netns exec isolated ip link set veth-isolated up
ip netns exec isolated ip addr add 10.99.0.2/24 dev veth-isolated
ip netns exec isolated ip link set lo up
ip netns exec isolated /path/to/service
```

## Conclusion

`ip netns add` creates isolated network namespaces. `ip netns exec` runs commands inside. Move interfaces with `ip link set <iface> netns <ns>`. Delete with `ip netns del`. Namespaces are the kernel-level primitive that Docker, Podman, and Kubernetes use for container network isolation.
