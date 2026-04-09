# How to Use the CephFS Shell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Shell, Administration

Description: Learn how to use the CephFS Shell to interactively browse and manage CephFS filesystems without mounting them on the host filesystem.

---

## Overview

The CephFS Shell (`cephfs-shell`) is an interactive command-line tool that provides filesystem operations on a CephFS instance without requiring a traditional mount. It connects directly to the CephFS metadata and data services, making it ideal for administrative tasks, diagnostics, and automation in environments where mounting is not convenient or possible.

## Installation

The CephFS Shell is part of the `cephfs-shell` package or included in `ceph-common` on some distributions:

```bash
# Debian/Ubuntu (requires Ceph apt repository)
apt-get install -y cephfs-shell
```

## Basic Usage in Rook Toolbox

The easiest way to use the CephFS Shell in a Rook-Ceph cluster is from the toolbox pod:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-shell
```

## Interactive Shell Commands

Once inside the shell, you can use familiar filesystem commands:

```text
CephFS:~/>>>  ls
CephFS:~/>>>  ls /mydir
CephFS:~/>>>  cd /mydir
CephFS:~/mydir>>>  mkdir newfolder
CephFS:~/mydir>>>  put /tmp/localfile.txt remotefile.txt
CephFS:~/mydir>>>  get remotefile.txt /tmp/downloaded.txt
CephFS:~/mydir>>>  rm oldfile.txt
CephFS:~/mydir>>>  stat myfile.txt
CephFS:~/mydir>>>  du .
CephFS:~/mydir>>>  quit
```

## Run Commands Non-Interactively

Execute single commands without entering interactive mode:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-shell -- ls /

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-shell -- du /myapp
```

## Set and View Extended Attributes

Manage extended attributes (xattrs) used for layout configuration:

```text
CephFS:~/>>>  setxattr /mydir ceph.dir.layout.stripe_count 4
CephFS:~/>>>  getxattr /mydir ceph.dir.layout
```

## Check Quotas

View directory quota settings from within the shell:

```text
CephFS:~/>>>  getxattr /mydir ceph.quota.max_bytes
CephFS:~/>>>  getxattr /mydir ceph.quota.max_files
```

## Batch Operations with Scripts

Use the shell in script mode to automate filesystem operations:

```bash
cat > /tmp/cephfs_ops.txt <<EOF
mkdir /backup
mkdir /backup/2026
put /local/data.tar.gz /backup/2026/data.tar.gz
chmod 750 /backup
EOF

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-shell -b /tmp/cephfs_ops.txt
```

## Connect to a Specific Filesystem

For multi-filesystem clusters, specify the target filesystem:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  cephfs-shell --fs cephfs2
```

## Summary

The CephFS Shell provides a convenient, mount-free way to interact with CephFS filesystems for administrative and automation tasks. It supports standard filesystem operations including directory management, file transfers, extended attribute management, and quota inspection. In Rook-Ceph clusters, running `cephfs-shell` from the toolbox pod is the most straightforward approach, requiring no host-level configuration or mount setup.
