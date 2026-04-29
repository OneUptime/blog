# How to Migrate Portainer from Version 1.x to 2.x

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Migration, Upgrade, Docker, DevOps

Description: A complete guide to migrating from Portainer 1.x to Portainer 2.x including data migration steps and breaking changes to be aware of.

---

Portainer 2.x introduced a redesigned architecture with a new data format, improved RBAC, and the agent-based connection model. Migration from 1.x requires a fresh install-data is not automatically migrated, but the process is well-documented.

## Key Differences Between 1.x and 2.x

| Feature | 1.x | 2.x |
|---------|-----|-----|
| Multi-environment | Endpoints | Environments |
| Default UI port | 9000 (HTTP) | 9443 (HTTPS, since 2.9) |
| HTTPS default | No | Yes (9443) |
| RBAC | Basic | Advanced (BE) |
| Data format | BoltDB (1.x schema) | BoltDB (2.x schema) |

## Step 1: Document Your Existing Configuration

Before migrating, record your current setup:

```bash
# Export the list of endpoints (environments) from Portainer 1.x API

curl -s -X GET \
  http://localhost:9000/api/endpoints \
  -H "Authorization: Bearer <your-1x-jwt-token>" | \
  python3 -m json.tool > portainer_1x_endpoints.json

# Note down custom templates
curl -s -X GET \
  http://localhost:9000/api/templates \
  -H "Authorization: Bearer <your-1x-jwt-token>" | \
  python3 -m json.tool > portainer_1x_templates.json
```

## Step 2: Back Up 1.x Data

```bash
# Stop Portainer 1.x
docker stop portainer

# Back up the 1.x data volume
docker run --rm \
  -v portainer_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/portainer_1x_backup_$(date +%Y%m%d).tar.gz -C /data .
```

## Step 3: Remove the 1.x Container

```bash
# Remove the old container (keep the volume for reference)
docker container rm portainer

# Optionally rename the old volume
docker volume create portainer_data_1x_backup
docker run --rm \
  -v portainer_data:/from \
  -v portainer_data_1x_backup:/to \
  alpine cp -a /from/. /to/
```

## Step 4: Install Portainer 2.x Fresh

```bash
# Create a new volume for 2.x
docker volume create portainer_data_v2

# Deploy Portainer 2.x
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data_v2:/data \
  portainer/portainer-ce:latest
```

## Step 5: Reconfigure Your Environments

Portainer 2.x does not import 1.x endpoint data. Re-add your environments manually:

1. Log in and complete the setup wizard
2. Go to **Environments > Add Environment**
3. Re-add each Docker host (standalone, Swarm, or Kubernetes)
4. Reinstall the Portainer Agent on each host:

```bash
# Install Portainer Agent 2.x on each Docker host
docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest
```

## Step 6: Recreate Stacks and Templates

Re-create your application stacks using the Stacks UI or by importing docker-compose files from version control. Custom templates can be re-created under **App Templates > Custom Templates**.

---

*Monitor all your newly migrated environments with [OneUptime](https://oneuptime.com) uptime and performance monitoring.*
