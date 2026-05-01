# How to Execute Commands Inside a Network Namespace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Namespaces, iproute2, Networking, Container, System Administration

Description: Run commands, scripts, and interactive shells inside a Linux network namespace using ip netns exec to test and manage isolated network environments.

## Introduction

Once you have created a network namespace, you need to run commands inside it to configure interfaces, test connectivity, and run services. The `ip netns exec` command runs any command within the context of a specified namespace, giving it access only to that namespace's network stack.

## Prerequisites

- Linux with iproute2
- A network namespace created with `ip netns add`
- Root access

## Basic Command Execution

```bash
# Run a single command inside the namespace "ns1"

ip netns exec ns1 <command>

# Examples:
# Show interfaces inside the namespace
ip netns exec ns1 ip link show

# Show IP addresses inside the namespace
ip netns exec ns1 ip addr show

# Show routing table inside the namespace
ip netns exec ns1 ip route show

# Check connectivity from inside the namespace
ip netns exec ns1 ping -c 3 8.8.8.8
```

## Open an Interactive Shell

```bash
# Open a bash shell inside the namespace
# All commands typed will execute in the namespace's network context
ip netns exec ns1 bash

# Verify you are in the right namespace
ip addr show
ip route show

# Exit the namespace shell
exit
```

## Run a Shell with a Custom Prompt

Mark your prompt so you know you are inside a namespace:

```bash
# Launch a bash shell with a modified prompt
ip netns exec ns1 bash --rcfile <(echo "PS1='[ns1] \u@\h:\w\$ '")
```

## Run Network Diagnostic Tools Inside a Namespace

```bash
# Check which DNS server is used inside the namespace
ip netns exec ns1 cat /etc/resolv.conf

# Test DNS resolution inside the namespace
ip netns exec ns1 nslookup google.com

# Check open sockets inside the namespace
ip netns exec ns1 ss -tulnp

# Capture traffic inside the namespace
ip netns exec ns1 tcpdump -i any -n

# Run a curl request through the namespace
ip netns exec ns1 curl -v http://192.168.1.1
```

## Run a Process Inside a Namespace as Another User

```bash
# Execute as a specific user inside the namespace
ip netns exec ns1 sudo -u www-data curl http://example.com
```

## Start a Background Process Inside a Namespace

```bash
# Start a web server inside the namespace in the background
ip netns exec ns1 python3 -m http.server 8080 &

# The server uses the namespace's network stack
# Verify it is listening on the namespace's IP
ip netns exec ns1 ss -tlnp | grep 8080
```

## Use nsenter as an Alternative

`nsenter` provides more fine-grained control and works with unnamed namespaces:

```bash
# Enter namespace by PID (useful for container namespaces)
nsenter --net=/proc/1234/ns/net -- ip addr show

# Enter a named namespace
nsenter --net=/var/run/netns/ns1 -- ip route show
```

## Script Multiple Commands Inside a Namespace

```bash
#!/bin/bash
# setup-ns1.sh: Configure namespace ns1

NS="ns1"

# Run a series of commands inside the namespace
ip netns exec "$NS" env NS="$NS" bash << 'EOF'
# Bring up loopback
ip link set lo up

# Configure interface (assuming veth1 is already moved into the namespace)
ip addr add 10.0.1.2/24 dev veth1
ip link set veth1 up

# Set default route
ip route add default via 10.0.1.1

echo "Namespace $NS configured successfully"
ip addr show
ip route show
EOF
```

## Conclusion

`ip netns exec` is the primary tool for running commands inside network namespaces. It works with any binary - shells, ping, curl, tcpdump, or custom applications. For interactive sessions, launch a bash shell with a modified prompt to avoid confusion about which network context you are in. For unnamed container namespaces, use `nsenter` with the `/proc/<pid>/ns/net` path.
