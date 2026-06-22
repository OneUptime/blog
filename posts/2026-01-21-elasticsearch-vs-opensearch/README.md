# Elasticsearch vs OpenSearch: Which to Choose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, OpenSearch, Comparison, Search Engine, AWS, Licensing, Migration

Description: A comprehensive comparison of Elasticsearch and OpenSearch, covering licensing differences, feature parity, performance, ecosystem, and guidance on choosing the right search engine for your use case.

---

OpenSearch is a fork of Elasticsearch created by AWS after Elastic changed Elasticsearch and Kibana from Apache 2.0 to source-available licenses. This guide compares both to help you make an informed decision.

## Background

### The Fork Story

- **2021**: Elastic changed Elasticsearch license from Apache 2.0 to SSPL/Elastic License
- **2021**: AWS forked Elasticsearch 7.10.2 to create OpenSearch under Apache 2.0
- **2024**: Elastic added AGPLv3 as a source-code licensing option for free portions of Elasticsearch and Kibana, while official distributions remain under Elastic License terms
- **Since then**: Both projects have diverged with independent development

### Licensing

| Aspect | Elasticsearch | OpenSearch |
|--------|---------------|------------|
| License | Elastic License 2.0 / SSPL / AGPLv3 source-code options | Apache 2.0 |
| Commercial Use | Allowed, subject to chosen license terms | Fully allowed |
| SaaS Offering | Restricted under Elastic License; other options have copyleft obligations | Allowed |
| Modification | Allowed | Allowed |
| Patent Grant | Depends on chosen license | Yes |

## Feature Comparison

### Core Features

| Feature | Elasticsearch | OpenSearch |
|---------|---------------|------------|
| Full-text search | Yes | Yes |
| Aggregations | Yes | Yes |
| Distributed architecture | Yes | Yes |
| RESTful API | Yes | Yes |
| JSON documents | Yes | Yes |
| Near real-time indexing | Yes | Yes |

### Advanced Features (as of 2024)

| Feature | Elasticsearch | OpenSearch |
|---------|---------------|------------|
| Vector search (kNN) | Native approximate kNN (8.0+) | Native `knn_vector` support (1.0+), Lucene HNSW engine (2.2+) |
| ML inference | Elastic ML | OpenSearch ML |
| Security (RBAC) | Basic RBAC (free), advanced controls (paid) | Free |
| Alerting | Basic Kibana alerting (free), Watcher and advanced connectors (paid) | Free |
| Index Lifecycle Management | Yes | Yes (ISM) |
| Cross-cluster replication | Paid | Free |
| Anomaly detection | Paid | Free |
| SQL support | REST SQL APIs free; JDBC/ODBC clients paid | Free |

### Elasticsearch-Only Features

```plaintext
- Elastic Agent and Fleet
- Elastic Security (SIEM)
- Elastic Observability
- Canvas (visualization)
- Machine Learning (advanced)
- Searchable snapshots (frozen tier)
- Runtime fields
- ES|QL
```

### OpenSearch-Only Features

```plaintext
- Free alerting and notifications
- Free anomaly detection
- Free SQL support
- Free security analytics
- Piped Processing Language (PPL)
- Asynchronous search
- k-NN plugin enhancements
```

## API Compatibility

### Compatible APIs

Most core APIs are compatible between Elasticsearch 7.x and OpenSearch:

```bash
# These work identically in both

curl -X GET "localhost:9200/_cluster/health"
curl -X GET "localhost:9200/_cat/indices"
curl -X PUT "localhost:9200/my-index"
curl -X POST "localhost:9200/my-index/_doc" -H "Content-Type: application/json" -d '{"field": "value"}'
curl -X GET "localhost:9200/my-index/_search"
```

### Breaking Changes

OpenSearch has diverged in some areas:

```bash
# Elasticsearch 8.x removed mapping types; use typeless document APIs
curl -X PUT "localhost:9200/index/_doc/1" # ES 8.x
curl -X PUT "localhost:9200/index/_doc/1" # OpenSearch (compatible)

# Security API differences
# Elasticsearch
curl -X PUT "localhost:9200/_security/user/newuser"

# OpenSearch
curl -X PUT "localhost:9200/_plugins/_security/api/internalusers/newuser"
```

## Performance Comparison

### Indexing Performance

Both have similar indexing performance for standard workloads:

```bash
# Benchmark indexing (results may vary)
# Elasticsearch 8.x: ~50,000 docs/second (single node)
# OpenSearch 2.x: ~48,000 docs/second (single node)
```

### Search Performance

Search performance is comparable:

```bash
# Simple query benchmark
# Elasticsearch: ~5ms p50, ~15ms p99
# OpenSearch: ~5ms p50, ~16ms p99
```

### Vector Search Performance

Elasticsearch has made significant improvements in vector search:

```bash
# k-NN search (1M vectors, 768 dimensions)
# Elasticsearch 8.x with HNSW: ~8ms
# OpenSearch 2.x with HNSW: ~10ms
```

## Ecosystem Comparison

### Client Libraries

| Language | Elasticsearch | OpenSearch |
|----------|---------------|------------|
| Python | elasticsearch-py | opensearch-py |
| Java | elasticsearch-java | opensearch-java |
| Node.js | @elastic/elasticsearch | @opensearch-project/opensearch |
| Go | go-elasticsearch | opensearch-go |
| Ruby | elasticsearch-ruby | opensearch-ruby |

### Visualization

