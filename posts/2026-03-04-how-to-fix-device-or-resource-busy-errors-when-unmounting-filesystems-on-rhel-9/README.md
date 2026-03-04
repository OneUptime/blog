# How to Fix 'Device or Resource Busy' When Unmounting on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting

Description: Step-by-step guide on fix 'device or resource busy' errors when unmounting filesystems on rhel 9 with practical examples and commands.

---

The "Device or resource busy" error when unmounting a filesystem on RHEL 9 means a process is still using files on that mount point.

## Identify What is Using the Mount

```bash
sudo fuser -mv /mnt/data
sudo lsof +D /mnt/data
```

## Find the Specific Processes

```bash
sudo fuser -v /mnt/data
```

This shows PIDs, users, and access types.

## Terminate the Processes

Gracefully:

```bash
sudo fuser -k /mnt/data
```

Forcefully:

```bash
sudo fuser -k -9 /mnt/data
```

## Check for Shell Sessions

```bash
# Check if any shell has the mount as cwd
sudo fuser -mv /mnt/data | grep bash
```

Change directory out of the mount point in all sessions.

## Lazy Unmount

```bash
sudo umount -l /mnt/data
```

This detaches the filesystem immediately and cleans up references when they are released.

## Force Unmount (NFS)

```bash
sudo umount -f /mnt/nfs-share
```

## Check for Loop Devices

```bash
losetup -a | grep /mnt/data
```

Detach if found:

```bash
sudo losetup -d /dev/loop0
```

## Check for Swap Files

```bash
swapon --show | grep /mnt/data
sudo swapoff /mnt/data/swapfile
```

## Check for Bind Mounts

```bash
mount | grep /mnt/data
sudo umount /mnt/data/bind-target
```

## Conclusion

"Device or resource busy" errors on RHEL 9 require identifying and stopping processes that hold references to the mounted filesystem. Use fuser and lsof to find the culprits, then unmount after releasing all references.

