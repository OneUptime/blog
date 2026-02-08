# How to Use docker config for Swarm Configurations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Swarm, Docker Config, Configuration Management, Orchestration, DevOps

Description: Manage application configuration files securely in Docker Swarm using docker config for centralized, versioned configs.

---

Hardcoding configuration files into Docker images is a bad practice. Environment variables work for simple settings, but complex configurations like Nginx configs, Prometheus rules, or application YAML files need a better solution. Docker Swarm's `docker config` provides a centralized way to store and distribute configuration files to services without baking them into images or mounting host paths.

## What Is docker config?

Docker configs store non-sensitive configuration data in the Swarm's Raft log, which replicates it across all manager nodes. When you attach a config to a service, Docker mounts it as a file inside the container. The config is encrypted at rest in the Raft log and transmitted securely to the containers that need it.

Key characteristics:
- Configs are stored centrally in the Swarm
- They are mounted as files inside containers (default location: `/<config-name>`)
- They are immutable once created (you create new versions, not update existing ones)
- They are replicated across all manager nodes for high availability
- Maximum size is 500KB per config

## Prerequisites

Docker configs require Swarm mode. If your Docker host is not part of a swarm, initialize one first.

```bash
# Initialize a single-node swarm (for development/testing)
docker swarm init

# Check swarm status
docker info --format '{{.Swarm.LocalNodeState}}'
# Output: active
```

## Creating Configs

### From a File

The most common way to create a config is from an existing file.

```bash
# Create a config from a file
docker config create nginx-config ./nginx.conf

# Create a config from a specific file with a descriptive name
docker config create my-app-config-v1 ./config/application.yml
```

### From stdin

You can also pipe content directly into a config.

```bash
# Create a config from stdin
echo "worker_processes auto;" | docker config create nginx-workers -

# Create from a heredoc
docker config create app-settings - << 'EOF'
database:
  host: db.internal
  port: 5432
  pool_size: 20
logging:
  level: info
  format: json
EOF
```

### From a Command Output

Generate configs dynamically from command output.

```bash
# Create a config from a template processor
envsubst < config.template.yml | docker config create app-config-v2 -

# Create from a generated file
python generate-config.py --env production | docker config create prod-config -
```

## Listing and Inspecting Configs

```bash
# List all configs
docker config ls

# Output:
# ID                          NAME               CREATED
# abc123def456...             nginx-config       2 hours ago
# ghi789jkl012...             app-config-v1      1 day ago

# Inspect a config (shows metadata but not the content by default)
docker config inspect nginx-config

# View the config content (base64 encoded)
docker config inspect --format '{{json .Spec.Data}}' nginx-config | jq -r . | base64 -d

# Pretty inspection
docker config inspect nginx-config --pretty
```

## Using Configs in Services

### Docker Service Command

Attach a config to a service using the `--config` flag.

```bash
# Create a service with a config
docker service create \
  --name web \
  --config source=nginx-config,target=/etc/nginx/nginx.conf \
  nginx:alpine

# Short form (mounts at /<config-name> in the container)
docker service create \
  --name web \
  --config nginx-config \
  nginx:alpine
```

The full config specification supports these options:

```bash
# Full config specification
docker service create \
  --name web \
  --config source=nginx-config,target=/etc/nginx/nginx.conf,uid=101,gid=101,mode=0440 \
  nginx:alpine
```

- `source` - Name of the config in the swarm
- `target` - Path inside the container where the config is mounted
- `uid` / `gid` - Owner user and group ID for the file
- `mode` - File permissions (octal)

### Docker Compose / Stack Deploy

The preferred way to use configs is through Docker stack files (Compose files used with `docker stack deploy`).

```yaml
# docker-compose.yml for stack deployment
version: "3.8"

services:
  web:
    image: nginx:alpine
    configs:
      - source: nginx-config
        target: /etc/nginx/nginx.conf
        uid: "101"
        gid: "101"
        mode: 0440
    ports:
      - "80:80"

configs:
  nginx-config:
    file: ./nginx.conf
```

Deploy the stack:

```bash
# Deploy the stack (creates configs automatically)
docker stack deploy -c docker-compose.yml my-stack

# Verify the service is using the config
docker service inspect my-stack_web --format '{{json .Spec.TaskTemplate.ContainerSpec.Configs}}' | jq .
```

## Using External Configs

If the config already exists in the swarm (created with `docker config create`), reference it as external.

```yaml
# Reference a pre-existing config
version: "3.8"

services:
  web:
    image: nginx:alpine
    configs:
      - source: nginx-config
        target: /etc/nginx/nginx.conf

configs:
  nginx-config:
    external: true
```

This is useful when configs are managed separately from the stack deployment, perhaps by a different team or automation process.

## Config Versioning Strategy

Since configs are immutable, you need a versioning strategy for updates. The common pattern uses version suffixes.

