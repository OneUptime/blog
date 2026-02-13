# How to Migrate from Self-Hosted Elasticsearch to OpenSearch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, OpenSearch, Elasticsearch, Migration, Search, Logging

Description: Learn how to migrate from self-hosted Elasticsearch to Amazon OpenSearch Service using snapshots, reindexing, and rolling migration strategies.

---

Self-hosted Elasticsearch clusters demand constant operational attention - JVM tuning, shard management, cluster upgrades, disk management, and security configuration. Amazon OpenSearch Service (the AWS-managed successor to Elasticsearch Service) handles all of this for you. The migration is straightforward for most use cases since OpenSearch maintains compatibility with Elasticsearch APIs.

This guide covers the migration from self-hosted Elasticsearch to Amazon OpenSearch Service.

## Compatibility Check

Before migrating, verify your Elasticsearch version is compatible:

| Source Elasticsearch Version | Target OpenSearch Version | Migration Path |
|---|---|---|
| 6.x | OpenSearch 1.x | Snapshot/restore or reindex |
| 7.0-7.10 | OpenSearch 1.x or 2.x | Snapshot/restore (preferred) |
| 7.11+ | OpenSearch 2.x | Reindex (license changes affect compatibility) |
| 8.x | OpenSearch 2.x | Reindex with mapping adjustments |

```bash
# Check your current Elasticsearch version
curl -s http://elasticsearch-host:9200/ | jq '.version.number'

# Check index compatibility
curl -s http://elasticsearch-host:9200/_cat/indices?v
```

## Setting Up the OpenSearch Domain

Create an OpenSearch domain sized to match your current cluster:

```python
# Create OpenSearch domain
import boto3

opensearch = boto3.client('opensearch')

response = opensearch.create_domain(
    DomainName='migrated-search',
    EngineVersion='OpenSearch_2.11',
    ClusterConfig={
        'InstanceType': 'r6g.large.search',
        'InstanceCount': 3,
        'DedicatedMasterEnabled': True,
        'DedicatedMasterType': 'r6g.large.search',
        'DedicatedMasterCount': 3,
        'ZoneAwarenessEnabled': True,
        'ZoneAwarenessConfig': {
            'AvailabilityZoneCount': 3
        },
        'WarmEnabled': False  # Enable if you need UltraWarm for older data
    },
    EBSOptions={
        'EBSEnabled': True,
        'VolumeType': 'gp3',
        'VolumeSize': 200,
        'Iops': 3000,
        'Throughput': 125
    },
    AccessPolicies='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"*"},"Action":"es:*","Resource":"arn:aws:es:us-east-1:123456789:domain/migrated-search/*"}]}',
    EncryptionAtRestOptions={'Enabled': True},
    NodeToNodeEncryptionOptions={'Enabled': True},
    DomainEndpointOptions={
        'EnforceHTTPS': True,
        'TLSSecurityPolicy': 'Policy-Min-TLS-1-2-PF-2023-10'
    },
    AdvancedSecurityOptions={
        'Enabled': True,
        'InternalUserDatabaseEnabled': True,
        'MasterUserOptions': {
            'MasterUserName': 'admin',
            'MasterUserPassword': 'SecurePassword123!'
        }
    }
)
```

## Migration Option 1: Snapshot and Restore (Recommended)

This is the fastest and most reliable method for compatible versions.

### Register a Snapshot Repository on Source

```bash
# Register S3 snapshot repository on your self-hosted cluster
curl -X PUT "http://elasticsearch-host:9200/_snapshot/migration-repo" \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "s3",
    "settings": {
      "bucket": "elasticsearch-migration-snapshots",
      "region": "us-east-1",
      "role_arn": "arn:aws:iam::123456789:role/ElasticsearchSnapshotRole"
    }
  }'
```

You need the `repository-s3` plugin installed on your self-hosted Elasticsearch cluster for this to work.

### Take a Snapshot

```bash
# Create a snapshot of all indices
curl -X PUT "http://elasticsearch-host:9200/_snapshot/migration-repo/migration-snapshot-1" \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "*",
    "ignore_unavailable": true,
    "include_global_state": false
  }'

# Monitor snapshot progress
curl -s "http://elasticsearch-host:9200/_snapshot/migration-repo/migration-snapshot-1/_status" | jq '.'
```

### Register the Same Repository on OpenSearch

```python
# Register the S3 repository on OpenSearch
import boto3
import requests
from requests_aws4auth import AWS4Auth

region = 'us-east-1'
service = 'es'
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(
    credentials.access_key,
    credentials.secret_key,
    region,
    service,
    session_token=credentials.token
)

host = 'https://migrated-search.us-east-1.es.amazonaws.com'

# Register snapshot repository
url = f'{host}/_snapshot/migration-repo'
payload = {
    "type": "s3",
    "settings": {
        "bucket": "elasticsearch-migration-snapshots",
        "region": "us-east-1",
        "role_arn": "arn:aws:iam::123456789:role/OpenSearchSnapshotRole"
    }
}

response = requests.put(url, auth=awsauth, json=payload)
print(response.json())
```

### Restore the Snapshot

```bash
# Restore snapshot on OpenSearch
curl -X POST "https://admin:password@migrated-search.us-east-1.es.amazonaws.com/_snapshot/migration-repo/migration-snapshot-1/_restore" \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "*",
    "ignore_unavailable": true,
    "include_global_state": false
  }'

# Monitor restore progress
curl -s "https://admin:password@migrated-search.us-east-1.es.amazonaws.com/_cat/recovery?v&active_only=true"
```

## Migration Option 2: Reindex from Remote

For version mismatches or when you need to transform data during migration, use the remote reindex API.

