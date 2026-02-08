# How to Run NetBox in Docker for Network Documentation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, NetBox, IPAM, DCIM, Network Documentation, Infrastructure, Automation

Description: Deploy NetBox in Docker for IP address management, data center documentation, and network infrastructure tracking with a REST API.

---

NetBox is the leading open-source tool for documenting network infrastructure. Originally built by the network engineering team at DigitalOcean, it serves as a single source of truth for IP address management (IPAM), data center infrastructure management (DCIM), circuit tracking, and device inventory. If you have ever struggled with spreadsheets full of IP addresses or outdated network diagrams, NetBox replaces all of that with a structured, searchable, API-driven platform.

Running NetBox in Docker is the recommended deployment method. The official project maintains a Docker Compose setup that bundles all required components. This guide walks through the deployment, initial configuration, data population, and integration with automation tools.

## What NetBox Tracks

NetBox models your entire infrastructure:

- **IPAM**: IP addresses, prefixes, VLANs, VRFs, and aggregates
- **DCIM**: Sites, racks, devices, interfaces, cables, and power
- **Circuits**: Provider circuits, peering connections, and transit links
- **Virtualization**: Virtual machines, clusters, and hypervisors
- **Contacts**: Teams and individuals responsible for infrastructure
- **Customization**: Custom fields, tags, and object relationships

## Prerequisites

You need:

- Docker and Docker Compose installed
- At least 2 GB of RAM and 2 CPU cores
- A few minutes for initial setup

## Deploying NetBox with Docker Compose

Clone the official NetBox Docker repository and configure it.

```bash
# Clone the official NetBox Docker project
git clone -b release https://github.com/netbox-community/netbox-docker.git
cd netbox-docker

# Create a local override file for customization
cp docker-compose.override.yml.example docker-compose.override.yml

# Generate a secret key for Django
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

Here is a standalone Docker Compose configuration if you prefer not to clone the repository.

```yaml
# docker-compose.yml - Complete NetBox stack
# Includes the web app, background worker, PostgreSQL, and Redis
version: "3.8"

services:
  netbox:
    image: netboxcommunity/netbox:latest
    container_name: netbox
    restart: unless-stopped
    ports:
      - "8000:8080"
    environment: &netbox-env
      SUPERUSER_API_TOKEN: "0123456789abcdef0123456789abcdef01234567"
      SUPERUSER_EMAIL: "admin@example.com"
      SUPERUSER_NAME: "admin"
      SUPERUSER_PASSWORD: "admin"
      ALLOWED_HOSTS: "*"
      DB_HOST: postgres
      DB_NAME: netbox
      DB_PASSWORD: netbox_db_password
      DB_USER: netbox
      REDIS_CACHE_HOST: redis-cache
      REDIS_HOST: redis
      SECRET_KEY: "your-very-long-secret-key-change-this-in-production"
    volumes:
      - netbox-media:/opt/netbox/netbox/media
      - netbox-reports:/opt/netbox/netbox/reports
      - netbox-scripts:/opt/netbox/netbox/scripts
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # Background worker processes async tasks like webhooks
  netbox-worker:
    image: netboxcommunity/netbox:latest
    container_name: netbox-worker
    restart: unless-stopped
    command: /opt/netbox/venv/bin/python /opt/netbox/netbox/manage.py rqworker
    environment: *netbox-env
    volumes:
      - netbox-media:/opt/netbox/netbox/media
      - netbox-reports:/opt/netbox/netbox/reports
      - netbox-scripts:/opt/netbox/netbox/scripts
    depends_on:
      - netbox

  # Housekeeping job cleans up old sessions and change logs
  netbox-housekeeping:
    image: netboxcommunity/netbox:latest
    container_name: netbox-housekeeping
    restart: unless-stopped
    command: /opt/netbox/housekeeping.sh
    environment: *netbox-env
    depends_on:
      - netbox

  postgres:
    image: postgres:15-alpine
    container_name: netbox-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: netbox
      POSTGRES_USER: netbox
      POSTGRES_PASSWORD: netbox_db_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U netbox"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: netbox-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  redis-cache:
    image: redis:7-alpine
    container_name: netbox-redis-cache
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  netbox-media:
  netbox-reports:
  netbox-scripts:
  postgres-data:
  redis-data:
```

## Starting NetBox

```bash
# Launch the complete stack
docker compose up -d

# Watch the logs for the initial database migration
docker compose logs -f netbox

# Verify all services are running
docker compose ps
```

Access the web interface at http://your-server:8000. Log in with the admin credentials you set in the environment variables.

## Populating NetBox with the API

NetBox has a comprehensive REST API. Use it to populate your infrastructure data programmatically.

```bash
# Set up API variables
NETBOX_URL="http://localhost:8000/api"
TOKEN="0123456789abcdef0123456789abcdef01234567"

# Create a site
curl -s -X POST "${NETBOX_URL}/dcim/sites/" \
  -H "Authorization: Token ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Primary Datacenter",
    "slug": "primary-dc",
    "status": "active",
    "region": null,
    "facility": "DC1",
    "physical_address": "123 Data Center Lane",
    "description": "Main production data center"
  }' | python3 -m json.tool

# Create a rack
curl -s -X POST "${NETBOX_URL}/dcim/racks/" \
  -H "Authorization: Token ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rack A01",
    "site": 1,
    "status": "active",
    "u_height": 42,
    "desc_units": false
  }' | python3 -m json.tool

# Create an IP prefix
curl -s -X POST "${NETBOX_URL}/ipam/prefixes/" \
  -H "Authorization: Token ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "prefix": "10.0.0.0/24",
    "site": 1,
    "status": "active",
    "description": "Server management network"
  }' | python3 -m json.tool

