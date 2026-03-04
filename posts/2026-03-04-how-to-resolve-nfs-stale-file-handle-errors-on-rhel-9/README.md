# How to Resolve 'NFS Stale File Handle' Errors on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting, NFS

Description: Step-by-step guide on resolve 'nfs stale file handle' errors on RHEL with practical examples and commands.

---

NFS stale file handle errors on RHEL occur when the server-side file or export changes while the client holds a reference. Here is how to resolve them.

## Identify the Error

```bash
ls /mnt/nfs-share
# ls: cannot access '/mnt/nfs-share': Stale file handle
```

## Quick Fix - Remount

```bash
sudo umount -f /mnt/nfs-share
sudo mount -t nfs server:/export /mnt/nfs-share
```

If umount fails:

```bash
sudo umount -l /mnt/nfs-share
sudo mount -t nfs server:/export /mnt/nfs-share
```

## Check NFS Server Status

On the server:

```bash
sudo systemctl status nfs-server
sudo exportfs -v
```

## Verify Exports

```bash
# On the server
sudo exportfs -ra

# On the client
showmount -e nfs-server
```

## Check for Server-Side Changes

The stale handle usually means:
- The exported directory was renamed or deleted on the server
- The NFS server was restarted and the fsid changed
- The underlying filesystem was remounted

## Fix with Consistent fsid

On the server, set a consistent fsid:

```bash
sudo vi /etc/exports
```

```
/export 10.0.0.0/24(rw,sync,no_root_squash,fsid=100)
```

Apply changes:

```bash
sudo exportfs -ra
```

## Prevent Stale Handles

Use autofs instead of static mounts:

```bash
sudo dnf install -y autofs

# Configure autofs
echo "/mnt/nfs /etc/auto.nfs" | sudo tee -a /etc/auto.master
echo "share -rw,soft,intr server:/export" | sudo tee /etc/auto.nfs

sudo systemctl enable --now autofs
```

## NFS Mount Options

Use mount options that handle stale handles gracefully:

```bash
sudo mount -t nfs -o soft,timeo=10,retrans=3 server:/export /mnt/nfs-share
```

## Conclusion

NFS stale file handle errors on RHEL are resolved by remounting the share and ensuring server-side export consistency. Use autofs and the soft mount option for more resilient NFS client configurations.

