# How to Configure Elasticsearch to Index IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Elasticsearch, Logging, ELK Stack, Index Mapping

Description: Configure Elasticsearch index mappings to correctly store and query IPv6 addresses, including ip field types, CIDR range queries, and multi-address document patterns.

## Introduction

Elasticsearch's `ip` field type natively supports both IPv4 and IPv6 addresses, including CIDR range queries. Proper mapping configuration ensures efficient storage and enables subnet-based filtering. This guide covers index templates, mapping configurations, and query patterns for IPv6 address data.

## Index Mapping for IPv6 Addresses

```json
PUT /network-logs
{
  "mappings": {
    "properties": {
      "@timestamp": {
        "type": "date"
      },
      "source_ip": {
        "type": "ip"
      },
      "destination_ip": {
        "type": "ip"
      },
      "source_port": {
        "type": "integer"
      },
      "destination_port": {
        "type": "integer"
      },
      "protocol": {
        "type": "keyword"
      },
      "bytes_transferred": {
        "type": "long"
      },
      "action": {
        "type": "keyword"
      }
    }
  }
}
```

The `ip` type automatically handles both IPv4 and IPv6 addresses in full and compressed notation.

## Index Template for Log Pipelines

```json
PUT _index_template/network-logs-template
{
  "index_patterns": ["network-logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1
    },
    "mappings": {
      "properties": {
        "@timestamp": {"type": "date"},
        "client_ip":  {"type": "ip"},
        "server_ip":  {"type": "ip"},
        "http_method": {"type": "keyword"},
        "url_path": {"type": "keyword"},
        "response_code": {"type": "short"},
        "bytes": {"type": "long"},
        "user_agent": {"type": "text"}
      }
    }
  }
}
```

## Indexing Documents with IPv6 Addresses

```python
#!/usr/bin/env python3
# index_ipv6_logs.py

from elasticsearch import Elasticsearch
from datetime import datetime, timezone

es = Elasticsearch("http://localhost:9200")

# Index a document with IPv6 addresses

doc = {
    "@timestamp": datetime.now(timezone.utc).isoformat(),
    "client_ip": "2001:db8::1",          # IPv6 compressed
    "server_ip": "2001:db8:1::10",
    "http_method": "GET",
    "url_path": "/api/v1/users",
    "response_code": 200,
    "bytes": 4321,
    "user_agent": "Mozilla/5.0"
}

resp = es.index(index="network-logs-2026.03.20", document=doc)
print(f"Indexed: {resp['_id']}")

# Index with full-form IPv6 and an IPv4-mapped IPv6 address
doc2 = {
    "@timestamp": datetime.now(timezone.utc).isoformat(),
    "client_ip": "2001:0db8:0000:0000:0000:0000:0000:0001",  # Full form
    "server_ip": "::ffff:192.168.1.10",  # IPv4-mapped
    "http_method": "POST",
    "url_path": "/api/v1/upload",
    "response_code": 201,
    "bytes": 8192,
}

resp2 = es.index(index="network-logs-2026.03.20", document=doc2)
print(f"Indexed: {resp2['_id']}")
```

## Querying IPv6 Addresses

```json
// Exact address match
GET /network-logs-*/_search
{
  "query": {
    "term": {
      "client_ip": "2001:db8::1"
    }
  }
}
```

```json
// CIDR subnet range query - finds all addresses in 2001:db8::/32
GET /network-logs-*/_search
{
  "query": {
    "term": {
      "client_ip": "2001:db8::/32"
    }
  }
}
```

```json
// Multiple subnets with bool filter
GET /network-logs-*/_search
{
  "query": {
    "bool": {
      "filter": [
        {
          "bool": {
            "should": [
              {
                "term": {
                  "client_ip": "2001:db8::/32"
                }
              },
              {
                "term": {
                  "client_ip": "fd00::/8"
                }
              },
              {
                "term": {
                  "client_ip": "::1/128"
                }
              }
            ],
            "minimum_should_match": 1
          }
        },
        {
          "range": {
            "@timestamp": {
              "gte": "now-1h"
            }
          }
        }
      ]
    }
  }
}
```

## Aggregations by IPv6 Prefix

```json
// Top /48 prefixes by request count
GET /network-logs-*/_search
{
  "size": 0,
  "aggs": {
    "top_client_prefixes": {
      "ip_prefix": {
        "field": "client_ip",
        "prefix_length": 48,
        "is_ipv6": true,
        "append_prefix_length": true
      },
      "aggs": {
        "response_codes": {
          "terms": {
            "field": "response_code"
          }
        }
      }
    }
  }
}
```

## Python Query Helper

```python
def query_ipv6_subnet(es_client, index, subnet: str, hours: int = 24):
    """Query Elasticsearch for traffic from an IPv6 subnet."""
    query = {
        "query": {
            "bool": {
                "filter": [
                    {"term": {"client_ip": subnet}},
                    {"range": {"@timestamp": {"gte": f"now-{hours}h"}}}
                ]
            }
        },
        "aggs": {
            "unique_clients": {"cardinality": {"field": "client_ip"}},
            "total_bytes": {"sum": {"field": "bytes"}},
            "response_codes": {"terms": {"field": "response_code", "size": 10}}
        },
        "size": 0
    }
    resp = es_client.search(
        index=index,
        query=query["query"],
        aggs=query["aggs"],
        size=query["size"],
    )
    hits = resp["hits"]["total"]["value"]
    unique = resp["aggregations"]["unique_clients"]["value"]
    total_bytes = resp["aggregations"]["total_bytes"]["value"]
    print(f"Subnet {subnet}: {hits} requests from {unique} unique IPs, {total_bytes} bytes total")
    return resp

# Example
es = Elasticsearch("http://localhost:9200")
query_ipv6_subnet(es, "network-logs-*", "2001:db8::/32")
```

## Conclusion

Elasticsearch's native `ip` field type handles IPv6 addresses transparently, supporting both compressed and full notation, IPv4-mapped addresses, and CIDR range queries via `term` filters. Use index templates to enforce consistent mapping across rolling indices. CIDR queries with the `ip` field type are particularly useful for subnet-based filtering and avoid the extra complexity of scripted or keyword-based workarounds for large log volumes.
