# How to Deploy Stacks to Podman via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Podman, Stack, Docker Compose, Deployment, Container Orchestration

Description: Learn how to deploy Docker Compose stacks to a Podman backend via Portainer, including compatibility notes and workarounds for Podman-specific differences.

---

Portainer can deploy Compose stacks to supported Podman environments. Podman exposes a Docker-compatible API through `podman system service`, which is how tools such as Portainer connect to a Podman socket.

## Prerequisites

- Portainer connected to a Podman environment
- Podman 5 on CentOS Stream 9 for Portainer's officially supported setup
- Rootful Podman (Portainer notes that rootless Podman may work, but is not officially supported)

## Deploying a Stack via Portainer

1. Select your Podman environment in Portainer, then go to **Stacks > Add Stack**.
2. Paste your Compose YAML or import from Git.
3. Click **Deploy the stack**.

Portainer deploys the Compose-defined services to the connected Podman environment through the Podman API/socket.

## Example Stack Compatible with Podman

Most Docker Compose stacks work with Podman without changes:

```yaml
services:
  webapp:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - webapp_data:/usr/share/nginx/html

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: pgpass
      POSTGRES_DB: myapp
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  webapp_data:
  db_data:
```

## Known Compatibility Issues

**Network mode `host`:** Portainer with rootless Podman is not officially supported. When using rootless Podman, prefer explicit port mappings instead of relying on host networking.

```yaml
# Workaround for rootless: use port mapping instead of host networking

services:
  app:
    ports:
      - "8080:80"     # Use explicit port mapping
    # network_mode: host  # Avoid this for rootless Podman
```

**Privileged containers:** Rootless containers cannot have more privileges than the account that launched them. If a workload only needs a small subset of privileges, add the specific capabilities it requires instead:

```yaml
services:
  app:
    cap_add:
      - NET_ADMIN
```

**Volume ownership:** User namespace mapping can make container UIDs and GIDs appear differently on the host. If you need Podman to adjust ownership on a mounted path, Podman documents the `:U` volume option for that purpose.

## Using Podman Pods in Stacks

Podman has a native pod concept for shared networking and namespaces, but Portainer's stack workflow is Compose-based. If you need Podman pod-specific behavior, manage it with Podman tooling outside the Portainer stack flow.

## Monitoring Stack Health

Use OneUptime to monitor service endpoints in your Podman stacks just as you would with Docker stacks. The monitoring endpoint doesn't care whether Podman or Docker is running the container.