| Tool | Elasticsearch | OpenSearch |
|------|---------------|------------|
| Primary UI | Kibana | OpenSearch Dashboards |
| Grafana | Supported | Supported |
| Third-party | Many | Growing |

### Log Shippers

| Shipper | Elasticsearch | OpenSearch |
|---------|---------------|------------|
| Filebeat | Native | Requires output config |
| Logstash | Native | Supported |
| Fluent Bit | Supported | Supported |
| Vector | Supported | Supported |

## Cloud Offerings

### Elasticsearch

| Provider | Service |
|----------|---------|
| Elastic | Elastic Cloud |
| AWS | Elastic Cloud on AWS |
| GCP | Elastic Cloud on GCP |
| Azure | Elastic Cloud on Azure |

### OpenSearch

| Provider | Service |
|----------|---------|
| AWS | Amazon OpenSearch Service |
| Self-hosted | OpenSearch on any cloud |
| Aiven | Aiven for OpenSearch |

## Cost Comparison

### Self-Hosted

| Component | Elasticsearch | OpenSearch |
|-----------|---------------|------------|
| Core engine | Free | Free |
| Security | Basic free, RBAC paid | Free |
| Alerting | Paid | Free |
| Machine Learning | Paid | Free (basic) |
| Cross-cluster replication | Paid | Free |

### Managed Services

```plaintext
Elastic Cloud:
- Standard: ~$95/month (2GB RAM, 60GB storage)
- Feature availability depends on subscription tier

Amazon OpenSearch:
- t3.small.search: ~$25/month
- Feature availability depends on engine version and service configuration

Note: Prices are approximate and vary by configuration.
```

## When to Choose Elasticsearch

### Best for:

1. **Elastic Stack ecosystem users**
   - Already using Kibana, Beats, APM
   - Need Elastic Security or Observability

2. **Enterprise features required**
   - Advanced ML capabilities
   - Searchable snapshots
   - Canvas visualizations

3. **Vendor support preference**
   - Direct Elastic support
   - Enterprise SLAs

4. **Cutting-edge features**
   - Latest search innovations
   - Vector search improvements

### Configuration Example

```yaml
# elasticsearch.yml
cluster.name: production
node.name: node-1
network.host: 0.0.0.0
discovery.type: single-node

# Enable security
xpack.security.enabled: true

# Enable ML
xpack.ml.enabled: true
```

## When to Choose OpenSearch

### Best for:

1. **Open source requirements**
   - Apache 2.0 license needed
   - Avoiding SSPL/proprietary licenses

2. **Cost-sensitive deployments**
   - Free security features
   - Free alerting and ML

3. **AWS-centric infrastructure**
   - Using Amazon OpenSearch Service
   - Integrated with AWS ecosystem

4. **SaaS product development**
   - Building search-as-a-service
   - No licensing restrictions

### Configuration Example

```yaml
# opensearch.yml
cluster.name: production
node.name: node-1
network.host: 0.0.0.0
discovery.type: single-node

# Security plugin is installed by default; configure production TLS certificates separately
```

## Migration Considerations

### From Elasticsearch to OpenSearch

```bash
# Check compatibility
# OpenSearch 1.x compatible with ES 7.10.x
# OpenSearch 2.x and 3.x have breaking changes

# Client library changes
# Before (Elasticsearch)
pip install elasticsearch

# After (OpenSearch)
pip install opensearch-py
```

### From OpenSearch to Elasticsearch

```bash
# Snapshot restore only works when source and target versions are compatible
# For incompatible versions, use reindexing, Logstash, or an ingestion pipeline
# Security configurations need reconfiguration
# Custom plugins may not be compatible
```

## Feature Matrix Decision Guide

| Requirement | Recommended |
|-------------|-------------|
| Apache 2.0 license | OpenSearch |
| Enterprise ML | Elasticsearch |
| Free security features | OpenSearch |
| Elastic Observability | Elasticsearch |
| AWS managed service | OpenSearch |
| Multi-cloud managed | Elasticsearch |
| Building SaaS product | OpenSearch |
| Kibana workflows | Elasticsearch |

## Client Code Comparison

### Python - Elasticsearch

```python
from elasticsearch import Elasticsearch

es = Elasticsearch(
    ["https://localhost:9200"],
    basic_auth=("elastic", "password"),
    verify_certs=True
)

# Index document
es.index(index="my-index", id=1, document={"field": "value"})

# Search
response = es.search(
    index="my-index",
    query={"match": {"field": "value"}}
)
```

### Python - OpenSearch

```python
from opensearchpy import OpenSearch

client = OpenSearch(
    hosts=[{"host": "localhost", "port": 9200}],
    http_auth=("admin", "admin"),
    use_ssl=True,
    verify_certs=True
)

# Index document
client.index(index="my-index", id=1, body={"field": "value"})

# Search
response = client.search(
    index="my-index",
    body={"query": {"match": {"field": "value"}}}
)
```

## Summary

### Choose Elasticsearch if:
- You need the full Elastic Stack ecosystem
- Enterprise features like advanced ML are required
- You want vendor support and SLAs
- You're not building a competing SaaS product

### Choose OpenSearch if:
- You need Apache 2.0 licensing
- Cost-sensitive with need for free security/alerting
- Building a SaaS product with search
- Using AWS infrastructure extensively

Both are excellent search engines. The choice depends on licensing requirements, feature needs, ecosystem preferences, and budget constraints.
