# How to Set Up Typesense Search Engine on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Typesense, Search, Self-Hosted, Database

Description: Install and configure Typesense on Ubuntu for fast, typo-tolerant search with vector search capabilities, covering setup, collections, indexing, and querying.

---

Typesense is an open-source, typo-tolerant search engine designed for speed and simplicity. It's written in C++ and optimized for in-memory search, typically returning results in 1-5 milliseconds. Unlike Elasticsearch, Typesense is designed to be easy to set up and doesn't require the operational complexity of a JVM-based system.

Typesense's strengths include strong typo tolerance, vector search support for semantic similarity queries, geosearch, and a clean REST API with official clients for most programming languages.

## Prerequisites

- Ubuntu 22.04 or 24.04
- At least 1 GB RAM (more for larger datasets - Typesense is RAM-based)
- Root or sudo access

## Installing Typesense

```bash
# Add Typesense repository
curl -fsSL https://dl.typesense.org/repo/apt/pubkey.gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/typesense-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/typesense-archive-keyring.gpg] \
  https://dl.typesense.org/repo/apt stable main" | \
  sudo tee /etc/apt/sources.list.d/typesense.list

sudo apt update
sudo apt install -y typesense-server

# Verify installation
typesense-server --version
```

## Configuration

Typesense's configuration file is at `/etc/typesense/typesense-server.ini`:

```bash
sudo nano /etc/typesense/typesense-server.ini
```

```ini
; /etc/typesense/typesense-server.ini

; Directory to store Typesense data
[server]
data-dir = /var/lib/typesense
; API key for authentication (generate a strong random key)
api-key = your-typesense-api-key-change-this
; Address to listen on
listen-address = 0.0.0.0
; Port to listen on
listen-port = 8108
; Enable CORS for specific origins (or * for all)
cors-domains = *
; Log directory
log-dir = /var/log/typesense
; Thread count (default is number of CPU cores)
; thread-pool-size = 8
```

Generate a strong API key:

```bash
openssl rand -base64 32
```

Update the configuration with your generated key, then start the service:

```bash
sudo systemctl enable typesense-server
sudo systemctl start typesense-server
sudo systemctl status typesense-server
```

Verify it's running:

```bash
curl http://localhost:8108/health
# Expected: {"ok": true}

# Verify API key works
curl -H "X-TYPESENSE-API-KEY: your-typesense-api-key-change-this" \
  http://localhost:8108/collections
# Expected: []  (empty array - no collections yet)
```

## Understanding Typesense Concepts

- **Collection**: Equivalent to a database table or Elasticsearch index. Defines the schema for documents.
- **Document**: A JSON object stored in a collection.
- **Field**: A property of a document with a defined type.
- **Schema**: Defines the fields, their types, and which ones are searchable, facetable, or sortable.

## Creating Collections

```bash
# Set your API key as a variable for cleaner commands
API_KEY="your-typesense-api-key-change-this"
BASE_URL="http://localhost:8108"

# Create a products collection with explicit schema
curl -X POST "$BASE_URL/collections" \
  -H "X-TYPESENSE-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "products",
    "fields": [
      {"name": "id", "type": "string"},
      {"name": "name", "type": "string"},
      {"name": "description", "type": "string"},
      {"name": "brand", "type": "string", "facet": true},
      {"name": "category", "type": "string", "facet": true},
      {"name": "price", "type": "float", "facet": true},
      {"name": "rating", "type": "float", "optional": true},
      {"name": "in_stock", "type": "bool", "facet": true},
      {"name": "tags", "type": "string[]", "facet": true},
      {"name": "image_url", "type": "string", "index": false}
    ],
    "default_sorting_field": "rating"
  }'
```

For collections where you want automatic schema detection:

```bash
# Auto-schema collection (Typesense infers types from the first documents)
curl -X POST "$BASE_URL/collections" \
  -H "X-TYPESENSE-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "articles",
    "fields": [
      {"name": ".*", "type": "auto"}
    ]
  }'
```

## Indexing Documents

