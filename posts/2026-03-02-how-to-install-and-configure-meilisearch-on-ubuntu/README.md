# How to Install and Configure Meilisearch on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Meilisearch, Search, Self-Hosted, Database

Description: Learn how to install Meilisearch on Ubuntu for lightning-fast full-text search with typo tolerance, faceting, and instant results as you type.

---

Meilisearch is a fast, open-source search engine that prioritizes developer experience. It delivers search results in under 50 milliseconds with typo tolerance enabled by default, so users get relevant results even when they misspell words. It's self-hostable, has a clean REST API, and is much simpler to set up than Elasticsearch.

Meilisearch is ideal for adding search to blogs, documentation sites, e-commerce catalogs, or internal tools where you want relevant, instant results without operational complexity.

## How Meilisearch Differs from Elasticsearch

- **Simplicity**: Meilisearch has a minimal configuration footprint - no shards, no complex mappings, no query DSL.
- **Typo tolerance**: Built-in, automatically handles search for "Ubintu" matching "Ubuntu".
- **Relevance tuning**: Simple ranking rules (typo count, word position, attribute importance) instead of complex scoring queries.
- **Speed**: Designed for search-as-you-type use cases with sub-50ms responses.
- **Scale**: Best for datasets under a few hundred million documents; for petabyte-scale, use Elasticsearch.

## Prerequisites

- Ubuntu 22.04 or 24.04
- Root or sudo access
- At least 1 GB RAM (more RAM = better caching of indexes)

## Installing Meilisearch

Meilisearch ships as a single binary with no dependencies:

```bash
# Download and install the latest version
curl -L https://install.meilisearch.com | sh

# Move the binary to a system-wide location
sudo mv ./meilisearch /usr/local/bin/meilisearch

# Verify the installation
meilisearch --version
```

## Creating a Dedicated User and Directory

```bash
# Create a system user for Meilisearch
sudo useradd -r -m -d /var/lib/meilisearch -s /bin/false meilisearch

# Create the data directory
sudo mkdir -p /var/lib/meilisearch/data
sudo mkdir -p /var/lib/meilisearch/dumps
sudo chown -R meilisearch:meilisearch /var/lib/meilisearch

# Create the configuration directory
sudo mkdir -p /etc/meilisearch
```

## Creating the Configuration File

```bash
sudo nano /etc/meilisearch/config.toml
```

```toml
# /etc/meilisearch/config.toml

# Database (data) directory
db_path = "/var/lib/meilisearch/data"

# Environment: development or production
# production mode disables the /experimental-features and has better defaults
env = "production"

# Bind address and port
http_addr = "127.0.0.1:7700"  # Listen on localhost; use Nginx to expose externally

# Master key - required in production mode
# Generate with: openssl rand -base64 32
master_key = "your-super-secret-master-key-at-least-16-bytes"

# Disable analytics (optional)
no_analytics = true

# Log level: ERROR, WARN, INFO, DEBUG, TRACE
log_level = "INFO"

# Maximum index size (bytes) - default is 100GB
max_indexing_memory = "512 MiB"

# Number of indexing threads (default = half of available cores)
# max_indexing_threads = 4

# Dump directory
dump_dir = "/var/lib/meilisearch/dumps"
```

## Creating the systemd Service

```bash
sudo nano /etc/systemd/system/meilisearch.service
```

```ini
[Unit]
Description=Meilisearch Search Engine
After=network.target

[Service]
Type=simple
User=meilisearch
Group=meilisearch

# Use the config file
ExecStart=/usr/local/bin/meilisearch --config-file-path /etc/meilisearch/config.toml

Restart=on-failure
RestartSec=5s

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable meilisearch
sudo systemctl start meilisearch
sudo systemctl status meilisearch
```

Verify it's running:

```bash
curl http://localhost:7700/health
# Expected: {"status":"available"}
```

## API Keys

With a master key set, you need to create API keys for different purposes:

