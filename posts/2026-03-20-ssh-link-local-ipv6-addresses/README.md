# How to SSH to Link-Local IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SSH, Link-Local, Fe80, Scope ID, Zone ID

Description: Learn how to SSH to hosts using link-local IPv6 addresses (fe80::/10), including specifying the network interface scope ID required for link-local connections.

## Understanding Link-Local IPv6 Addresses

Link-local addresses (fe80::/10) are only reachable on the local network segment. They require a **scope ID** (the network interface name) to disambiguate which interface to use for the connection.

```bash
# View your link-local addresses

ip -6 addr show | grep "fe80"
# Example output:
# inet6 fe80::1:2:3:4/64 scope link
#        ↑ link-local address, interface implied

# Each interface has its own link-local address
ip -6 addr show eth0 | grep "fe80"
# inet6 fe80::aabb:ccdd:eeff:1234/64 scope link
```

## SSH to Link-Local Address with Scope ID

```bash
# Format: address%interface
ssh user@fe80::aabb:ccdd:eeff:1234%eth0

# Examples with different interfaces
ssh user@fe80::1:2:3:4%eth0
ssh user@fe80::1:2:3:4%ens3
ssh user@fe80::1:2:3:4%enp0s3

# With port
ssh -p 2222 user@fe80::1:2:3:4%eth0

# Verbose mode (shows scope ID usage)
ssh -v user@fe80::1:2:3:4%eth0
```

## URL Encoding the Scope ID

Tools that take a URI, such as curl, may require a URL-encoded scope ID (`%25` for `%`):

```bash
# curl URI style - use %25 for the literal %
curl "http://[fe80::1:2:3:4%25eth0]:8080/"

# SSH typically accepts the % directly
ssh user@fe80::1:2:3:4%eth0

# If % causes shell issues, quote the address
ssh user@"fe80::1:2:3:4%eth0"

# Or use single quotes
ssh 'user@fe80::1:2:3:4%eth0'
```

## ~/.ssh/config with Link-Local

```text
# ~/.ssh/config

# SSH to link-local address via eth0
Host local-device
    HostName fe80::aabb:ccdd:eeff:1234%%eth0
    User admin
    AddressFamily inet6
    IdentityFile ~/.ssh/id_ed25519

# Multiple link-local hosts on same segment
Host router
    HostName fe80::1%%eth0
    User admin

Host switch
    HostName fe80::2%%eth0
    User admin
```

## Discover Link-Local Neighbors

```bash
# Discover IPv6 neighbors on local segment
ip -6 neigh show

# Or use nmap's IPv6 multicast discovery script
nmap -6 --script=targets-ipv6-multicast-echo --script-args 'newtargets,interface=eth0' -sL

# Ping all nodes on link (multicast)
ping -6 ff02::1%eth0

# Check neighbor discovery cache
ip -6 neigh show dev eth0 | grep "fe80"
```

## Practical Use Cases

```bash
# Use case 1: SSH to a device on local network before it has a global address
# (Common for initial setup of routers, switches, IoT devices)
ssh admin@fe80::1%eth0

# Use case 2: Out-of-band management on the same L2 segment
ssh -i ~/.ssh/admin_key admin@fe80::dead:beef:cafe:1234%eth0

# Use case 3: Connect to container with link-local address
# Find container's link-local address
docker exec mycontainer ip -6 addr show eth0 | grep fe80
# Connect to it (replace the address and host-side interface)
ssh user@fe80::aabb:ccdd:eeff:5678%veth0

# Use case 4: Connect to VM over bridge interface
ssh user@fe80::1:2:3:4%virbr0
```

## SCP and rsync with Link-Local

```bash
# SCP to link-local address (bracket notation required)
scp -6 file.txt "user@[fe80::1:2:3:4%eth0]:/remote/path/"

# Quote the remote spec so the brackets and % are passed literally
scp file.txt 'user@[fe80::1:2:3:4%eth0]:/path/'

# rsync to link-local
rsync -av -e "ssh -6" /local/dir/ "user@[fe80::1:2:3:4%eth0]:/remote/"
```

## Troubleshooting Link-Local SSH

```bash
# Error: "Network is unreachable" or "No route to host"
# Cause: Missing scope ID (interface)
# Wrong:  ssh user@fe80::1:2:3:4
# Right:  ssh user@fe80::1:2:3:4%eth0

# Verify the target is a neighbor
ping -6 fe80::1:2:3:4%eth0
ip -6 neigh | grep "fe80::1:2:3:4"

# Verify your interface has a link-local address
ip -6 addr show eth0 | grep "fe80"

# Check that sshd is listening on the remote
# (On remote: ss -6 -tlnp | grep 22)
```

## Summary

SSH to link-local IPv6 addresses (fe80::/10) by appending the network interface as a scope ID: `ssh user@fe80::1:2:3:4%eth0`. The interface is required because link-local addresses are not globally routable and the system needs to know which interface to use. For `~/.ssh/config`, set `HostName fe80::1:2:3:4%%eth0` because SSH config uses `%` for token expansion. For SCP/rsync, use bracket notation and quote the remote spec: `scp file 'user@[fe80::addr%eth0]:/path/'`. First verify reachability with `ping -6 fe80::addr%eth0`.
