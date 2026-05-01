# How to Deploy Sonic Search via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Sonic, Search, Docker, Self-Hosted

Description: Deploy Sonic lightweight search backend using Portainer as a fast, schema-less alternative to Elasticsearch.

## Introduction

Sonic is a fast, lightweight, and schema-less search backend written in Rust. It provides a simple line-based protocol over TCP (similar to Redis) for indexing and querying text. Sonic is designed for high performance with minimal resource usage.

## Prerequisites

- Portainer installed with Docker

## Step 1: Create the Configuration File on the Host

```bash
mkdir -p /opt/sonic
cat > /opt/sonic/config.cfg << 'EOF'
[server]
log_level = "info"

[channel]
inet = "0.0.0.0:1491"
tcp_timeout = 300

auth_password = "SecurePassword"

[store]
[store.kv]
path = "/var/lib/sonic/store/kv/"

[store.fst]
path = "/var/lib/sonic/store/fst/"
EOF
```

## Step 2: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Sonic Search

services:
  sonic:
    image: valeriansaliou/sonic:v1.4.9
    container_name: sonic
    restart: unless-stopped
    ports:
      - "1491:1491"
    volumes:
      - /opt/sonic/config.cfg:/etc/sonic.cfg:ro
      - sonic_data:/var/lib/sonic/store
    networks:
      - sonic_net

volumes:
  sonic_data:

networks:
  sonic_net:
    driver: bridge
```

## Step 3: Update the Password Before Deploying

Update the password in the `config.cfg` file on the host before deploying.

## Step 4: Test the Connection

Sonic uses a line-based protocol over TCP. You can test using netcat:

```bash
# Connect to Sonic
nc localhost 1491

# Authenticate and start an ingest session
START ingest SecurePassword
# Returns: STARTED ingest protocol(1) buffer(20000)

# Push data (collection, bucket, object_id, text)
PUSH messages default 1 "hello world this is a test message"
PUSH messages default 2 "another document about search engines"
PUSH messages default 3 "sonic is a fast search backend"
QUIT
```

## Step 5: Search via the Search Channel

```bash
nc localhost 1491
START search SecurePassword
# Query: QUERY <collection> <bucket> "<terms>" [LIMIT(<count>)] [OFFSET(<count>)] [LANG(<locale>)]
QUERY messages default "search"
# Returns: PENDING <event_id>
# Then, for example: EVENT QUERY <event_id> 2 3  (matched object IDs)
QUIT
```

## Step 6: Python Integration

```python
# pip install sonic-client
from sonic import IngestClient, SearchClient

# Index documents
with IngestClient("localhost", 1491, "SecurePassword") as ingest:
    ingest.push("messages", "default", "1", "hello world search engine")
    ingest.push("messages", "default", "2", "sonic is fast and lightweight")

# Search
with SearchClient("localhost", 1491, "SecurePassword") as search:
    results = search.query("messages", "default", "search engine", limit=10)
    print(results)  # ['1'] - returns object IDs
```

## Step 7: Consolidate the Index

```bash
# Connect to the control channel to trigger consolidation
nc localhost 1491
START control SecurePassword
TRIGGER consolidate
QUIT
```

## Conclusion

Sonic stores its index in a RocksDB-backed key-value store and uses an FST (Finite State Transducer) for word suggestions and typo correction. The authentication password in `config.cfg` is set with `auth_password` under `[channel]`. Sonic returns object IDs from search queries - your application maps these IDs back to actual content. It is ideal for lightweight, low-memory search in applications that don't need Elasticsearch's aggregation capabilities.
