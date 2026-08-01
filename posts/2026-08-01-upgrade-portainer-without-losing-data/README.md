# How to Upgrade Portainer Without Losing Users, Environments, or Stack Definitions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Upgrade, Backup, Operations

Description: Upgrade Portainer safely by preserving its data volume, taking a restorable configuration backup, following the supported platform path, matching agents, and verifying managed environments.

---

Portainer keeps its users, environment definitions, access controls, registry credentials, settings, and Portainer-managed stack definitions in persistent storage mounted at `/data`. Replacing the Portainer Server container is therefore normal; replacing or mounting the wrong data volume is what makes an upgrade look like a fresh installation.

A safe upgrade has four controls:

1. identify the current deployment and its real `/data` source;
2. take and protect a Portainer configuration backup;
3. use the official upgrade path for the platform and edition;
4. verify the server, agents, environments, and definitions before declaring success.

## Inventory the Running Installation

On Docker Standalone, capture the image, ports, environment, and mounts:

```bash
docker inspect portainer \
  --format 'image={{.Config.Image}} ports={{json .HostConfig.PortBindings}} mounts={{json .Mounts}}'
docker volume inspect portainer_data
docker ps --filter name=portainer
```

Do not assume the volume is named `portainer_data`. A Compose project may prefix it, and an installation may use a bind mount. The decisive fact is the source mounted at container destination `/data`.

Also record:

- Community or Business Edition;
- exact running Server version and release channel;
- installation method: `docker run`, Compose, Swarm stack, Helm, or Kubernetes manifest;
- Agent and Edge Agent versions;
- published ports and reverse-proxy route;
- custom flags, TLS files, `AGENT_SECRET`, and data encryption settings.

Use the upgrade page for that same platform and edition. Converting the deployment method while upgrading creates unnecessary variables.

## Take a Backup and Understand Its Boundary

As a Portainer administrator, use **Settings → Back up Portainer** and download the archive. Password-protect it if required, store the password separately, and copy the archive outside the host being upgraded.

Current Portainer documentation says this archive contains the information stored on `/data`, including the database and Portainer-managed stack files. It is intended to restore Portainer configuration. It does **not** include:

- running containers or images;
- Docker volumes and their application data;
- bind-mounted application data;
- Docker or Kubernetes configuration that exists outside Portainer.

Back up application data through each workload's own procedure. A Portainer backup and a database backup for an application serve different purposes.

Restore is performed during initialization of a fresh Portainer instance with an empty data volume. A backup is only trustworthy after you have documented and, ideally, tested that restore path.

## Read the Supported Upgrade Path

Check the current Portainer upgrade documentation and release notes before pulling an image. Version 1.x installations require an intermediate migration through 2.0.0 rather than jumping directly to a current 2.x release. For 2.x, confirm whether your source and target releases have a supported direct path and whether you are using LTS or STS.

Pinning an exact tested image version in production makes the change reproducible. If your organization intentionally tracks the `lts` channel, resolve and record the image digest before the maintenance window.

Current Portainer platform upgrade pages instruct operators to match the Portainer Agent version to the Server version. Update in the documented order and preserve any custom `AGENT_SECRET` on both sides.

## Replace the Server, Not Its Data

For a recommended Docker Standalone CE installation following the LTS channel, the official flow is conceptually:

```bash
docker stop portainer
docker rm portainer
docker pull portainer/portainer-ce:lts

docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

This is an example only when it matches the original supported installation. Preserve all required flags and mounts from the inventory. If `/data` was a bind mount or differently named volume, substitute that exact source.

The dangerous commands are the ones not needed for an upgrade:

```text
docker volume rm portainer_data
docker compose down -v
```

Do not remove the persistent volume. Also do not start old and new Server containers concurrently against the same `/data` directory.

On Swarm and Kubernetes, use the official service-update, Helm, or manifest procedure. Confirm that Portainer's persistent storage can attach on the node where the new task or Pod starts. Local-only storage plus unconstrained rescheduling can present an empty installation even though the original data still exists on another node.

## Watch the Database Migration

Follow the Server logs during first startup:

```bash
docker logs --follow --tail=200 portainer
```

Allow the database migration to finish. Repeatedly killing the container during migration increases recovery risk.

Do not roll back by pointing an older image at a database already upgraded by a newer version. Portainer documents that newer releases commonly change the database schema and an older release cannot use that newer database. Restore the pre-upgrade backup into a fresh instance and run the image version compatible with that backup.

## Validate More Than the Login Page

After the Server is healthy, verify:

- the UI uses the intended URL and HTTPS port;
- the displayed Server version and edition are correct;
- administrator and representative non-admin users can authenticate;
- teams, roles, access controls, registries, and Git credentials are present;
- every environment reports healthy and opens successfully;
- Server and Agent versions match the chosen release;
- managed stack definitions and Git settings are visible;
- webhooks and SSO callbacks still use the correct external URL;
- creating and deleting a harmless test workload works in a non-production environment.

The Docker workloads managed by Portainer normally continue running while the Server container is replaced. Avoid using application uptime alone as proof that Portainer's own state survived.

## Build a Rollback Decision

Set a time limit before the window begins. Roll back through restore when there is evidence of database corruption, an unsupported migration, or a critical compatibility problem. Continue forward when the issue is a corrected port mapping, proxy route, Agent version, or missing startup flag and the database itself migrated cleanly.

Keep the old image reference and backup until verification and an observation period complete. Then update the deployment source of truth so the next restart does not silently return to the previous image or old arguments.

## Official Documentation

- [Portainer: Updating Portainer](https://docs.portainer.io/start/upgrade)
- [Portainer: Updating on Docker Standalone](https://docs.portainer.io/start/upgrade/docker)
- [Portainer: Updating on Docker Swarm](https://docs.portainer.io/start/upgrade/swarm)
- [Portainer: Updating on Kubernetes](https://docs.portainer.io/start/upgrade/kubernetes)
- [Portainer: General Settings—Back up Portainer](https://docs.portainer.io/admin/settings/general#back-up-portainer)
- [Portainer: What Does Portainer's Backup Include?](https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include)
- [Portainer: Upgrading and Downgrading FAQ](https://docs.portainer.io/faqs/upgrading)