### Configure OpenSearch to Allow Remote Reindex

Add your source cluster to the OpenSearch domain's reindex allowlist:

```python
# Update OpenSearch domain to allow remote reindex
opensearch.update_domain_config(
    DomainName='migrated-search',
    AdvancedOptions={
        'rest.action.multi.allow_explicit_index': 'true'
    }
)
```

### Run the Reindex

```bash
# Reindex from self-hosted Elasticsearch to OpenSearch
curl -X POST "https://admin:password@migrated-search.us-east-1.es.amazonaws.com/_reindex" \
  -H 'Content-Type: application/json' \
  -d '{
    "source": {
      "remote": {
        "host": "http://elasticsearch-host:9200",
        "username": "elastic",
        "password": "password"
      },
      "index": "my-index",
      "query": {
        "match_all": {}
      }
    },
    "dest": {
      "index": "my-index"
    }
  }'
```

For large indices, use slicing for parallel reindex:

```bash
# Parallel reindex using slicing
curl -X POST "https://admin:password@migrated-search.us-east-1.es.amazonaws.com/_reindex?wait_for_completion=false" \
  -H 'Content-Type: application/json' \
  -d '{
    "source": {
      "remote": {
        "host": "http://elasticsearch-host:9200"
      },
      "index": "large-index",
      "slice": {
        "id": 0,
        "max": 5
      }
    },
    "dest": {
      "index": "large-index"
    }
  }'
```

Run multiple slices in parallel for faster migration.

## Migration Option 3: Logstash Pipeline

For ongoing data streams (like log data), use Logstash to dual-write to both clusters during migration:

```ruby
# logstash-migration.conf
input {
  elasticsearch {
    hosts => ["http://elasticsearch-host:9200"]
    index => "logs-*"
    query => '{ "query": { "range": { "@timestamp": { "gte": "now-30d" } } } }'
    scroll => "5m"
    size => 1000
  }
}

output {
  opensearch {
    hosts => ["https://migrated-search.us-east-1.es.amazonaws.com:443"]
    user => "admin"
    password => "SecurePassword123!"
    ssl => true
    index => "%{[@metadata][_index]}"
    document_id => "%{[@metadata][_id]}"
  }
}
```

For new incoming data, configure your log shippers (Fluentd, Filebeat, etc.) to write to both clusters:

```yaml
# Filebeat dual output configuration
output.elasticsearch:
  hosts: ["http://elasticsearch-host:9200"]

# Add OpenSearch output
output.logstash:
  hosts: ["logstash-host:5044"]
```

## Handling Index Templates and Aliases

Migrate your index templates and aliases:

```python
# Export templates from source
import requests

# Get all templates from source
templates = requests.get('http://elasticsearch-host:9200/_index_template/*').json()

# Create templates on OpenSearch
for template in templates.get('index_templates', []):
    name = template['name']
    body = template['index_template']

    requests.put(
        f'https://admin:password@migrated-search.us-east-1.es.amazonaws.com/_index_template/{name}',
        json=body
    )
    print(f"Created template: {name}")

# Migrate aliases
aliases = requests.get('http://elasticsearch-host:9200/_aliases').json()
for index, alias_config in aliases.items():
    for alias_name, alias_body in alias_config.get('aliases', {}).items():
        requests.post(
            'https://admin:password@migrated-search.us-east-1.es.amazonaws.com/_aliases',
            json={
                'actions': [{'add': {'index': index, 'alias': alias_name, **alias_body}}]
            }
        )
```

## Validation

After migration, validate your data:

```python
# Validate document counts across all indices
import requests

source_url = 'http://elasticsearch-host:9200'
target_url = 'https://admin:password@migrated-search.us-east-1.es.amazonaws.com'

# Get index stats from both
source_stats = requests.get(f'{source_url}/_cat/indices?format=json').json()
target_stats = requests.get(f'{target_url}/_cat/indices?format=json').json()

source_counts = {idx['index']: idx['docs.count'] for idx in source_stats if not idx['index'].startswith('.')}
target_counts = {idx['index']: idx['docs.count'] for idx in target_stats if not idx['index'].startswith('.')}

for index in sorted(source_counts.keys()):
    source = source_counts.get(index, '0')
    target = target_counts.get(index, '0')
    match = 'OK' if source == target else 'MISMATCH'
    print(f"{index}: source={source}, target={target} [{match}]")
```

## Updating Client Applications

Update your application's Elasticsearch client to connect to OpenSearch:

```python
# Before (Elasticsearch client)
# from elasticsearch import Elasticsearch
# client = Elasticsearch(['http://elasticsearch-host:9200'])

# After (OpenSearch client)
from opensearchpy import OpenSearch
client = OpenSearch(
    hosts=[{'host': 'migrated-search.us-east-1.es.amazonaws.com', 'port': 443}],
    http_auth=('admin', 'SecurePassword123!'),
    use_ssl=True,
    verify_certs=True
)
```

The OpenSearch client is API-compatible with the Elasticsearch client for most operations, so code changes are minimal.

## Monitoring Your OpenSearch Domain

OpenSearch publishes metrics to CloudWatch. For comprehensive search infrastructure monitoring, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-12-build-a-custom-search-engine-with-amazon-opensearch/view) for deeper insights into search performance and availability.

## Wrapping Up

Migrating from self-hosted Elasticsearch to OpenSearch is mostly a data migration problem. The snapshot/restore method is fastest and most reliable for compatible versions. For version mismatches, reindex from remote handles the translation. For streaming data like logs, dual-write during the transition period ensures you do not miss anything. The API compatibility between Elasticsearch and OpenSearch means your application changes are minimal - usually just updating the connection configuration and swapping the client library.
