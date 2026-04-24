# How to Deploy Matrix/Synapse via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Matrix, Synapse, Decentralized Chat, Self-Hosted, Federation

Description: Deploy Matrix Synapse homeserver via Portainer for decentralized, end-to-end encrypted team communication with federation support and Element web client.

## Introduction

Matrix is an open standard for decentralized, real-time communication with end-to-end encryption. Synapse is the reference Matrix homeserver implementation. By hosting your own Synapse server, you have complete control over your communications and can federate with the wider Matrix network.

## Prerequisites

- A domain name (matrix.example.com)
- DNS configured
- HTTPS configured for `matrix.example.com`
- Port 8448 accessible for federation, or federation delegated through port 443

## Step 1: Generate Synapse Configuration

```bash
# Generate initial Synapse configuration

docker run --rm \
  -v /opt/matrix/synapse-config:/data \
  -e SYNAPSE_SERVER_NAME=matrix.example.com \
  -e SYNAPSE_REPORT_STATS=no \
  matrixdotorg/synapse:latest generate

# This creates homeserver.yaml in /opt/matrix/synapse-config/
```

## Deploy as a Stack

```yaml
version: "3.8"

services:
  synapse:
    image: matrixdotorg/synapse:latest
    container_name: synapse
    environment:
      - SYNAPSE_SERVER_NAME=matrix.example.com
      - SYNAPSE_REPORT_STATS=no
    volumes:
      - /opt/matrix/synapse-config:/data
    ports:
      - "8008:8008"    # Synapse HTTP listener
      - "8448:8448"    # Federation only if Synapse TLS is configured on 8448
    depends_on:
      - synapse-db
    restart: unless-stopped

  synapse-db:
    image: postgres:16-alpine
    container_name: synapse-db
    environment:
      POSTGRES_DB: synapse
      POSTGRES_USER: synapse
      POSTGRES_PASSWORD: synapse_db_password
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - synapse_db:/var/lib/postgresql/data
    restart: unless-stopped

  # Element Web - Matrix web client
  element:
    image: vectorim/element-web:latest
    container_name: element
    volumes:
      - /opt/matrix/element-config.json:/app/config.json:ro
    ports:
      - "8080:80"
    restart: unless-stopped

volumes:
  synapse_db:
```

## Configure Synapse for PostgreSQL

Edit `/opt/matrix/synapse-config/homeserver.yaml`:

```yaml
# Database configuration (replace SQLite with PostgreSQL)
database:
  name: psycopg2
  args:
    user: synapse
    password: synapse_db_password
    database: synapse
    host: synapse-db
    cp_min: 5
    cp_max: 10

# Registration
enable_registration: false   # Disable public registration
registration_shared_secret: "change-this-secret"

# Turn server for VoIP
turn_uris:
  - "turn:turn.matrix.example.com?transport=udp"
  - "turn:turn.matrix.example.com?transport=tcp"
turn_shared_secret: "turn_shared_secret"
turn_user_lifetime: 86400000
turn_allow_guests: true
```

## Element Web Configuration

Create `/opt/matrix/element-config.json`:

```json
{
  "default_server_config": {
    "m.homeserver": {
      "base_url": "https://matrix.example.com",
      "server_name": "matrix.example.com"
    }
  },
  "disable_custom_urls": false,
  "disable_guests": true,
  "default_theme": "dark",
  "features": {
    "feature_video_rooms": true
  }
}
```

## Create Admin User

```bash
# Register an admin user (requires registration_shared_secret in homeserver.yaml)
docker exec -it synapse register_new_matrix_user \
  http://localhost:8008 \
  -c /data/homeserver.yaml \
  -u admin \
  -p admin_password \
  -a
```

## Conclusion

Matrix/Synapse deployed via Portainer provides a decentralized, federated communication platform with end-to-end encryption. Unlike centralized platforms, Matrix gives you data ownership while allowing communication with users on other Matrix servers. Element Web provides a polished client interface, and the federation capability means your team can communicate with the wider Matrix ecosystem.