```bash
# Index a single document
curl -X POST "$BASE_URL/collections/products/documents" \
  -H "X-TYPESENSE-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "prod_001",
    "name": "Wireless Mechanical Keyboard",
    "description": "Full-size mechanical keyboard with wireless Bluetooth connectivity and backlit keys",
    "brand": "Keychron",
    "category": "Electronics",
    "price": 149.99,
    "rating": 4.7,
    "in_stock": true,
    "tags": ["keyboard", "wireless", "mechanical", "bluetooth"],
    "image_url": "https://example.com/images/keyboard.jpg"
  }'

# Batch import (much faster for bulk loading)
curl -X POST "$BASE_URL/collections/products/documents/import?action=create" \
  -H "X-TYPESENSE-API-KEY: $API_KEY" \
  -H "Content-Type: text/plain" \
  --data-binary @- << 'NDJSON'
{"id":"prod_002","name":"Ergonomic Mouse","description":"Vertical mouse for wrist comfort","brand":"Logitech","category":"Electronics","price":69.99,"rating":4.5,"in_stock":true,"tags":["mouse","ergonomic"],"image_url":"https://example.com/mouse.jpg"}
{"id":"prod_003","name":"USB-C Hub","description":"7-port hub with HDMI and USB-A ports","brand":"Anker","category":"Electronics","price":39.99,"rating":4.6,"in_stock":true,"tags":["hub","usb-c","accessories"],"image_url":"https://example.com/hub.jpg"}
{"id":"prod_004","name":"Laptop Stand","description":"Adjustable aluminum laptop stand","brand":"Rain Design","category":"Accessories","price":49.99,"rating":4.8,"in_stock":false,"tags":["laptop","stand","ergonomic"],"image_url":"https://example.com/stand.jpg"}
NDJSON
```

## Searching Documents

```bash
# Basic text search
curl "$BASE_URL/collections/products/documents/search?q=wireless+keyboard&query_by=name,description" \
  -H "X-TYPESENSE-API-KEY: $API_KEY"

# Search with typo tolerance (finds "wirlss" -> "wireless")
curl "$BASE_URL/collections/products/documents/search?q=wirlss+keyboard&query_by=name,description&num_typos=2" \
  -H "X-TYPESENSE-API-KEY: $API_KEY"

# Search with filters and sorting
curl "$BASE_URL/collections/products/documents/search" \
  -H "X-TYPESENSE-API-KEY: $API_KEY" \
  -G \
  --data-urlencode "q=keyboard" \
  --data-urlencode "query_by=name,description" \
  --data-urlencode "filter_by=price:<200 && in_stock:true" \
  --data-urlencode "sort_by=rating:desc" \
  --data-urlencode "per_page=10" \
  --data-urlencode "page=1"

# Faceted search with facet counts
curl "$BASE_URL/collections/products/documents/search" \
  -H "X-TYPESENSE-API-KEY: $API_KEY" \
  -G \
  --data-urlencode "q=*" \
  --data-urlencode "query_by=name" \
  --data-urlencode "facet_by=category,brand,price" \
  --data-urlencode "max_facet_values=10" \
  --data-urlencode "per_page=20"
```

## Vector Search

Typesense supports vector search for semantic similarity (requires embedding generation):

```bash
# Create a collection with a vector field
curl -X POST "$BASE_URL/collections" \
  -H "X-TYPESENSE-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "articles",
    "fields": [
      {"name": "title", "type": "string"},
      {"name": "content", "type": "string"},
      {"name": "embedding", "type": "float[]", "num_dim": 384, "index": true}
    ]
  }'

# Search using a vector (e.g., generated by a sentence transformer model)
curl "$BASE_URL/collections/articles/documents/search" \
  -H "X-TYPESENSE-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "*",
    "vector_query": "embedding:(YOUR_QUERY_VECTOR_HERE, k:10)",
    "per_page": 10
  }'
```

## Scoped API Keys

For frontend search (where users can only search, not write), create a scoped search key:

```bash
# Create a scoped API key that limits search to specific collections
curl -X POST "$BASE_URL/keys" \
  -H "X-TYPESENSE-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Frontend search key",
    "actions": ["documents:search"],
    "collections": ["products"],
    "expires_at": 0
  }'
```

## Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/search.example.com
server {
    listen 443 ssl http2;
    server_name search.example.com;

    ssl_certificate /etc/letsencrypt/live/search.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/search.example.com/privkey.pem;

    # Only allow search endpoint publicly
    location /collections {
        # Only allow GET (search) methods
        limit_except GET {
            deny all;
        }
        proxy_pass http://127.0.0.1:8108;
        proxy_set_header Host $host;
    }

    # Block admin endpoints
    location / {
        deny all;
    }
}
```

## Backup and Restore

```bash
# Create a data snapshot
curl -X POST "$BASE_URL/operations/snapshot?snapshot_path=/var/lib/typesense/backups/$(date +%Y%m%d)" \
  -H "X-TYPESENSE-API-KEY: $API_KEY"

# Restore by stopping Typesense, replacing the data directory, and starting again
sudo systemctl stop typesense-server
sudo cp -r /var/lib/typesense/backups/20240302/* /var/lib/typesense/
sudo chown -R typesense:typesense /var/lib/typesense/
sudo systemctl start typesense-server
```

Monitor Typesense availability with [OneUptime](https://oneuptime.com) using the `/health` endpoint to ensure your search service stays up.
