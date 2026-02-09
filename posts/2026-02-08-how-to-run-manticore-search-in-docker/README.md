# How to Run Manticore Search in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Manticore Search, Full-Text Search, MySQL Protocol, DevOps, Search Engines

Description: Set up Manticore Search in Docker as a fast, lightweight alternative to Elasticsearch with MySQL protocol compatibility.

---

Manticore Search is an open-source search engine that evolved from Sphinx Search. It provides full-text search, columnar storage, and analytics capabilities while maintaining a small resource footprint. One of its standout features is MySQL protocol compatibility, which means you can query Manticore using standard MySQL clients and connectors without learning a new query language.

Manticore is significantly faster than Elasticsearch for many search workloads and uses a fraction of the memory. It supports both real-time indexes (insert and search immediately) and plain indexes (batch-built from a database), giving you flexibility in how you manage your search data.

## Quick Start

Run Manticore with a single command:

```bash
# Start Manticore Search with persistent data
docker run -d \
  --name manticore \
  -p 9306:9306 \
  -p 9308:9308 \
  -v manticore_data:/var/lib/manticore \
  manticoresearch/manticore
```

Port 9306 speaks the MySQL protocol. Port 9308 is the HTTP/JSON API.

Test with a MySQL client:

```bash
# Connect to Manticore using the MySQL client
mysql -h 127.0.0.1 -P 9306
```

## Docker Compose Setup

```yaml
# docker-compose.yml - Manticore Search for development
version: "3.8"

services:
  manticore:
    image: manticoresearch/manticore
    ports:
      # MySQL protocol for SQL queries
      - "9306:9306"
      # HTTP API for JSON queries
      - "9308:9308"
    volumes:
      # Persist index data
      - manticore_data:/var/lib/manticore
      # Mount custom configuration (optional)
      - ./manticore.conf:/etc/manticoresearch/manticore.conf
    environment:
      # Enable automatic column store for better analytics performance
      EXTRA: 1
    ulimits:
      nproc: 65535
      nofile:
        soft: 65535
        hard: 65535
    restart: unless-stopped

volumes:
  manticore_data:
```

## Creating Tables and Indexing Data

Connect to Manticore and create a search table using familiar SQL syntax:

```sql
-- Connect: mysql -h 127.0.0.1 -P 9306

-- Create a real-time table for product search
CREATE TABLE products (
    name text,
    description text,
    category string,
    brand string,
    price float,
    in_stock bool,
    created_at timestamp
) morphology='stem_en' html_strip='1';
```

Insert documents:

```sql
-- Insert product documents
INSERT INTO products (id, name, description, category, brand, price, in_stock, created_at)
VALUES
  (1, 'Wireless Bluetooth Headphones', 'Premium noise-cancelling headphones with 30-hour battery', 'Electronics', 'AudioTech', 149.99, 1, NOW()),
  (2, 'Mechanical Gaming Keyboard', 'RGB backlit keyboard with Cherry MX switches', 'Electronics', 'KeyMaster', 89.99, 1, NOW()),
  (3, 'Organic Cotton T-Shirt', 'Soft organic cotton shirt in multiple colors', 'Clothing', 'EcoWear', 29.99, 1, NOW()),
  (4, 'Running Shoes Pro', 'Lightweight running shoes with cushioned sole', 'Footwear', 'SpeedRun', 119.99, 1, NOW()),
  (5, 'Portable Bluetooth Speaker', 'Waterproof speaker with 12-hour battery life', 'Electronics', 'SoundBox', 59.99, 0, NOW());
```

## Searching

Manticore supports rich full-text search queries:

```sql
-- Simple full-text search
SELECT * FROM products WHERE MATCH('bluetooth wireless');

-- Search with filters
SELECT * FROM products WHERE MATCH('headphones') AND price < 200 AND in_stock = 1;

-- Faceted search - get counts by category
SELECT category, COUNT(*) as cnt FROM products WHERE MATCH('*') GROUP BY category;

-- Search with highlighting
SELECT id, name, HIGHLIGHT() FROM products WHERE MATCH('keyboard gaming');

-- Phrase search (exact phrase match)
SELECT * FROM products WHERE MATCH('"bluetooth speaker"');

-- Proximity search (words within 3 positions of each other)
SELECT * FROM products WHERE MATCH('"wireless headphones"~3');

-- Prefix search for autocomplete
SELECT * FROM products WHERE MATCH('head*');

-- Sort by relevance and price
SELECT *, WEIGHT() as relevance FROM products WHERE MATCH('electronics')
ORDER BY relevance DESC, price ASC;
```

## HTTP/JSON API

Manticore also has a REST API that accepts JSON queries:

