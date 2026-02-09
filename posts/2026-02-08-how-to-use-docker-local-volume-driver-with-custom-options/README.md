# How to Use Docker Local Volume Driver with Custom Options

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Volumes, Storage, Local Volume Driver, DevOps, Docker CLI

Description: Learn how to configure Docker's local volume driver with custom mount options for tmpfs, ext4, and bind-style volumes.

---

Docker's built-in local volume driver is more powerful than most people realize. By default, when you create a volume with `docker volume create`, Docker stores data in `/var/lib/docker/volumes/` on the host. But the local driver accepts custom options that let you mount tmpfs filesystems, specify filesystem types, and pass arbitrary mount flags. This turns the local driver into a flexible tool that covers many use cases without needing third-party plugins.

## Understanding the Local Volume Driver

The local volume driver wraps the Linux `mount` command. It supports three key options that map directly to mount flags:

- `type` - the filesystem type (tmpfs, nfs, ext4, btrfs, etc.)
- `o` - mount options, same as what you would pass to `mount -o`
- `device` - the device or remote share to mount

When you combine these options, you can create volumes backed by different storage types, all managed through Docker's standard volume interface.

## Creating a tmpfs Volume

A tmpfs volume stores data in memory. This is useful for sensitive data that should never touch disk, or for high-speed scratch space that does not need to survive a restart.

Here is how to create a tmpfs volume with a 100MB size limit:

```bash
# Create a tmpfs volume limited to 100MB stored entirely in RAM
docker volume create --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=size=100m \
  my_tmpfs_vol
```

You can verify the volume was created and inspect its configuration:

```bash
# Check the volume details including mount options
docker volume inspect my_tmpfs_vol
```

The output will show something like:

```json
[
    {
        "CreatedAt": "2026-02-08T10:00:00Z",
        "Driver": "local",
        "Labels": {},
        "Mountpoint": "/var/lib/docker/volumes/my_tmpfs_vol/_data",
        "Name": "my_tmpfs_vol",
        "Options": {
            "device": "tmpfs",
            "o": "size=100m",
            "type": "tmpfs"
        },
        "Scope": "local"
    }
]
```

Run a container with this volume to test it:

```bash
# Attach the tmpfs volume to a container and check available space
docker run --rm -v my_tmpfs_vol:/data alpine df -h /data
```

You will see approximately 100MB of available space, all backed by RAM.

## Creating a Volume with a Specific Filesystem

If you have a block device or a disk image formatted with a specific filesystem, you can mount it as a Docker volume. For example, if you have an ext4-formatted disk at `/dev/sdb1`:

```bash
# Mount an ext4 block device as a Docker volume
docker volume create --driver local \
  --opt type=ext4 \
  --opt device=/dev/sdb1 \
  my_ext4_vol
```

You can also add mount options like `noatime` to improve performance by skipping access time updates:

```bash
# Mount ext4 with noatime for better I/O performance
docker volume create --driver local \
  --opt type=ext4 \
  --opt device=/dev/sdb1 \
  --opt o=noatime \
  my_fast_vol
```

## Bind-Mount Style Volumes with Custom Options

Sometimes you want a named volume that points to a specific directory on the host. The local driver can do this using a bind mount:

```bash
# Create a named volume that maps to a specific host path
docker volume create --driver local \
  --opt type=none \
  --opt device=/home/deploy/app-data \
  --opt o=bind \
  my_bind_vol
```

This gives you the best of both worlds. You get a named volume that shows up in `docker volume ls` and can be referenced by name, but the data lives in a specific host directory you control. The directory must already exist on the host before you create the volume.

This approach is better than raw bind mounts in many situations because Docker manages the volume lifecycle and it works cleanly with Docker Compose.

## Using Custom Volumes in Docker Compose

You can declare volumes with custom driver options directly in your `docker-compose.yml` file. Here is an example that sets up three different volume types:

```yaml
# docker-compose.yml - demonstrating three local volume types
version: "3.8"

services:
  app:
    image: myapp:latest
    volumes:
      - cache_vol:/tmp/cache      # tmpfs for fast caching
      - data_vol:/var/lib/data    # bind to host directory
      - scratch_vol:/scratch      # tmpfs scratch space

volumes:
  cache_vol:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
      o: "size=256m,uid=1000"

  data_vol:
    driver: local
    driver_opts:
      type: none
      device: /opt/app-data
      o: bind

  scratch_vol:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
      o: "size=50m,mode=1777"
```

Note the `mode=1777` option on the scratch volume. This sets the sticky bit, similar to how `/tmp` works on a standard Linux system. The `uid=1000` on the cache volume ensures the volume is owned by a non-root user inside the container.

## Mounting NFS Shares with the Local Driver

You do not need a dedicated NFS volume plugin. The local driver handles NFS mounts natively:

```bash
# Mount an NFS share as a Docker volume
docker volume create --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.100,rw,nfsvers=4 \
  --opt device=:/exports/shared \
  my_nfs_vol
```

This creates a volume backed by the NFS export at `192.168.1.100:/exports/shared`. The `nfsvers=4` option forces NFSv4, and `rw` enables read-write access.

For NFS with Kerberos authentication:

```bash
# Mount NFS with Kerberos security
docker volume create --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.100,rw,nfsvers=4,sec=krb5 \
  --opt device=:/exports/secure \
  my_secure_nfs
```

## Practical Tips

**Check what mounted:** After starting a container, you can verify the mount inside the container:

```bash
# Run a container and check how the volume is mounted
docker run --rm -v my_tmpfs_vol:/data alpine mount | grep /data
```

**Permissions matter:** When using bind-style volumes, the directory on the host must have the right ownership. If your container runs as UID 1000, make sure the host directory is accessible:

```bash
# Set ownership on the host directory before creating the volume
sudo chown 1000:1000 /home/deploy/app-data
```

**Volume options are immutable:** Once you create a volume with specific options, you cannot change those options. You need to remove and recreate the volume. Keep this in mind when automating deployments.

```bash
# Remove and recreate a volume to change its options
docker volume rm my_tmpfs_vol
docker volume create --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=size=200m \
  my_tmpfs_vol
```

**tmpfs size limits are soft:** If you do not set a size limit on a tmpfs volume, it can grow to use half of your host's RAM. Always set explicit size limits in production.

## When to Use Custom Local Volumes

The local driver with custom options covers a surprising number of storage scenarios. Use it when you need tmpfs for speed or security, when you want named volumes backed by host directories, or when mounting NFS shares. For more advanced use cases like distributed storage across multiple hosts, you will want to look at third-party volume plugins like REX-Ray or the CSI driver interface. But for single-host setups, the local driver is often all you need.

Combining custom volume options with Docker Compose makes your infrastructure declarative and reproducible. Your storage configuration lives right alongside your service definitions, which means anyone on your team can spin up the full stack with a single `docker compose up`.
