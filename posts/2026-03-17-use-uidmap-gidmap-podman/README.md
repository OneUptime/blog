# How to Use uidmap and gidmap with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, uidmap, gidmap, User Namespaces

Description: Learn how to use --uidmap and --gidmap flags in Podman for precise control over UID and GID mappings between container and host.

---

> The `--uidmap` and `--gidmap` flags provide the most granular control over user namespace mappings, letting you define exactly how each container UID maps to a host or intermediate UID.

While `--userns` provides preset mapping modes, `--uidmap` and `--gidmap` let you specify custom mapping entries. This is essential when you need specific UIDs inside the container to map to specific IDs outside the container.

---

## Understanding the Map Format

The mapping format is `container_id:from_id:size`:

```bash
# Syntax: --uidmap container_id:from_id:size

# Maps a range of container UIDs to a range of host UIDs in rootful mode
# In rootless mode, from_id is an intermediate UID in Podman's user namespace

# Example: map container UID 0 to host UID 1000, one ID
# --uidmap 0:1000:1

# Example: map container UIDs 1-65536 to host UIDs 100000-165535
# --uidmap 1:100000:65536
```

## Basic Custom UID Mapping

```bash
# Map container root (UID 0) to your host UID
# Map container UIDs 1-65536 to subordinate UIDs
podman run --rm \
  --uidmap 0:0:1 \
  --uidmap 1:1:65536 \
  alpine:latest id

# In rootless mode, UID 0 in the mapping refers to your own UID
```

## Mapping a Specific Container UID to Your Host UID

```bash
# Map container UID 1000 to your host UID (UID 0 in rootless namespace)
# This is useful when the container app runs as UID 1000
podman run --rm \
  --uidmap 0:1:999 \
  --uidmap 1000:0:1 \
  --uidmap 1001:1000:64536 \
  alpine:latest sh -c "id; ls -la /tmp"
```

## Custom Mappings for Volume Permissions

```bash
# Problem: files in a bind mount are owned by a different UID
# Solution: map the container UID to match the file owner

# If files on host are owned by your UID and the container
# app runs as UID 33 (www-data), map container 33 to your host UID
podman run --rm \
  --uidmap 0:1:33 \
  --uidmap 33:0:1 \
  --uidmap 34:34:65502 \
  -v ./webroot:/var/www/html \
  php:apache ls -la /var/www/html
```

## Combining uidmap and gidmap

```bash
# Map both UIDs and GIDs for complete control
podman run --rm \
  --uidmap 0:0:1 \
  --uidmap 1:1:65536 \
  --gidmap 0:0:1 \
  --gidmap 1:1:65536 \
  alpine:latest id
```

## Practical Examples

```bash
# Isolate container with a unique UID range
podman run -d \
  --name isolated-app \
  --uidmap 0:1:65536 \
  --gidmap 0:1:65536 \
  my-app:latest

# Run two containers with non-overlapping UID ranges
podman run -d --name app1 \
  --uidmap 0:1:10000 \
  app:latest

podman run -d --name app2 \
  --uidmap 0:10001:10000 \
  app:latest

# These containers use non-overlapping subordinate UID ranges
```

## Viewing Active Mappings

```bash
# Check the UID map of a running container
podman exec my-container cat /proc/self/uid_map

# View mappings from the host perspective
podman inspect --format='{{json .HostConfig.IDMappings}}' my-container | python3 -m json.tool
```

## Troubleshooting

```bash
# Error: invalid uidmap entry
# Ensure mappings cover the full UID range needed by the container
# The total mapped size must cover all UIDs used in the image

# Error: uidmap ranges overlap
# Each container UID can only be mapped once
# Check that your ranges do not overlap

# Verify your subuid range is large enough
grep "$USER" /etc/subuid
```

## Summary

The `--uidmap` and `--gidmap` flags provide precise control over how container UIDs/GIDs map outside the container. Each mapping entry follows the `container_id:from_id:size` format. Use custom mappings when you need specific UIDs inside the container to correspond to specific IDs outside the container, when isolating containers with non-overlapping UID ranges, or when fixing volume permission mismatches. For most use cases, `--userns=keep-id` or `--userns=auto` is simpler, but `--uidmap`/`--gidmap` offers full flexibility when needed.
