# How to Use Docker Swarm Configs for Non-Secret Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Swarm, Configs, Configuration Management, DevOps, Container Orchestration

Description: Manage non-sensitive configuration files in Docker Swarm using the built-in configs feature for Nginx, app settings, and more.

---

Docker Swarm has a built-in `configs` feature designed specifically for non-secret configuration data. Think Nginx config files, application settings, feature flags, or logging configurations. Unlike secrets (which are encrypted at rest and mounted in a tmpfs), configs are stored unencrypted in the Raft log and mounted as regular files inside containers.

Configs solve a real problem. Before they existed, you had to bake configuration files into images (rebuilding for every change), use environment variables (messy for complex configs), or mount host volumes (breaking the portable, immutable container model). Swarm configs keep configuration separate from the image while maintaining the declarative, version-controlled workflow that Swarm provides.

## Creating a Config

Create a config from a file, a string, or stdin.

From a file:

```bash
# Create an Nginx configuration as a Swarm config
docker config create nginx-conf ./nginx.conf
```

From a string using stdin:

```bash
# Create a config from a heredoc
echo '{"log_level": "info", "port": 8080, "workers": 4}' | docker config create app-settings -
```

From a file with a specific name:

```bash
# Create a config with a versioned name
docker config create nginx-conf-v2 ./nginx-v2.conf
```

## Listing and Inspecting Configs

```bash
# List all configs in the swarm
docker config ls

# Inspect a config to see its metadata
docker config inspect nginx-conf

# View the actual config content (base64 encoded in the output)
docker config inspect nginx-conf --pretty
```

## Using Configs in Services

Attach a config to a service to mount it as a file inside the container.

```bash
# Create a service that uses the Nginx config
docker service create \
  --name web \
  --replicas 3 \
  --config source=nginx-conf,target=/etc/nginx/nginx.conf \
  -p 80:80 \
  nginx:alpine
```

The `source` is the config name in Swarm, and `target` is the file path inside the container. By default, configs are mounted as world-readable files owned by root.

## A Practical Example: Nginx with Custom Config

Let us walk through a complete example. Start with an Nginx configuration file:

```nginx
# nginx.conf - Custom Nginx configuration for a reverse proxy
worker_processes auto;
events {
    worker_connections 1024;
}
http {
    upstream backend {
        server api:8080;
    }
    server {
        listen 80;
        server_name _;

        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
```

```bash
# Create the config from the file
docker config create nginx-conf ./nginx.conf

# Deploy Nginx using the config
docker service create \
  --name proxy \
  --replicas 2 \
  --config source=nginx-conf,target=/etc/nginx/nginx.conf \
  --network app-network \
  -p 80:80 \
  nginx:alpine
```

Every replica of the proxy service gets the same Nginx configuration. No volume mounts, no baked-in configs.

## Setting File Permissions

Control the file ownership and permissions of the mounted config:

```bash
# Mount a config with specific UID, GID, and permissions
docker service create \
  --name webapp \
  --config source=app-settings,target=/app/config.json,uid=1000,gid=1000,mode=0440 \
  myapp:v1.0
```

- **uid/gid**: Set the owner and group of the file inside the container
- **mode**: Set Unix file permissions (0440 = owner and group can read)

This is important when your container runs as a non-root user and needs to read the config file.

## Updating Configs (The Rotation Pattern)

Swarm configs are immutable. You cannot modify a config after creating it. To update a configuration, you create a new config and rotate the service to use it.

```bash
# Step 1: Create a new config with the updated content
docker config create nginx-conf-v2 ./nginx-updated.conf

# Step 2: Update the service to use the new config
docker service update \
  --config-rm nginx-conf \
  --config-add source=nginx-conf-v2,target=/etc/nginx/nginx.conf \
  proxy

# Step 3: Remove the old config (optional, after verifying the update works)
docker config rm nginx-conf
```

The service performs a rolling update when you change its config, so the update process respects your update parallelism and delay settings.

