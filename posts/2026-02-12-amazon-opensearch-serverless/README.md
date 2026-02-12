# How to Use Amazon OpenSearch Serverless

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, OpenSearch, Serverless, Search

Description: Learn how to set up and use Amazon OpenSearch Serverless for search and analytics workloads without managing cluster infrastructure or capacity planning.

---

Amazon OpenSearch Serverless takes away the operational overhead of running OpenSearch clusters. You don't pick instance types, you don't worry about shard counts, and you don't manage storage. You create a collection, define access policies, and start indexing data. OpenSearch Serverless handles scaling, patching, and availability automatically.

It's not the right fit for every use case - there are some differences from managed OpenSearch that matter - but for many search and log analytics workloads, it simplifies operations dramatically.

## Collections vs Clusters

The main conceptual shift is that OpenSearch Serverless uses "collections" instead of clusters. A collection is a group of indexes that share the same access policy and encryption settings. There are two types:

- **Search collections** - Optimized for full-text search with low-latency lookups
- **Time series collections** - Optimized for log analytics and time-based data with higher ingestion throughput

You pick the type when you create the collection, and it can't be changed later.

## Setting Up Security Policies

Before creating a collection, you need encryption and network policies. These are defined at the account level and matched to collections using patterns.

Here's the encryption policy:

```bash
# Create an encryption policy for all collections matching the pattern
# AWS-managed key is simpler; use customer-managed KMS for more control
aws opensearchserverless create-security-policy \
    --name "default-encryption" \
    --type "encryption" \
    --policy '{
        "Rules": [
            {
                "ResourceType": "collection",
                "Resource": ["collection/*"]
            }
        ],
        "AWSOwnedKey": true
    }'
```

Now the network policy, which controls whether the collection is accessible from the internet or only from specific VPCs:

```bash
# Network policy allowing public access to the collection endpoint
# For production, restrict to VPC endpoints instead
aws opensearchserverless create-security-policy \
    --name "public-access" \
    --type "network" \
    --policy '[
        {
            "Rules": [
                {
                    "ResourceType": "collection",
                    "Resource": ["collection/logs-*"]
                },
                {
                    "ResourceType": "dashboard",
                    "Resource": ["collection/logs-*"]
                }
            ],
            "AllowFromPublic": true
        }
    ]'
```

For VPC-only access:

```bash
# Restrict access to a specific VPC endpoint
aws opensearchserverless create-security-policy \
    --name "vpc-only-access" \
    --type "network" \
    --policy '[
        {
            "Rules": [
                {
                    "ResourceType": "collection",
                    "Resource": ["collection/production-*"]
                }
            ],
            "AllowFromPublic": false,
            "SourceVPCEs": ["vpce-0abc123def456789a"]
        }
    ]'
```

## Creating Data Access Policies

Data access policies control who can read and write to your indexes:

```bash
# Create a data access policy granting index and collection permissions
aws opensearchserverless create-access-policy \
    --name "app-data-access" \
    --type "data" \
    --policy '[
        {
            "Rules": [
                {
                    "ResourceType": "index",
                    "Resource": ["index/logs-collection/*"],
                    "Permission": [
                        "aoss:CreateIndex",
                        "aoss:UpdateIndex",
                        "aoss:DescribeIndex",
                        "aoss:ReadDocument",
                        "aoss:WriteDocument"
                    ]
                },
                {
                    "ResourceType": "collection",
                    "Resource": ["collection/logs-collection"],
                    "Permission": [
                        "aoss:CreateCollectionItems",
                        "aoss:DescribeCollectionItems",
                        "aoss:UpdateCollectionItems"
                    ]
                }
            ],
            "Principal": [
                "arn:aws:iam::123456789012:role/AppIngestionRole",
                "arn:aws:iam::123456789012:role/AnalyticsRole"
            ]
        }
    ]'
```

## Creating the Collection

With policies in place, creating the collection is straightforward:

```bash
# Create a time series collection for log data
aws opensearchserverless create-collection \
    --name "logs-collection" \
    --type "TIMESERIES" \
    --description "Application and infrastructure log analytics"

# Create a search collection for product catalog
aws opensearchserverless create-collection \
    --name "product-search" \
    --type "SEARCH" \
    --description "Product catalog full-text search"
```

