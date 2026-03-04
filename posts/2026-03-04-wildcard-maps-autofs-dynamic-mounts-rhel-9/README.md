# How to Use Wildcard Maps in autofs for Dynamic Mounts on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, autofs, Wildcard Maps, NFS, Dynamic Mounts, Linux

Description: Use wildcard maps in autofs on RHEL to dynamically mount any subdirectory on demand without creating individual map entries.

---

Wildcard maps in autofs let you handle an unlimited number of mount points with a single map entry. Instead of listing every possible subdirectory, you define a pattern that matches any name. This is commonly used for user home directories but works for any scenario where mount points follow a predictable pattern.

## Wildcard Syntax

In an autofs map file, the asterisk (`*`) matches any key (subdirectory name), and the ampersand (`&`) in the source is replaced with the matched key.

```
*  -rw,soft  nfsserver:/export/&
```

When someone accesses `/mnt/data/projects`, autofs replaces `*` with `projects` and mounts `nfsserver:/export/projects`.

## Basic Wildcard Example

### Master Map

```bash
sudo tee /etc/auto.master.d/data.autofs << 'EOF'
/data /etc/auto.data
EOF
```

### Map File with Wildcard

```bash
sudo tee /etc/auto.data << 'EOF'
* -rw,soft,intr nfsserver:/export/data/&
EOF
```

Restart autofs:

```bash
sudo systemctl restart autofs
```

### Test

```bash
# Any directory name under /data/ triggers a mount
ls /data/projects/    # Mounts nfsserver:/export/data/projects
ls /data/archives/    # Mounts nfsserver:/export/data/archives
ls /data/anything/    # Mounts nfsserver:/export/data/anything
```

The mount only succeeds if the corresponding NFS export exists on the server.

## Combining Wildcards with Explicit Entries

You can mix wildcard and explicit entries. Explicit entries take precedence:

```bash
sudo tee /etc/auto.data << 'EOF'
projects   -rw,soft  nfsserver1:/export/projects
archives   -ro,soft  nfsserver2:/export/archives
*          -rw,soft  nfsserver1:/export/data/&
EOF
```

- Accessing `/data/projects` mounts from `nfsserver1:/export/projects`
- Accessing `/data/archives` mounts read-only from `nfsserver2:/export/archives`
- Accessing `/data/anything-else` falls through to the wildcard and mounts from `nfsserver1:/export/data/anything-else`

## Multi-Level Wildcard Paths

You can use the `&` substitution in more complex paths:

```bash
# Mount user data organized by department
# NFS exports: /export/dept/engineering/alice, /export/dept/sales/bob, etc.
sudo tee /etc/auto.master.d/users.autofs << 'EOF'
/users /etc/auto.users
EOF

sudo tee /etc/auto.users << 'EOF'
* -rw,soft nfsserver:/export/users/&
EOF
```

## Wildcard with Multiple Servers

If you want to mount from a server that matches the key name:

```bash
# Key is the server name
sudo tee /etc/auto.servers << 'EOF'
* -rw,soft &:/export/data
EOF
```

Accessing `/mnt/server1` mounts `server1:/export/data`.

## Wildcard with Subdirectory Mounts

Mount multiple subdirectories from the same NFS server for each key:

```bash
sudo tee /etc/auto.projects << 'EOF'
* -rw,soft nfsserver:/export/projects/&/code \
           nfsserver:/export/projects/&/docs \
           nfsserver:/export/projects/&/builds
EOF
```

This creates multi-mount entries for each project.

## Wildcard for Home Directories

The most common wildcard use case:

```bash
# /etc/auto.home
* -rw,soft,intr nfsserver:/export/home/&
```

Every user's home directory is mounted on demand. No need to add new entries when creating new users.

## Debugging Wildcard Resolution

To see how autofs resolves wildcards:

```bash
# Enable debug logging
sudo vi /etc/sysconfig/autofs
# Set: LOGGING="debug"

sudo systemctl restart autofs

# Try accessing a mount
ls /data/testdir/

# Check the logs
sudo journalctl -u autofs | tail -30
```

You will see entries like:

```
attempting to mount entry /data/testdir
lookup_mount: lookup(file): looking up testdir
lookup_mount: lookup(file): testdir -> -rw,soft nfsserver:/export/data/testdir
```

## Performance Considerations

Wildcard maps with many active mounts can generate significant NFS traffic. Consider:

```bash
# Increase the timeout to reduce mount/unmount cycles
/data /etc/auto.data --timeout=1800
```

## Limitations

- Wildcards only match a single path component (not `/data/a/b`)
- Tab completion may not work for unmounted paths (the directory does not exist until accessed)
- `ls /data/` on the parent directory does not show possible mounts (since they are dynamic)

## Conclusion

Wildcard maps are a powerful autofs feature for environments with many possible mount points that follow a pattern. A single wildcard entry replaces potentially hundreds of explicit entries. They are essential for user home directory automounting and useful for any structured NFS export hierarchy.
