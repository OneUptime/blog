# How to Deploy Stacks with Named Volumes and NFS Mounts in Portainer (3)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Volumes, NFS, Named Volumes, Storage, Stack

Description: Configure named Docker volumes and NFS-backed shared storage in Portainer stacks for persistent, portable data storage that survives container and stack redeployments.

---

Named volumes and NFS mounts provide persistent, identifiable storage for your containerized applications. Portainer stacks support both patterns natively through Docker Compose volume configuration.

## Named Volumes

Named volumes are managed by Docker and persist across container restarts and stack redeployments:

```yaml
services:
  database:
    image: postgres:16-alpine
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=password

  webapp:
    image: myapp:1.2.3
    volumes:
      - app-uploads:/var/www/uploads
      - app-config:/var/app/config

# Declare all named volumes at the top level

volumes:
  postgres-data:
    name: production-postgres-data   # Explicit, stable Docker volume name
  app-uploads:
    name: production-app-uploads
  app-config:
    name: production-app-config
```

## NFS-Backed Volumes

Use NFS for shared storage accessible by multiple containers across hosts:

```yaml
volumes:
  shared-media:
    driver: local
    driver_opts:
      type: nfs
      o: "addr=nfs-server.example.com,rw,nfsvers=4,hard,timeo=600"
      device: ":/exports/media"

  shared-uploads:
    driver: local
    driver_opts:
      type: nfs
      o: "addr=192.168.1.50,rw,nfsvers=4"
      device: ":/nfs/uploads"
```

## CIFS/SMB Mounts

For Windows file shares:

```yaml
volumes:
  windows-share:
    driver: local
    driver_opts:
      type: cifs
      o: "username=share-user,password=share-pass,domain=WORKGROUP"
      device: "//192.168.1.100/SharedFolder"
```

## Volume Labels and Backup Integration

Label volumes so backup tooling can identify them:

```yaml
volumes:
  db-data:
    labels:
      backup: "true"
      backup-schedule: "hourly"
      owner: "database-team"
```

## Sharing Volumes Between Services

Multiple services can mount the same volume:

```yaml
services:
  writer:
    image: data-writer:1.0
    volumes:
      - shared-data:/data

  reader:
    image: data-reader:1.0
    volumes:
      - shared-data:/data:ro   # Read-only for the reader

volumes:
  shared-data:
```

## Summary

Named volumes and NFS mounts in Portainer stacks provide durable, portable storage. Use named volumes for single-host persistence and NFS for shared storage across multiple hosts or containers. Name volumes explicitly when you need stable Docker volume names for backup and management operations.
