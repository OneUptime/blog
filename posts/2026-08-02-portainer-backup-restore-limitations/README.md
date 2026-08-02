# How to Back Up and Restore Portainer-and What the Backup Does Not Include

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Backup, Restore, Disaster Recovery, Docker, Persistent Volume, Operation

Description: Back up and restore Portainer configuration safely, understand exactly what its archive contains, and protect workload data with a separate recovery plan.

---

A Portainer backup is a backup of the **management plane**, not a backup of everything Portainer can see. It archives the information Portainer stores in its `/data` volume so a fresh Portainer instance can recover its configuration. It does not copy the containers, images, volumes, databases, or Kubernetes resources running in managed environments.

That distinction determines whether a recovery plan works. A Portainer archive can restore users and stack definitions while an application still has no data to start with.

## What the Portainer Backup Contains

Portainer documents the backup as a `tar.gz` archive of the information stored in `/data`. The detailed inventory includes records for areas such as:

- Portainer settings, version state, license data, and certificates managed by Portainer;
- users, roles, teams, memberships, API keys, and resource controls;
- environment definitions, groups, relationships, and access assignments;
- registry definitions, Docker Hub configuration, Git credentials, cloud credentials, and Helm repositories;
- custom templates, schedules, webhooks, policies, and feature configuration;
- Edge groups, jobs, configurations, status, and pending commands; and
- stack definitions and metadata for stacks deployed through Portainer.

Stack files created through Portainer are included. That is valuable, but a stack definition is declarative instructions-not the live resources or their persistent bytes.

Treat the archive as sensitive. Even when individual stored values are protected internally, it contains security-relevant configuration, identities, credentials, certificates, and topology. Encrypt it, restrict access, and apply the same retention controls used for other privileged system backups.

## What It Explicitly Does Not Contain

Portainer's documentation says the configuration backup does not back up what was deployed on environments. It does not include:

- Docker containers or Swarm services;
- pulled or locally built container images;
- Docker named or anonymous volume contents;
- application data in bind-mounted host directories;
- databases merely because their containers appear in Portainer;
- Docker daemon configuration outside Portainer's database;
- Kubernetes objects and persistent volume data outside Portainer's own storage; or
- files and certificates mounted into the Portainer container from host paths outside `/data`.

It also cannot capture deployment-time settings that live outside Portainer. For example, a reverse proxy's certificate, firewall rules, DNS records, an externally supplied `AGENT_SECRET`, a Docker Compose file used to run Portainer itself, and the storage-class configuration behind a Kubernetes PVC all need their own source of truth.

### A Concrete Example

Suppose Portainer deployed this Docker Swarm stack:

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    secrets:
      - db_password

volumes:
  postgres_data:

secrets:
  db_password:
    external: true
```

The Portainer backup can include the stack definition and its Portainer metadata. It does not contain the rows in `postgres_data`, the Docker volume itself, or the external secret's value. Restoring only Portainer can make the stack visible again without making the application recoverable.

## Create a Local Portainer Backup

Use an administrator account:

1. Open **Settings**.
2. Scroll to **Back up Portainer**.
3. Select **Download backup file**.
4. Enable password protection and choose a strong, recoverable password.
5. Click **Download backup** and store the resulting `tar.gz` outside the Portainer host.

Record a checksum after moving the file to controlled storage:

```bash
shasum -a 256 portainer-backup_*.tar.gz \
  > portainer-backup.sha256
```

Keep the encryption password in a separate secret manager. A password-protected backup without a recoverable password is not a recovery asset.

The browser download must not be the only copy. A disk failure, ransomware event, or operator error that removes the Portainer host can remove a backup stored on that same host or workstation.

## Use S3 Backups Where Available

Portainer Business Edition supports storing configuration backups in Amazon S3 or an S3-compatible service, on demand or on a cron schedule. The configuration includes the bucket, region, credentials or environment-resolved AWS credentials, optional S3-compatible host, and optional backup password.

For scheduled backups:

- use a dedicated bucket and least-privilege write credentials;
- enable object versioning or an immutability control appropriate to the organization;
- encrypt the backup with a password stored outside the bucket;
- monitor scheduled job failures and object age;
- define retention rather than accumulating backups indefinitely; and
- periodically restore one in an isolated test environment.

Scheduling answers **when to copy**. It does not prove that the backup is accessible, decryptable, compatible, or operationally complete.

## Restore Portainer from a Local Archive

Portainer supports configuration restore only during initialization of a **fresh instance with an empty data volume**. Do not initialize a new admin account first and then look for an in-place import button.

A cautious Docker Standalone recovery flow is:

1. Record the failed instance's Portainer edition, exact image tag, Docker run or Compose configuration, published ports, mounted certificates, and environment variables.
2. Preserve the existing `portainer_data` volume or disk. Do not delete the last copy while investigating.
3. Create a new, empty data volume for the recovery instance.
4. Start the appropriate Portainer image with that empty volume mounted at `/data` and the required environment connection.
5. Open the initialization page and expand **Restore Portainer from backup**.
6. Select the archive, provide its password if encrypted, and start the restore.
7. Sign in using the credentials restored from the backup.

For example, the empty-volume part of a Community Edition test deployment looks like this:

```bash
docker volume create portainer_restore_data

