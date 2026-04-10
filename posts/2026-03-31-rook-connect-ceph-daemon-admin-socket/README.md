# How to Connect to a Ceph Daemon Admin Socket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Admin Socket, Daemon, Debug, Operation

Description: Connect to a Ceph daemon admin socket to inspect runtime state, dump performance counters, and issue live commands without restarting the daemon.

---

## Overview

Every Ceph daemon (OSD, MON, MGR, MDS, RGW) creates a Unix domain socket called an admin socket. This socket provides a direct command interface to the running daemon for diagnostics, configuration changes, and performance monitoring without requiring daemon restarts.

## Finding Admin Socket Paths

```bash
# Default location for admin sockets
ls /var/run/ceph/

# List all admin sockets in a cluster
ls /var/run/ceph/*.asok

# Example output:
# ceph-osd.0.asok
# ceph-osd.1.asok
# ceph-mon.hostname.asok
# ceph-mds.hostname.asok
# ceph-mgr.hostname.asok
```

For RGW the socket naming follows the daemon ID:

```bash
ls /var/run/ceph/ceph-client.rgw.*.asok
```

## Connecting with ceph daemon

The `ceph daemon` command is the standard way to interact with admin sockets:

```bash
# General syntax
ceph daemon <socket-path> <command>

# Or use the daemon type and ID
ceph daemon osd.0 help
ceph daemon mon.$(hostname) help
ceph daemon client.rgw.myzone help
```

## Direct Socket Access with ceph --admin-daemon

For scripting or when `ceph daemon` is not available:

```bash
# Direct socket communication
ceph --admin-daemon /var/run/ceph/ceph-osd.0.asok help

# Using the asok file path directly
ceph --admin-daemon /var/run/ceph/ceph-client.rgw.myzone.asok help
```

## Connecting to Sockets in Kubernetes (Rook)

In a Rook-managed cluster, admin sockets are inside containers:

```bash
# List OSD pods
kubectl -n rook-ceph get pods -l app=rook-ceph-osd

# Exec into an OSD pod
kubectl -n rook-ceph exec -it rook-ceph-osd-0-<hash> -- bash

# Find and use the admin socket inside the container
ls /var/run/ceph/
ceph --admin-daemon /var/run/ceph/ceph-osd.0.asok help
```

Note that `ceph daemon` requires local access to the Unix domain socket, so it only works from inside the daemon's own pod. From the Rook toolbox, use `ceph tell` instead, which sends commands over the network via the monitors:

```bash
# Get into the Rook toolbox
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Use ceph tell to send commands to daemons over the network
ceph tell osd.0 help
ceph tell client.rgw.myzone help
```

## Verifying Socket is Responsive

```bash
# Quick test - get version info
ceph daemon osd.0 version

# Check if socket file exists and is a socket
test -S /var/run/ceph/ceph-osd.0.asok && echo "Socket exists" || echo "Socket not found"
```

## Common Connection Issues

```bash
# Permission denied - add user to ceph group
usermod -aG ceph $USER
newgrp ceph

# Socket not found - check if daemon is running
systemctl status ceph-osd@0
ps aux | grep ceph-osd

# Verify socket path from ceph.conf
ceph config get osd.0 admin_socket
```

## Summary

The Ceph admin socket provides direct access to running daemon internals through Unix domain sockets. Use `ceph daemon` for interactive use and `ceph --admin-daemon` for scripting. In Rook environments, exec into the relevant pod or use the toolbox to access admin sockets. Admin socket access is essential for live diagnostics, performance counters, and runtime configuration changes.
