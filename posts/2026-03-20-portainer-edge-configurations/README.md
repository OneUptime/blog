# How to Store Edge Configurations in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Edge Computing, Configuration Management, DevOps

Description: Learn how to create, manage, and distribute edge configurations to remote devices using Portainer's Edge Configuration feature.

## Introduction

Managing configuration files across a large fleet of edge devices is one of the most challenging aspects of edge operations. Portainer's Edge Configurations feature allows you to centrally store configuration packages and distribute them to your edge endpoints automatically, keeping all devices in sync without manual intervention.

## Prerequisites

- Portainer Business Edition with Edge Compute enabled
- Edge agents connected
- At least one Edge Group configured

## What Are Edge Configurations?

Edge Configurations are sets of files stored in Portainer that get synchronized to edge devices. Common use cases include:

- Application configuration files (e.g., `nginx.conf`, `app.yaml`)
- Certificate files
- Environment files (`.env`)
- Custom scripts or initialization files

## Step 1: Navigate to Edge Configurations

1. Log in to Portainer.
2. Go to **Edge Compute > Edge Configurations**.
3. Click **Add configuration**.

## Step 2: Create a Configuration

Provide the following:

- **Name**: A descriptive identifier (e.g., `nginx-config-production`).
- **Type**: Choose `General configuration` to deploy the same files to all devices in the selected edge groups, or `Device specific configuration` to match files or folders to devices by `PORTAINER_EDGE_ID`.
- **Configuration package**: Upload a ZIP package containing the files you want to distribute.

For example, your ZIP package might contain files like:

```text
edge-configs.zip
|- nginx.conf
`- app.yaml
```

One of those files could be an `nginx.conf` like this:

```nginx
# Example: nginx.conf for an edge-deployed reverse proxy

# Stored as an edge configuration in Portainer

worker_processes auto;

events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:8080;
    }

    server {
        listen 80;
        server_name _;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # Health check endpoint
        location /health {
            return 200 "OK";
            add_header Content-Type text/plain;
        }
    }
}
```

## Step 3: Set the Target Directory

Specify the directory on the edge device where the package contents should be written:

```text
# Target directory on edge host:
/etc/edge-configs/nginx

# Or for app config:
/opt/myapp/config
```

Portainer deploys the files from the ZIP package into this directory on the edge device. The directory should be the same on all target devices and writable by the user the Edge Agent runs as. For example, if your ZIP package contains `nginx.conf` and you use `/etc/edge-configs/nginx` as the directory, the file will be available at `/etc/edge-configs/nginx/nginx.conf`.

## Step 4: Assign to Edge Groups

Select the edge groups that should receive this configuration:

- `Production-EU`
- `Production-US`
- `Factory-Floor-Berlin`

All edge environments in the selected groups will receive the configuration package.

## Step 5: Reference Configurations in Edge Stacks

Once configurations are distributed, your Edge Stack can use them via bind mounts:

```yaml
# docker-compose.yml - uses the edge-distributed config file
services:
  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
    volumes:
      # Mount the configuration distributed by Portainer Edge Configurations
      - /etc/edge-configs/nginx/nginx.conf:/etc/nginx/nginx.conf:ro

  app:
    image: myorg/myapp:latest
    restart: always
    volumes:
      # Mount app config distributed by Portainer
      - /opt/myapp/config/app.yaml:/app/config.yaml:ro
```

## Step 6: Update Configurations

To roll out a configuration change:
1. Go to **Edge Compute > Edge Configurations**.
2. Click on the configuration name.
3. Upload an updated ZIP package or adjust the configuration settings.
4. Click **Save**.

Portainer will push the updated files to all assigned edge groups on the next agent synchronization cycle.

## Step 7: Monitor Synchronization Status

On the **Edge Configurations** page, you can monitor the progress of the rollout across your edge environments and confirm which edge groups each configuration applies to.

## Best Practices

- **Version your configurations**: Include a version comment in files so you know what revision is deployed.
- **Use separate configurations per environment**: For example, `nginx-config-production` vs `nginx-config-staging`.
- **Combine with Edge Stacks**: Distribute config files first, then deploy stacks that reference them.
- **Avoid secrets in edge configurations**: Use your platform's native secret mechanism or another dedicated secret manager instead.

```yaml
# Example: app.yaml configuration distributed via Edge Configurations
# Version: 1.3.0
app:
  listen_port: 8080
  log_level: info
  database:
    # Note: actual DB password injected via container env var, not here
    host: localhost
    port: 5432
    name: appdb
  metrics:
    enabled: true
    port: 9090
```

## Conclusion

Portainer Edge Configurations solve the configuration distribution problem at scale. By centralizing your config packages in Portainer and letting agents synchronize them automatically, you can reduce or eliminate the need for SSH-based distribution of application configuration files across your edge fleet. Combined with Edge Stacks, this gives you a more declarative deployment pipeline for remote devices.
