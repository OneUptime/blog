# How to Install and Configure phpIPAM for IPv4 Address Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: phpIPAM, IPAM, IPv4, Network Management, Docker, PHP

Description: Install phpIPAM using Docker Compose and configure it as an IPv4 address management system for tracking subnets and IP allocations.

phpIPAM is an open-source web-based IP address management application written in PHP. It offers a clean UI, subnet scanning, VLAN management, and REST API for IPv4 and IPv6 tracking.

## Step 1: Deploy phpIPAM with Docker Compose

```yaml
# docker-compose.yml

services:
  phpipam-web:
    image: phpipam/phpipam-www:latest
    ports:
      - "80:80"
    environment:
      - TZ=UTC
      - IPAM_DATABASE_HOST=phpipam-db
      - IPAM_DATABASE_PASS=phpipam_pass
      - IPAM_DATABASE_NAME=phpipam
      - IPAM_DATABASE_USER=phpipam
      - IPAM_DATABASE_WEBHOST=%
    volumes:
      - phpipam-logo:/phpipam/css/images/logo
      - phpipam-ca:/usr/local/share/ca-certificates:ro
    restart: unless-stopped
    depends_on:
      - phpipam-db
    cap_add:
      - NET_ADMIN
      - NET_RAW

  phpipam-cron:
    image: phpipam/phpipam-cron:latest
    environment:
      - TZ=UTC
      - IPAM_DATABASE_HOST=phpipam-db
      - IPAM_DATABASE_PASS=phpipam_pass
      - IPAM_DATABASE_NAME=phpipam
      - IPAM_DATABASE_USER=phpipam
      - IPAM_DATABASE_WEBHOST=%
      - SCAN_INTERVAL=1h
    volumes:
      - phpipam-ca:/usr/local/share/ca-certificates:ro
    restart: unless-stopped
    depends_on:
      - phpipam-db
    cap_add:
      - NET_ADMIN
      - NET_RAW

  phpipam-db:
    image: mariadb:latest
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_USER=phpipam
      - MYSQL_PASSWORD=phpipam_pass
      - MYSQL_DATABASE=phpipam
    volumes:
      - phpipam-db:/var/lib/mysql
    restart: unless-stopped

volumes:
  phpipam-logo:
  phpipam-ca:
  phpipam-db:
```

```bash
docker compose up -d

# Verify the services are running
docker compose ps
```

## Step 2: Initial Setup

1. Open `http://localhost` in your browser
2. Click **Install new phpipam database**
3. Enter the database credentials from your compose file
4. Log in with `Admin` / `ipamadmin`
5. Change the default admin password

## Step 3: Configure IPAM via the Web Interface

1. Go to **Administration → IP Sections**
2. Create a section: "Corporate Network"
3. Add subnets under the section

## Step 4: Create Sections and Subnets via API

In the phpIPAM web UI, enable the API module and create an API app named `myapp` under **Settings → API**.

```bash
# First, get an API token
curl -X POST \
  -u "Admin:your-admin-password" \
  "http://localhost/api/myapp/user/"

# Store the token from the response
TOKEN="your-api-token-here"

# Create a section
curl -X POST \
  -H "token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Corporate", "description": "Corporate network sections"}' \
  "http://localhost/api/myapp/sections/"

# Create a subnet
# Replace sectionId with the numeric ID of your section
curl -X POST \
  -H "token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subnet": "10.100.1.0",
    "mask": "24",
    "sectionId": "1",
    "description": "Web tier servers"
  }' \
  "http://localhost/api/myapp/subnets/"
```

## Step 5: Enable Subnet Scanning

phpIPAM can automatically scan subnets for live hosts when the `phpipam-cron` container is running:

```bash
# Scheduled discovery jobs are controlled by the cron container
# SCAN_INTERVAL=1h
```

Enable scanning in the subnet settings:
1. Edit a subnet
2. Assign a scan agent
3. Enable host status checks and/or new host discovery

## Viewing Subnet Utilization

```bash
# Replace with the numeric ID of your subnet
SUBNET_ID="1"

# Get subnet usage details
curl -H "token: $TOKEN" \
  "http://localhost/api/myapp/subnets/$SUBNET_ID/usage/" \
  | python3 -m json.tool
```

## Backing Up phpIPAM

```bash
# Database backup
docker compose exec -T phpipam-db mariadb-dump \
  -u phpipam --password=phpipam_pass phpipam > phpipam-backup.sql

# Restore from backup
docker compose exec -T phpipam-db mariadb \
  -u phpipam --password=phpipam_pass phpipam < phpipam-backup.sql
```

phpIPAM provides a lighter-weight alternative to NetBox for organizations primarily needing subnet and IP tracking without full DCIM functionality.
