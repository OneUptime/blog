# How to Migrate Containers Between Portainer Environments - Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Migration, Container Management, DevOps, Environment

Description: Learn how to move containers and stacks from one Portainer environment to another, including volume data and configuration transfer.

---

Portainer makes multi-environment management easy, and while it can migrate a Docker-based stack definition between environments from the UI, moving workloads - for example, from staging to production, or from one Docker host to another - still requires a methodical approach for data and environment-specific settings. This guide covers migrating containers, stacks, and their data between Portainer-managed environments.

---

## Understanding Portainer Environments

In Portainer, each managed Docker, Swarm, Podman, or Kubernetes target is a separate "environment." For Docker-based environments, Portainer can migrate a stack definition between environments from the UI, but persistent volume data still needs to be transferred separately.

---

## Step 1: Copy or Migrate the Stack Definition

The cleanest supported approach is to migrate the stack definition from the source environment in Portainer, or copy the Compose file if you prefer to redeploy it manually.

In Portainer UI:
1. Go to the source environment
2. Navigate to **Stacks**
3. Click the stack you want to migrate
4. In **Stack duplication / migration**, select the destination environment and click **Migrate** if you want Portainer to move the stack definition for you
5. If you prefer to redeploy manually, copy the Compose YAML from the editor when available. For Git-based stacks, update the repository copy or detach the stack from Git first

---

## Step 2: Export Volume Data

For containers with persistent data, export each volume's contents. If your stack uses both `my_app_data` and `db_data`, back up each volume separately.

```bash
# Export each named Docker volume to a tar archive
docker run --rm \
  -v my_app_data:/source \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/my_app_data.tar.gz -C /source .

docker run --rm \
  -v db_data:/source \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/db_data.tar.gz -C /source .

# List what's in an archive to confirm
tar tzf my_app_data.tar.gz | head -20
```

---

## Step 3: Push Images to a Shared Registry

If custom images are used, ensure they're in a registry accessible from the target environment.

```bash
# Tag your image for a registry accessible to both environments
docker tag my-custom-app:v1 registry.example.com/my-custom-app:v1

# Push to the shared registry
docker push registry.example.com/my-custom-app:v1
```

---

## Step 4: Transfer Volume Data to the Target Host

```bash
# Transfer volume backups to the target server
scp my_app_data.tar.gz db_data.tar.gz user@target-host:/home/user/

# On the target host: create the volumes and restore them
docker volume create my_app_data
docker volume create db_data

docker run --rm \
  -v my_app_data:/target \
  -v /home/user:/backup \
  alpine \
  tar xzf /backup/my_app_data.tar.gz -C /target

docker run --rm \
  -v db_data:/target \
  -v /home/user:/backup \
  alpine \
  tar xzf /backup/db_data.tar.gz -C /target
```

---

## Step 5: Deploy the Stack in the Target Environment

In the Portainer UI for the target environment:

1. Go to **Stacks > Add Stack**
2. Give it the same name as the source stack and select **Web editor**
3. Paste the Compose YAML you exported
4. Update any environment variables specific to the target (database URLs, hostnames, etc.)
5. Click **Deploy the stack**

```yaml
# Updated compose for target environment
# Key changes: image registry URL updated, env vars for new environment
services:
  app:
    image: registry.example.com/my-custom-app:v1  # updated registry URL
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - DB_HOST=db-production.internal  # updated for target environment
      - APP_ENV=production
    volumes:
      - my_app_data:/app/data

  db:
    image: postgres:15
    restart: unless-stopped
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  my_app_data:
    external: true  # use the volume we pre-populated
  db_data:
    external: true  # restore this volume before deploying if you need existing database data
```

---

## Step 6: Validate the Migration

```bash
# On the target host, verify containers are running
docker ps

# Check container logs for errors
docker logs -f <container_name>

# Verify volume data is accessible
docker exec <container_name> ls /app/data
```

---

## Summary

Migrating containers between Portainer environments is a six-step process: copy or migrate the stack definition, back up volume data, push any custom images, transfer and restore data on the target host, and redeploy the stack if needed. Update environment-specific settings in the Compose file before deploying to the target environment to avoid configuration drift.
