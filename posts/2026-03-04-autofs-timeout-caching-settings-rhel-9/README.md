# How to Configure autofs Timeout and Caching Settings on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, autofs, Timeout, Caching, NFS, Linux

Description: Configure autofs timeout and caching parameters on RHEL to control when idle mounts are unmounted and how map data is cached.

---

autofs timeout and caching settings control two things: how long mounted file systems stay active after the last access, and how often autofs re-reads its map configuration. Tuning these settings affects system responsiveness, NFS server load, and resource usage.

## Mount Timeout

The mount timeout determines how long a mounted file system stays mounted after the last access. When the timeout expires, autofs unmounts the file system.

### Setting Timeout in the Master Map

```bash
# Per-mount-point timeout (in seconds)
/nfs /etc/auto.nfs --timeout=300
```

300 seconds = 5 minutes. After 5 minutes without any file access in `/nfs/*`, the NFS shares are unmounted.

### Setting the Global Default Timeout

Edit `/etc/autofs.conf`:

```bash
sudo vi /etc/autofs.conf
```

```
timeout = 300
```

Or in `/etc/sysconfig/autofs`:

```
TIMEOUT=300
```

### Timeout Values and Trade-offs

| Timeout | Behavior | Good For |
|---|---|---|
| 60 (1 min) | Quick unmount | Many users, limited NFS connections |
| 300 (5 min) | Default | General use |
| 600 (10 min) | Moderate persistence | Frequently accessed shares |
| 3600 (1 hour) | Long persistence | Build systems, batch processing |
| 0 | Never unmount | When you want permanent mounts via autofs |

Short timeouts reduce the number of active NFS mounts but increase mount/unmount overhead. Long timeouts keep mounts active longer but use more NFS connections.

### Disabling Timeout (Permanent Mount)

Set timeout to 0 to keep mounts active indefinitely:

```
/nfs /etc/auto.nfs --timeout=0
```

The mount is still on-demand (first access triggers it), but once mounted, it never automatically unmounts.

## Negative Timeout

The negative timeout controls how long autofs remembers a failed mount attempt before trying again:

```bash
# In /etc/autofs.conf
negative_timeout = 60
```

Default is 60 seconds. During this period, accessing the same failed mount point returns an error immediately without retrying the mount.

Reduce it if NFS servers recover quickly:

```
negative_timeout = 10
```

Increase it if you want to reduce retry traffic:

```
negative_timeout = 300
```

## Mount Wait Timeout

Controls how long autofs waits for a mount operation to complete:

```
# In /etc/autofs.conf
mount_wait = 30
```

Default is usually around 30 seconds. If your NFS server is slow to respond, increase this. If you want faster failure detection, decrease it.

## Map Caching

autofs can cache map data (the contents of map files) to reduce I/O when checking mounts. This is especially important for LDAP-based maps.

### Cache Settings in autofs.conf

```bash
sudo vi /etc/autofs.conf
```

```
# Map entry cache timeout (seconds)
# How long map entries are cached before re-reading
map_hash_table_size = 1024

# Browse mode - show mount points even when not mounted
browse_mode = no
```

### LDAP Map Caching with SSSD

When using SSSD for LDAP maps, SSSD handles caching:

```ini
# In /etc/sssd/sssd.conf
[domain/example.com]
# Cache timeout for automount entries
entry_cache_autofs_timeout = 86400
```

The default is to use the general `entry_cache_timeout` value (5400 seconds = 90 minutes). For infrequently changing maps, set a longer cache:

```ini
entry_cache_autofs_timeout = 86400  # 24 hours
```

To force a cache refresh:

```bash
sudo sss_cache -A
sudo systemctl restart autofs
```

## Browse Mode

Browse mode controls whether autofs shows mount point directories in directory listings:

```
# In /etc/autofs.conf
browse_mode = yes
```

With `browse_mode = yes`:
- `ls /nfs/` shows all possible mount point names (from the map)
- The directories appear without actually mounting them
- Makes tab completion work for unvisited mount points

With `browse_mode = no` (default):
- `ls /nfs/` shows only currently mounted directories
- Saves resources but tab completion does not work for unmounted paths

## Logging Configuration

Control the verbosity of autofs logging:

```
# In /etc/autofs.conf
logging = none
```

Options:
- `none`: Only log errors
- `verbose`: Log mount/unmount operations
- `debug`: Full debug output (very verbose)

For production:

```
logging = verbose
```

This logs mount and unmount events without the noise of full debug output.

## Applying Changes

After modifying `/etc/autofs.conf` or `/etc/sysconfig/autofs`:

```bash
sudo systemctl restart autofs
```

Verify the settings took effect:

```bash
sudo automount -m
```

## Performance Tuning Example

For a busy environment with many users and NFS shares:

```
# /etc/autofs.conf
timeout = 600
negative_timeout = 30
mount_wait = 15
browse_mode = no
logging = verbose
```

Master map:

```
/home /etc/auto.home --timeout=1800
/data /etc/auto.data --timeout=600
/tmp/shared /etc/auto.tmp --timeout=60
```

This uses different timeouts for different use cases:
- Home directories stay mounted for 30 minutes (users work in them for extended periods)
- Data shares unmount after 10 minutes
- Temporary shares unmount after 1 minute

## Conclusion

Timeout and caching settings let you balance between resource usage and responsiveness. Use shorter timeouts for infrequently accessed shares and longer timeouts for actively used mounts. For LDAP-based maps, configure SSSD cache timeouts to reduce LDAP queries. Monitor autofs logs with verbose logging to understand mount patterns and tune settings accordingly.
