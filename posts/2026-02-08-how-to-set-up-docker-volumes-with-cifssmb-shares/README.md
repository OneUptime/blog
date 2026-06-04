# How to Set Up Docker Volumes with CIFS/SMB Shares

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Volumes, CIFS, SMB, Storage, Networking, DevOps

Description: A practical guide to mounting Windows CIFS/SMB network shares as Docker volumes for cross-platform file sharing.

---

If your infrastructure includes Windows file servers or NAS devices that speak SMB/CIFS, you can mount those shares directly as Docker volumes. This lets containers read and write to shared network storage without any custom scripts or third-party plugins. The Docker local volume driver handles CIFS mounts natively on Linux hosts, making it straightforward to integrate Windows-based storage into your containerized workflows.

## Prerequisites

Before you start, your Docker host needs the CIFS utilities installed. On Ubuntu/Debian:

```bash
# Install the CIFS utilities package required for SMB mounts

sudo apt-get update && sudo apt-get install -y cifs-utils
```

On CentOS/RHEL/Fedora:

```bash
# Install CIFS utilities on Red Hat-based systems
sudo dnf install -y cifs-utils
```

Verify the package is installed by checking that `mount.cifs` exists:

```bash
# Confirm mount.cifs is available on the system
which mount.cifs
```

You also need network connectivity to the SMB server and valid credentials with read (or read-write) access to the target share.

## Creating a Basic CIFS Volume

The simplest way to create a CIFS-backed Docker volume uses the local driver with CIFS-specific options:

```bash
# Create a Docker volume backed by a CIFS/SMB share
docker volume create --driver local \
  --opt type=cifs \
  --opt device=//192.168.1.50/shared-data \
  --opt o=addr=192.168.1.50,username=dockeruser,password=secret123,file_mode=0644,dir_mode=0755 \
  my_cifs_volume
```

Let me break down each option:

- `type=cifs` tells the local driver to use CIFS mounting
- `device=//192.168.1.50/shared-data` is the UNC path to the SMB share
- `addr=192.168.1.50` is the server address (required for DNS resolution in some setups)
- `username` and `password` are the SMB credentials
- `file_mode` and `dir_mode` set default permissions for files and directories

Test the volume by running a container:

```bash
# Test reading from the CIFS volume
docker run --rm -v my_cifs_volume:/mnt/share alpine ls -la /mnt/share
```

## Handling Credentials

Putting passwords in plain text on the command line is a bad practice. However, Docker's built-in `local` volume driver forwards the options directly to the Linux mount operation; it does not run the `mount.cifs` helper that expands `credentials=/path/to/file`. For direct CIFS volumes, pass the username and password as mount options and protect access to Docker commands and volume metadata:

```bash
# Keep the password out of the literal command by reading it from an environment variable
read -rsp "SMB password: " SMB_PASSWORD
echo
```

Now reference the variable when creating the volume:

```bash
# Create CIFS volume using shell variables for the sensitive value
docker volume create --driver local \
  --opt type=cifs \
  --opt device=//192.168.1.50/shared-data \
  --opt o=addr=192.168.1.50,username=dockeruser,password="${SMB_PASSWORD}",file_mode=0644,dir_mode=0755 \
  my_secure_cifs_volume
```

This keeps the password out of the literal shell history, but Docker still stores the resolved mount options for the volume. If you need a credentials file, mount the CIFS share on the host with `mount.cifs` or `/etc/fstab`, then bind-mount that host path into Docker instead of creating the CIFS mount through the local volume driver.

## Using CIFS Volumes in Docker Compose

For production deployments, declare your CIFS volumes in `docker-compose.yml`:

```yaml
# docker-compose.yml - service with CIFS-backed volume
services:
  fileprocessor:
    image: python:3.12-slim
    volumes:
      - smb_input:/input:ro       # Read-only access to incoming files
      - smb_output:/output        # Read-write for processed output
    command: python /app/process.py

  backup:
    image: alpine:latest
    volumes:
      - smb_backup:/backup
    command: sh -c "tar czf /backup/archive-$$(date +%Y%m%d).tar.gz /backup/data"

volumes:
  smb_input:
    driver: local
    driver_opts:
      type: cifs
      device: "//fileserver.local/incoming"
      o: "addr=fileserver.local,username=${SMB_USERNAME},password=${SMB_PASSWORD},file_mode=0644,dir_mode=0755,vers=3.0"

  smb_output:
    driver: local
    driver_opts:
      type: cifs
      device: "//fileserver.local/processed"
      o: "addr=fileserver.local,username=${SMB_USERNAME},password=${SMB_PASSWORD},file_mode=0666,dir_mode=0777,vers=3.0"

  smb_backup:
    driver: local
    driver_opts:
      type: cifs
      device: "//fileserver.local/backups"
      o: "addr=fileserver.local,username=${SMB_USERNAME},password=${SMB_PASSWORD},vers=3.0"
```

