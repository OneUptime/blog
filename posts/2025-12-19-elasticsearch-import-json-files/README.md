# How to Import JSON Files into Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, JSON, Data Import, Bulk API, Indexing, Data Migration

Description: A comprehensive guide to importing JSON files into Elasticsearch using bulk API, curl, Python, Logstash, and command-line tools with handling for various JSON formats.

---

Importing JSON data into Elasticsearch is a common task for data migration, seeding test data, or loading datasets. This guide covers multiple methods to handle various JSON file formats and sizes efficiently.

## JSON File Formats

Elasticsearch can import different JSON structures:

```mermaid
graph TD
    A[JSON File] --> B{Format Type}
    B --> C[Single Object]
    B --> D[Array of Objects]
    B --> E[Newline Delimited JSON]
    B --> F[Bulk API Format]

    C --> G[Single Index Request]
    D --> H[Parse and Bulk Import]
    E --> I[Line-by-Line Processing]
    F --> J[Direct Bulk API]
```

## Method 1: Using curl with Bulk API

### Newline Delimited JSON (NDJSON)

Create a file in bulk format:

```json
{"index":{"_index":"products","_id":"1"}}
{"name":"Laptop","price":999.99,"category":"electronics"}
{"index":{"_index":"products","_id":"2"}}
{"name":"Headphones","price":149.99,"category":"electronics"}
{"index":{"_index":"products","_id":"3"}}
{"name":"Keyboard","price":79.99,"category":"accessories"}
```

Import with curl:

```bash
curl -X POST "https://localhost:9200/_bulk" \
  -H "Content-Type: application/x-ndjson" \
  -u elastic:password \
  --data-binary @products.ndjson
```

### From Standard JSON Array

Convert JSON array to NDJSON format:

```bash
# Input: products.json
# [{"name":"Laptop","price":999},{"name":"Phone","price":599}]

# Convert and import
cat products.json | jq -c '.[] | {"index":{"_index":"products"}}, .' | \
curl -X POST "https://localhost:9200/_bulk" \
  -H "Content-Type: application/x-ndjson" \
  -u elastic:password \
  --data-binary @-
```

### Import with Auto-generated IDs

```bash
curl -X POST "https://localhost:9200/products/_bulk" \
  -H "Content-Type: application/x-ndjson" \
  -u elastic:password \
  --data-binary @- << 'EOF'
{"index":{}}
{"name":"Product 1","price":100}
{"index":{}}
{"name":"Product 2","price":200}
EOF
```

## Method 2: Python Bulk Import

### Basic Import Script

```python
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk, streaming_bulk
import json

es = Elasticsearch(
    ["https://localhost:9200"],
    basic_auth=("elastic", "password"),
    verify_certs=False
)

def import_json_file(filepath: str, index_name: str, id_field: str = None):
    """Import JSON file into Elasticsearch."""

    with open(filepath, 'r') as f:
        data = json.load(f)

    # Handle both single object and array
    if isinstance(data, dict):
        data = [data]

    def generate_actions():
        for doc in data:
            action = {
                "_index": index_name,
                "_source": doc
            }
            if id_field and id_field in doc:
                action["_id"] = doc[id_field]
            yield action

    success, errors = bulk(es, generate_actions())
    print(f"Imported {success} documents, {len(errors)} errors")
    return success, errors


# Usage
import_json_file("products.json", "products", id_field="product_id")
```

### Streaming Large Files

```python
import json
from elasticsearch import Elasticsearch
from elasticsearch.helpers import streaming_bulk

es = Elasticsearch(
    ["https://localhost:9200"],
    basic_auth=("elastic", "password"),
    verify_certs=False
)

def import_large_json(filepath: str, index_name: str, chunk_size: int = 1000):
    """Import large JSON files using streaming."""

    def generate_docs():
        with open(filepath, 'r') as f:
            # For JSON array
            data = json.load(f)
            for doc in data:
                yield {
                    "_index": index_name,
                    "_source": doc
                }

    success = 0
    failed = 0

    for ok, result in streaming_bulk(
        es,
        generate_docs(),
        chunk_size=chunk_size,
        raise_on_error=False
    ):
        if ok:
            success += 1
        else:
            failed += 1
            print(f"Failed: {result}")

    print(f"Completed: {success} success, {failed} failed")


import_large_json("large_dataset.json", "dataset")
```

