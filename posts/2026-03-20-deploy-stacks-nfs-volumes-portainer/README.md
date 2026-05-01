# How to Deploy Stacks with Named Volumes and NFS Mounts in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, NFS, Volumes, Storage, Stack, Infrastructure

Description: Configure Docker stacks with NFS-backed named volumes in Portainer to share persistent storage across multiple containers and hosts in your Docker Swarm cluster.

---

Docker named volumes backed by NFS allow multiple containers - even on different Swarm nodes - to share the same persistent storage. This is essential for stateful services that need shared file access across a cluster. Portainer's stack interface makes NFS volume configuration straightforward.

## When to Use NFS Volumes

- Stateful services in Swarm that may reschedule across nodes
- Shared configuration or data files accessed by multiple services
- Media file storage accessed by multiple web server replicas
- Log directories shared between the application and a log forwarder

## Prerequisites

- An NFS server accessible from all cluster nodes
- NFS client packages installed on host nodes, for example `apt install nfs-common` on Debian/Ubuntu

## Step 1: Verify NFS Access

Test NFS connectivity from each node before deploying:

```bash
# Test NFS mount manually

mkdir -p /mnt/test-nfs
mount -t nfs 192.168.1.100:/exports/appdata /mnt/test-nfs
ls /mnt/test-nfs
umount /mnt/test-nfs
```

## Step 2: Define NFS Volumes in Stack YAML

```yaml
# nfs-stack.yml
version: "3.8"

services:
  web:
    image: nginx:alpine
    volumes:
      # Use the NFS-backed named volume
      - shared-media:/usr/share/nginx/html/media:ro
    deploy:
      replicas: 3
      restart_policy:
        condition: any

  media-processor:
    image: alpine:3.20
    command: ["sh", "-c", "while true; do sleep 3600; done"]
    volumes:
      - shared-media:/data/media
    deploy:
      restart_policy:
        condition: any

volumes:
  shared-media:
    driver: local
    driver_opts:
      type: nfs
      # NFS server IP and export path
      o: "addr=192.168.1.100,nfsvers=4,rw,soft"
      device: ":/exports/shared-media"
```

## Step 3: NFS Volume with Additional Mount Options

For NFS servers requiring specific mount options:

```yaml
volumes:
  app-data:
    driver: local
    driver_opts:
      type: nfs
      o: "addr=192.168.1.100,nfsvers=4.1,rw,hard,timeo=600,retrans=2"
      device: ":/exports/app-data"
```

Common NFS mount options:

| Option | Effect |
|---|---|
| `nfsvers=4` | Use NFSv4 |
| `rw` | Read-write |
| `ro` | Read-only |
| `hard` | Retry indefinitely on server failure |
| `soft` | Return an error after retries instead of retrying indefinitely |
| `timeo=600` | Set the client timeout to 60 seconds |

## Step 4: Deploy via Portainer

Paste the stack YAML in **Stacks > Add stack** and click **Deploy the stack**. When a service using `shared-media` starts on a node, Docker creates the local volume definition there and mounts the referenced NFS export. All containers in the stack that reference `shared-media` will mount the same NFS path.

## Step 5: Verify the Volume

After deployment, check the volume from a shell on a node running a task that uses the volume:

```bash
docker volume inspect <stack-name>_shared-media
# Shows the NFS driver options and mount point
```

## Step 6: NFS Performance Considerations

- Adjust metadata caching options such as `actimeo` or `lookupcache` only when faster cross-client visibility is worth the extra NFS traffic
- For databases, avoid NFS - use local volumes with placement constraints instead
- For large media files, consider object storage (MinIO) rather than NFS

## Summary

NFS-backed named volumes in Portainer stacks enable shared persistent storage across Swarm nodes without requiring applications to implement distributed storage logic. The volume definition in the stack YAML is self-documenting and reproducible - anyone deploying the stack gets the correct NFS configuration automatically.