Notice the `vers=3.0` option. This forces SMB version 3.0, which you should use for better security and performance on modern servers. SMB 1.0 is obsolete, and SMB 2.x lacks newer SMB 3.x features such as SMB encryption.

## Specifying SMB Protocol Versions

Different servers support different SMB protocol versions. Here is how to specify each:

```bash
# Force SMB 2.1 for older NAS devices
docker volume create --driver local \
  --opt type=cifs \
  --opt device=//nas.local/media \
  --opt o=addr=nas.local,username=dockeruser,password="${SMB_PASSWORD}",vers=2.1 \
  media_vol

# Force SMB 3.0 for modern Windows servers (recommended)
docker volume create --driver local \
  --opt type=cifs \
  --opt device=//winserver.local/data \
  --opt o=addr=winserver.local,username=dockeruser,password="${SMB_PASSWORD}",vers=3.0 \
  data_vol

# Force SMB 3.1.1 for Windows Server 2016+ with encryption
docker volume create --driver local \
  --opt type=cifs \
  --opt device=//winserver.local/secure \
  --opt o=addr=winserver.local,username=dockeruser,password="${SMB_PASSWORD}",vers=3.1.1,seal \
  secure_vol
```

The `seal` option in the last example enables SMB encryption at the protocol level, which encrypts all data in transit.

## Handling UID/GID Mapping

CIFS mounts do not support standard Linux ownership changes with `chown`. Instead, you set the UID and GID at mount time:

```bash
# Map the share to UID 1000 and GID 1000 inside containers
docker volume create --driver local \
  --opt type=cifs \
  --opt device=//192.168.1.50/appdata \
  --opt o=addr=192.168.1.50,username=dockeruser,password="${SMB_PASSWORD}",uid=1000,gid=1000,file_mode=0644,dir_mode=0755 \
  appdata_vol
```

This is critical when your container process runs as a non-root user. Without explicit UID/GID mapping, all files will appear owned by root, and your application may fail with permission denied errors.

## Troubleshooting Common Issues

**Mount fails with "host is down":** This can mean the server requires a different SMB version than the client is offering. Add `vers=3.0` or `vers=2.1` explicitly after checking that the host is reachable.

```bash
# Debug CIFS mount issues by testing manually on the host
sudo mount -t cifs //192.168.1.50/shared-data /mnt/test \
  -o username=dockeruser,password="${SMB_PASSWORD}",vers=3.0
```

**Permission denied after successful mount:** Check the UID/GID mapping. Also verify that the SMB user has proper share-level and filesystem-level permissions on the Windows side.

**Slow performance:** Enable SMB multichannel if your server supports it, and consider increasing the read/write buffer sizes:

```bash
# Create a performance-tuned CIFS volume
docker volume create --driver local \
  --opt type=cifs \
  --opt device=//192.168.1.50/highperf \
  --opt o=addr=192.168.1.50,username=dockeruser,password="${SMB_PASSWORD}",vers=3.0,cache=loose,rsize=1048576,wsize=1048576 \
  fast_cifs_vol
```

The `cache=loose` option enables aggressive client-side caching, and the larger `rsize`/`wsize` values increase the maximum read and write buffer sizes to 1MB.

**Volume won't remove:** If Docker says the volume is in use, stop all containers using it first:

```bash
# Find and stop containers using a specific volume
docker ps -a --filter volume=my_cifs_volume --format '{{.ID}}' | xargs -r docker stop
docker volume rm my_cifs_volume
```

## Guest Access and Anonymous Shares

Some shares allow anonymous access. For these, use the `guest` option:

```bash
# Mount a guest-accessible share with no credentials required
docker volume create --driver local \
  --opt type=cifs \
  --opt device=//192.168.1.50/public \
  --opt o=addr=192.168.1.50,guest,ro,file_mode=0444,dir_mode=0555 \
  public_share
```

The `ro` option mounts the share read-only, and the read-only file and directory modes (0444 and 0555) add an extra client-side safety layer for public shares.

## Summary

CIFS/SMB volumes let you bridge Windows-based storage into Docker containers cleanly. The key points to remember: handle credentials carefully, specify the SMB protocol version explicitly, map UIDs and GIDs to match your container users, and prefer SMB 3.0 or newer for security. With these practices in place, you can share data between Windows servers and Linux containers reliably.