### Import NDJSON Files

```python
import json
from elasticsearch import Elasticsearch
from elasticsearch.helpers import streaming_bulk

es = Elasticsearch(
    ["https://localhost:9200"],
    basic_auth=("elastic", "password"),
    verify_certs=False
)

def import_ndjson(filepath: str, index_name: str):
    """Import newline-delimited JSON file."""

    def generate_docs():
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if line:
                    doc = json.loads(line)
                    yield {
                        "_index": index_name,
                        "_source": doc
                    }

    success = 0
    for ok, _ in streaming_bulk(es, generate_docs(), raise_on_error=False):
        if ok:
            success += 1

    print(f"Imported {success} documents")


import_ndjson("data.ndjson", "events")
```

### With Data Transformation

```python
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
import json
from datetime import datetime

es = Elasticsearch(
    ["https://localhost:9200"],
    basic_auth=("elastic", "password"),
    verify_certs=False
)

def transform_document(doc):
    """Transform document before indexing."""
    # Add timestamp
    doc["imported_at"] = datetime.utcnow().isoformat()

    # Normalize fields
    if "price" in doc:
        doc["price"] = float(doc["price"])

    if "tags" in doc and isinstance(doc["tags"], str):
        doc["tags"] = [t.strip() for t in doc["tags"].split(",")]

    # Remove unwanted fields
    doc.pop("internal_id", None)

    return doc

def import_with_transform(filepath: str, index_name: str):
    """Import JSON with transformation."""

    with open(filepath, 'r') as f:
        data = json.load(f)

    def generate_actions():
        for doc in data:
            transformed = transform_document(doc)
            yield {
                "_index": index_name,
                "_source": transformed
            }

    success, errors = bulk(es, generate_actions())
    print(f"Imported {success} documents")


import_with_transform("raw_products.json", "products")
```

## Method 3: Logstash Import

### Logstash Configuration for JSON

```ruby
# /etc/logstash/conf.d/import-json.conf

input {
  file {
    path => "/data/import/*.json"
    start_position => "beginning"
    sincedb_path => "/dev/null"
    codec => json
  }
}

filter {
  # Add timestamp
  mutate {
    add_field => { "imported_at" => "%{@timestamp}" }
  }

  # Transform fields
  if [price] {
    mutate {
      convert => { "price" => "float" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["https://localhost:9200"]
    user => "elastic"
    password => "password"
    ssl => true
    ssl_certificate_verification => false
    index => "products"
  }
}
```

### For NDJSON Files

```ruby
input {
  file {
    path => "/data/import/*.ndjson"
    start_position => "beginning"
    sincedb_path => "/dev/null"
    codec => "json_lines"
  }
}

output {
  elasticsearch {
    hosts => ["https://localhost:9200"]
    user => "elastic"
    password => "password"
    index => "events"
  }
}
```

## Method 4: elasticdump Tool

Install and use elasticdump for import/export:

```bash
# Install
npm install -g elasticdump

# Import JSON file
elasticdump \
  --input=products.json \
  --output=https://elastic:password@localhost:9200/products \
  --type=data

# Import with mapping first
elasticdump \
  --input=mapping.json \
  --output=https://elastic:password@localhost:9200/products \
  --type=mapping

elasticdump \
  --input=data.json \
  --output=https://elastic:password@localhost:9200/products \
  --type=data
```

## Method 5: Kibana Dev Tools

For smaller datasets, use Kibana console:

```json
POST /products/_bulk
{"index":{"_id":"1"}}
{"name":"Laptop","price":999.99}
{"index":{"_id":"2"}}
{"name":"Phone","price":599.99}
{"index":{"_id":"3"}}
{"name":"Tablet","price":449.99}
```

## Handling Different JSON Structures

### Nested JSON Objects