# Assign an IP address
curl -s -X POST "${NETBOX_URL}/ipam/ip-addresses/" \
  -H "Authorization: Token ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "10.0.0.1/24",
    "status": "active",
    "dns_name": "core-router.example.com",
    "description": "Core router management interface"
  }' | python3 -m json.tool
```

## Bulk Import Using Python

For large-scale data imports, use the pynetbox Python library.

```python
# populate_netbox.py - Bulk import infrastructure data into NetBox
# Requires: pip install pynetbox

import pynetbox

# Connect to the NetBox API
nb = pynetbox.api("http://localhost:8000", token="0123456789abcdef0123456789abcdef01234567")

# Create device roles
roles = ["Router", "Switch", "Firewall", "Server", "Access Point"]
for role_name in roles:
    nb.dcim.device_roles.create(
        name=role_name,
        slug=role_name.lower().replace(" ", "-"),
        color="0000ff"
    )
    print(f"Created role: {role_name}")

# Create a device type (manufacturer + model)
manufacturer = nb.dcim.manufacturers.create(name="Cisco", slug="cisco")
device_type = nb.dcim.device_types.create(
    manufacturer=manufacturer.id,
    model="Catalyst 9300",
    slug="catalyst-9300",
    u_height=1
)

# Create devices in a rack
for i in range(1, 5):
    device = nb.dcim.devices.create(
        name=f"switch-{i:02d}",
        device_type=device_type.id,
        role=nb.dcim.device_roles.get(name="Switch").id,
        site=nb.dcim.sites.get(name="Primary Datacenter").id,
        rack=nb.dcim.racks.get(name="Rack A01").id,
        position=i * 2,
        face="front",
        status="active"
    )
    print(f"Created device: {device.name}")

# Create VLANs
vlans = [
    {"vid": 10, "name": "Management", "description": "Device management"},
    {"vid": 20, "name": "Servers", "description": "Server production"},
    {"vid": 30, "name": "Users", "description": "User workstations"},
    {"vid": 100, "name": "Guest", "description": "Guest WiFi"},
]

for vlan_data in vlans:
    vlan = nb.ipam.vlans.create(
        vid=vlan_data["vid"],
        name=vlan_data["name"],
        site=nb.dcim.sites.get(name="Primary Datacenter").id,
        status="active",
        description=vlan_data["description"]
    )
    print(f"Created VLAN {vlan.vid}: {vlan.name}")
```

## Webhooks for Automation

NetBox can trigger webhooks when objects change, enabling automation workflows.

```bash
# Create a webhook that fires when IP addresses change
curl -s -X POST "${NETBOX_URL}/extras/webhooks/" \
  -H "Authorization: Token ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "IP Address Changes",
    "payload_url": "https://automation.example.com/netbox-webhook",
    "content_types": ["ipam.ipaddress"],
    "type_create": true,
    "type_update": true,
    "type_delete": true,
    "http_method": "POST",
    "http_content_type": "application/json",
    "enabled": true
  }'
```

## Backup and Restore

Protect your infrastructure documentation with regular backups.

```bash
# Back up the PostgreSQL database
docker exec netbox-postgres pg_dump -U netbox netbox | gzip > netbox-db-$(date +%Y%m%d).sql.gz

# Back up the media files (uploaded images, attachments)
docker run --rm -v netbox-media:/source:ro -v $(pwd):/backup alpine \
  tar czf /backup/netbox-media-$(date +%Y%m%d).tar.gz -C /source .

# Restore the database
gunzip < netbox-db-20260208.sql.gz | docker exec -i netbox-postgres psql -U netbox netbox
```

## LDAP Authentication

Integrate NetBox with your corporate directory for single sign-on.

```python
# Add to the NetBox configuration (extra.py or ldap_config.py)
import ldap
from django_auth_ldap.config import LDAPSearch, GroupOfNamesType

AUTH_LDAP_SERVER_URI = "ldap://ldap.example.com"
AUTH_LDAP_BIND_DN = "cn=netbox,ou=services,dc=example,dc=com"
AUTH_LDAP_BIND_PASSWORD = "ldap_bind_password"
AUTH_LDAP_USER_SEARCH = LDAPSearch(
    "ou=users,dc=example,dc=com",
    ldap.SCOPE_SUBTREE,
    "(uid=%(user)s)"
)
AUTH_LDAP_GROUP_SEARCH = LDAPSearch(
    "ou=groups,dc=example,dc=com",
    ldap.SCOPE_SUBTREE,
    "(objectClass=groupOfNames)"
)
AUTH_LDAP_GROUP_TYPE = GroupOfNamesType()
AUTH_LDAP_REQUIRE_GROUP = "cn=netbox-users,ou=groups,dc=example,dc=com"

AUTH_LDAP_USER_FLAGS_BY_GROUP = {
    "is_active": "cn=netbox-users,ou=groups,dc=example,dc=com",
    "is_staff": "cn=netbox-admins,ou=groups,dc=example,dc=com",
    "is_superuser": "cn=netbox-admins,ou=groups,dc=example,dc=com",
}
```

## Production Tips

For production NetBox deployments, change the SECRET_KEY and all default passwords before going live. Place an Nginx or Traefik reverse proxy in front of NetBox for TLS termination. Configure the ALLOWED_HOSTS setting to your actual domain instead of "*". Set up daily database backups with offsite storage. Use Redis Sentinel or a managed Redis service for high availability. Monitor NetBox health and response times with OneUptime to catch performance issues before they affect your team.

NetBox in Docker transforms network documentation from scattered spreadsheets into a structured, searchable, API-driven platform. It becomes the foundation for network automation, capacity planning, and change management across your infrastructure.
