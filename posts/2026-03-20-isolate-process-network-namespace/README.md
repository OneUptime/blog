# How to Isolate a Process in a Network Namespace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Namespaces, Process Isolation, Security, Networking, unshare, Nsenter

Description: Run a process in its own network namespace to isolate its network access, using unshare for new processes or ip netns exec for existing namespaces.

## Introduction

Running a process inside a network namespace restricts it to only the network interfaces and routes in that namespace. This is useful for security isolation, testing applications with limited network access, sandboxing untrusted code, and replicating container-like behavior manually.

## Prerequisites

- Root access or sufficient capabilities (`CAP_SYS_ADMIN` and `CAP_NET_ADMIN`)
- iproute2 installed
- `unshare` from util-linux (usually pre-installed)

## Method 1: Run a Process in an Existing Named Namespace

```bash
# Create and configure the namespace

ip netns add isolated-ns
ip netns exec isolated-ns ip link set lo up

# Without adding an interface or route, external connections will fail
ip netns exec isolated-ns bash -c "curl --connect-timeout 2 http://192.168.1.1 || echo 'No external interface configured yet'"

# Start a long-running process in the namespace
ip netns exec isolated-ns /usr/bin/python3 /opt/myapp/server.py &

# The process can only see interfaces in isolated-ns
ip netns exec isolated-ns ip link show
```

## Method 2: Create a New Namespace for a Specific Process

`unshare` creates a new namespace and immediately executes a command in it:

```bash
# Launch a process in a brand-new, anonymous network namespace
unshare --net bash

# Inside this shell, only loopback exists
ip link show
# 1: lo: <LOOPBACK> mtu 65536 ... state DOWN

# The process has NO connectivity to the outside world
ping 8.8.8.8
# connect: Network is unreachable
```

## Method 3: Enter an Existing Process's Namespace

You cannot move a running process to a different network namespace directly, but you can use `nsenter` to run commands in the context of an existing process's namespace:

```bash
# Enter the network namespace of process PID 1234
nsenter --target 1234 --net -- ip addr show

# Or enter a named namespace
nsenter --net=/var/run/netns/ns1 -- /bin/bash
```

## Isolate with No Network Access

To completely block network access for a process:

```bash
# Create a namespace with NO interfaces except loopback
ip netns add no-net
ip netns exec no-net ip link set lo up

# Run a process with no network access
ip netns exec no-net bash -c "
    # Only loopback is available - no external network
    ip link show
    # Try to connect to internet - will fail
    curl --connect-timeout 2 http://1.1.1.1 || echo 'Network blocked as expected'
"
```

## Full Isolation Script with Controlled Access

```bash
#!/bin/bash
# run-isolated.sh: Run a command in a namespace with specific network access

NS="sandbox-$$"  # Unique namespace name using PID

# Create a fresh namespace
ip netns add "$NS"
ip netns exec "$NS" ip link set lo up

# Run the program in the namespace
echo "Running in isolated namespace: $NS"
ip netns exec "$NS" "$@"
EXIT_CODE=$?

# Clean up the namespace after the program exits
ip netns delete "$NS"
exit $EXIT_CODE
```

Usage:

```bash
# Run curl in an isolated namespace (no internet access)
./run-isolated.sh curl http://example.com

# Run a Python script isolated
./run-isolated.sh python3 untrusted_script.py
```

## Check Which Namespace a Process Is In

```bash
# Show the network namespace of a process
ls -la /proc/<PID>/ns/net

# Compare two processes' namespaces
diff <(ls -la /proc/1/ns/net) <(ls -la /proc/<PID>/ns/net)
```

## Conclusion

Process isolation in network namespaces prevents a process from seeing or accessing network resources outside its namespace. Use `ip netns exec` for named namespaces, `unshare --net` for creating new anonymous namespaces, and `nsenter` for entering existing process namespaces. This is the core mechanism behind container network isolation in Docker and Kubernetes.
