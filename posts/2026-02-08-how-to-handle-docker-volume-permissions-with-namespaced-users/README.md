# How to Handle Docker Volume Permissions with Namespaced Users

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Volumes, Permissions, User Namespaces, Security, Linux, DevOps

Description: How to solve file permission issues when using Docker volumes with user namespace remapping for enhanced security.

---

Docker user namespaces remap container UIDs and GIDs to unprivileged ranges on the host. A process running as root (UID 0) inside the container actually runs as something like UID 100000 on the host. This is a powerful security feature because even if an attacker escapes the container, they are an unprivileged user on the host.

The downside is that volume permissions break. Files created by the container are owned by the remapped UID on the host, and files on the host are inaccessible to the container because the UIDs do not match. This guide shows you how to handle these permission issues properly.

## Understanding User Namespace Remapping

When you enable user namespaces, Docker sets up a mapping using the `dockremap` user. The mapping is defined in `/etc/subuid` and `/etc/subgid`:

```bash
# View the subordinate UID and GID ranges
cat /etc/subuid
cat /etc/subgid
```

A typical entry looks like:

```
dockremap:100000:65536
```

This means container UID 0 maps to host UID 100000, container UID 1 maps to host UID 100001, and so on up to container UID 65535 mapping to host UID 165535.

## Enabling User Namespace Remapping

Configure Docker to use user namespaces by editing the daemon config:

```bash
# Add userns-remap to Docker daemon configuration
cat > /etc/docker/daemon.json << 'EOF'
{
  "userns-remap": "default"
}
EOF

# Restart Docker to apply the change
sudo systemctl restart docker
```

The `"default"` setting creates the `dockremap` user automatically. You can also specify a specific user: `"userns-remap": "myuser"`.

Verify it is working:

```bash
# Run a container and check what UID root actually maps to
docker run --rm alpine id

# Check the actual UID on the host side
docker run --rm alpine sleep 60 &
ps aux | grep "sleep 60"
```

The `ps` output will show the process running under a high UID like 100000, not as root.

## The Volume Permission Problem

Here is the problem in action. Create a bind mount and try to use it:

```bash
# Create a directory owned by your regular user
mkdir /tmp/testdata
echo "hello" > /tmp/testdata/file.txt

# Try to read it from a namespaced container - this fails
docker run --rm -v /tmp/testdata:/data alpine cat /data/file.txt
```

The container cannot read the file because:
- The file is owned by your host UID (e.g., 1000)
- The container sees UID 1000 as a high UID outside its namespace
- The container process (running as remapped root) has no permission

Going the other direction, files created by the container have unexpected ownership on the host:

```bash
# Create a file from inside a namespaced container
docker run --rm -v /tmp/testdata:/data alpine touch /data/from-container.txt

# Check ownership on the host
ls -la /tmp/testdata/from-container.txt
# Output: -rw-r--r-- 1 100000 100000 ... from-container.txt
```

The file is owned by UID 100000 on the host, which is not a normal user.

## Solution 1: Set Ownership to the Remapped UID

The most direct fix is to set the host directory ownership to match the remapped UID:

```bash
# Find the remapped UID range
REMAP_UID=$(grep dockremap /etc/subuid | cut -d: -f2)
REMAP_GID=$(grep dockremap /etc/subgid | cut -d: -f2)

echo "Remapped root UID: $REMAP_UID, GID: $REMAP_GID"

# Change ownership of the volume directory to the remapped root
sudo chown -R "${REMAP_UID}:${REMAP_GID}" /opt/app-data
```

Now the container (running as remapped root) can read and write the directory.

If your container runs as a non-root user (e.g., UID 1000 inside the container), calculate the host UID:

```bash
# Container UID 1000 maps to host UID (remap_base + 1000)
APP_HOST_UID=$((REMAP_UID + 1000))
APP_HOST_GID=$((REMAP_GID + 1000))

sudo chown -R "${APP_HOST_UID}:${APP_HOST_GID}" /opt/app-data
```

## Solution 2: Use an Init Container to Fix Permissions

In Docker Compose, use an init service to set permissions before the main app starts:

