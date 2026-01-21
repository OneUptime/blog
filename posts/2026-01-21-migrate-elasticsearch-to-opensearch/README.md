# How to Migrate from Elasticsearch to OpenSearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, OpenSearch, Migration, AWS, Data Migration, Search Engine

Description: A comprehensive guide to migrating from Elasticsearch to OpenSearch, covering compatibility assessment, migration strategies, client library updates, and post-migration validation.

---

Migrating from Elasticsearch to OpenSearch requires careful planning due to API differences and feature changes. This guide covers the complete migration process.

## Pre-Migration Assessment

### Version Compatibility

| Elasticsearch Version | OpenSearch Version | Notes |
|-----------------------|-------------------|-------|
| 7.10.x | OpenSearch 1.x | High compatibility |
| 7.11+ | OpenSearch 1.x | Some API changes |
| 8.x | OpenSearch 2.x | Significant changes |

### Check Current Version

```bash
# Elasticsearch version
curl -X GET "localhost:9200/"

# Response
{
  "version": {
    "number": "7.10.2",
    "lucene_version": "8.7.0"
  }
}
```

### Feature Compatibility Check

```bash
# List installed plugins
curl -X GET "localhost:9200/_cat/plugins?v"

# Check cluster settings
curl -X GET "localhost:9200/_cluster/settings?include_defaults=true"

# Check index settings
curl -X GET "localhost:9200/_settings?pretty"
```

## Migration Strategies

### Strategy 1: Snapshot and Restore

Best for: Smaller clusters, acceptable downtime

```bash
# 1. Create shared repository (S3 example)
# On Elasticsearch
curl -X PUT "localhost:9200/_snapshot/migration_repo" -H 'Content-Type: application/json' -d'
{
  "type": "s3",
  "settings": {
    "bucket": "my-migration-bucket",
    "region": "us-east-1",
    "base_path": "es-backup"
  }
}'

# 2. Create snapshot
curl -X PUT "localhost:9200/_snapshot/migration_repo/migration_snapshot?wait_for_completion=true" -H 'Content-Type: application/json' -d'
{
  "indices": "*",
  "ignore_unavailable": true,
  "include_global_state": true
}'

# 3. Register same repository in OpenSearch
curl -X PUT "https://opensearch:9200/_snapshot/migration_repo" -H 'Content-Type: application/json' -d'
{
  "type": "s3",
  "settings": {
    "bucket": "my-migration-bucket",
    "region": "us-east-1",
    "base_path": "es-backup"
  }
}'

# 4. Restore in OpenSearch
curl -X POST "https://opensearch:9200/_snapshot/migration_repo/migration_snapshot/_restore" -H 'Content-Type: application/json' -d'
{
  "indices": "*",
  "ignore_unavailable": true,
  "include_global_state": false
}'
```

### Strategy 2: Reindex from Remote

Best for: Zero downtime migration, data transformation

```bash
# 1. Configure OpenSearch to allow remote reindex
# opensearch.yml
reindex.remote.whitelist: "old-es-cluster:9200"

# 2. Reindex from Elasticsearch to OpenSearch
curl -X POST "https://opensearch:9200/_reindex?wait_for_completion=false" -H 'Content-Type: application/json' -d'
{
  "source": {
    "remote": {
      "host": "http://old-es-cluster:9200",
      "username": "elastic",
      "password": "password"
    },
    "index": "source-index",
    "query": {
      "match_all": {}
    }
  },
  "dest": {
    "index": "dest-index"
  }
}'

# 3. Monitor reindex progress
curl -X GET "https://opensearch:9200/_tasks?detailed=true&actions=*reindex"
```

### Strategy 3: Dual-Write Migration

Best for: Zero downtime, gradual migration

```python
from elasticsearch import Elasticsearch
from opensearchpy import OpenSearch

class DualWriteClient:
    def __init__(self, es_config, os_config):
        self.es = Elasticsearch(**es_config)
        self.os = OpenSearch(**os_config)
        self.write_to_both = True
        self.read_from = "elasticsearch"

    def index(self, index, id, document):
        if self.write_to_both:
            self.es.index(index=index, id=id, document=document)
            self.os.index(index=index, id=id, body=document)
        elif self.read_from == "opensearch":
            self.os.index(index=index, id=id, body=document)
        else:
            self.es.index(index=index, id=id, document=document)

    def search(self, index, query):
        if self.read_from == "opensearch":
            return self.os.search(index=index, body=query)
        else:
            return self.es.search(index=index, query=query)

    def switch_to_opensearch(self):
        self.read_from = "opensearch"
        self.write_to_both = False

# Usage
client = DualWriteClient(
    es_config={"hosts": ["http://elasticsearch:9200"]},
    os_config={"hosts": [{"host": "opensearch", "port": 9200}]}
)

# After migration complete
client.switch_to_opensearch()
```