```bash
# Create versioned configs
docker config create app-config-v1 ./config-v1.yml
docker config create app-config-v2 ./config-v2.yml

# Update the service to use the new config
docker service update \
  --config-rm app-config-v1 \
  --config-add source=app-config-v2,target=/app/config.yml \
  my-service
```

In a stack file, use labels or template variables for versioning.

```yaml
# Versioned config in a stack file
version: "3.8"

services:
  app:
    image: my-app:latest
    configs:
      - source: app-config
        target: /app/config.yml

configs:
  app-config:
    file: ./config.yml
    # Each deploy creates a new config if the content changed
    name: app-config-${CONFIG_VERSION:-v1}
```

```bash
# Deploy with a specific config version
CONFIG_VERSION=v2 docker stack deploy -c docker-compose.yml my-stack
```

## Real-World Examples

### Nginx Configuration

```yaml
# Full Nginx setup with config management
version: "3.8"

services:
  nginx:
    image: nginx:alpine
    configs:
      - source: nginx-main
        target: /etc/nginx/nginx.conf
      - source: nginx-default-site
        target: /etc/nginx/conf.d/default.conf
      - source: nginx-ssl-params
        target: /etc/nginx/ssl-params.conf
    ports:
      - "80:80"
      - "443:443"
    deploy:
      replicas: 3

configs:
  nginx-main:
    file: ./nginx/nginx.conf
  nginx-default-site:
    file: ./nginx/default.conf
  nginx-ssl-params:
    file: ./nginx/ssl-params.conf
```

### Prometheus Monitoring

```yaml
# Prometheus with config for rules and scrape targets
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    configs:
      - source: prometheus-config
        target: /etc/prometheus/prometheus.yml
      - source: alert-rules
        target: /etc/prometheus/rules/alerts.yml
    ports:
      - "9090:9090"
    deploy:
      placement:
        constraints:
          - node.role == manager

configs:
  prometheus-config:
    file: ./prometheus/prometheus.yml
  alert-rules:
    file: ./prometheus/alerts.yml
```

### Application Configuration

```yaml
# Multi-service application with shared and service-specific configs
version: "3.8"

services:
  api:
    image: my-api:latest
    configs:
      - source: shared-config
        target: /app/config/shared.yml
      - source: api-config
        target: /app/config/api.yml
    deploy:
      replicas: 3

  worker:
    image: my-worker:latest
    configs:
      - source: shared-config
        target: /app/config/shared.yml
      - source: worker-config
        target: /app/config/worker.yml
    deploy:
      replicas: 5

  scheduler:
    image: my-scheduler:latest
    configs:
      - source: shared-config
        target: /app/config/shared.yml
      - source: scheduler-config
        target: /app/config/scheduler.yml

configs:
  shared-config:
    file: ./config/shared.yml
  api-config:
    file: ./config/api.yml
  worker-config:
    file: ./config/worker.yml
  scheduler-config:
    file: ./config/scheduler.yml
```

## Configs vs Secrets vs Environment Variables

Docker provides three ways to pass configuration into containers. Choose the right one for each type of data.

| Feature | Configs | Secrets | Environment Variables |
|---|---|---|---|
| For sensitive data | No | Yes | No (visible in inspect) |
| Stored encrypted at rest | In Raft log | Yes (encrypted) | No |
| Mounted as files | Yes | Yes (in /run/secrets/) | No |
| Max size | 500KB | 500KB | No hard limit |
| Available outside Swarm | No | No | Yes |
| Immutable | Yes | Yes | Can change on update |

**Use configs for:** Nginx configs, Prometheus rules, application YAML files, feature flags, any non-sensitive configuration file.

**Use secrets for:** Database passwords, API keys, TLS certificates, anything you would not want visible in logs or inspect output.

**Use environment variables for:** Simple key-value settings, runtime flags, environment-specific overrides.

## Removing Configs

```bash
# Remove a specific config
docker config rm nginx-config

# Remove multiple configs
docker config rm config-v1 config-v2 config-v3

# You cannot remove a config that is in use by a service
# First remove it from the service, then delete the config
docker service update --config-rm old-config my-service
docker config rm old-config
```

## Automating Config Management

```bash
#!/bin/bash
# deploy-configs.sh - Deploy configuration files to Swarm

CONFIG_DIR="./configs"
VERSION=$(date +%Y%m%d%H%M%S)

# Create configs from all files in the config directory
for file in "$CONFIG_DIR"/*; do
  filename=$(basename "$file")
  config_name="${filename%.*}-${VERSION}"

  echo "Creating config: $config_name from $file"
  docker config create "$config_name" "$file"
done

echo "Configs created with version: $VERSION"
echo "Update your stack file to reference the new config names"
```

Docker configs bring order to configuration management in Swarm deployments. They centralize config files, replicate them across manager nodes, and deliver them securely to containers. Pair them with secrets for sensitive data and environment variables for simple settings, and you have a complete configuration strategy for your Swarm services.
