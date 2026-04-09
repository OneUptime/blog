# How to Configure the ElasticSearch Sync Module for RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Elasticsearch, Sync

Description: Learn how to configure the Ceph RGW Elasticsearch sync module to automatically index object metadata for full-text search and analytics.

---

## Overview

The Ceph RGW Elasticsearch sync module indexes object metadata to an Elasticsearch cluster in real time as objects are written to or deleted from RGW. This enables full-text search over object names, custom metadata, and tags without requiring application-level indexing. The module operates in a secondary RGW zone that receives data from the primary zone.

## Step 1 - Set Up the Multisite Realm

```bash
# Create realm, zonegroup, and master zone if not already set up
radosgw-admin realm create --rgw-realm=myrealm
radosgw-admin zonegroup create --rgw-zonegroup=default \
  --master --default

radosgw-admin zone create --rgw-zonegroup=default \
  --rgw-zone=primary --master --default

# Create a sync user
radosgw-admin user create --uid=sync-user \
  --display-name="Sync User" --system

SYNC_ACCESS=$(radosgw-admin user info --uid=sync-user | jq -r '.keys[0].access_key')
SYNC_SECRET=$(radosgw-admin user info --uid=sync-user | jq -r '.keys[0].secret_key')
```

## Step 2 - Create the Elasticsearch Zone

```bash
# Create the Elasticsearch sync zone
radosgw-admin zone create \
  --rgw-zonegroup=default \
  --rgw-zone=elasticsearch-zone \
  --tier-type=elasticsearch \
  --access-key="${SYNC_ACCESS}" \
  --secret="${SYNC_SECRET}"

# Configure the Elasticsearch endpoint
radosgw-admin zone modify \
  --rgw-zone=elasticsearch-zone \
  --tier-config=endpoint=http://elasticsearch.logging.svc.cluster.local:9200,\
num_shards=16,\
num_replicas=1

# Update the period
radosgw-admin period update --commit
```

## Step 3 - Configure Advanced Elasticsearch Options

```bash
# Index all custom metadata as string type by default
radosgw-admin zone modify \
  --rgw-zone=elasticsearch-zone \
  --tier-config=explicit_custom_meta=false

# Restrict indexing to specific buckets (comma-separated)
radosgw-admin zone modify \
  --rgw-zone=elasticsearch-zone \
  --tier-config=index_buckets_list=bucket1,bucket2,bucket3

# Restrict indexing to specific bucket owners (comma-separated)
radosgw-admin zone modify \
  --rgw-zone=elasticsearch-zone \
  --tier-config=approved_owners_list=owner1,owner2
```

## Step 4 - Deploy the Elasticsearch Zone RGW

```yaml
# Deploy an RGW instance for the Elasticsearch sync zone
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: elasticsearch-sync-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 7481
    instances: 1
```

```bash
# Start RGW with the elasticsearch zone
radosgw --rgw-zone=elasticsearch-zone --rgw-zonegroup=default \
  --rgw-realm=myrealm -d --no-mon-config &
```

## Step 5 - Query Indexed Objects in Elasticsearch

```bash
# Search for objects by name pattern
curl -X GET "http://elasticsearch:9200/rgw-myrealm-*/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "bool": {
        "must": [
          {"wildcard": {"name": "report-*"}},
          {"range": {"lastmodified": {"gte": "now-7d"}}}
        ]
      }
    },
    "_source": ["name", "bucket", "owner", "size", "lastmodified", "etag"],
    "size": 100
  }'

# Search by custom metadata tag
curl -X GET "http://elasticsearch:9200/rgw-myrealm-*/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": {"x-amz-meta-project": "analytics"}
    }
  }'
```

## Step 6 - Monitor the Sync Module

```bash
# Check sync status for the Elasticsearch zone
radosgw-admin sync status --rgw-zone=elasticsearch-zone

# View sync errors
radosgw-admin sync error list --max-entries=20

# Check Elasticsearch index stats
curl "http://elasticsearch:9200/_cat/indices/rgw-*?v&s=index"

# Monitor sync lag
radosgw-admin sync status 2>&1 | grep -A10 "data sync"
```

## Summary

The Ceph RGW Elasticsearch sync module automatically indexes object metadata to Elasticsearch as objects are written, enabling full-text search across large object stores. Configuration requires creating a secondary zone with `tier-type=elasticsearch`, pointing it at the Elasticsearch endpoint, and optionally filtering which buckets and metadata fields are indexed. The sync operates asynchronously via the datalog, ensuring no write latency impact on the primary zone.
