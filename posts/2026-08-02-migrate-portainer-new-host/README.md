# How to Migrate Portainer to a New Host Without Losing Stacks or Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Migration, Docker, Stacks, Volumes, Backup, Disaster Recovery

Description: Move Portainer and Docker workloads to a new host while preserving management configuration, stack definitions, named volumes, bind mounts, and a tested rollback path.

---

Migrating “Portainer” can mean two very different operations:

1. Move the Portainer Server—the UI, users, environment definitions, and configuration—to a new host while the managed Docker or Kubernetes environments stay where they are.
2. Move a Docker environment and its workloads to a new host as well.

The first migration uses Portainer's configuration backup and restore. The second also requires an application migration because Portainer does not carry containers or persistent volume contents inside its backup. Treating these as one opaque copy operation is how a stack arrives with an empty database.

## Understand the Four Kinds of State

Inventory each category separately:

| State | Typical location | Migration method |
| --- | --- | --- |
| Portainer configuration | Portainer `/data` volume | Portainer backup and fresh-instance restore |
| Stack definitions | Portainer backup and/or Git repository | Restore Portainer; keep Git as source of truth |
| Application data | Docker volumes, bind mounts, external storage | Application-aware backup, volume archive, or storage-native replication |
| Runtime resources | Containers, networks, images, secrets, configs | Recreate from Compose/stack definitions and external secret sources |

Portainer's own FAQ states that its backup includes the database and stack files deployed through Portainer, but not the managed containers or their data. Its stack migration page separately warns that migrating a stack does not relocate attached persistent-volume content.

## Choose the Migration Pattern

### Portainer Server Only

Use this when the Docker hosts, Swarm, or Kubernetes clusters remain in place. Back up Portainer, restore it on the new server, preserve any deployment-time secrets and proxy configuration, and verify that the restored environment definitions can still reach their agents or APIs.

No application volumes need to move because the workloads have not moved. This is the simpler and lower-risk operation.

### Portainer Server and a Docker Host

Use this when the machine running applications is being retired. You must separately migrate every persistent mount, make images available, recreate runtime resources, restore Portainer configuration, and update DNS or traffic routing.

### Stack Between Two Existing Portainer Environments

If both old and new Docker environments are visible in the same Portainer instance, Portainer provides **Migrate** and **Duplicate** actions on a stack. The action moves or copies the definition, but Portainer explicitly warns that volume content is not relocated.

For a controlled cutover, duplicating the stack can be safer than immediately migrating it: restore the data on the destination, deploy under isolated networking or with replicas stopped where possible, validate, switch traffic, and then remove the source only after the rollback window. Ensure two live copies cannot write to the same logical database or consume the same exclusive workload.

## Build a Migration Inventory

Start by recording how Portainer itself runs:

```bash
docker inspect portainer \
  --format 'image={{.Config.Image}} restart={{.HostConfig.RestartPolicy.Name}}'

docker inspect portainer \
  --format '{{range .Mounts}}{{println .Type .Name .Source "->" .Destination}}{{end}}'

docker port portainer
```

Record separately:

- exact Portainer edition and image tag;
- `/data` volume or bind-mount source;
- Docker socket or agent connection;
- published UI and Edge Agent ports;
- command-line flags and environment variables such as an externally set `AGENT_SECRET`;
- reverse-proxy, DNS, TLS, firewall, and identity-provider settings; and
- scheduled jobs or monitoring that call the old address.

Then inventory workload storage:

```bash
docker volume ls

docker ps -a --format '{{.Names}}' |
while read -r container; do
  docker inspect "$container" \
    --format '{{range .Mounts}}{{println $.Name .Type .Name .Source "->" .Destination}}{{end}}'
done
```

Classify every mount as:

- **named Docker volume:** Docker-managed data that must be archived, replicated, or provided by the same external volume driver;
- **bind mount:** a host path that must exist on the destination with correct content, ownership, modes, and labels;
- **tmpfs:** ephemeral data that should not be migrated; or
- **network storage:** data whose server may remain in place but whose mount options, credentials, DNS, and reachability must be recreated.

Also list resources that a Compose deployment may expect to pre-exist:

```bash
docker network ls
docker secret ls 2>/dev/null || true
docker config ls 2>/dev/null || true
```

External Docker networks, Swarm secrets, and Swarm configs are not made portable by a stack definition that merely references them.

## Make Stack Definitions Portable Before the Move

Prefer a reviewed Git repository for Compose files and deployment documentation. For each stack, preserve:

