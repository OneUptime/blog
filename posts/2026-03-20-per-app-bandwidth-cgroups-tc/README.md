# How to Configure Per-Application IPv4 Bandwidth Limits with cgroups and tc

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cgroups, tc, Traffic Control, Bandwidth, IPv4, Linux, QoS

Description: Use Linux cgroups (v2) combined with tc and eBPF or net_cls to apply per-application IPv4 bandwidth limits by tagging traffic by cgroup membership.

## Introduction

Linux's traffic control (`tc`) operates at the network interface level, but with cgroups you can mark network traffic per process group and then apply `tc` filters to enforce per-application bandwidth limits. This is useful on shared servers where you want to prevent one application from saturating the network link.

## Approach: cgroup net_cls + tc

The `net_cls` cgroup subsystem assigns a class ID to packets from processes in a cgroup. `tc` filters then match the class ID and apply rate limits.

## Step 1: Set Up cgroup v1 with net_cls

```bash
# Mount net_cls cgroup hierarchy (cgroup v1)

sudo mkdir -p /sys/fs/cgroup/net_cls
sudo mount -t cgroup -o net_cls net_cls /sys/fs/cgroup/net_cls

# Create a cgroup for your application
sudo mkdir /sys/fs/cgroup/net_cls/myapp

# Assign a class ID (format: 0xMMMMmmmm where MMMM is major and mmmm is minor in hex,
# e.g., 0x00010001 = tc class 1:1)
echo 0x00010001 | sudo tee /sys/fs/cgroup/net_cls/myapp/net_cls.classid
```

## Step 2: Assign the Application's Processes to the cgroup

```bash
# Add the application's PID to the cgroup
APP_PID=$(pgrep -f myapp)
echo ${APP_PID} | sudo tee /sys/fs/cgroup/net_cls/myapp/tasks

# For new processes: run them in the cgroup
sudo cgexec -g net_cls:myapp myapp --option1 --option2
```

## Step 3: Create the tc Hierarchy

```bash
# Create a root HTB qdisc on the interface
sudo tc qdisc add dev eth0 root handle 1: htb default 99

# Default class - unlimited (for all other traffic)
sudo tc class add dev eth0 parent 1: classid 1:99 htb \
  rate 1gbit \
  ceil 1gbit

# Rate-limited class for myapp (10 Mbit/s)
# rate is the guaranteed bandwidth; ceil is the maximum (no burst here)
sudo tc class add dev eth0 parent 1: classid 1:1 htb \
  rate 10mbit \
  ceil 10mbit
```

## Step 4: Add a Filter to Match cgroup Traffic

```bash
# Attach the cgroup classifier. It reads net_cls.classid from each
# packet's source-process cgroup and uses that value as the tc class ID,
# so traffic from the myapp cgroup (0x00010001) lands in class 1:1.
sudo tc filter add dev eth0 parent 1: protocol ip prio 10 cgroup
```

Now any packet sent by a process in the `myapp` cgroup will be rate-limited to 10 Mbit/s.

## Verifying the Configuration

```bash
# Show tc classes and their statistics
sudo tc -s class show dev eth0

# Show the filter
sudo tc filter show dev eth0

# Test bandwidth from the application
# (Run iperf3 inside the cgroup)
sudo cgexec -g net_cls:myapp iperf3 -c iperf-server.example.com -t 10
```

## Applying Limits to Both Ingress and Egress

Egress (outbound) is directly controlled by tc. Ingress (inbound) requires an IFB
device, but note an important caveat: the `cgroup` classifier only works for
locally generated packets (per `tc-cgroup(8)`). On ingress the packet has not yet
been delivered to a local socket, so it has no cgroup association and the
classifier cannot match. To rate-limit ingress for a specific application, match
on its destination port or IP instead. For example:

```bash
# Load IFB module
sudo modprobe ifb numifbs=1
sudo ip link set dev ifb0 up

# Redirect ingress to IFB
sudo tc qdisc add dev eth0 handle ffff: ingress
sudo tc filter add dev eth0 parent ffff: protocol ip u32 \
  match u32 0 0 action mirred egress redirect dev ifb0

# Apply HTB on ifb0 and match the application's destination port (e.g., 8080)
sudo tc qdisc add dev ifb0 root handle 1: htb default 99
sudo tc class add dev ifb0 parent 1: classid 1:1 htb rate 10mbit ceil 10mbit
sudo tc filter add dev ifb0 parent 1: protocol ip prio 10 u32 \
  match ip dport 8080 0xffff flowid 1:1
```

## Cleanup

```bash
# Remove all tc rules from the interface
sudo tc qdisc del dev eth0 root
sudo tc qdisc del dev eth0 ingress

# Remove the cgroup
sudo rmdir /sys/fs/cgroup/net_cls/myapp
```

## Conclusion

Combining `net_cls` cgroups with `tc` HTB provides per-process bandwidth controls on Linux. While more complex than simple interface-level limiting, it offers precise per-application enforcement that is essential on multi-tenant servers.
