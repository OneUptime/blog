# How to Set Up a Private Galaxy Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Private Server, Pulp, Automation Hub

Description: How to deploy and configure a private Ansible Galaxy server using Pulp or Automation Hub for hosting internal collections and roles.

---

Running a private Galaxy server gives your organization a central place to store, version, and distribute Ansible content internally. Instead of relying on the public Galaxy or scattering roles across Git repositories, a private server provides a curated library of approved automation content with proper access controls.

There are two main approaches: deploying Galaxy NG (the upstream project that powers Automation Hub) or using Pulp with the Galaxy plugin. This post covers both.

## Why Run a Private Galaxy Server?

A few scenarios where this makes sense:

- You want a curated catalog of approved roles and collections for your organization
- Compliance requirements mandate that all software comes from internal sources
- You need access controls to restrict who can publish and consume content
- You want to mirror specific public Galaxy content for reliability and speed
- Air-gapped environments need a local Galaxy-compatible API

## Option 1: Galaxy NG (Community Automation Hub)

Galaxy NG is the open-source upstream of Red Hat's Automation Hub. It provides a full Galaxy-compatible API, web interface, and support for both roles and collections.

### Deploying Galaxy NG with Docker Compose

The quickest way to get started is with the official container images:

```yaml
# docker-compose.yml - Galaxy NG deployment
---
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: galaxy
      POSTGRES_PASSWORD: galaxy_secret
      POSTGRES_DB: galaxy
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U galaxy"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  galaxy-api:
    image: quay.io/ansible/galaxy-ng:latest
    command: ["run", "api"]
    environment:
      GALAXY_DB_HOST: postgres
      GALAXY_DB_PORT: "5432"
      GALAXY_DB_USER: galaxy
      GALAXY_DB_PASSWORD: galaxy_secret
      GALAXY_DB_NAME: galaxy
      GALAXY_REDIS_HOST: redis
      GALAXY_REDIS_PORT: "6379"
      GALAXY_SECRET_KEY: "change-this-to-a-random-string"
      GALAXY_ALLOWED_HOSTS: "*"
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - galaxy_data:/var/lib/pulp

  galaxy-worker:
    image: quay.io/ansible/galaxy-ng:latest
    command: ["run", "worker"]
    environment:
      GALAXY_DB_HOST: postgres
      GALAXY_DB_PORT: "5432"
      GALAXY_DB_USER: galaxy
      GALAXY_DB_PASSWORD: galaxy_secret
      GALAXY_DB_NAME: galaxy
      GALAXY_REDIS_HOST: redis
      GALAXY_REDIS_PORT: "6379"
      GALAXY_SECRET_KEY: "change-this-to-a-random-string"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - galaxy_data:/var/lib/pulp

  galaxy-content:
    image: quay.io/ansible/galaxy-ng:latest
    command: ["run", "content-app"]
    environment:
      GALAXY_DB_HOST: postgres
      GALAXY_DB_PORT: "5432"
      GALAXY_DB_USER: galaxy
      GALAXY_DB_PASSWORD: galaxy_secret
      GALAXY_DB_NAME: galaxy
      GALAXY_REDIS_HOST: redis
      GALAXY_REDIS_PORT: "6379"
      GALAXY_SECRET_KEY: "change-this-to-a-random-string"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - galaxy_data:/var/lib/pulp

volumes:
  postgres_data:
  galaxy_data:
```

Start the services:

```bash
# Launch Galaxy NG
docker compose up -d

# Wait for services to be healthy
docker compose ps

# Create an admin user
docker compose exec galaxy-api pulpcore-manager createsuperuser \
    --username admin \
    --email admin@example.com
```

### Configuring Galaxy NG

Once running, access the web UI at `http://localhost:8080` and log in with the admin credentials. From there you can:

- Create namespaces for different teams
- Set up approval workflows for new content
- Configure remote repositories to sync from public Galaxy

## Option 2: Pulp with Galaxy Plugin

Pulp is a more general-purpose content management platform. With the `pulp_ansible` plugin, it can serve as a Galaxy server.

### Installing Pulp with the Ansible Plugin

Use the Pulp installer (itself an Ansible collection) to deploy Pulp:

