# How to Use the --mount Flag vs --volume Flag in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Mount, CLI

Description: Learn the differences between the --mount and --volume flags in Podman and when to use each one.

---

> Podman provides two syntaxes for mounting volumes: the concise --volume (-v) flag and the explicit --mount flag. Understanding their differences helps you choose the right approach.

Both `--volume` and `--mount` achieve the same result of attaching storage to containers, but they differ in syntax, readability, and behavior for edge cases. This guide compares both approaches with practical examples.

---

## The --volume (-v) Flag

The `-v` flag uses a colon-separated string with up to three fields:

```bash
# Syntax: -v source:destination:options

# Named volume
podman run -d -v mydata:/app/data docker.io/library/nginx:latest

# Bind mount
podman run -d -v /home/user/config:/etc/nginx/conf.d:ro docker.io/library/nginx:latest

# With multiple options
podman run -d -v /home/user/data:/data:Z,rw docker.io/library/nginx:latest
```

## The --mount Flag

The `--mount` flag uses key=value pairs separated by commas:

```bash
# Named volume
podman run -d \
  --mount type=volume,source=mydata,target=/app/data \
  docker.io/library/nginx:latest

# Bind mount
podman run -d \
  --mount type=bind,source=/home/user/config,target=/etc/nginx/conf.d,readonly=true \
  docker.io/library/nginx:latest

# tmpfs mount
podman run -d \
  --mount type=tmpfs,target=/tmp,tmpfs-size=100M \
  docker.io/library/nginx:latest
```

## Key Differences

| Feature | --volume (-v) | --mount |
|---------|--------------|---------|
| Syntax | Colon-separated | Key-value pairs |
| Readability | Concise | Explicit |
| Missing host paths | Errors if path missing | Errors if path missing |
| Mount options | Appended after colons | Explicit key names |
| tmpfs support | Via --tmpfs flag | Built-in type=tmpfs |

## Auto-Creation Behavior

Both flags require bind mount source paths to exist before the container starts:

```bash
# -v errors if the host path doesn't exist
podman run --rm -v /home/user/newdir:/data docker.io/library/alpine:latest ls /data
# Error: /home/user/newdir: no such file or directory

# --mount also errors if the source directory doesn't exist
podman run --rm \
  --mount type=bind,source=/home/user/missing,target=/data \
  docker.io/library/alpine:latest ls /data
# Error: /home/user/missing: no such file or directory
```

## Bind Mount Comparison

```bash
# Using -v for a bind mount
podman run -d --name app1 \
  -v /home/user/html:/usr/share/nginx/html:ro,Z \
  docker.io/library/nginx:latest

# Equivalent using --mount
podman run -d --name app2 \
  --mount type=bind,source=/home/user/html,target=/usr/share/nginx/html,readonly=true,relabel=private \
  docker.io/library/nginx:latest
```

## Named Volume Comparison

```bash
# Using -v for a named volume
podman run -d --name db1 \
  -v pgdata:/var/lib/postgresql/data \
  docker.io/library/postgres:16

# Equivalent using --mount
podman run -d --name db2 \
  --mount type=volume,source=pgdata,target=/var/lib/postgresql/data \
  docker.io/library/postgres:16
```

## Volume Driver Options

Create named volumes with driver options first, then mount them into the container:

```bash
# Create and configure a volume
podman volume create nfs-data \
  --opt type=nfs \
  --opt device=192.168.1.100:/share \
  --opt o=addr=192.168.1.100

# Mount the named volume
podman run -d --name app \
  --mount type=volume,source=nfs-data,target=/data \
  docker.io/library/nginx:latest
```

## When to Use Each

Use `-v` when:
- You want concise, quick commands
- Simple bind mounts or named volumes
- Scripting with short one-liners

Use `--mount` when:
- You need explicit, readable configuration
- Working with tmpfs
- You want key-value mount options

## Summary

Both `--volume` and `--mount` attach storage to Podman containers. The `-v` flag is concise, while `--mount` is explicit and more readable. Use `-v` for quick commands and `--mount` for complex configurations or when you prefer key-value options. Bind mount source paths must exist before the container starts with either syntax.
