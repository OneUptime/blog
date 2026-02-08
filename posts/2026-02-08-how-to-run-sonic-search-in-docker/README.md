# How to Run Sonic Search in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Sonic, Search, Lightweight Search, DevOps, Rust

Description: Deploy Sonic search backend in Docker as a lightweight alternative to Elasticsearch for fast autocomplete and full-text search.

---

Sonic is a lightweight, schema-less search backend written in Rust. It was created as a replacement for Elasticsearch in situations where you need fast text search without the heavy resource footprint. Sonic uses very little memory (a few megabytes compared to Elasticsearch's gigabytes) and provides sub-millisecond search performance.

Sonic is not a database. It is a search index that you push text into and query against. Your source of truth stays in your database, and Sonic provides the search layer. This separation of concerns makes the architecture clean and the search index easy to rebuild.

## How Sonic Works

Sonic organizes data into collections, buckets, and objects:

- **Collection** - A top-level namespace (like a database)
- **Bucket** - A grouping within a collection (like a table)
- **Object** - A unique identifier for a piece of content

You push text associated with an object ID into Sonic, and when you search, it returns the matching object IDs. Your application then looks up the full records from your database.

```mermaid
graph LR
    App[Your App] -->|Push text| Sonic[Sonic Index]
    App -->|Search query| Sonic
    Sonic -->|Object IDs| App
    App -->|Fetch records| DB[Database]
```

## Quick Start

Run Sonic with Docker:

```bash
# Start Sonic on port 1491
docker run -d \
  --name sonic \
  -p 1491:1491 \
  -v sonic_data:/var/lib/sonic/store \
  valeriansaliou/sonic:v1.4.9
```

## Docker Compose Setup

```yaml
# docker-compose.yml - Sonic search backend
version: "3.8"

services:
  sonic:
    image: valeriansaliou/sonic:v1.4.9
    ports:
      # Sonic channel protocol port
      - "1491:1491"
    volumes:
      # Persist the search index
      - sonic_data:/var/lib/sonic/store
      # Mount custom configuration
      - ./sonic.cfg:/etc/sonic.cfg
    restart: unless-stopped

volumes:
  sonic_data:
```

## Configuration

Create a Sonic configuration file:

```toml
# sonic.cfg - Sonic search engine configuration

[server]
# Bind to all interfaces inside the container
log_level = "info"

[channel]
inet = "0.0.0.0:1491"
tcp_timeout = 300

# Authentication password for connecting to Sonic
[channel.search]
query_limit_default = 10
query_limit_maximum = 100
query_alternates_try = 4
suggest_limit_default = 5
suggest_limit_maximum = 20

[store]
[store.kv]
path = "/var/lib/sonic/store/kv/"
retain_word_objects = 1000

[store.kv.pool]
inactive_after = 1800

[store.kv.database]
flush_after = 900
compress = true

[store.fst]
path = "/var/lib/sonic/store/fst/"

[store.fst.pool]
inactive_after = 300

[store.fst.graph]
consolidate_after = 180
max_size = 2048
max_words = 250000
```

Note: The default password for Sonic is `SecretPassword`. Change it in production by adding an `auth_password` setting under `[channel]`.

## Interacting with Sonic

Sonic uses a custom text protocol over TCP. You can interact with it using `telnet` or a Sonic client library.

Connect to Sonic manually:

```bash
# Connect to Sonic's channel protocol
docker exec -it sonic sh -c "echo 'START search SecretPassword' | nc localhost 1491"
```

Sonic has three channels:

- **ingest** - Push data into the index
- **search** - Query the index
- **control** - Manage the index (flush, consolidate, etc.)

## Using the Node.js Client

The `sonic-channel` package provides a clean API for Node.js:

```javascript
// index-data.js - Push data into Sonic search index
const Sonic = require('sonic-channel');

// Connect to the ingest channel for pushing data
const ingestChannel = new Sonic.Ingest({
  host: 'localhost',
  port: 1491,
  auth: 'SecretPassword',
}).connect({
  connected: () => {
    console.log('Connected to Sonic ingest channel');
  },
});

// Index product data
async function indexProducts() {
  const products = [
    { id: 'prod-1', name: 'Wireless Bluetooth Headphones with Noise Cancellation' },
    { id: 'prod-2', name: 'Mechanical Gaming Keyboard RGB Backlit' },
    { id: 'prod-3', name: 'Ultra-wide Curved Monitor 34 inch' },
    { id: 'prod-4', name: 'Portable Bluetooth Speaker Waterproof' },
    { id: 'prod-5', name: 'Ergonomic Office Chair with Lumbar Support' },
  ];

  for (const product of products) {
    // Push text into the "products" collection, "default" bucket
    await ingestChannel.push('products', 'default', product.id, product.name);
    console.log(`Indexed: ${product.id} - ${product.name}`);
  }

  // Consolidate the index to make new data searchable
  const controlChannel = new Sonic.Control({
    host: 'localhost',
    port: 1491,
    auth: 'SecretPassword',
  }).connect({
    connected: async () => {
      await controlChannel.consolidate();
      console.log('Index consolidated');
    },
  });
}

indexProducts();
```

```javascript
// search.js - Query Sonic search index
const Sonic = require('sonic-channel');

// Connect to the search channel
const searchChannel = new Sonic.Search({
  host: 'localhost',
  port: 1491,
  auth: 'SecretPassword',
}).connect({
  connected: async () => {
    // Search for products matching "bluetooth"
    const results = await searchChannel.query('products', 'default', 'bluetooth');
    console.log('Search results:', results);
    // Output: ['prod-1', 'prod-4'] (object IDs)

    // Autocomplete/suggest based on partial input
    const suggestions = await searchChannel.suggest('products', 'default', 'key');
    console.log('Suggestions:', suggestions);
    // Output: ['keyboard'] (word completions)
  },
});
```

## Python Client

```python
# sonic_search.py - Python client for Sonic
from sonic import IngestClient, SearchClient, ControlClient

# Push data into the index
def index_articles():
    with IngestClient("localhost", 1491, "SecretPassword") as ingest:
        articles = [
            ("article-1", "Getting Started with Docker Containers"),
            ("article-2", "Kubernetes vs Docker Swarm Comparison"),
            ("article-3", "Docker Compose for Local Development"),
            ("article-4", "Building Multi-stage Docker Images"),
            ("article-5", "Docker Networking Deep Dive Tutorial"),
        ]

        for article_id, title in articles:
            ingest.push("articles", "default", article_id, title)
            print(f"Indexed: {article_id}")

    # Consolidate to make data searchable
    with ControlClient("localhost", 1491, "SecretPassword") as control:
        control.consolidate()
        print("Index consolidated")

# Search the index
def search_articles(query):
    with SearchClient("localhost", 1491, "SecretPassword") as search:
        # Full text search
        results = search.query("articles", "default", query)
        print(f"Search for '{query}': {results}")
        return results

# Get autocomplete suggestions
def suggest(prefix):
    with SearchClient("localhost", 1491, "SecretPassword") as search:
        suggestions = search.suggest("articles", "default", prefix)
        print(f"Suggest for '{prefix}': {suggestions}")
        return suggestions

if __name__ == "__main__":
    index_articles()
    search_articles("docker")
    suggest("kuber")
```

## Integration with Your Application

Here is a practical architecture with Sonic, a database, and a web API:

```yaml
# docker-compose.yml - Full search-enabled application stack
version: "3.8"

services:
  sonic:
    image: valeriansaliou/sonic:v1.4.9
    ports:
      - "1491:1491"
    volumes:
      - sonic_data:/var/lib/sonic/store
      - ./sonic.cfg:/etc/sonic.cfg

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    volumes:
      - pg_data:/var/lib/postgresql/data

  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      SONIC_HOST: sonic
      SONIC_PORT: 1491
      SONIC_PASSWORD: SecretPassword
      DATABASE_URL: postgres://app:secret@postgres:5432/myapp
    depends_on:
      - sonic
      - postgres

volumes:
  sonic_data:
  pg_data:
```

## Managing the Index

```bash
# Connect to Sonic control channel to manage the index
# Using a Sonic client or raw TCP:

# Flush all data from a collection
# FLUSHC products

# Flush a specific bucket
# FLUSHB products default

# Flush a specific object (re-index a single item)
# FLUSHO products default prod-1

# Trigger index consolidation (makes recently pushed data searchable)
# TRIGGER consolidate

# Get server info
# INFO
```

## Performance Characteristics

Sonic is designed for speed over feature richness:

- **Search latency** - Sub-millisecond for most queries
- **Memory usage** - 10-30 MB for millions of records
- **Index size** - Roughly 20% of original text size on disk
- **Throughput** - Handles thousands of queries per second on modest hardware

These numbers make Sonic an excellent choice for autocomplete features, site search on small-to-medium datasets, and any use case where the overhead of Elasticsearch is not justified.

## Summary

Sonic fills the gap between no search and a full Elasticsearch deployment. It provides fast, typo-tolerant text search with autocomplete capabilities while using minimal resources. The trade-off is that Sonic only returns object IDs, not full documents, so you need a separate database for record storage. For most applications, this is fine since you already have a database. The Docker setup is minimal, the configuration is straightforward, and the client libraries for Node.js and Python make integration quick. If your search needs are text-based and you want something lighter than Elasticsearch, Sonic is worth considering.
