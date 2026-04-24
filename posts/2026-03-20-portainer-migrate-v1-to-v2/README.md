# How to Migrate Portainer from Version 1.x to 2.x - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Migration, Upgrade, V1, V2

Description: A guide to migrating from Portainer version 1.x to the modern 2.x architecture, covering data migration, configuration changes, and breaking changes.

## Overview

Portainer 1.x reached end-of-life and is no longer maintained, but Portainer documents a supported upgrade path to 2.x. The key point is that this is an in-place upgrade that reuses your existing Portainer data volume: if you are on a release older than 1.24.1, upgrade to 1.24.2 first, then to 2.0.0, and only then continue to a current 2.x release.

The commands below use Portainer Community Edition images. If you are migrating a Business Edition installation, use the matching BE image and follow Portainer's BE upgrade or switch instructions instead.

## Key Differences: Portainer 1.x vs 2.x

| Aspect | Portainer 1.x | Portainer 2.x |
|---|---|---|
| Architecture | Portainer Server, with Agent available for Swarm/remote management | Portainer Server with Agent or Edge Agent options |
| Kubernetes support | None | Supported |
| Supported upgrade path | Upgrade older installs to `1.24.2` first | Upgrade to `2.0.0` before moving to newer 2.x releases |
| UI access during upgrade | `http://server:9000` | `http://server:9000` on `2.0.0`, then `https://server:9443` on current 2.x releases |
| Legacy HTTP access | `9000` | `9000` optional for legacy HTTP access |
| Data directory | `/data` | `/data` |

## What Is Migrated

When you follow the supported upgrade path and keep the existing `/data` volume, Portainer upgrades the existing database in place:
- Users, teams, and access control stored in Portainer
- Environments and environment groups stored in Portainer
- Stack definitions created in Portainer, registries, templates, and settings

## What Must Be Reconfigured

- Nothing in Portainer itself should need to be recreated if you keep the existing `/data` volume
- You should still validate environment connectivity and update any Agent or Edge Agent deployments to the same version as the Portainer Server
- If you move from legacy HTTP on `9000` to HTTPS on `9443`, update bookmarks, reverse proxy settings, and firewall rules as needed
- Application containers, images, volumes, and other Docker/Kubernetes resources outside Portainer's own database are not part of the Portainer configuration

## Migration Process

### Step 1: Document Your 1.x Configuration

Before starting, document your current Portainer version and configuration, and take a backup of the existing volume or bind mount used for `/data`:

```bash
# Record the exact Portainer 1.x version first.
# Then back up the existing Docker volume or bind mount used for /data.
#
# Also screenshot or export from the Portainer 1.x UI:
# - Environments list
# - User and team list
# - Access policies
# - Stack definitions managed by Portainer
# - Template and registry configuration
```

### Step 2: Upgrade to Portainer 1.24.2 if Needed

If you are running a version older than 1.24.1, you must first upgrade to 1.24.2:

```bash
# Skip this step if you are already on 1.24.1 or 1.24.2.
# Replace portainer_data with the existing volume or bind mount backing /data.
docker stop portainer
docker rm portainer

docker run -d \
  -p 8000:8000 \
  -p 9000:9000 \
  --name=portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer:1.24.2
```

### Step 3: Upgrade to Portainer 2.0.0

```bash
# Stop and remove the 1.24.x container, but keep the existing data volume.
# Replace portainer_data with the existing volume or bind mount backing /data.
docker stop portainer
docker rm portainer
docker pull portainer/portainer-ce:2.0.0

docker run -d \
  -p 8000:8000 \
  -p 9000:9000 \
  --name=portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:2.0.0
```

### Step 4: Update to a Current 2.x Release

```bash
# Once 2.0.0 is running, continue with the standard 2.x update process.
docker stop portainer
docker rm portainer
docker pull portainer/portainer-ce:lts

docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name=portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Add -p 9000:9000 only if you still need legacy HTTP access.
```

### Step 5: Review Environments and Agents

In most cases, Portainer-managed users, environments, stacks, registries, and templates should already be present because the existing database was upgraded in place:

```text
1. Sign in to the upgraded Portainer instance.
2. Verify your users, teams, environments, stacks, registries, and templates are present.
3. If you manage remote or multi-node Swarm environments, update or redeploy the Portainer Agent or Edge Agent so the agent version matches the Portainer Server version.
4. If you need to add a new Swarm environment, use the Add Environment wizard and follow the generated Agent or Edge Agent instructions.
```

### Step 6: Validate Migration

- Verify you can sign in to `https://server:9443` (or `http://server:9000` if you kept legacy HTTP enabled)
- Verify all environments are connected
- Test deploying containers
- Check user access
- Validate that Portainer-managed stacks are present and working as expected

### Step 7: Finalize the Upgrade

If you followed the supported upgrade path above, there is no separate Portainer 1.x instance to decommission later because you replaced it in place. Do not delete the existing data volume until you have completed validation and confirmed your backup is usable.

## Conclusion

Migrating from Portainer 1.x to 2.x is a supported in-place upgrade, not a parallel fresh installation. Keep the existing `/data` volume, upgrade older 1.x releases to 1.24.2 first, then move to 2.0.0 and continue to a current 2.x release. When the upgrade is done correctly, Portainer-managed users, environments, stacks, registries, templates, and settings should come forward with the upgraded database; the main work afterward is validation and any agent version alignment.