```yaml
# pulp-install.yml - Deploy Pulp with the Galaxy plugin
---
- hosts: galaxy_server
  become: true
  vars:
    pulp_settings:
      secret_key: "change-this-to-something-random"
      content_origin: "https://galaxy.internal.com"
      allowed_content_checksums:
        - sha256
        - sha512
    pulp_install_plugins:
      pulp-ansible:
        source: "pulp-ansible"
      galaxy-ng:
        source: "galaxy-ng"
    pulp_default_admin_password: "admin_password_here"

  roles:
    - pulp.pulp_installer.pulp_all_services
```

Run it:

```bash
# Install the Pulp installer collection first
ansible-galaxy collection install pulp.pulp_installer

# Deploy Pulp
ansible-playbook pulp-install.yml -i inventory
```

## Configuring Clients to Use Your Private Server

Once your server is running, configure `ansible.cfg` on every client machine:

```ini
# ansible.cfg - point to your private Galaxy server
[galaxy]
server_list = private_galaxy, public_galaxy

[galaxy_server.private_galaxy]
url = https://galaxy.internal.com/api/galaxy/content/published/
token = your_api_token_here

[galaxy_server.public_galaxy]
url = https://galaxy.ansible.com/
```

This configuration checks your private server first and falls back to public Galaxy if the content is not found internally.

## Syncing Content from Public Galaxy

You can mirror specific collections from public Galaxy to your private server. This is done through remote repositories in Galaxy NG:

```bash
# Create a remote pointing to public Galaxy
curl -X POST "http://localhost:8080/api/galaxy/content/v3/sync/config/" \
    -H "Authorization: Token your_admin_token" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "community",
        "url": "https://galaxy.ansible.com/api/",
        "requirements_file": "---\ncollections:\n  - name: community.general\n  - name: ansible.posix\n"
    }'

# Trigger a sync
curl -X POST "http://localhost:8080/api/galaxy/content/v3/sync/" \
    -H "Authorization: Token your_admin_token" \
    -H "Content-Type: application/json" \
    -d '{"name": "community"}'
```

## Publishing Internal Content

Upload a collection to your private server:

```bash
# Build the collection
ansible-galaxy collection build ./my_namespace/my_collection/

# Upload to the private server
ansible-galaxy collection publish my_namespace-my_collection-1.0.0.tar.gz \
    --server private_galaxy
```

## Access Control

Galaxy NG supports namespaces and permissions. Create team-specific namespaces so only authorized users can publish to them:

```bash
# Create a namespace via the API
curl -X POST "http://localhost:8080/api/galaxy/v3/namespaces/" \
    -H "Authorization: Token admin_token" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "platform_team",
        "groups": [
            {"name": "platform-engineers", "object_permissions": ["upload_to_namespace"]}
        ]
    }'
```

## Setting Up TLS

For production, always put your Galaxy server behind TLS. Use a reverse proxy like Nginx:

```nginx
# /etc/nginx/conf.d/galaxy.conf - Reverse proxy for Galaxy NG
server {
    listen 443 ssl;
    server_name galaxy.internal.com;

    ssl_certificate /etc/ssl/certs/galaxy.crt;
    ssl_certificate_key /etc/ssl/private/galaxy.key;

    # Proxy to Galaxy API
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy to Galaxy content app
    location /pulp/content/ {
        proxy_pass http://127.0.0.1:24816;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Galaxy NG UI
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring Your Galaxy Server

Set up basic health checks to make sure the server stays available:

```bash
#!/bin/bash
# check-galaxy-health.sh - Monitor Galaxy server health
GALAXY_URL="https://galaxy.internal.com"

# Check the API endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$GALAXY_URL/api/galaxy/")

if [ "$HTTP_CODE" != "200" ]; then
    echo "ALERT: Galaxy server returned HTTP $HTTP_CODE"
    # Send alert via your monitoring system
    exit 1
fi

echo "Galaxy server healthy (HTTP $HTTP_CODE)"
```

## Summary

Running a private Galaxy server gives your organization centralized control over Ansible content distribution. Galaxy NG (deployed via Docker Compose) is the quickest path to a working server, while Pulp with the ansible plugin offers more flexibility. Configure clients with `ansible.cfg` server lists, set up TLS for production, sync public content for reliability, and use namespaces for access control. This setup is particularly valuable for regulated environments and large teams that need a curated library of approved automation content.
