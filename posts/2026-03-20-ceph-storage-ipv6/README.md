# How to Configure Ceph Storage with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ceph, Storage, Distributed Storage, Object Storage, Block Storage

Description: Configure a Ceph storage cluster to operate over IPv6 networks, including monitor, OSD, and RGW configuration with IPv6 addresses and dual-stack operation.

## Introduction

Ceph is a distributed storage system that supports IPv6 for all its daemon types - monitors (MON), object storage daemons (OSD), metadata servers (MDS), and RADOS gateways (RGW). IPv6 bootstrap settings can live in `ceph.conf`, while cephadm-managed settings are typically stored in Ceph's monitor configuration database. Each daemon can bind to IPv6 addresses for both inter-cluster communication and client access.

## Ceph Configuration for IPv6

```ini
# /etc/ceph/ceph.conf

[global]
# Cluster FSID

fsid = a7f2c3d4-e5f6-7890-abcd-ef1234567890

# Monitor hosts with IPv6 addresses
# Use bracket notation for IPv6
mon_host = [v2:[2001:db8::10]:3300,v1:[2001:db8::10]:6789] \
           [v2:[2001:db8::11]:3300,v1:[2001:db8::11]:6789] \
           [v2:[2001:db8::12]:3300,v1:[2001:db8::12]:6789]

# Bind to IPv6 addresses
ms_bind_ipv6 = true
ms_bind_ipv4 = false    # Set to true for dual-stack

# Optional network definitions
public_network = 2001:db8::/64
cluster_network = fd00:ce01::/64   # Cluster network (separate from public)

# Optional per-daemon static overrides
[osd.0]
public_addr = 2001:db8::20
cluster_addr = fd00:ce01::20
```

## Deploy Ceph with cephadm on IPv6

```bash
# Bootstrap a new Ceph cluster on an IPv6-addressed host
cephadm bootstrap \
    --mon-ip 2001:db8::10 \
    --cluster-network fd00:ce01::/64 \
    --allow-overwrite \
    --skip-pull

# Add additional monitors with IPv6
ceph orch host add ceph-mon2 2001:db8::11
ceph orch host add ceph-mon3 2001:db8::12

# Deploy monitors
ceph orch apply mon "ceph-mon1,ceph-mon2,ceph-mon3"

# Add OSDs on IPv6 hosts
ceph orch host add ceph-osd1 2001:db8::20
ceph orch apply osd --all-available-devices
```

## Ceph Monitor Configuration with IPv6

```ini
# /etc/ceph/ceph.conf - Monitor section

[mon.ceph-mon1]
host = ceph-mon1
public_addr = 2001:db8::10
mon_addr = [2001:db8::10]:6789

[mon.ceph-mon2]
host = ceph-mon2
public_addr = 2001:db8::11
mon_addr = [2001:db8::11]:6789
```

## RADOS Gateway (RGW) with IPv6

```bash
# Configure the RGW frontend in Ceph's monitor configuration database
ceph config set client.rgw.rgw1 rgw_frontends \
    'beast endpoint=[2001:db8::30]:7480 endpoint=0.0.0.0:7480'

# For HTTPS:
# ceph config set client.rgw.rgw1 rgw_frontends \
#     'beast ssl_endpoint=[2001:db8::30]:7443 ssl_certificate=/etc/ceph/rgw.crt ssl_private_key=/etc/ceph/rgw.key'

# Deploy the RGW service with cephadm
ceph orch apply rgw rgw1 --placement="1 ceph-rgw1"

# Test the RGW endpoint over IPv6
curl -g -6 http://[2001:db8::30]:7480/
```

## CephFS Mount over IPv6

```bash
# Mount CephFS using the kernel client
# Monitors listed with IPv6 addresses
mount -t ceph [2001:db8::10],[2001:db8::11],[2001:db8::12]:/ /mnt/cephfs \
    -o name=admin,secret=<key>

# Or use the ceph-fuse client
ceph-fuse -m [2001:db8::10]:6789 /mnt/cephfs

# /etc/fstab entry for CephFS over IPv6
[2001:db8::10],[2001:db8::11],[2001:db8::12]:/  /mnt/cephfs  ceph  name=admin,secretfile=/etc/ceph/admin.key,_netdev  0  0
```

## RBD (Block Device) over IPv6

```bash
# Create an RBD image
rbd create --size 10240 mypool/myimage

# Map the RBD image (kernel RBD client uses IPv6 via monitors)
rbd map mypool/myimage
# The kernel connects to monitors at their IPv6 addresses from ceph.conf

# Format and mount
mkfs.ext4 /dev/rbd0
mount /dev/rbd0 /mnt/rbd
```

## Verify Ceph IPv6 Operation

```bash
# Check Ceph cluster status
ceph status
# Verify monitors show IPv6 addresses

# Check monitor quorum
ceph mon dump
# Expected: shows IPv6 addresses for each monitor

# Check OSD tree
ceph osd tree

# Verify network bindings
ss -tlnp | grep -E "(ceph|6789|3300|7480)"
# Should show [2001:db8::10]:6789 and similar

# Query a monitor directly
ceph tell mon.ceph-mon1 mon_status
```

## Firewall Rules for Ceph over IPv6

```bash
# Monitor ports on the public network
ip6tables -A INPUT -p tcp --dport 6789 -s 2001:db8::/64 -j ACCEPT  # MON v1
ip6tables -A INPUT -p tcp --dport 3300 -s 2001:db8::/64 -j ACCEPT  # MON v2

# OSD/MDS/Manager ports on the public network
ip6tables -A INPUT -p tcp --dport 6800:7568 -s 2001:db8::/64 -j ACCEPT

# OSD cluster-network ports
ip6tables -A INPUT -p tcp --dport 6800:7568 -s fd00:ce01::/64 -j ACCEPT

# RGW
ip6tables -A INPUT -p tcp --dport 7480 -j ACCEPT

ip6tables-save > /etc/ip6tables/rules.v6
```

## Conclusion

Ceph supports IPv6 through the `ms_bind_ipv6 = true` option and by specifying IPv6 addresses or IPv6 CIDR networks for monitors, OSDs, and RGW endpoints. The `mon_host` configuration uses Ceph's messenger v2 format with brackets around IPv6 addresses. All Ceph daemon types - MON, OSD, MDS, and RGW - bind to IPv6 when configured. CephFS mounts, RBD maps, and RGW client access all operate over IPv6 using the same configuration. For dual-stack operation, set both `ms_bind_ipv6 = true` and `ms_bind_ipv4 = true`; if you also define `public_network` or `cluster_network`, include both IPv4 and IPv6 CIDRs.