```python
import json
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk

es = Elasticsearch(
    ["https://localhost:9200"],
    basic_auth=("elastic", "password"),
    verify_certs=False
)

def flatten_json(nested_json, prefix=''):
    """Flatten nested JSON structures."""
    flat = {}
    for key, value in nested_json.items():
        new_key = f"{prefix}{key}" if prefix else key
        if isinstance(value, dict):
            flat.update(flatten_json(value, f"{new_key}."))
        elif isinstance(value, list):
            if value and isinstance(value[0], dict):
                # Keep nested objects for Elasticsearch nested type
                flat[new_key] = value
            else:
                flat[new_key] = value
        else:
            flat[new_key] = value
    return flat

def import_nested_json(filepath: str, index_name: str, flatten: bool = False):
    """Import JSON with nested objects."""

    with open(filepath, 'r') as f:
        data = json.load(f)

    def generate_actions():
        for doc in data:
            if flatten:
                doc = flatten_json(doc)
            yield {
                "_index": index_name,
                "_source": doc
            }

    success, _ = bulk(es, generate_actions())
    print(f"Imported {success} documents")
```

### CSV to JSON to Elasticsearch

```python
import csv
import json
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk

es = Elasticsearch(
    ["https://localhost:9200"],
    basic_auth=("elastic", "password"),
    verify_certs=False
)

def import_csv(filepath: str, index_name: str):
    """Import CSV file into Elasticsearch."""

    def generate_actions():
        with open(filepath, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Convert numeric strings to numbers
                for key, value in row.items():
                    try:
                        if '.' in value:
                            row[key] = float(value)
                        else:
                            row[key] = int(value)
                    except (ValueError, TypeError):
                        pass

                yield {
                    "_index": index_name,
                    "_source": row
                }

    success, errors = bulk(es, generate_actions())
    print(f"Imported {success} rows from CSV")


import_csv("products.csv", "products")
```

## Create Index with Mapping First

```bash
# Create index with mapping
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0
    },
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "fields": {
            "keyword": { "type": "keyword" }
          }
        },
        "price": { "type": "float" },
        "category": { "type": "keyword" },
        "description": { "type": "text" },
        "created_at": { "type": "date" }
      }
    }
  }'

# Then import data
curl -X POST "https://localhost:9200/products/_bulk" \
  -H "Content-Type: application/x-ndjson" \
  -u elastic:password \
  --data-binary @products.ndjson
```

## Error Handling and Validation

```python
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
import json

es = Elasticsearch(
    ["https://localhost:9200"],
    basic_auth=("elastic", "password"),
    verify_certs=False
)

def import_with_validation(filepath: str, index_name: str, required_fields: list):
    """Import with validation and error handling."""

    with open(filepath, 'r') as f:
        data = json.load(f)

    valid_docs = []
    invalid_docs = []

    for i, doc in enumerate(data):
        # Validate required fields
        missing = [f for f in required_fields if f not in doc or doc[f] is None]
        if missing:
            invalid_docs.append({
                "index": i,
                "doc": doc,
                "reason": f"Missing fields: {missing}"
            })
        else:
            valid_docs.append(doc)

    if invalid_docs:
        print(f"Found {len(invalid_docs)} invalid documents:")
        for inv in invalid_docs[:5]:
            print(f"  Index {inv['index']}: {inv['reason']}")

    if valid_docs:
        def generate_actions():
            for doc in valid_docs:
                yield {"_index": index_name, "_source": doc}

        success, errors = bulk(es, generate_actions(), raise_on_error=False)
        print(f"Imported {success} valid documents")
        if errors:
            print(f"Bulk errors: {len(errors)}")

    return len(valid_docs), len(invalid_docs)


import_with_validation(
    "products.json",
    "products",
    required_fields=["name", "price"]
)
```

## Performance Tips

| Tip | Description |
|-----|-------------|
| Use bulk API | Always batch documents |
| Disable refresh | Set `refresh_interval: -1` during import |
| Increase replicas after | Set `number_of_replicas: 0` during import |
| Optimal batch size | 1000-5000 documents per batch |
| Parallel imports | Use multiple threads for large datasets |

## Conclusion

Importing JSON into Elasticsearch can be done through:

1. **curl with bulk API** - Simple, command-line based
2. **Python scripts** - Flexible, with transformation
3. **Logstash** - Configuration-based, streaming
4. **elasticdump** - Ready-made tool
5. **Kibana Dev Tools** - Interactive, small datasets

Choose based on file size, transformation needs, and automation requirements.