It takes a few minutes for the collection to become active. You can check the status:

```bash
# Check collection status - wait for ACTIVE state
aws opensearchserverless batch-get-collection \
    --names "logs-collection"
```

## Indexing Data

Once the collection is active, you get an endpoint URL. You use it just like a regular OpenSearch endpoint, but with AWS Signature Version 4 authentication.

Here's a Python example for indexing documents:

```python
# Index documents into an OpenSearch Serverless collection
# Uses AWS SigV4 authentication instead of basic auth
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth

region = 'us-east-1'
service = 'aoss'

credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(
    credentials.access_key,
    credentials.secret_key,
    region,
    service,
    session_token=credentials.token
)

# The endpoint comes from the collection details
host = 'abc123.us-east-1.aoss.amazonaws.com'

client = OpenSearch(
    hosts=[{'host': host, 'port': 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection,
    timeout=300
)

# Create an index with mappings
index_body = {
    'settings': {
        'index': {
            'number_of_shards': 2,
            'number_of_replicas': 0
        }
    },
    'mappings': {
        'properties': {
            'timestamp': {'type': 'date'},
            'service': {'type': 'keyword'},
            'level': {'type': 'keyword'},
            'message': {'type': 'text'},
            'host': {'type': 'keyword'},
            'response_time_ms': {'type': 'float'}
        }
    }
}

client.indices.create(index='app-logs-2026-02', body=index_body)

# Index a document
document = {
    'timestamp': '2026-02-12T10:30:00Z',
    'service': 'api-gateway',
    'level': 'ERROR',
    'message': 'Connection timeout to downstream service',
    'host': 'api-gw-prod-3',
    'response_time_ms': 30000.0
}

response = client.index(
    index='app-logs-2026-02',
    body=document,
    refresh='wait_for'
)

print(f"Document indexed: {response['_id']}")
```

## Searching Data

Querying works the same as managed OpenSearch:

```python
# Search for error logs in the last hour with aggregations
search_body = {
    'size': 10,
    'query': {
        'bool': {
            'must': [
                {'match': {'level': 'ERROR'}},
                {'range': {
                    'timestamp': {
                        'gte': 'now-1h',
                        'lte': 'now'
                    }
                }}
            ]
        }
    },
    'aggs': {
        'errors_by_service': {
            'terms': {
                'field': 'service',
                'size': 10
            }
        },
        'error_timeline': {
            'date_histogram': {
                'field': 'timestamp',
                'fixed_interval': '5m'
            }
        }
    },
    'sort': [
        {'timestamp': {'order': 'desc'}}
    ]
}

results = client.search(index='app-logs-*', body=search_body)

for hit in results['hits']['hits']:
    print(f"{hit['_source']['timestamp']} [{hit['_source']['service']}] {hit['_source']['message']}")
```

## Key Differences from Managed OpenSearch

There are some things that work differently in OpenSearch Serverless:

1. **No cluster management** - You can't configure instance types, node counts, or shard settings at the cluster level
2. **OCU-based billing** - You pay for OpenSearch Compute Units (OCUs), which scale automatically. Minimum is 2 OCUs for indexing and 2 for search
3. **No multi-tenancy within a collection** - Each collection is isolated
4. **Limited plugin support** - Not all OpenSearch plugins are available
5. **SigV4 authentication only** - No basic auth or SAML (for the API; dashboards support SAML)

## Cost Considerations

The minimum cost for an OpenSearch Serverless collection is 4 OCUs (2 for indexing, 2 for search) running 24/7. At roughly $0.24 per OCU-hour, that's about $700/month minimum. This makes it more expensive than a small managed cluster for light workloads, but much cheaper when you'd otherwise need to over-provision for peak traffic.

You can set capacity limits to control costs:

```bash
# Set maximum OCU capacity to prevent runaway costs
aws opensearchserverless update-account-settings \
    --capacity-limits '{
        "maxIndexingCapacityInOCU": 10,
        "maxSearchCapacityInOCU": 10
    }'
```

OpenSearch Serverless is a great choice when you don't want to deal with cluster sizing, upgrades, and capacity planning. For adding alerting on top of your search and analytics data, check out [setting up OpenSearch alerting](https://oneuptime.com/blog/post/opensearch-alerting/view).