```yaml
# docker-compose.yml with init container for permission fixing
version: "3.8"

services:
  # This runs first and sets correct permissions
  init-permissions:
    image: alpine
    user: "0:0"    # Run as root inside container (remapped on host)
    volumes:
      - app_data:/data
    command: >
      sh -c "
        chown -R 1000:1000 /data &&
        chmod 755 /data
      "

  app:
    image: myapp:latest
    user: "1000:1000"
    depends_on:
      init-permissions:
        condition: service_completed_successfully
    volumes:
      - app_data:/data

volumes:
  app_data:
```

The init container runs as root (which is remapped to an unprivileged host user), sets the ownership to UID 1000 (which maps to a specific remapped UID on the host), and then the app container runs as UID 1000 with the correct permissions.

## Solution 3: Use Named Volumes with Docker-Managed Permissions

Named volumes avoid many permission issues because Docker creates and manages them within the remapped namespace:

```bash
# Create a named volume - Docker handles permissions in the namespace
docker volume create myapp_data

# The volume works correctly with namespaced containers
docker run --rm -v myapp_data:/data alpine sh -c "echo test > /data/file.txt && cat /data/file.txt"
```

When possible, prefer named volumes over bind mounts in user namespace configurations.

## Solution 4: ACLs for Dual Access

If both the host user and the container need access to the same files, use POSIX ACLs:

```bash
# Install ACL utilities
sudo apt-get install -y acl

# Find the remapped UID
REMAP_UID=$(grep dockremap /etc/subuid | cut -d: -f2)

# Set ACLs to allow both the host user and the remapped container user
sudo setfacl -R -m u:${REMAP_UID}:rwx /opt/shared-data
sudo setfacl -R -m u:$(whoami):rwx /opt/shared-data

# Set default ACLs so new files inherit the permissions
sudo setfacl -R -d -m u:${REMAP_UID}:rwx /opt/shared-data
sudo setfacl -R -d -m u:$(whoami):rwx /opt/shared-data

# Verify the ACLs
getfacl /opt/shared-data
```

This allows both your host user and the container to read and write files without conflicts.

## Solution 5: Custom User Namespace Mapping

Instead of using the default `dockremap` user, map to your own user's subordinate range. This can simplify permission management:

```bash
# Check your user's subordinate UIDs
grep $(whoami) /etc/subuid

# If no entry exists, add one
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $(whoami)
```

Configure Docker to remap to your user:

```json
{
  "userns-remap": "youruser"
}
```

## Handling Volumes with Multiple Non-Root Users

When multiple containers with different UIDs need access to the same volume:

```yaml
# docker-compose.yml - multiple users sharing a volume
version: "3.8"

services:
  writer:
    image: myapp:latest
    user: "1000:2000"    # UID 1000, GID 2000 (shared group)
    volumes:
      - shared_data:/data

  reader:
    image: myapp:latest
    user: "1001:2000"    # UID 1001, same GID 2000
    volumes:
      - shared_data:/data:ro

  init:
    image: alpine
    user: "0:0"
    volumes:
      - shared_data:/data
    command: >
      sh -c "
        chgrp -R 2000 /data &&
        chmod -R g+rwX /data &&
        chmod g+s /data
      "

volumes:
  shared_data:
```

The init container sets the group and the setgid bit. All new files created in `/data` will inherit group 2000, so both the writer and reader can access them through group permissions.

## Debugging Permission Issues

When volumes do not work, check both the host and container perspectives:

```bash
# Check ownership from the host side
ls -lan /var/lib/docker/100000.100000/volumes/myapp_data/_data/

# Check ownership from inside the container
docker run --rm -v myapp_data:/data alpine ls -lan /data

# Check the user namespace mapping in use
docker inspect --format '{{.HostConfig.UsernsMode}}' my_container

# Check the effective user inside the container
docker exec my_container id
```

Compare the UIDs. The host UIDs should be the container UIDs plus the remap offset. If they do not match, your remapping configuration may not be active.

## Summary

User namespace remapping is one of the best security features Docker offers, but it requires deliberate handling of volume permissions. The simplest approach is to use named volumes and let Docker manage ownership. For bind mounts, calculate the remapped UIDs and set ownership accordingly. Use ACLs when both host and container users need concurrent access. The extra setup effort pays for itself with genuine container isolation that protects your host from container breakouts.
