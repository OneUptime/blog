# How to Install and Configure NetBox for IPv4 Address Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NetBox, IPAM, IPv4, Network Management, Docker, Python

Description: Install NetBox using Docker Compose and configure it for IPv4 address management including setting up your first site, prefix, and IP space.

NetBox is an open-source IP address management (IPAM) and data center infrastructure management (DCIM) tool. It provides a comprehensive platform for documenting and managing IPv4 address space.

## Prerequisites

```bash
# Docker and Docker Compose are required

docker --version   # 20.10.10+
docker compose version

git --version
```

## Step 1: Clone NetBox Docker

```bash
# Clone the official NetBox Docker repository
git clone -b release https://github.com/netbox-community/netbox-docker.git
cd netbox-docker
```

## Step 2: Configure NetBox

```bash
# Copy the example override file and back up the default environment file
cp docker-compose.override.yml.example docker-compose.override.yml
cp env/netbox.env env/netbox.env.bak

# Edit the environment file and compose override
nano env/netbox.env
nano docker-compose.override.yml
```

Key settings to configure:

```bash
# env/netbox.env
# Generate SECRET_KEY with:
# docker compose run --rm netbox python3 /opt/netbox/netbox/generate_secret_key.py
SECRET_KEY=<paste-generated-secret-key>
ALLOWED_HOSTS=localhost 192.168.1.100 netbox.example.com
```

```yaml
# docker-compose.override.yml
services:
  netbox:
    ports:
      - "8000:8080"
    environment:
      SKIP_SUPERUSER: "false"
      SUPERUSER_NAME: admin
      SUPERUSER_EMAIL: admin@example.com
      SUPERUSER_PASSWORD: SecurePassword123!
      SUPERUSER_API_TOKEN: replace-with-a-long-random-token
```

## Step 3: Start NetBox

```bash
# Pull images and start all services
docker compose pull
docker compose up -d

# Verify all containers are running
docker compose ps

# Expected containers:
# netbox          (web application)
# netbox-worker   (background tasks)
# postgres        (database)
# redis           (caching)
# redis-cache     (query caching)
```

## Step 4: Access the Web Interface

```bash
# NetBox is available at http://localhost:8000
curl http://localhost:8000

# Or access from browser: http://<SERVER_IP>:8000
# Login with SUPERUSER_NAME/SUPERUSER_PASSWORD
```

## Step 5: Initial IPAM Configuration via CLI

```bash
# Create initial data using the NetBox management shell
docker compose exec -T netbox ./manage.py shell --interface python << 'EOF'
from dcim.models import Site
from ipam.models import RIR, Aggregate, Prefix

# Create a site for your first IPv4 allocations
site, _ = Site.objects.get_or_create(name="HQ", slug="hq")

# Create an RIR (Regional Internet Registry) for RFC 1918 private space
rir, _ = RIR.objects.get_or_create(
    name="RFC 1918",
    slug="rfc-1918",
    defaults={"is_private": True},
)

# Create an aggregate for the 10.0.0.0/8 space
agg, _ = Aggregate.objects.get_or_create(
    prefix="10.0.0.0/8",
    defaults={"rir": rir, "description": "Private IPv4 space"},
)

# Create a prefix inside that aggregate
prefix, _ = Prefix.objects.get_or_create(
    prefix="10.100.0.0/16",
    defaults={"description": "Production network"},
)

print("Created Site, RIR, Aggregate, and Prefix")
EOF
```

## Step 6: Verify via API

```bash
# NetBox provides a REST API for all operations
# Use the v2 API token you set in docker-compose.override.yml,
# or create one under your user profile in the web interface.

# List all prefixes
curl -H "Authorization: Bearer <YOUR_V2_TOKEN>" \
  http://localhost:8000/api/ipam/prefixes/ | python3 -m json.tool

# Create a prefix via API
curl -X POST \
  -H "Authorization: Bearer <YOUR_V2_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"prefix": "10.101.0.0/16", "description": "Lab network"}' \
  http://localhost:8000/api/ipam/prefixes/
```

## Configuring Persistent Storage

```bash
# Data is stored in Docker volumes by default
# For production, use docker-compose.override.yml to replace named volumes
# with bind mounts for services such as postgres and NetBox media
```

NetBox's combination of web UI, REST API, and GraphQL makes it suitable for both manual IPAM documentation and automated IP allocation workflows.
