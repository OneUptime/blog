# How to Configure bindfs for Directory Rebinding on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Filesystems, FUSE

Description: Learn how to use bindfs on Ubuntu to mirror directories with different ownership and permissions, useful for sharing files between users and Docker containers without changing real file ownership.

---

bindfs is a FUSE filesystem that mounts a directory at a new location while remapping ownership, group membership, and permissions. Unlike a regular bind mount, which preserves the original permissions, bindfs lets you present a directory with entirely different uid/gid mappings. This is particularly useful when sharing files between users, running Docker containers that expect specific UIDs, or giving web servers access to files owned by another user.

## Installing bindfs

```bash
# Install bindfs from Ubuntu repositories
sudo apt update
sudo apt install bindfs -y

# Verify installation
bindfs --version
```

## Basic Usage: Remounting with Different Ownership

The most common use case is mounting a directory so that it appears to be owned by a different user.

```bash
# Create source and mirror directories
mkdir -p /home/alice/projects
mkdir -p /mnt/alice-projects

# Create some test files as alice
su - alice -c "echo 'hello' > /home/alice/projects/test.txt"

# Mount alice's directory so it appears owned by bob
sudo bindfs \
    -u bob \
    -g bob \
    /home/alice/projects \
    /mnt/alice-projects

# Check permissions from alice's perspective
ls -la /home/alice/projects/
# -rw-r--r-- 1 alice alice 6 Mar  2 12:00 test.txt

# Check through bindfs mount - appears owned by bob
ls -la /mnt/alice-projects/
# -rw-r--r-- 1 bob bob 6 Mar  2 12:00 test.txt
```

## Understanding Permission Mapping

bindfs allows fine-grained control over how permissions are translated.

```bash
# Mirror a directory with all files appearing group-writable
sudo bindfs \
    --perms=og+w \
    /srv/shared-data \
    /mnt/group-write-view

# Force specific permission bits
# --perms accepts symbolic permission modifications
sudo bindfs \
    --perms=a+rX,og-w \
    /srv/readonly-data \
    /mnt/readonly-view

# Only expose files matching certain criteria
# Force all files to appear with 644 permissions
sudo bindfs \
    --create-with-perms=0644 \
    --perms=0644 \
    /srv/source \
    /mnt/target
```

## Sharing Files Between Containers and Host

A common real-world problem: your web application runs as `www-data` (UID 33), but your source files are owned by your developer user (UID 1000). bindfs provides a clean solution.

```bash
# Developer files owned by user alice (uid=1000)
ls -la /home/alice/webapp/
# drwxr-xr-x alice alice ... webapp/
# -rw-r--r-- alice alice ... index.php

# Create a directory accessible to www-data
sudo mkdir -p /var/www/webapp

# Mount with ownership remapped to www-data
sudo bindfs \
    -u www-data \
    -g www-data \
    /home/alice/webapp \
    /var/www/webapp

# Now Nginx/Apache can read the files as www-data
ls -la /var/www/webapp/
# -rw-r--r-- www-data www-data ... index.php

# Developer can still edit files via original path
su - alice -c "nano /home/alice/webapp/index.php"
# Changes are immediately visible via the bindfs mount
```

## Docker Container Use Case

Docker containers often run as specific UIDs. bindfs lets you present host directories with the UID the container expects.

```bash
# Your app container runs as UID 999 (appuser inside container)
# Host files are owned by UID 1000

# Create a bindfs-remapped directory for Docker to use
sudo mkdir -p /mnt/container-data

sudo bindfs \
    -u 999 \
    -g 999 \
    --create-for-user=999 \
    --create-for-group=999 \
    /data/myapp \
    /mnt/container-data

# Run container using the remapped directory
docker run \
    -v /mnt/container-data:/app/data \
    --user 999:999 \
    myapp:latest
```

## Persistent Mounts with /etc/fstab

For permanent bindfs mounts, add them to `/etc/fstab`.

```bash
sudo nano /etc/fstab
```

```text
# bindfs mount: present /srv/source as owned by www-data
/srv/source  /var/www/data  fuse.bindfs  force-user=www-data,force-group=www-data,perms=0644:+X  0  0
```

The options for fstab use the long-form names:

```text
# Common fstab bindfs options:
# force-user=USERNAME   - force owner to this user
# force-group=GROUPNAME - force group to this group
# perms=MODE            - force permission mode
# create-for-user=UID   - new files created as this user
# create-for-group=GID  - new files created as this group
# multithreaded         - enable multithreaded mode
```

```bash
# Mount all fstab entries
sudo mount -a

# Verify the mount
mount | grep bindfs
```

## Mirror Mode for Backups and Sync

Use bindfs to create a view of a directory tree with normalized permissions for backup tools.

```bash
# Create a consistent view of /home for backups
# - All files appear readable (even those that are mode 600)
# - Owned by backup user
sudo mkdir -p /mnt/backup-view

sudo bindfs \
    -u backup \
    -g backup \
    --perms=u+rX \
    /home \
    /mnt/backup-view

# Now run backup against /mnt/backup-view
rsync -a /mnt/backup-view/ backup@nas:/backup/home/
```

## Rate Limiting File Access

bindfs can also apply rate limiting to read and write operations.

```bash
# Limit read speed to 10MB/s (useful for throttling large file access)
sudo bindfs \
    --read-rate=10485760 \
    /srv/large-files \
    /mnt/throttled-files

# Limit write speed to 5MB/s
sudo bindfs \
    --write-rate=5242880 \
    /srv/incoming \
    /mnt/limited-incoming
```

## Setting Up as a Non-Root User

bindfs is a FUSE filesystem, so regular users can mount it if configured properly.

```bash
# Allow users to mount FUSE filesystems
# This is already the default on Ubuntu (check /etc/fuse.conf)
grep user_allow_other /etc/fuse.conf
# user_allow_other (should be uncommented)

# If not enabled:
sudo sed -i 's/#user_allow_other/user_allow_other/' /etc/fuse.conf

# Regular user can mount with their own home as source
bindfs \
    -u $(id -u) \
    -g $(id -g) \
    ~/documents \
    ~/documents-mirror

# Unmount as regular user
fusermount -u ~/documents-mirror
```

## Combining bindfs with OverlayFS

A powerful pattern for container workloads: use OverlayFS for copy-on-write, then bindfs to remap ownership.

```bash
# Set up overlay filesystem
mkdir -p /tmp/overlay/{lower,upper,work,merged}
cp -a /srv/base-content/. /tmp/overlay/lower/

sudo mount -t overlay overlay \
    -o lowerdir=/tmp/overlay/lower,upperdir=/tmp/overlay/upper,workdir=/tmp/overlay/work \
    /tmp/overlay/merged

# Now mount the overlay view with remapped ownership via bindfs
mkdir -p /mnt/app-view
sudo bindfs -u appuser -g appuser /tmp/overlay/merged /mnt/app-view

# The application sees files owned by appuser
# Writes go to the upper overlay layer
# The original lower content is never modified
```

## Unmounting bindfs

```bash
# Unmount a bindfs filesystem
sudo umount /mnt/alice-projects

# Or use fusermount (works for non-root mounts)
fusermount -u /mnt/alice-projects

# Force unmount if busy
sudo umount -l /mnt/alice-projects

# Verify it is unmounted
mount | grep alice-projects
```

bindfs solves a class of problems elegantly: presenting the same underlying files to different processes or users with different ownership and permission requirements, without duplicating data or changing the real file attributes. This makes it particularly valuable in development environments where your editor, your application, and your web server all need to access the same files with different UIDs.
