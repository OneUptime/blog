# How to Sync MongoDB Data to Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Elasticsearch, Data Sync, Monstache, Change Stream

Description: Sync MongoDB data to Elasticsearch in real-time using Monstache or the MongoDB Kafka Connector to enable full-text search alongside MongoDB's document store.

---

## Overview

MongoDB excels at flexible document storage and transactional workloads, while Elasticsearch shines at full-text search, faceted search, and log analytics. Syncing data between them lets you use MongoDB as the source of truth while leveraging Elasticsearch's search capabilities. This guide covers Monstache (a purpose-built sync tool), Change Streams with a custom consumer, and an initial bulk sync approach for existing data.

## Approach 1 - Monstache (Recommended)

Monstache is a Go service that reads MongoDB Change Streams and indexes documents into Elasticsearch in real time.

### Install Monstache

```bash
# Download latest release
curl -L https://github.com/rwynn/monstache/releases/download/v6.7.11/monstache-linux-amd64.zip -o monstache.zip
unzip monstache.zip
chmod +x monstache
sudo mv monstache /usr/local/bin/
```

### Configure Monstache

```toml
# config.toml
mongo-url = "mongodb://localhost:27017/?replicaSet=rs0"
elasticsearch-urls = ["http://localhost:9200"]

# Direct read these specific namespaces on startup
direct-read-namespaces = ["ecommerce.products", "ecommerce.users"]

# Resume sync after restart using MongoDB resume tokens
resume = true
resume-name = "default"

# Elasticsearch settings
elasticsearch-max-conns = 4
elasticsearch-max-seconds = 5
elasticsearch-max-bytes = 8000000

# Mapping MongoDB collection to Elasticsearch index
[[namespace-map]]
  namespace = "ecommerce.products"
  index = "products"

# Transform documents before indexing
[[script]]
  namespace = "ecommerce.products"
  script = """
module.exports = function(doc) {
  doc.search_text = doc.name + " " + (doc.description || "") + " " + (doc.brand || "")
  return doc
}
"""
```

### Run Monstache

```bash
monstache -f config.toml

# Or as a system service
monstache -f /etc/monstache/config.toml &
```

### Verify Sync

```bash
# Check documents in Elasticsearch
curl http://localhost:9200/products/_count

# Search synced documents
curl "http://localhost:9200/products/_search?q=widget&pretty"
```

## Approach 2 - Custom Change Stream Consumer

```python
from pymongo import MongoClient
from elasticsearch import Elasticsearch

mongo_client = MongoClient("mongodb://localhost:27017/?replicaSet=rs0")
es_client = Elasticsearch(["http://localhost:9200"])
db = mongo_client["ecommerce"]

def transform_for_es(doc):
    """Convert MongoDB document for Elasticsearch."""
    es_doc = dict(doc)
    es_doc["_id"] = str(es_doc["_id"])
    return es_doc

def sync_collection():
    change_stream = db.products.watch(
        pipeline=[],
        full_document="updateLookup"
    )

    for change in change_stream:
        op = change["operationType"]
        doc_id = str(change["documentKey"]["_id"])

        if op in ("insert", "update", "replace"):
            doc = change.get("fullDocument")
            if doc:
                es_doc = transform_for_es(doc)
                es_client.index(
                    index="products",
                    id=doc_id,
                    document=es_doc
                )
                print(f"Indexed {doc_id}")

        elif op == "delete":
            es_client.delete(index="products", id=doc_id, ignore=[404])
            print(f"Deleted {doc_id}")

if __name__ == "__main__":
    sync_collection()
```

## Approach 3 - Initial Bulk Sync

For an initial sync of existing data:

```python
from pymongo import MongoClient
from elasticsearch import Elasticsearch, helpers

mongo_client = MongoClient("mongodb://localhost:27017")
es_client = Elasticsearch(["http://localhost:9200"])

def initial_sync(db_name, collection_name, index_name, batch_size=500):
    collection = mongo_client[db_name][collection_name]
    total = collection.count_documents({})
    print(f"Syncing {total} documents...")

    def generate_actions():
        for doc in collection.find({}, batch_size=batch_size):
            doc["_id"] = str(doc["_id"])
            yield {
                "_index": index_name,
                "_id": doc["_id"],
                "_source": doc
            }

    success, failed = helpers.bulk(
        es_client,
        generate_actions(),
        chunk_size=batch_size,
        raise_on_error=False,
        stats_only=True
    )
    print(f"Synced: {success}, Failed: {failed}")

initial_sync("ecommerce", "products", "products")
```

## Create Elasticsearch Index Mapping

```bash
curl -X PUT "localhost:9200/products" -H "Content-Type: application/json" -d '{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "name": { "type": "text", "analyzer": "english" },
      "description": { "type": "text" },
      "price": { "type": "double" },
      "category": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "createdAt": { "type": "date" }
    }
  }
}'
```

## Search from Your Application

```javascript
const { Client } = require("@elastic/elasticsearch")
const es = new Client({ node: "http://localhost:9200" })

async function searchProducts(query, category) {
  const result = await es.search({
    index: "products",
    body: {
      query: {
        bool: {
          must: [
            { multi_match: { query, fields: ["name^2", "description"] } }
          ],
          filter: category ? [{ term: { category } }] : []
        }
      },
      highlight: {
        fields: { name: {}, description: {} }
      }
    }
  })
  return result.hits.hits
}
```

## Summary

Syncing MongoDB to Elasticsearch enables powerful full-text search on your MongoDB data. Monstache is the easiest production-ready option, offering resume tokens, document transformation scripts, and Elasticsearch index mapping. For custom control, a Change Stream consumer gives you full flexibility over which operations and fields to sync. Always perform an initial bulk sync before starting the real-time change stream listener.