## Client Library Migration

### Python

**Before (Elasticsearch):**
```python
from elasticsearch import Elasticsearch

es = Elasticsearch(
    ["https://localhost:9200"],
    basic_auth=("elastic", "password"),
    verify_certs=True
)

# Index
es.index(index="my-index", id=1, document={"field": "value"})

# Search
response = es.search(
    index="my-index",
    query={"match": {"field": "value"}}
)
```

**After (OpenSearch):**
```python
from opensearchpy import OpenSearch

client = OpenSearch(
    hosts=[{"host": "localhost", "port": 9200}],
    http_auth=("admin", "admin"),
    use_ssl=True,
    verify_certs=True,
    ssl_show_warn=False
)

# Index
client.index(index="my-index", id=1, body={"field": "value"})

# Search
response = client.search(
    index="my-index",
    body={"query": {"match": {"field": "value"}}}
)
```

### Node.js

**Before (Elasticsearch):**
```javascript
const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'password'
  }
});

// Index
await client.index({
  index: 'my-index',
  id: '1',
  document: { field: 'value' }
});

// Search
const response = await client.search({
  index: 'my-index',
  query: { match: { field: 'value' } }
});
```

**After (OpenSearch):**
```javascript
const { Client } = require('@opensearch-project/opensearch');

const client = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'admin',
    password: 'admin'
  },
  ssl: {
    rejectUnauthorized: false
  }
});

// Index
await client.index({
  index: 'my-index',
  id: '1',
  body: { field: 'value' }
});

// Search
const response = await client.search({
  index: 'my-index',
  body: { query: { match: { field: 'value' } } }
});
```

### Java

**Before (Elasticsearch):**
```java
RestHighLevelClient client = new RestHighLevelClient(
    RestClient.builder(new HttpHost("localhost", 9200, "https"))
        .setHttpClientConfigCallback(httpClientBuilder ->
            httpClientBuilder.setDefaultCredentialsProvider(credentialsProvider))
);

IndexRequest request = new IndexRequest("my-index")
    .id("1")
    .source("field", "value");
client.index(request, RequestOptions.DEFAULT);
```

**After (OpenSearch):**
```java
final OpenSearchClient client = new OpenSearchClient(
    ApacheHttpClient5TransportBuilder
        .builder(HttpHost.create("https://localhost:9200"))
        .setMapper(new JacksonJsonpMapper())
        .build()
);

IndexRequest<Map> request = new IndexRequest.Builder<Map>()
    .index("my-index")
    .id("1")
    .document(Map.of("field", "value"))
    .build();
client.index(request);
```

## Security Configuration Migration

### Elasticsearch Security

```yaml
# elasticsearch.yml
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.http.ssl.enabled: true
```

### OpenSearch Security

```yaml
# opensearch.yml
plugins.security.ssl.transport.enabled: true
plugins.security.ssl.http.enabled: true
plugins.security.allow_default_init_securityindex: true
plugins.security.authcz.admin_dn:
  - CN=admin,OU=IT,O=Company,L=City,ST=State,C=US
```

### User Migration

```bash
# Export Elasticsearch users (requires X-Pack)
curl -u elastic:password -X GET "localhost:9200/_security/user?pretty" > users.json

# Create users in OpenSearch
# Users are created via internal_users.yml or API
curl -X PUT "https://opensearch:9200/_plugins/_security/api/internalusers/myuser" \
  -H 'Content-Type: application/json' \
  -u admin:admin \
  -d '
{
  "password": "newpassword",
  "backend_roles": ["readall"],
  "attributes": {}
}'
```

### Role Migration

```bash
# Elasticsearch roles
curl -u elastic:password -X GET "localhost:9200/_security/role?pretty" > roles.json

# OpenSearch role creation
curl -X PUT "https://opensearch:9200/_plugins/_security/api/roles/my_role" \
  -H 'Content-Type: application/json' \
  -u admin:admin \
  -d '
{
  "cluster_permissions": ["cluster_monitor"],
  "index_permissions": [{
    "index_patterns": ["my-index-*"],
    "allowed_actions": ["read", "search"]
  }]
}'
```

## Index Template Migration

