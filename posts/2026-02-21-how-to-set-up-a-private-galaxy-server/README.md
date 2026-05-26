# How to Set Up a Private Galaxy Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Private Server, Pulp, Automation Hub

Description: How to deploy and configure a private Ansible Galaxy server using Pulp or Automation Hub for hosting internal collections and roles.

---

Running a private Galaxy server gives your organization a central place to store, version, and distribute Ansible content internally. Instead of relying on the public Galaxy or scattering roles across Git repositories, a private server provides a curated library of approved automation content with proper access controls.

There are two main approaches: deploying Galaxy NG (the upstream project that powers Automation Hub) or using Pulp with the `pulp_ansible` and `galaxy-ng` plugins. This post covers both.

## Why Run a Private Galaxy Server?

A few scenarios where this makes sense:

- You want a curated catalog of approved roles and collections for your organization
- Compliance requirements mandate that all software comes from internal sources
- You need access controls to restrict who can publish and consume content
- You want to mirror specific public Galaxy content for reliability and speed
- Air-gapped environments need a local Galaxy-compatible API

## Option 1: Galaxy NG (Community Automation Hub)

Galaxy NG is the open-source upstream of Red Hat's Automation Hub. It provides a Galaxy-compatible API and web interface for collections, with legacy role support handled through the v1 API.

### Deploying Galaxy NG with Docker Compose

The quickest way to get started for local evaluation is with the official Galaxy NG compose stack from the source repository:

```bash
# Get the Galaxy NG source
git clone https://github.com/ansible/galaxy_ng.git
cd galaxy_ng

# Build the community compose stack
docker compose -f dev/compose/community.yaml build

# Launch Galaxy NG
docker compose -f dev/compose/community.yaml up -d

# Wait for services to be healthy
docker compose -f dev/compose/community.yaml ps

# Create an admin user
docker compose -f dev/compose/community.yaml exec manager pulpcore-manager createsuperuser \
    --username admin \
    --email admin@example.com
```

### Configuring Galaxy NG

Once running, the Galaxy API is available at `http://localhost:5001/api/galaxy/v3/swagger-ui/`. The standalone community UI can be run separately from the `ansible-hub-ui` repository and is available at `http://localhost:8002` when started. From there you can:

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
  collections:
    - pulp.pulp_installer
  vars:
    pulp_settings:
      secret_key: "change-this-to-something-random"
      content_origin: "https://galaxy.internal.com"
      allowed_content_checksums:
        - sha256
        - sha512
    pulp_install_plugins:
      pulp-ansible:
      galaxy-ng:
    pulp_default_admin_password: "admin_password_here"

  roles:
    - pulp_all_services
  environment:
    DJANGO_SETTINGS_MODULE: pulpcore.app.settings
```

Run it:

```bash
# Install the Pulp installer collection first
ansible-galaxy collection install pulp.pulp_installer
ansible-galaxy install geerlingguy.postgresql

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
url = https://galaxy.internal.com/api/galaxy/
token = your_api_token_here

[galaxy_server.public_galaxy]
url = https://galaxy.ansible.com/
```

This configuration checks your private server first and can use public Galaxy for dependencies that are not found internally. For Galaxy NG uploads, use `/api/galaxy/` or an inbound namespace repository; `/api/galaxy/content/published/` is for downloading from the published repository and does not accept collection uploads.

## Syncing Content from Public Galaxy

You can mirror specific collections from public Galaxy to your private server. In Galaxy NG, edit the `community` remote under Collections > Repository Management, upload a `requirements.yaml` file, and start the sync from the UI:

```yaml
# requirements.yaml
collections:
  - name: community.general
  - name: ansible.posix
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
curl -X POST "http://localhost:5001/api/_ui/v1/namespaces/" \
    -H "Authorization: token admin_token" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "platform_team",
        "groups": []
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
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Galaxy NG UI, if running the standalone UI
    location / {
        proxy_pass http://127.0.0.1:8002;
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
