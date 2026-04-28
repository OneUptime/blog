# How to Troubleshoot NFS Mount Failures on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NFS, IPv4, Troubleshooting, Mount, Debugging, Linux

Description: Diagnose and fix common NFS mount failures including connection refused, access denied, stale file handle, and timeout errors on IPv4 networks.

## Introduction

NFS mount failures manifest as cryptic errors. Systematic diagnosis starting from network connectivity through RPC availability to export permissions resolves most issues quickly. This guide covers the most common failure modes and their fixes.

## Diagnostic Steps

```bash
# Step 1: Verify network connectivity

ping -c 3 203.0.113.10

# Step 2: Check if NFS server is running
ssh 203.0.113.10 "sudo systemctl status nfs-kernel-server"

# Step 3: Check RPC portmapper
rpcinfo -p 203.0.113.10
# Expected: lists nfs, mountd, etc.

# Step 4: Check available exports
showmount -e 203.0.113.10

# Step 5: Attempt verbose mount
sudo mount -v -t nfs 203.0.113.10:/srv/data /mnt/test
```

## Common Errors and Fixes

### mount.nfs: Connection refused

```bash
# Cause: NFS server not running or port blocked

# Fix 1: Start NFS server
sudo systemctl start nfs-kernel-server
sudo systemctl status nfs-kernel-server

# Fix 2: Check firewall
sudo iptables -L INPUT -n | grep 2049
# Open port if needed:
sudo iptables -A INPUT -p tcp --dport 2049 -j ACCEPT

# Fix 3: Check RPC is running
sudo systemctl start rpcbind
rpcinfo -p localhost
```

### mount.nfs: Access denied

```bash
# Cause: Client IP not in /etc/exports

# Check exports on server:
sudo exportfs -v

# If client IP is missing, add it:
# /etc/exports
# /srv/data  203.0.113.20(rw,sync,no_subtree_check)

# Re-export:
sudo exportfs -ra

# Verify the client IP is now listed:
sudo showmount -e localhost
```

### mount.nfs: Stale file handle

```bash
# Cause: Server was restarted or export was removed and re-added

# Fix on client:
sudo umount -f /mnt/nfs   # Force unmount

# If busy:
sudo umount -l /mnt/nfs   # Lazy unmount

# Re-mount:
sudo mount -t nfs 203.0.113.10:/srv/data /mnt/nfs

# If the issue persists, restart NFS server:
sudo systemctl restart nfs-kernel-server
```

### mount.nfs: No route to host

```bash
# Cause: Network/firewall issue

# Check routing
ip route get 203.0.113.10

# Check firewall
sudo iptables -L -n | grep DROP

# Temporarily disable firewall to isolate:
sudo systemctl stop ufw   # Temporarily disable
sudo mount -t nfs 203.0.113.10:/srv/data /mnt/test
sudo systemctl start ufw

# Check if specific ports are blocked:
nc -zv 203.0.113.10 2049   # Test NFS port
nc -zv 203.0.113.10 111    # Test portmapper
```

### Mount hangs (no output)

```bash
# Cause: Server unreachable but using 'hard' mount option

# Try to interrupt the hung process (note: 'intr' option is a no-op since kernel 2.6.25)
# Kill the hung mount process:
sudo kill -9 $(pgrep mount.nfs)

# Use soft mount to get error instead of hang:
sudo mount -t nfs -o soft,timeo=30 203.0.113.10:/srv/data /mnt/test

# Check if it's a firewall state issue:
sudo conntrack -L | grep 203.0.113.10
```

## Server-Side Diagnostics

```bash
# Check NFS server logs
sudo journalctl -u nfs-kernel-server --since "10 minutes ago"

# Check RPC log
sudo journalctl -u rpcbind -f

# Monitor NFS traffic
sudo tcpdump -i eth0 -n "host 203.0.113.20 and port 2049"

# Check active NFS connections
sudo ss -tnp | grep 2049

# Review exports configuration
sudo exportfs -v 2>&1
cat /etc/exports
```

## Conclusion

NFS mount troubleshooting follows a clear path: verify network connectivity, confirm NFS/RPC services are running, check firewall rules on both client and server, verify the client IP appears in `/etc/exports`, and use verbose mount (`-v`) for detailed error output. For recurring stale handle issues, check NFS server restart procedures and ensure clients unmount cleanly before server maintenance.
