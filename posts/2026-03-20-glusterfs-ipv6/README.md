# How to Configure GlusterFS with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, GlusterFS, Distributed Storage, Network Storage, Linux

Description: Configure GlusterFS distributed file system to use IPv6 for inter-node communication and client mounts, including peer probing with IPv6 addresses and volume creation.

## Introduction

GlusterFS is a distributed file system that supports IPv6 for both peer-to-peer communication between storage nodes and client mounts. GlusterFS uses hostnames or IP addresses for peer identification, and IPv6 addresses must be used consistently throughout the configuration. The native GlusterFS client (`glusterfs`) and FUSE mount both support IPv6 server addresses.

## Prerequisites

```bash
# Install GlusterFS server on all nodes

apt-get install -y glusterfs-server    # Debian/Ubuntu
dnf install -y glusterfs-server        # RHEL/CentOS

# Enable and start GlusterFS daemon
systemctl enable --now glusterd

# Verify GlusterFS is listening on the management port
ss -tlnp | grep 24007
# If glusterd is configured for IPv6, this should show an IPv6 listener
# such as [::]:24007 or the specific IPv6 bind address
```

## Configure /etc/hosts for IPv6 GlusterFS Nodes

```bash
# /etc/hosts - on all GlusterFS nodes
# Use hostnames consistently across all nodes

2001:db8::10    gluster1 gluster1.example.com
2001:db8::11    gluster2 gluster2.example.com
2001:db8::12    gluster3 gluster3.example.com
```

## Peer Probing over IPv6

```bash
# From gluster1, probe other nodes using hostnames that resolve to IPv6
gluster peer probe gluster2
gluster peer probe gluster3

# From gluster2, probe gluster1 back once if you want hostnames
# recorded consistently in the trusted pool
gluster peer probe gluster1

# Verify peer status
gluster peer status
# Expected:
# Number of Peers: 2
# Hostname: gluster2
# State: Peer in Cluster (Connected)
# Hostname: gluster3
# State: Peer in Cluster (Connected)
```

## Create a GlusterFS Volume with IPv6 Bricks

```bash
# Create a replicated volume using hostnames that resolve to IPv6 addresses
gluster volume create myvol replica 3 \
    gluster1:/data/brick1 \
    gluster2:/data/brick1 \
    gluster3:/data/brick1

# Start the volume
gluster volume start myvol

# Verify volume info
gluster volume info myvol
# Expected:
# Volume Name: myvol
# Type: Replicate
# Volume ID: ...
# Status: Started
# Bricks:
# Brick1: gluster1:/data/brick1
# Brick2: gluster2:/data/brick1
# Brick3: gluster3:/data/brick1
```

## Mount GlusterFS Volume over IPv6 (Native Client)

```bash
# Mount using a hostname that resolves to IPv6
mount -t glusterfs gluster1:/myvol /mnt/glusterfs

# Or explicitly using an IPv6 address literal
mount -t glusterfs 2001:db8::10:/myvol /mnt/glusterfs

# Mount with options
mount -t glusterfs \
    -o log-level=WARNING,log-file=/var/log/gluster-client.log \
    gluster1:/myvol /mnt/glusterfs

# /etc/fstab entry
gluster1:/myvol   /mnt/glusterfs   glusterfs   defaults,_netdev   0   0
```

## GlusterFS Volume Options for IPv6

```bash
# Use IPv6-only addressing for the volume's TCP transport
gluster volume set myvol transport.address-family inet6

# Enable auth for IPv6 client addresses
gluster volume set myvol auth.allow 2001:db8:100::/48

# Check configured address family
gluster volume get myvol transport.address-family

# Make glusterd listen on IPv6
# Edit /etc/glusterfs/glusterd.vol and set:
# option transport.address-family inet6
# option transport.socket.bind-address 2001:db8::10
# Then restart glusterd:
# systemctl restart glusterd
```

## Firewall Rules for GlusterFS over IPv6

```bash
# GlusterFS management ports
ip6tables -A INPUT -p tcp -m multiport --dports 24007,24008 -s 2001:db8::/32 -j ACCEPT

# Gluster 10+ randomizes brick ports within base-port:max-port.
# With the default glusterd.vol template, that range is 49152:60999.
ip6tables -A INPUT -p tcp --dport 49152:60999 -s 2001:db8::/32 -j ACCEPT

# RDMA-enabled volumes also need their allocated brick ports permitted

ip6tables-save > /etc/ip6tables/rules.v6
```

## Monitor GlusterFS over IPv6

```bash
# Check volume healing status
gluster volume heal myvol info

# Monitor volume status
gluster volume status myvol

# Check peer connections
gluster pool list

# Verify brick processes are running and using IPv6
ss -tlnp | grep glusterfs
# Should show brick processes listening on IPv6
```

## Troubleshooting GlusterFS IPv6 Issues

```bash
# Peer probe fails - check if glusterd is reachable
ping6 gluster2
telnet -6 gluster2 24007

# Volume mount fails - check gluster volume status
gluster volume status myvol

# Brick offline - check GlusterFS logs
tail -f /var/log/glusterfs/glusterd.log | grep -i error

# Check if transport is actually using IPv6
gluster volume get myvol transport.address-family
```

## Conclusion

GlusterFS supports IPv6 through standard TCP transport, which is IPv6-capable when IPv6 is configured on the network interfaces. The key requirement is consistent use of hostnames (resolved via `/etc/hosts` or DNS) or IPv6 addresses across all peer probe commands, volume creation, and client mounts. The `auth.allow` option accepts IPv6 CIDR notation for restricting client access. Firewall rules must allow the management ports (24007 and 24008) and the configured brick port range from the GlusterFS node CIDRs. Mount clients using `glusterfs` type with either hostnames resolving to IPv6 or direct IPv6 literals in `SERVER:/VOLNAME` form.