### Elasticsearch Template

```json
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1
    },
    "mappings": {
      "properties": {
        "@timestamp": {"type": "date"},
        "message": {"type": "text"}
      }
    }
  }
}
```

### OpenSearch Template

```bash
curl -X PUT "https://opensearch:9200/_index_template/logs_template" \
  -H 'Content-Type: application/json' \
  -u admin:admin \
  -d '
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1
    },
    "mappings": {
      "properties": {
        "@timestamp": {"type": "date"},
        "message": {"type": "text"}
      }
    }
  }
}'
```

## ILM to ISM Migration

### Elasticsearch ILM Policy

```json
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "7d",
            "max_size": "50gb"
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "forcemerge": {"max_num_segments": 1}
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

### OpenSearch ISM Policy

```bash
curl -X PUT "https://opensearch:9200/_plugins/_ism/policies/logs_policy" \
  -H 'Content-Type: application/json' \
  -u admin:admin \
  -d '
{
  "policy": {
    "description": "Log retention policy",
    "default_state": "hot",
    "states": [
      {
        "name": "hot",
        "actions": [
          {
            "rollover": {
              "min_index_age": "7d",
              "min_size": "50gb"
            }
          }
        ],
        "transitions": [
          {
            "state_name": "warm",
            "conditions": {
              "min_index_age": "30d"
            }
          }
        ]
      },
      {
        "name": "warm",
        "actions": [
          {
            "force_merge": {
              "max_num_segments": 1
            }
          }
        ],
        "transitions": [
          {
            "state_name": "delete",
            "conditions": {
              "min_index_age": "90d"
            }
          }
        ]
      },
      {
        "name": "delete",
        "actions": [
          {
            "delete": {}
          }
        ]
      }
    ],
    "ism_template": {
      "index_patterns": ["logs-*"]
    }
  }
}'
```

## Post-Migration Validation

### Data Validation Script

```python
from elasticsearch import Elasticsearch
from opensearchpy import OpenSearch

def validate_migration(es_host, os_host, index):
    es = Elasticsearch([es_host])
    os = OpenSearch([{"host": os_host, "port": 9200}])

    # Compare document counts
    es_count = es.count(index=index)["count"]
    os_count = os.count(index=index)["count"]

    print(f"Elasticsearch count: {es_count}")
    print(f"OpenSearch count: {os_count}")

    if es_count != os_count:
        print("WARNING: Document counts don't match!")
        return False

    # Compare sample documents
    es_sample = es.search(index=index, size=100)
    os_sample = os.search(index=index, body={"size": 100})

    es_ids = {hit["_id"] for hit in es_sample["hits"]["hits"]}
    os_ids = {hit["_id"] for hit in os_sample["hits"]["hits"]}

    missing = es_ids - os_ids
    if missing:
        print(f"Missing documents in OpenSearch: {missing}")
        return False

    print("Validation passed!")
    return True

# Run validation
validate_migration(
    es_host="http://elasticsearch:9200",
    os_host="opensearch",
    index="my-index"
)
```

### Performance Validation

```bash
# Compare search performance
# Elasticsearch
time curl -X GET "http://elasticsearch:9200/my-index/_search?q=field:value"

# OpenSearch
time curl -X GET "https://opensearch:9200/my-index/_search?q=field:value"

# Compare aggregation performance
curl -X GET "https://opensearch:9200/my-index/_search" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "aggs": {
    "by_field": {
      "terms": {"field": "category.keyword"}
    }
  }
}'
```

## Rollback Plan

### Quick Rollback Steps

```bash
# 1. Keep Elasticsearch running during migration

# 2. Update application config to point back to Elasticsearch
# config.yml
# search_host: elasticsearch:9200

# 3. If using dual-write, switch read source
client.read_from = "elasticsearch"

# 4. Verify application functionality

# 5. If needed, restore from snapshot
curl -X POST "localhost:9200/_snapshot/backup_repo/pre_migration/_restore"
```

## Summary

Migrating from Elasticsearch to OpenSearch involves:

1. **Assessment** - Check version compatibility and features
2. **Strategy selection** - Snapshot/restore, reindex, or dual-write
3. **Client library updates** - Change from elasticsearch-py to opensearch-py
4. **Security migration** - Convert users, roles, and SSL configuration
5. **ILM to ISM** - Convert lifecycle policies
6. **Validation** - Verify data integrity and performance
7. **Rollback plan** - Have a way to revert if needed

With proper planning, the migration can be completed with minimal downtime and risk.
