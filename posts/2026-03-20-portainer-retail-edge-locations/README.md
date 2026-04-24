# How to Set Up Portainer for Retail Edge Locations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Retail, Edge Computing, Portainer, Docker, POS, Digital Signage, IoT

Description: Deploy and manage containerized retail applications across multiple store locations using Portainer Edge Agent for centralized control of POS systems, digital signage, and inventory management...

---

Modern retail stores run a growing number of software workloads: POS terminals, digital signage, inventory scanners, customer analytics, and loss prevention systems. Portainer's Edge Agent lets you manage all of these as containers from a central back-office platform.

## Retail Edge Architecture

```mermaid
graph TB
    HQ[Corporate Portainer Server] --> StoreA[Store A - Edge Node]
    HQ --> StoreB[Store B - Edge Node]
    HQ --> StoreC[Store C - Edge Node]
    StoreA --> POS[POS Container]
    StoreA --> Signage[Digital Signage Container]
    StoreA --> Inventory[Inventory Scanner Container]
    StoreA --> Analytics[Customer Analytics Container]
```

## Step 1: Categorize Retail Workloads by Update Frequency

| Workload | Update Frequency | Image Size | Priority |
|----------|-----------------|------------|----------|
| POS Application | Monthly | Medium | Critical |
| Digital Signage | Daily/Weekly | Large (media) | High |
| Inventory Scanner | Quarterly | Small | Medium |
| Price Checker | Monthly | Small | Medium |
| Customer Analytics | Weekly | Medium | Low |

## Step 2: Deploy the Retail Edge Stack

```yaml
# retail-edge-stack.yml

services:
  # Point-of-sale application
  pos-app:
    image: myregistry/pos-application:4.2.1
    environment:
      - STORE_ID=${STORE_ID}
      - POS_TERMINAL_ID=${TERMINAL_ID}
      - PAYMENT_GATEWAY_URL=https://payments.example.com
      - INVENTORY_SERVICE=http://inventory-service:8080
    ports:
      - "8080:8080"
    volumes:
      - pos-data:/var/pos
    restart: always    # Critical - must restart even without Portainer connectivity
    networks:
      - retail-net

  # Digital signage player
  signage-player:
    image: myregistry/signage-player:2.1.0
    environment:
      - CONTENT_SERVER=https://cdn.example.com
      - DISPLAY_ID=${DISPLAY_ID}
      - STORE_ID=${STORE_ID}
    volumes:
      - signage-cache:/var/signage/cache
    restart: unless-stopped
    networks:
      - retail-net

  # Inventory management
  inventory-service:
    image: myregistry/inventory-service:3.0.1
    environment:
      - DATABASE_URL=postgres://inventory:inventory_pw@postgres:5432/inventory
      - SYNC_INTERVAL=300    # Sync with central inventory every 5 minutes
    depends_on:
      - postgres
    restart: unless-stopped
    networks:
      - retail-net

  # Local database for offline operation
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=inventory
      - POSTGRES_USER=inventory
      - POSTGRES_PASSWORD=inventory_pw
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: always
    networks:
      - retail-net

volumes:
  pos-data:
  signage-cache:
  postgres-data:

networks:
  retail-net:
    driver: bridge
```

## Step 3: Configure Store-Specific Variables

Each store has a unique `STORE_ID`. If you're deploying an Edge Stack in Portainer Business Edition, use the stack's **Environment variables** section to set store-specific configuration at deployment time:

1. Go to **Edge Stacks > Add stack** (or edit an existing Edge Stack)
2. In **Environment variables**, set `STORE_ID=store-us-ca-001` and `TERMINAL_ID=pos-01`

Portainer injects these values into the stack at deployment time while leaving the `${STORE_ID}` and `${TERMINAL_ID}` references in the Compose file.

## Step 4: Push Promotions via Edge Jobs

Run promotional content updates across all stores simultaneously:

```bash
#!/bin/bash
# promotion-update.sh - runs via Portainer Edge Job
# Pulls the latest promotional content for the signage player

SIGNAGE_CONTAINER=$(docker ps -q --filter "label=com.docker.compose.service=signage-player" | head -n1)

if [ -z "$SIGNAGE_CONTAINER" ]; then
  echo "signage-player container not found" >&2
  exit 1
fi

STORE_ID=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$SIGNAGE_CONTAINER" | sed -n 's/^STORE_ID=//p')

if [ -z "$STORE_ID" ]; then
  echo "STORE_ID not set in signage-player container" >&2
  exit 1
fi

TMP_FILE=$(mktemp)
trap 'rm -f "$TMP_FILE"' EXIT

# Pull new promotions from the content server to a temporary file on the host
curl -fsSL -o "$TMP_FILE" \
  "https://promotions.example.com/current/${STORE_ID}"

# Copy the content into the running container, then reload the player
docker cp "$TMP_FILE" "${SIGNAGE_CONTAINER}:/var/signage/cache/promotions.json"
docker exec "$SIGNAGE_CONTAINER" /usr/bin/reload-content.sh

echo "Promotion update completed for store ${STORE_ID}"
```

If your edge environments are Docker Standalone hosts that use `/etc/cron.d`, schedule this via **Edge Jobs > Add Edge Job** with target Edge Group `all-stores`.

## Step 5: Handle Store Offline Scenarios

Configure the inventory service to operate without central connectivity:

- Use a local PostgreSQL database as the source of truth during outages
- Queue transactions locally and sync when connectivity is restored
- The POS application reads from local inventory and posts transactions to a queue

## Security Hardening

For retail PCI-DSS hardening:

```yaml
services:
  pos-app:
    # Run as non-root user
    user: "1001:1001"
    # Read-only root filesystem
    read_only: true
    # Writable temp directory only
    tmpfs:
      - /tmp
    # Drop all Linux capabilities
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
```

## Summary

Portainer gives retail operations teams a single pane of glass to manage hundreds of store locations. Centralized deployment, Edge Stack environment variables in Portainer Business Edition, and Edge Jobs for scripted updates make it a practical choice for retail edge infrastructure.
