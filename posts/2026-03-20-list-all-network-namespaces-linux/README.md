# How to List All Network Namespaces on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Namespaces, iproute2, Networking, Container, System Administration

Description: List and inspect all network namespaces on a Linux system using ip netns list, /var/run/netns, and lsns to understand the current namespace layout.

## Introduction

Listing network namespaces helps you understand what isolated network environments exist on a system - whether created manually, by containers, or by network tools. Linux provides several ways to enumerate namespaces depending on how they were created.

## Prerequisites

- Linux with iproute2 installed
- Root access for full visibility

## List Named Namespaces with ip netns

Named namespaces (created with `ip netns add`) are stored as bind-mount files in `/var/run/netns/`:

```bash
# List all named network namespaces

ip netns list

# Example output:
# ns2 (id: 1)
# ns1 (id: 0)
```

If an `(id: N)` suffix is shown, it is the network namespace ID (nsid) relative to the current network namespace, not the kernel inode number.

## List Namespace Files Directly

```bash
# List namespace files in the filesystem
ls -la /var/run/netns/

# Show a human-readable long listing
ls -lh /var/run/netns/
```

## Get Detailed Namespace Info

```bash
# Show network namespace IDs (nsids) visible from the current namespace
ip netns list-id
```

## List Active Namespaces (Including Container Namespaces)

Containers (Docker, Kubernetes) often create network namespaces that do NOT appear in `ip netns list` because they are not named under `/var/run/netns`. Use `lsns` to see active network namespaces that are visible through `/proc`:

```bash
# List active network namespaces on the system (requires util-linux)
lsns -t net

# Example output:
#         NS TYPE  NPROCS   PID USER    NETNSID NSFS COMMAND
# 4026531992 net      123     1 root unassigned      /sbin/init
# 4026532189 net        1  1234 root          0      /pause
# 4026532250 net        2  5678 root          1      nginx
```

## Inspect a Running Process Namespace

```bash
# Find the network namespace of a specific process (PID 1234)
ls -la /proc/1234/ns/net

# The symlink target is the namespace inode (e.g., net:[4026532189])
```

## Check Which Namespace You Are In

```bash
# Show the current process's network namespace inode
stat -Lc '%i' /proc/self/ns/net

# Compare with another named namespace file
stat -Lc '%i' /var/run/netns/ns1

# Matching inode numbers indicate the same network namespace
```

## List Interfaces Inside Each Namespace

```bash
# Loop through all named namespaces and list their interfaces
for ns in $(ip netns list | awk '{print $1}'); do
    echo "=== Namespace: $ns ==="
    ip netns exec "$ns" ip link show
done
```

## Associate Processes with Namespaces

```bash
# Find all processes in a specific named namespace
ip netns pids ns1
```

## Docker and Kubernetes Namespace Visibility

Docker creates network namespaces but does not name them under `/var/run/netns` by default. To make a Docker container's namespace visible to `ip netns`:

```bash
# Get the container's PID
CONTAINER_PID=$(docker inspect --format '{{.State.Pid}}' my_container)

# Attach the container's network namespace to a name
ip netns attach my_container "$CONTAINER_PID"

# Now the container appears in ip netns list
ip netns list
ip netns exec my_container ip addr
```

## Conclusion

`ip netns list` shows named namespaces under `/var/run/netns`, while `lsns -t net` reveals active network namespaces with processes, including container namespaces. For deep inspection, check `/proc/<pid>/ns/net` to find the namespace a specific process is running in. Docker-created namespaces can be given a name with `ip netns attach` to make them appear in `ip netns`.
