# How to Understand POSIX Compatibility in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, POSIX, Filesystem

Description: Learn the extent of POSIX compatibility in CephFS and the known limitations that affect application compatibility in Rook-Ceph deployments.

---

## Overview

CephFS strives to be a fully POSIX-compliant distributed filesystem, enabling existing applications designed for local filesystems to run unmodified on shared storage. However, the distributed nature of CephFS introduces certain behaviors that differ from a local POSIX filesystem. Understanding these differences prevents subtle application bugs and helps you design workloads that are compatible with CephFS.

## What CephFS Supports

CephFS fully supports the core POSIX filesystem operations:

```text
- Directory operations: mkdir, rmdir, opendir, readdir, closedir
- File operations: open, read, write, close, truncate, unlink
- Link operations: link, symlink, readlink, unlink
- Attribute operations: stat, chmod, chown, utimes
- Extended attributes: setxattr, getxattr, listxattr, removexattr
- File locking: flock (BSD locks), fcntl (POSIX locks)
- Atomic rename: rename (POSIX guarantee maintained)
```

## Known Limitations and Differences

### Close-to-Open Consistency

CephFS implements close-to-open (CAO) consistency rather than strict POSIX consistency. Data written by one client becomes visible to other clients after the writing client closes the file:

```text
Client A: write() -> close()  [data visible to others after this]
Client B: open() -> read()    [will see Client A's data]
```

Applications that share files and expect immediate visibility across clients may see stale data if they do not close files between writes.

### Locking Behavior

Advisory file locks (`flock`, `fcntl`) work correctly within a single CephFS mount but have limitations across disconnected clients:

```bash
# Test file locking behavior
python3 -c "
import fcntl, os, time
fd = os.open('/mnt/cephfs/locktest', os.O_RDWR | os.O_CREAT)
fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
print('Lock acquired')
time.sleep(10)
os.close(fd)
"
```

### Sparse File Behavior

CephFS supports sparse files but `du` may report different values than `ls -l` for sparse files because `du` measures actual storage allocated:

```bash
# Create a sparse file
dd if=/dev/zero of=/mnt/cephfs/sparsefile bs=1M count=1 seek=1000
ls -lh /mnt/cephfs/sparsefile   # Shows 1001M
du -sh /mnt/cephfs/sparsefile   # Shows much less (actual data)
```

### mmap and Direct I/O

CephFS supports `mmap` for memory-mapped files, but certain direct I/O flags may behave differently than on local filesystems. Test your application's mmap usage:

```python
import mmap
import os

fd = os.open('/mnt/cephfs/mmaptest', os.O_RDWR | os.O_CREAT)
os.write(fd, b'\x00' * 4096)
mm = mmap.mmap(fd, 4096)
mm[0:5] = b'hello'
mm.flush()
mm.close()
os.close(fd)
```

### NFS Re-export

CephFS does not fully support NFS re-export semantics. Use Rook's Ganesha NFS gateway (`CephNFS`) for proper NFS serving of CephFS content.

## Summary

CephFS provides strong POSIX compatibility for the vast majority of workloads, including databases, web applications, and build systems. The primary behavioral difference is close-to-open consistency rather than strict POSIX consistency, which affects applications sharing files across clients without file close operations. For most Rook-Ceph deployments, CephFS is a drop-in replacement for local filesystems, but high-performance or multi-writer applications should be tested for compatibility with the CAO consistency model.