- the exact Compose or stack YAML;
- environment-variable names and a secure source for their values;
- referenced `.env`, config, and secret files;
- image references, including the expected digest where reproducibility matters;
- external volume and network names;
- required host paths and permissions; and
- startup, shutdown, backup, restore, and health-check procedures.

Render a local Compose model where you have the same files and variables:

```bash
docker compose --env-file .env config > rendered-compose.yaml
docker compose --env-file .env config --images
docker compose --env-file .env config --volumes
```

Do not commit a rendered file if it exposes secrets. Its purpose here is to catch missing interpolation values and host-specific paths before the maintenance window.

## Back Up Portainer Configuration

In Portainer, sign in as an administrator, open **Settings**, find **Back up Portainer**, and download a password-protected backup. Store the archive and its checksum off the source host, with the password in a separate secret manager.

If Business Edition S3 backup is used, verify that the intended object exists and is retrievable from the recovery environment. Do not assume the most recent object represents a successful backup merely because a schedule exists.

Portainer restore is supported during initial setup of a fresh instance with an empty `/data` volume. This is preferable to copying an opaque Docker storage directory between different hosts or storage-driver configurations.

## Back Up Named Volumes Safely

For generic file data, Docker documents mounting a volume into a temporary container and archiving it. Stop or quiesce the application first when a consistent point-in-time copy matters:

```bash
mkdir -p ./volume-backups

docker run --rm \
  --volume app_uploads:/source:ro \
  --volume "$PWD/volume-backups":/backup \
  alpine \
  tar czf /backup/app_uploads.tar.gz -C /source .
```

Create a checksum and copy both files to the destination through an approved secure channel:

```bash
shasum -a 256 volume-backups/app_uploads.tar.gz \
  > volume-backups/app_uploads.tar.gz.sha256
```

For databases, use the database's documented backup procedure or a coordinated storage snapshot. A tar archive taken while database files are changing may be crash-consistent at best and unusable at worst. Keep the volume archive only as an additional layer if the database's recovery model permits it.

Do not recursively copy `/var/lib/docker` as a general migration strategy. Docker documents direct interaction with the volume's daemon-managed storage location as unsupported. Migrate through mounted volumes, the volume driver's supported mechanism, or the storage platform's replication and snapshot tools.

## Copy Bind-Mounted Data

A bind mount is tied to a source path on the Docker daemon host. Either reproduce that path on the destination or deliberately change the stack definition.

When copying, preserve the metadata the application needs:

- numeric user and group ownership;
- file and directory modes;
- symlinks and hard links where relevant;
- ACLs and extended attributes;
- SELinux labels or other mandatory access-control context; and
- sparse files and filesystem semantics for applications that rely on them.

Pause writers for the final synchronization. After copying, test the path from the destination Docker daemon's perspective—not from the machine where a remote Docker client happens to run. Docker resolves bind sources on the daemon host.

## Make Images Available on the Destination

Registry-backed images can be pulled again if the destination has network access, credentials, and CA trust:

```bash
docker pull registry.example.com/acme/api@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

If a stack relies on an image built only in the old host's local image store, publish it to an approved registry or deliberately transfer it with Docker's image save/load workflow. Portainer's backup does not include images.

Check the destination architecture. A tag that resolved on an `amd64` host may not contain a matching `arm64` manifest, and the migration will fail before the container can start.

## Prepare the Destination

Before downtime:

1. Install a Docker Engine version supported by the intended Portainer release.
2. Configure DNS, NTP, storage drivers, log rotation, firewall rules, proxy settings, and certificate trust.
3. Create required external networks and storage connections.
4. Create destination named volumes using the exact names expected by the stack, or update the Compose definitions deliberately.
5. Restore non-production copies of volume data and test permissions.
6. Verify registry pulls and health-check dependencies.
7. Prepare the Portainer deployment definition without initializing its `/data` volume.

Compose normally scopes non-external volume names by project. Changing the project or stack name can therefore change the actual Docker volume name. If the intended destination volume is pre-created, declare and reference it explicitly:

```yaml
services:
  db:
    image: postgres:17
    volumes:
      - database:/var/lib/postgresql/data

volumes:
  database:
    external: true
    name: production_database
```

Create it before deployment:

```bash
docker volume create production_database
```

This prevents Compose from silently creating an empty project-scoped volume because the stack name changed.

## Restore Volumes on the New Host

Verify the transferred archive checksum, then restore into the empty destination volume:

```bash
shasum -a 256 -c volume-backups/app_uploads.tar.gz.sha256