```bash
# Create a search-only key for your frontend
curl -X POST http://localhost:7700/keys \
  -H "Authorization: Bearer your-super-secret-master-key-at-least-16-bytes" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Frontend Search Key",
    "description": "Read-only key for the search frontend",
    "actions": ["search"],
    "indexes": ["*"],
    "expiresAt": null
  }'

# Create a write key for your backend
curl -X POST http://localhost:7700/keys \
  -H "Authorization: Bearer your-super-secret-master-key-at-least-16-bytes" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Backend Write Key",
    "description": "Key for indexing documents from the backend",
    "actions": ["documents.add", "documents.delete", "indexes.create", "settings.update", "tasks.get"],
    "indexes": ["*"],
    "expiresAt": null
  }'

# List all keys
curl http://localhost:7700/keys \
  -H "Authorization: Bearer your-super-secret-master-key-at-least-16-bytes"
```

Save the `key` values from the responses.

## Creating Indexes and Adding Documents

```bash
# Create an index (or it's created automatically when you add documents)
curl -X POST http://localhost:7700/indexes \
  -H "Authorization: Bearer YOUR_WRITE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "products",
    "primaryKey": "id"
  }'

# Add documents (batch indexing is much faster than one at a time)
curl -X POST http://localhost:7700/indexes/products/documents \
  -H "Authorization: Bearer YOUR_WRITE_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "id": 1,
      "name": "Wireless Mechanical Keyboard",
      "description": "Full-size mechanical keyboard with wireless connectivity",
      "category": "Electronics",
      "price": 149.99,
      "tags": ["keyboard", "wireless", "mechanical"]
    },
    {
      "id": 2,
      "name": "Ergonomic Mouse",
      "description": "Vertical ergonomic mouse for reduced wrist strain",
      "category": "Electronics",
      "price": 59.99,
      "tags": ["mouse", "ergonomic", "wireless"]
    },
    {
      "id": 3,
      "name": "USB-C Hub",
      "description": "7-in-1 USB-C hub with HDMI, USB-A, and SD card reader",
      "category": "Electronics",
      "price": 39.99,
      "tags": ["hub", "usb-c", "accessories"]
    }
  ]'
```

## Searching

```bash
# Basic search
curl -X POST http://localhost:7700/indexes/products/search \
  -H "Authorization: Bearer YOUR_SEARCH_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "wirelss keyboard"
  }'
# Note: "wirelss" is a typo - Meilisearch still finds "Wireless Keyboard"

# Search with filters and facets
curl -X POST http://localhost:7700/indexes/products/search \
  -H "Authorization: Bearer YOUR_SEARCH_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "wireless",
    "filter": "category = Electronics AND price < 100",
    "sort": ["price:asc"],
    "attributesToHighlight": ["name", "description"],
    "highlightPreTag": "<mark>",
    "highlightPostTag": "</mark>",
    "limit": 10,
    "offset": 0
  }'
```

## Configuring Index Settings

Fine-tune how Meilisearch searches and ranks results:

```bash
# Update index settings
curl -X PATCH http://localhost:7700/indexes/products/settings \
  -H "Authorization: Bearer YOUR_WRITE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "searchableAttributes": [
      "name",
      "description",
      "tags"
    ],
    "displayedAttributes": [
      "id",
      "name",
      "description",
      "category",
      "price",
      "tags"
    ],
    "filterableAttributes": [
      "category",
      "price",
      "tags"
    ],
    "sortableAttributes": [
      "price",
      "name"
    ],
    "rankingRules": [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness"
    ],
    "typoTolerance": {
      "enabled": true,
      "minWordSizeForTypos": {
        "oneTypo": 5,
        "twoTypos": 9
      }
    },
    "synonyms": {
      "laptop": ["notebook", "computer"],
      "phone": ["smartphone", "mobile"]
    }
  }'
```

## Setting Up Nginx as a Reverse Proxy

Expose Meilisearch publicly through Nginx:

```nginx
# /etc/nginx/sites-available/search.example.com
server {
    listen 443 ssl http2;
    server_name search.example.com;

    ssl_certificate /etc/letsencrypt/live/search.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/search.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:7700;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # Only allow GET search requests from the internet
        # Block admin endpoints
        limit_except GET POST {
            deny all;
        }
    }

    # Block admin endpoints from external access
    location ~ ^/(keys|dumps|settings|indexes/.*/settings|tasks) {
        return 403;
    }
}
```

Monitor your Meilisearch instance's availability with [OneUptime](https://oneuptime.com) using the `/health` endpoint. A healthy response contains `{"status":"available"}`.
