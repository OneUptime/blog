# Why Qdrant Data Disappears or Corrupts After a Docker Restart on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Qdrant, Docker, Microsoft Windows, WSL, Data Persistence, Troubleshooting

Description: Diagnose Qdrant data loss after Windows Docker restarts, replace unsafe host bind mounts with a Docker-managed volume, and verify recovery before trusting the deployment.

---

A Qdrant container is disposable; its storage must not be. On Windows, a particularly dangerous failure mode occurs when `/qdrant/storage` is bind-mounted to a directory on the Windows filesystem. Qdrant relies on filesystem behavior that this Docker Desktop or WSL path may not provide completely. The database can look healthy until a restart, then collections may be missing or vector data may be lost or returned as all zeros.

Qdrant's official troubleshooting guidance is direct: do not use a Windows host-folder bind mount for database storage. Use a Docker-managed volume instead. Treat an affected store as potentially corrupt rather than repeatedly restarting it and hoping the data returns.

## Recognize the Risky Mount

These patterns bind a Windows-host path into the container and are unsafe for Qdrant storage:

```powershell
docker run --name qdrant `
  -p 6333:6333 -p 6334:6334 `
  -v C:\qdrant-data:/qdrant/storage `
  qdrant/qdrant:v1.19.0
```

```yaml
services:
  qdrant:
    image: qdrant/qdrant:v1.19.0
    volumes:
      - C:\qdrant-data:/qdrant/storage
```

A relative bind such as `./qdrant_storage:/qdrant/storage` can have the same problem when the Compose project lives under a Windows-mounted path such as `/mnt/c/...` in WSL. The important distinction is not whether the path is absolute or relative; it is which filesystem backs it.

Also verify that the deployment actually mounts `/qdrant/storage`. Writing only to the container's writable layer loses the database when the container is removed and recreated.

## Stop Writes Before Investigating

If data is missing or corruption is suspected:

1. stop application writes and ingestion jobs;
2. record the container image tag, mount configuration, logs, and Qdrant version;
3. stop the Qdrant container, then copy the affected storage directory or volume for forensic work;
4. do not run repair experiments against the only copy;
5. recover from a known-good snapshot or source dataset into fresh storage.

`docker restart` preserves the same container, while `docker compose down` followed by `up` commonly recreates it. Neither operation makes an unsafe host filesystem suitable for database files. A restart-correlated symptom can therefore be a storage-semantics problem, a missing mount, or a Compose volume-name change-not evidence that Qdrant keeps data only in RAM.

Inspect the effective mounts rather than relying on the Compose file you expected to deploy:

```powershell
docker inspect qdrant --format '{{json .Mounts}}'
docker logs qdrant
docker image inspect qdrant/qdrant:v1.19.0 --format '{{.RepoDigests}}'
```

These commands assume the container from the `docker run --name qdrant` example. For a Compose deployment, use `docker compose ps --all` to find the generated container name or ID, and use `docker compose logs qdrant` for service logs.

Look for a mount whose destination is `/qdrant/storage`. Record whether its type is `volume` or `bind`, and confirm that the named volume in use is the one you expect.

## Use a Docker-Managed Named Volume

Create the volume explicitly and mount it at Qdrant's storage path:

```powershell
docker volume create qdrant-storage

docker run --name qdrant `
  -p 6333:6333 -p 6334:6334 `
  -v qdrant-storage:/qdrant/storage `
  qdrant/qdrant:v1.19.0
```

Pin a Qdrant version that you have tested; replace the example tag with your approved release rather than silently following `latest`.

The equivalent Compose file declares a top-level named volume:

```yaml
services:
  qdrant:
    image: qdrant/qdrant:v1.19.0
    restart: unless-stopped
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant-storage:/qdrant/storage

volumes:
  qdrant-storage:
    name: qdrant-storage
```

The explicit `name` prevents a Compose project-name change from silently selecting a new prefixed volume. If you intentionally use Compose's generated name, confirm it with `docker volume ls` before and after deployment changes.

Do not add `docker compose down -v` to a routine restart procedure. The `-v` flag removes named volumes declared by the project and therefore deletes persistent data.

## Migrate Only from a Trustworthy Source

A file-level copy of a live or already-corrupt storage directory is not a validated backup. Prefer, in order:

- a Qdrant collection snapshot created before the incident;
- a tested platform backup;
- re-ingestion from the authoritative document and embedding pipeline.

Restore into a new collection or a new clean volume first. Qdrant collection snapshots include points, payloads, collection configuration, and built indexes, but aliases are not part of a collection snapshot and must be recreated separately.

If the only source is the affected directory, preserve it and ask Qdrant support or an experienced operator before attempting recovery. Do not merge its files into an initialized clean volume.

## Prove Persistence with a Destructive Test Dataset

Before moving production data, test the new volume with disposable records:

1. start Qdrant with the named volume;
2. create a test collection and insert known points;
3. query and record the point count;
4. stop and remove only the container;
5. recreate it with the same image tag and named volume;
6. verify the collection, points, payloads, and searches;
7. repeat after a Docker Desktop and Windows restart.

Removing the container is intentional in this test. It proves that persistence comes from the volume rather than the old container layer:

```powershell
docker stop qdrant
docker rm qdrant

docker run --name qdrant `
  -p 6333:6333 -p 6334:6334 `
  -v qdrant-storage:/qdrant/storage `
  qdrant/qdrant:v1.19.0
```

Never run this test against an unverified production container. Confirm the exact container and volume names first.

## A Volume Is Persistence, Not a Backup

A named volume protects data across container replacement, but it remains on the same Windows machine and Docker installation. Disk failure, accidental volume deletion, ransomware, or a destructive deployment can still remove it.

Create regular Qdrant snapshots, copy them off the Docker host, retain more than one recovery point, verify checksums, and rehearse restores. Monitor free disk space and Qdrant health. A successful snapshot API response is only the start of a backup workflow; the copy must also be restorable.

For production deployments that need stronger durability and availability guarantees, use supported Linux storage and plan replicas and backups according to Qdrant's deployment guidance. A local Windows Docker setup is useful for development, but it should not be promoted to production simply because one restart test passed.

## Official Documentation

- [Qdrant common errors: Docker volumes on Windows and WSL](https://qdrant.tech/documentation/operations/common-errors/)
- [Qdrant installation with Docker and persistent storage](https://qdrant.tech/documentation/quickstart/)
- [Qdrant snapshots and recovery](https://qdrant.tech/documentation/operations/snapshots/)
- [Docker documentation: volumes](https://docs.docker.com/engine/storage/volumes/)
- [Docker Compose documentation: volumes](https://docs.docker.com/reference/compose-file/volumes/)

## Conclusion

When Qdrant data vanishes or becomes corrupt after a Windows Docker restart, first inspect what actually backs `/qdrant/storage`. Replace Windows-host bind mounts with a Docker-managed named volume, recover into clean storage from a trusted snapshot or source, and prove persistence by recreating a disposable container. Then add off-host, restore-tested backups-a volume alone is not one.
