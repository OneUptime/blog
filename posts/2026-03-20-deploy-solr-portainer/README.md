# How to Deploy Solr via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Solr, Search, Apache, Docker

Description: Deploy Apache Solr enterprise search platform using Portainer with core management and REST API access.

## Introduction

Apache Solr is an enterprise-grade, open-source search platform built on Apache Lucene. It provides full-text search, faceting, hit highlighting, geospatial search, and real-time indexing. Solr is used by major organizations for high-volume search requirements.

## Prerequisites

- Portainer installed with Docker
- At least 2 GB RAM

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Apache Solr

version: "3.8"

services:
  solr:
    image: solr:10.0-slim
    container_name: solr
    restart: unless-stopped
    ports:
      - "8983:8983"
    volumes:
      - solr_data:/var/solr
    environment:
      - SOLR_HEAP=512m
    command:
      - solr-foreground
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://localhost:8983/solr/admin/info/system"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - solr_net

volumes:
  solr_data:

networks:
  solr_net:
    driver: bridge
```

## Step 2: Create a Core

```bash
# Create a new Solr core named "products"
docker exec solr solr create -c products

# List all cores
curl http://localhost:8983/solr/admin/cores?action=STATUS
```

## Step 3: Index Documents

```bash
# Index JSON documents
curl -X POST "http://localhost:8983/solr/products/update/json/docs" \
  -H 'Content-Type: application/json' \
  -d '[
    {"id": "1", "name": "Laptop Pro", "brand": "TechCorp", "price": 1299.99, "category": "Electronics"},
    {"id": "2", "name": "Wireless Mouse", "brand": "InputCo", "price": 49.99, "category": "Accessories"},
    {"id": "3", "name": "USB-C Hub", "brand": "ConnectCo", "price": 79.99, "category": "Accessories"}
  ]'

# Commit the changes (make them searchable)
curl -X POST "http://localhost:8983/solr/products/update?commit=true"

# Index from a CSV file
curl "http://localhost:8983/solr/products/update/csv?commit=true&header=true" \
  --data-binary @products.csv \
  -H 'Content-Type: application/csv'
```

## Step 4: Search

```bash
# Basic search
curl "http://localhost:8983/solr/products/select?q=laptop&wt=json&indent=true"

# Filter query (doesn't affect relevance scoring)
curl "http://localhost:8983/solr/products/select?q=*:*&fq=category:Electronics&wt=json"

# Faceted search
curl "http://localhost:8983/solr/products/select?q=*:*&facet=true&facet.field=category&wt=json"

# Full-text search with highlighting
curl "http://localhost:8983/solr/products/select?q=name:wireless&hl=true&hl.fl=name&wt=json"
```

## Step 5: Configure Schema

```bash
# Add a field to the schema
curl -X POST "http://localhost:8983/solr/products/schema" \
  -H 'Content-Type: application/json' \
  -d '{
    "add-field": {
      "name": "description",
      "type": "text_general",
      "stored": true,
      "indexed": true
    }
  }'

# View current schema
curl "http://localhost:8983/solr/products/schema"
```

## Step 6: Access the Admin UI

Open `http://<host>:8983/solr` to access the Solr Admin UI. Use the **Core Selector** to browse cores, run queries, and view schema.

## Conclusion

Solr uses cores (single search indexes) or collections (SolrCloud distributed indexes). For a single-node deployment, cores are sufficient. The `SOLR_HEAP` env var controls JVM heap size - size it based on your workload and GC behavior rather than a fixed percentage of total RAM. Use `commit=true` after bulk indexing to make documents searchable immediately, or configure `autoCommit` in `solrconfig.xml` for production workloads.