## Using Configs in Docker Compose

Define configs in a Compose file for stack deployments:

```yaml
# docker-compose.yml - Using configs in a stack
version: "3.8"

services:
  proxy:
    image: nginx:alpine
    ports:
      - "80:80"
    configs:
      # Short syntax - mounts to /<config-name> in the container
      - nginx-conf
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s

  api:
    image: myapi:v1.0
    configs:
      # Long syntax - full control over mount path and permissions
      - source: app-settings
        target: /app/config.json
        uid: "1000"
        gid: "1000"
        mode: 0440
    deploy:
      replicas: 3

configs:
  nginx-conf:
    file: ./nginx.conf
  app-settings:
    file: ./settings.json
```

Deploy the stack:

```bash
# Deploy the stack with configs
docker stack deploy -c docker-compose.yml myapp
```

When you update a config file and redeploy the stack, Swarm detects the content change and performs a rolling update of affected services.

## Templating Configs

Swarm supports Go template syntax in configs, which lets you inject runtime information.

```bash
# Create a templated config
docker config create templated-conf --template-driver golang ./config.tmpl
```

The template file can use Swarm-provided variables:

```
# config.tmpl - Go template with Swarm variables
hostname={{ .Service.Name }}-{{ .Task.Slot }}
node={{ .Node.Hostname }}
service={{ .Service.Name }}
task_id={{ .Task.ID }}
```

This injects the service name, task slot, node hostname, and task ID at runtime, which is useful for logging and monitoring configurations.

## Multiple Configs on a Single Service

Services can use multiple configs simultaneously:

```bash
# Attach multiple configs to a service
docker service create \
  --name webapp \
  --config source=app-settings,target=/app/config.json \
  --config source=logging-conf,target=/app/logging.yaml \
  --config source=feature-flags,target=/app/features.json \
  myapp:v1.0
```

Each config mounts as a separate file at its target path.

## External Configs in Compose

Reference configs that already exist in the Swarm (created outside of the Compose file):

```yaml
# docker-compose.yml - Reference pre-existing configs
version: "3.8"

services:
  proxy:
    image: nginx:alpine
    configs:
      - source: nginx-production
        target: /etc/nginx/nginx.conf

configs:
  nginx-production:
    # This config must already exist in the Swarm
    external: true
```

This is useful when the same config is shared across multiple stacks, or when configs are managed by a separate process.

## Configs vs Secrets vs Environment Variables

When should you use each?

**Configs** are best for:
- Configuration files (YAML, JSON, INI, TOML)
- Nginx/Apache/HAProxy configuration
- Application settings that are not sensitive
- Feature flags and toggles

**Secrets** are best for:
- Passwords and API keys
- TLS certificates and private keys
- Database connection strings with credentials
- Any data that should be encrypted at rest

**Environment variables** are best for:
- Simple key-value settings
- Values that change per environment (DATABASE_HOST, LOG_LEVEL)
- Settings consumed by standard library code (PORT, NODE_ENV)

## Limitations

- Configs are immutable after creation. Use the rotation pattern for updates.
- Maximum config size is 500 KB.
- Configs are stored unencrypted in the Raft log. Do not put sensitive data in them.
- Config names must be unique within the swarm.
- You must remove a config from all services before deleting it.

```bash
# This fails if any service still uses the config
docker config rm nginx-conf

# Check which services use a config
docker service inspect --format '{{json .Spec.TaskTemplate.ContainerSpec.Configs}}' proxy | jq .
```

## Conclusion

Docker Swarm configs provide a clean, native way to manage non-secret configuration data. They keep config files out of your images, support versioning through the rotation pattern, and integrate with the rolling update mechanism for safe configuration changes. Combined with secrets for sensitive data and environment variables for simple settings, configs complete the configuration management story for Swarm-based deployments. Use them anywhere you would otherwise bake a config file into an image or mount a host volume.