docker volume create app_uploads

docker run --rm \
  --volume app_uploads:/target \
  --volume "$PWD/volume-backups":/backup:ro \
  alpine \
  tar xzf /backup/app_uploads.tar.gz -C /target
```

Inspect representative paths through a container, then run the application's own integrity checks. A successful `tar` exit status verifies extraction mechanics, not business-level correctness.

For the final cutover, stop application writes on the source, take a final database backup or incremental synchronization, restore the final changes, and keep the source volumes intact. Avoid starting old and new database instances as independent writers from the same point-in-time state unless the application explicitly supports that topology.

## Restore Portainer on the New Host

Create a fresh, empty Portainer data volume and start the intended image with the same required connection model. A Docker Standalone Community Edition skeleton is:

```bash
docker volume create portainer_data

docker run --detach \
  --name portainer \
  --restart always \
  --publish 9443:9443 \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  --volume portainer_data:/data \
  portainer/portainer-ce:lts
```

Use Portainer's current installation instructions for your edition and topology; do not blindly replace an existing Swarm, Kubernetes, Edge, or TLS deployment with that standalone example.

On the initialization page:

1. expand **Restore Portainer from backup**;
2. choose the local archive or the supported S3 restore option;
3. provide the backup password; and
4. complete the restore before creating a new admin account.

If the original Portainer server managed its local Docker socket, the restored local environment now points at the new host's socket because `/var/run/docker.sock` belongs to the destination. That is useful only if the intended workloads and data have already been migrated. If Portainer managed remote agents, validate that routing, DNS, agent secrets, certificates, and firewall rules allow the new Portainer server to reach them.

## Deploy or Migrate the Stacks

Restoring Portainer metadata does not teleport old containers into the destination Engine. Reconcile the destination from the preserved source of truth:

- deploy Git-backed stacks from their reviewed repository and intended revision;
- use Portainer's duplicate or migrate function when both environments are connected and the operation fits the cutover plan;
- ensure all external volumes, networks, configs, and secrets exist first; and
- do not let the deployment create an empty volume under a slightly different name.

Start stateful dependencies first, validate them, then start application services. Confirm the running mounts:

```bash
docker inspect production-db \
  --format '{{range .Mounts}}{{println .Type .Name .Source "->" .Destination}}{{end}}'
```

## Validate Before Switching Traffic

Check both the management plane and applications.

For Portainer:

- users, teams, roles, and environment access are present;
- API tokens and automation work;
- registries and Git sources authenticate;
- environments and agents are healthy;
- stacks point to the intended destination; and
- the public URL, TLS, SSO, console, and WebSocket functions work.

For each workload:

- the container uses the expected image digest;
- the expected named volume or bind path is mounted;
- file ownership and permissions are correct;
- database recovery and application-level integrity checks pass;
- health checks remain healthy through restarts;
- background workers are not duplicated unintentionally; and
- reads and writes persist after a controlled container recreation.

Only then update DNS, load balancers, or ingress. Reduce DNS TTL before the maintenance window if that is part of the plan, but remember that existing connections and caches can outlive a DNS change.

## Keep a Recoverable Rollback

Do not delete source containers, volumes, the original Portainer `/data`, or backup archives during the initial validation window. A practical rollback is:

1. stop writes on the destination;
2. determine whether any destination data must be reconciled back;
3. switch traffic to the preserved source;
4. start the old services from their untouched volumes; and
5. investigate without overwriting either recovery point.

The hard part is data divergence, not container startup. Define the point after which rollback requires data reconciliation, and make that an explicit go/no-go decision during the cutover.

## Official Documentation

- [Portainer: Back up and restore Portainer](https://docs.portainer.io/admin/settings/general#back-up-portainer)
- [Portainer: What a backup includes](https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include)
- [Portainer: Migrate, duplicate, or rename a stack](https://docs.portainer.io/user/docker/stacks/migrate)
- [Portainer: Requirements and persistent storage](https://docs.portainer.io/start/requirements-and-prerequisites)
- [Docker: Volumes and backup, restore, or migration](https://docs.docker.com/engine/storage/volumes/)
- [Docker: Bind mount constraints](https://docs.docker.com/engine/storage/bind-mounts/)
- [Docker Compose: Volume top-level element](https://docs.docker.com/reference/compose-file/volumes/)
- [Docker Compose: Render the resolved configuration](https://docs.docker.com/reference/cli/docker/compose/config/)
