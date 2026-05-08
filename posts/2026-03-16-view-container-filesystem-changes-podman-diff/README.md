# How to View Container Filesystem Changes with podman diff

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Filesystem, Container Inspection

Description: Learn how to use podman diff to see which files were added, changed, or deleted inside a container compared to its original image.

---

> podman diff reveals exactly what changed in a container's filesystem, making it invaluable for auditing, debugging, and understanding container drift.

Containers start from a clean image, but as they run, files get created, modified, and deleted. The `podman diff` command shows you exactly what changed in a container's filesystem compared to its base image. This is essential for debugging, security auditing, and deciding whether to commit container changes to a new image.

---

## Basic Usage

View all filesystem changes in a container:

```bash
# Start a container and make some changes

podman run -d --name my-app nginx:latest
podman exec my-app touch /tmp/newfile.txt
podman exec my-app /bin/bash -c "echo 'modified' >> /etc/hostname"

# View the changes
podman diff my-app
```

## Understanding the Output

The output uses a prefix letter to indicate the type of change:

```bash
# A = Added (new file or directory)
# C = Changed (modified file or directory)
# D = Deleted (removed file or directory)

# Example output:
# C /tmp
# A /tmp/newfile.txt
# C /etc
# C /etc/hostname
```

The `C` prefix on directories means something inside them changed.

## Practical Examples

### Tracking File Creation

```bash
# Start fresh
podman run -d --name file-test alpine /bin/sh -c "sleep 3600"

# Create some files
podman exec file-test touch /tmp/file1.txt
podman exec file-test mkdir -p /opt/myapp/data
podman exec file-test touch /opt/myapp/data/config.yml

# See what was added
podman diff file-test
# C /tmp
# A /tmp/file1.txt
# A /opt
# A /opt/myapp
# A /opt/myapp/data
# A /opt/myapp/data/config.yml
```

### Tracking File Modifications

```bash
# Modify existing files
podman exec file-test /bin/sh -c "echo 'new content' > /etc/motd"

# Check the diff
podman diff file-test | grep "^C"
# C /etc
# C /etc/motd
```

### Tracking File Deletions

```bash
# Delete a file
podman exec file-test rm /etc/motd

# Check the diff
podman diff file-test | grep "^D"
# D /etc/motd
```

## Filtering Changes by Type

Use grep to filter for specific change types:

```bash
# Show only added files
podman diff my-app | grep "^A"

# Show only changed files
podman diff my-app | grep "^C"

# Show only deleted files
podman diff my-app | grep "^D"

# Count changes by type
echo "Added:   $(podman diff my-app | grep -c "^A")"
echo "Changed: $(podman diff my-app | grep -c "^C")"
echo "Deleted: $(podman diff my-app | grep -c "^D")"
```

## Comparing Before Package Installation

A common use case is seeing what a package installation changes:

```bash
# Start a clean container
podman run -d --name pkg-test ubuntu:latest sleep 3600

# Check diff before (should be minimal)
podman diff pkg-test

# Install a package
podman exec pkg-test /bin/bash -c "apt-get update -qq && apt-get install -y -qq curl"

# See all the changes
podman diff pkg-test | head -30

# Count total changes
echo "Total filesystem changes: $(podman diff pkg-test | wc -l)"
```

## Security Auditing

Check for unexpected changes in a container:

```bash
# Look for changes in sensitive directories
podman diff my-app | grep -E "^(A|C) /(etc|usr|bin|sbin)"

# Check for new executable files
podman diff my-app | grep "^A" | while read change path; do
    if podman exec my-app test -x "$path" 2>/dev/null; then
        echo "NEW EXECUTABLE: $path"
    fi
done

# Look for changes to system binaries
podman diff my-app | grep -E "/(bin|sbin|usr/bin|usr/sbin)/"
```

## Using diff with Stopped Containers

`podman diff` works on stopped containers too:

```bash
# Stop a container
podman stop file-test

# Still see the changes
podman diff file-test
```

## Diff for Image Layers

You can also diff an image to see what it adds or changes compared to its parent layer:

```bash
# Diff an image against its parent layer
podman diff --format json nginx:latest 2>/dev/null | head -20
```

## Deciding Whether to Commit Changes

Use diff to decide if a container's changes should be saved:

```bash
# Review all changes before committing
echo "Changes to be committed:"
podman diff my-app

# If satisfied, commit to a new image
# podman commit my-app my-custom-image:v1
```

## Scripting with diff

```bash
# Monitor containers for unexpected changes
for name in $(podman ps --format '{{.Names}}'); do
    changes=$(podman diff "$name" 2>/dev/null | wc -l)
    if [ "$changes" -gt 50 ]; then
        echo "WARNING: $name has $changes filesystem changes"
    else
        echo "OK: $name has $changes filesystem changes"
    fi
done
```

## Cleanup

```bash
podman stop my-app file-test pkg-test 2>/dev/null
podman rm my-app file-test pkg-test 2>/dev/null
```

## Summary

The `podman diff` command compares a container's current filesystem with its original image, showing added (A), changed (C), and deleted (D) files. Use it for security auditing, understanding package installations, debugging file-related issues, and deciding whether to commit container changes. It works on both running and stopped containers.