docker run --detach \
  --name portainer-restore-test \
  --publish 127.0.0.1:19443:9443 \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  --volume portainer_restore_data:/data \
  portainer/portainer-ce:lts
```

Use the image and upgrade path appropriate to the backup and your supported release. Portainer warns that newer databases cannot be used by older versions because database schemas change. For a controlled recovery, restore on the expected release, verify it, and then follow Portainer's documented upgrade path rather than attempting an arbitrary downgrade.

Binding the test listener to `127.0.0.1` reduces accidental exposure, but the Docker socket still grants powerful host access. Run the recovery test on an isolated system if it should not see production resources.

## Restore from S3

S3 restore is also performed on a fresh Portainer instance during initial setup and is a Business Edition feature. Choose **Retrieve from S3**, then provide the access key ID, secret access key, region, bucket name, object filename, S3-compatible host if applicable, and backup password.

The recovery environment must be able to resolve and reach the object store. Test that network path from the actual runtime environment; success from an administrator's laptop does not prove that the Portainer container or pod has the same DNS, routing, proxy, and CA trust.

## Validate the Restored Management Plane

A successful login is only the first check. Verify deliberately:

- expected Portainer edition and version;
- users, teams, roles, and environment access;
- API access tokens and automation behavior;
- environment definitions and agent connectivity;
- registry entries and pull access;
- Git credentials and repository-backed stack access;
- stack definitions, environment variables, and webhooks;
- authentication provider settings;
- certificates and public URL behavior; and
- Edge Agent connectivity and any externally supplied secrets.

Then inspect managed environments independently. Existing workloads may continue running throughout a Portainer outage because they belong to Docker or Kubernetes, not to the Portainer server process. Conversely, a clean Portainer restore does not recreate workload state that was lost with an environment.

## Back Up Workload Data Separately

As a first pass on each Docker host, list its volumes and inspect mounts for running and stopped containers:

```bash
docker volume ls

docker ps --all --format '{{.Names}}' |
while read -r container; do
  docker inspect "$container" \
    --format '{{range .Mounts}}{{println $.Name .Type .Source "->" .Destination}}{{end}}'
done
```

For a generic named volume, Docker documents a container-based archive pattern. Adapted to a named volume, it can look like:

```bash
docker run --rm \
  --volume app_data:/source:ro \
  --volume "$PWD":/backup \
  alpine \
  tar czf /backup/app_data.tar.gz -C /source .
```

Restore into a newly created volume:

```bash
docker volume create app_data_restored

docker run --rm \
  --volume app_data_restored:/target \
  --volume "$PWD":/backup:ro \
  alpine \
  tar xzf /backup/app_data.tar.gz -C /target
```

Those commands produce a filesystem copy, not automatically an application-consistent database backup. Stop or quiesce the writer when appropriate, and use database-native backups such as logical dumps or coordinated snapshots when the application requires them.

Back up bind-mounted directories with a host-aware backup tool while preserving ownership, modes, extended attributes, and required security labels. For Kubernetes, protect manifests through GitOps or another declarative source and use the storage provider's supported CSI snapshot or backup mechanism for persistent volume data.

## Do Not Confuse Three Different Backups

Portainer installations can involve three similarly named artifacts:

1. **Portainer configuration archive:** the downloadable, optionally encrypted `/data` archive used by the supported fresh-instance restore flow.
2. **Automatic database backup made during an upgrade:** a `portainer.db.bak` file used for a specific database rollback procedure. It is only the database backup described by that procedure, not a substitute for the full disaster-recovery archive.
3. **Application backups:** volume archives, database dumps, storage snapshots, manifests, images, and secrets required to recover managed workloads.

A complete recovery plan normally needs the first and third. The upgrade-time database copy is an additional rollback aid, not the entire strategy.

## Build a Restore Drill, Not Just a Backup Job

At a regular interval:

1. select a backup according to the retention policy;
2. verify its checksum and retrieve its password through the documented break-glass process;
3. restore it to a fresh, isolated Portainer instance;
4. execute the management-plane validation checklist;
5. restore a representative application backup separately;
6. record recovery time, missing dependencies, and manual decisions; and
7. destroy the isolated test environment securely.

This makes the limitation of Portainer's archive explicit: it restores Portainer very well only when the external pieces-runtime deployment, network, identity provider, agents, registries, secrets, and workload data-are also recoverable.

## Official Documentation

- [Portainer: General settings, backup, and restore](https://docs.portainer.io/admin/settings/general)
- [Portainer: What the backup includes](https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include)
- [Portainer: Roll back to a previous version](https://docs.portainer.io/faqs/upgrading/how-can-i-roll-back-to-a-previous-version-of-portainer)
- [Portainer: Updating Portainer](https://docs.portainer.io/start/upgrade)
- [Docker: Back up, restore, or migrate volumes](https://docs.docker.com/engine/storage/volumes/#back-up-restore-or-migrate-data-volumes)
- [Docker: Bind mount considerations](https://docs.docker.com/engine/storage/bind-mounts/)