```bash
# Search using the HTTP API
curl -X POST http://localhost:9308/search \
  -H "Content-Type: application/json" \
  -d '{
    "index": "products",
    "query": {
      "match": {
        "name,description": "bluetooth"
      }
    },
    "limit": 10,
    "sort": [
      { "price": "asc" }
    ]
  }'

# Insert a document via HTTP
curl -X POST http://localhost:9308/insert \
  -H "Content-Type: application/json" \
  -d '{
    "index": "products",
    "id": 6,
    "doc": {
      "name": "USB-C Hub Adapter",
      "description": "7-in-1 USB-C hub with HDMI and ethernet",
      "category": "Electronics",
      "brand": "ConnectPro",
      "price": 45.99,
      "in_stock": true
    }
  }'

# Bulk insert multiple documents
curl -X POST http://localhost:9308/bulk \
  -H "Content-Type: application/x-ndjson" \
  -d '
{"insert": {"index": "products", "id": 7, "doc": {"name": "Wireless Mouse", "price": 29.99, "category": "Electronics"}}}
{"insert": {"index": "products", "id": 8, "doc": {"name": "Laptop Stand", "price": 49.99, "category": "Accessories"}}}
'
```

## Python Integration

```python
# search_app.py - Manticore Search with Python
import mysql.connector

# Connect to Manticore using the MySQL protocol
conn = mysql.connector.connect(
    host='127.0.0.1',
    port=9306
)
cursor = conn.cursor(dictionary=True)

# Create a table for articles
cursor.execute("""
    CREATE TABLE IF NOT EXISTS articles (
        title text,
        body text,
        author string,
        published_at timestamp,
        views integer
    ) morphology='stem_en'
""")

# Index some articles
articles = [
    (1, 'Getting Started with Docker', 'A beginners guide to containerization', 'alice', 1707350400, 1500),
    (2, 'Docker Compose Tips', 'Advanced tips for Docker Compose workflows', 'bob', 1707436800, 2300),
    (3, 'Kubernetes Deployment Guide', 'How to deploy applications on Kubernetes', 'alice', 1707523200, 3100),
]

for article in articles:
    cursor.execute(
        "INSERT INTO articles (id, title, body, author, published_at, views) VALUES (%s, %s, %s, %s, %s, %s)",
        article
    )

# Full-text search with filters
cursor.execute("""
    SELECT id, title, HIGHLIGHT({}, 'title') as highlighted_title, views
    FROM articles
    WHERE MATCH('docker')
    AND author = 'alice'
    ORDER BY views DESC
    LIMIT 10
""")

for row in cursor.fetchall():
    print(f"{row['id']}: {row['highlighted_title']} (views: {row['views']})")

cursor.close()
conn.close()
```

## Manticore with Your Application Stack

```yaml
# docker-compose.yml - Full application with Manticore search
version: "3.8"

services:
  manticore:
    image: manticoresearch/manticore
    ports:
      - "9306:9306"
      - "9308:9308"
    volumes:
      - manticore_data:/var/lib/manticore
    restart: unless-stopped

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
      DATABASE_URL: postgres://app:secret@postgres:5432/myapp
      MANTICORE_HOST: manticore
      MANTICORE_SQL_PORT: 9306
      MANTICORE_HTTP_PORT: 9308
    depends_on:
      - manticore
      - postgres

volumes:
  manticore_data:
  pg_data:
```

## Cluster Setup for High Availability

Manticore supports replication for high availability:

```yaml
# docker-compose-cluster.yml - Manticore replication cluster
version: "3.8"

services:
  manticore-1:
    image: manticoresearch/manticore
    ports:
      - "9306:9306"
      - "9308:9308"
    volumes:
      - m1_data:/var/lib/manticore
    environment:
      EXTRA: 1
      cluster: myapp_cluster
      cluster_name: node1

  manticore-2:
    image: manticoresearch/manticore
    ports:
      - "9316:9306"
      - "9318:9308"
    volumes:
      - m2_data:/var/lib/manticore
    environment:
      EXTRA: 1
      cluster: myapp_cluster
      cluster_name: node2

volumes:
  m1_data:
  m2_data:
```

## Useful Management Commands

```bash
# Show all tables
mysql -h 127.0.0.1 -P 9306 -e "SHOW TABLES"

# Show table schema
mysql -h 127.0.0.1 -P 9306 -e "DESCRIBE products"

# Show table status and statistics
mysql -h 127.0.0.1 -P 9306 -e "SHOW TABLE products STATUS"

# Show server status
mysql -h 127.0.0.1 -P 9306 -e "SHOW STATUS"

# Optimize table (merge disk chunks for better performance)
mysql -h 127.0.0.1 -P 9306 -e "OPTIMIZE TABLE products"

# Delete documents matching a condition
mysql -h 127.0.0.1 -P 9306 -e "DELETE FROM products WHERE in_stock = 0"

# Truncate the entire table
mysql -h 127.0.0.1 -P 9306 -e "TRUNCATE TABLE products"
```

## Summary

Manticore Search delivers fast full-text search with a familiar SQL interface. The MySQL protocol compatibility means you can use existing MySQL clients, ORMs, and tools to interact with it, which significantly reduces the learning curve. Compared to Elasticsearch, Manticore uses less memory, starts faster, and provides comparable or better search performance for most workloads. The Docker deployment is straightforward, and the combination of SQL and HTTP APIs gives you flexibility in how you integrate it with your application. If you need a search engine that feels like a database, Manticore is an excellent choice.
