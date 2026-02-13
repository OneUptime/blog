# How to Migrate from Self-Managed Elasticsearch to OpenSearch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, OpenSearch, Elasticsearch, Migration, Search

Description: A complete walkthrough for migrating your self-managed Elasticsearch cluster to Amazon OpenSearch, covering snapshot strategies, index compatibility, and client updates.

---

If you've been running your own Elasticsearch cluster, you already know the headaches: managing nodes, handling upgrades, tuning JVM settings, and hoping your cluster stays green during peak traffic. Amazon OpenSearch offers a managed alternative that takes a lot of that pain away, and the migration path is more straightforward than you'd expect.

This guide walks through the full migration from a self-managed Elasticsearch deployment to Amazon OpenSearch Service. We'll cover compatibility checks, snapshot-based migration, and the client-side changes you'll need to make.

## Before You Start: Compatibility Check

OpenSearch is a fork of Elasticsearch 7.10.2, so if you're running Elasticsearch 7.x or below, you're in a good position. If you're on Elasticsearch 8.x, some adjustments will be necessary since the APIs diverged after the fork.

Check your current Elasticsearch version first.

```bash
# Check your current Elasticsearch version
curl -s http://localhost:9200 | jq '.version.number'
```

You'll also want to audit your indices for compatibility. Some older mapping types and deprecated features won't transfer cleanly.

```bash
# List all indices and their settings
curl -s http://localhost:9200/_cat/indices?v&h=index,health,status,docs.count,store.size
```

## Step 1: Create Your OpenSearch Domain

Start by provisioning an OpenSearch domain in AWS. You can do this through the console, but here's the CLI approach for reproducibility.

```bash
# Create an OpenSearch domain with reasonable defaults
aws opensearch create-domain \
  --domain-name my-search-cluster \
  --engine-version OpenSearch_2.11 \
  --cluster-config \
    InstanceType=r6g.large.search,InstanceCount=3,DedicatedMasterEnabled=true,DedicatedMasterType=r6g.large.search,DedicatedMasterCount=3 \
  --ebs-options EBSEnabled=true,VolumeType=gp3,VolumeSize=100 \
  --access-policies '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::123456789012:root"},
      "Action": "es:*",
      "Resource": "arn:aws:es:us-east-1:123456789012:domain/my-search-cluster/*"
    }]
  }'
```

Wait for the domain to become active. This typically takes 15-20 minutes.

```bash
# Check domain status
aws opensearch describe-domain --domain-name my-search-cluster \
  --query 'DomainStatus.Processing'
```

## Step 2: Register an S3 Snapshot Repository

The most reliable migration method is snapshot and restore. You'll take a snapshot of your Elasticsearch cluster, push it to S3, then restore it in OpenSearch.

First, create an S3 bucket and an IAM role that OpenSearch can assume.

```bash
# Create the snapshot bucket
aws s3 mb s3://my-es-migration-snapshots --region us-east-1

# Create the IAM policy for snapshot access
cat > snapshot-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Action": [
      "s3:ListBucket"
    ],
    "Effect": "Allow",
    "Resource": "arn:aws:s3:::my-es-migration-snapshots"
  }, {
    "Action": [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject"
    ],
    "Effect": "Allow",
    "Resource": "arn:aws:s3:::my-es-migration-snapshots/*"
  }]
}
EOF
```

Now register the snapshot repository on your source Elasticsearch cluster. You'll need the `repository-s3` plugin installed.

```bash
# Register S3 repository on source Elasticsearch
curl -X PUT "http://localhost:9200/_snapshot/migration_repo" \
  -H 'Content-Type: application/json' -d '{
  "type": "s3",
  "settings": {
    "bucket": "my-es-migration-snapshots",
    "region": "us-east-1",
    "role_arn": "arn:aws:iam::123456789012:role/SnapshotRole"
  }
}'
```

## Step 3: Take the Snapshot

Take a snapshot of all indices you want to migrate. If you have system indices or indices you don't need, be selective.

```bash
# Snapshot specific indices
curl -X PUT "http://localhost:9200/_snapshot/migration_repo/migration_snapshot_1" \
  -H 'Content-Type: application/json' -d '{
  "indices": "my-app-logs-*,my-app-data-*",
  "ignore_unavailable": true,
  "include_global_state": false
}'

# Monitor snapshot progress
curl -s "http://localhost:9200/_snapshot/migration_repo/migration_snapshot_1/_status" | jq '.snapshots[0].state'
```

For large clusters, snapshots can take hours. The `include_global_state: false` flag skips cluster settings and templates, which you'll likely want to reconfigure for OpenSearch anyway.

## Step 4: Register the Repository in OpenSearch

Now register the same S3 bucket as a snapshot repository in your OpenSearch domain. This requires signing requests with AWS credentials.

```python
# register_repo.py - Register snapshot repo in OpenSearch
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

host = 'https://my-search-cluster.us-east-1.es.amazonaws.com'
path = '/_snapshot/migration_repo'

payload = {
    "type": "s3",
    "settings": {
        "bucket": "my-es-migration-snapshots",
        "region": "us-east-1",
        "role_arn": "arn:aws:iam::123456789012:role/SnapshotRole"
    }
}

response = requests.put(
    f"{host}{path}",
    auth=awsauth,
    json=payload,
    headers={"Content-Type": "application/json"}
)
print(response.text)
```

## Step 5: Restore the Snapshot

With the repository registered, restore your snapshot into OpenSearch.

```bash
# Restore the snapshot in OpenSearch
curl -X POST "https://my-search-cluster.us-east-1.es.amazonaws.com/_snapshot/migration_repo/migration_snapshot_1/_restore" \
  -H 'Content-Type: application/json' -d '{
  "indices": "my-app-logs-*,my-app-data-*",
  "ignore_unavailable": true,
  "include_global_state": false
}'

# Check restore progress
curl -s "https://my-search-cluster.us-east-1.es.amazonaws.com/_cat/recovery?v&active_only=true"
```

## Step 6: Update Your Application Clients

This is where many teams stumble. You need to update your application code to point to OpenSearch and use compatible clients.

If you're using the official Elasticsearch Python client, switch to the OpenSearch Python client.

```python
# Before: Elasticsearch client
# from elasticsearch import Elasticsearch
# es = Elasticsearch(['http://localhost:9200'])

# After: OpenSearch client
from opensearchpy import OpenSearch

client = OpenSearch(
    hosts=[{'host': 'my-search-cluster.us-east-1.es.amazonaws.com', 'port': 443}],
    http_auth=('master_user', 'Master_Password1!'),
    use_ssl=True,
    verify_certs=True,
    ssl_show_warn=False
)

# The query API is nearly identical
results = client.search(
    index='my-app-data-*',
    body={
        'query': {
            'match': {
                'title': 'migration guide'
            }
        }
    }
)
```

For Node.js applications, the change is similar.

```javascript
// Before: @elastic/elasticsearch
// const { Client } = require('@elastic/elasticsearch');

// After: @opensearch-project/opensearch
const { Client } = require('@opensearch-project/opensearch');

const client = new Client({
  node: 'https://my-search-cluster.us-east-1.es.amazonaws.com',
  auth: {
    username: 'master_user',
    password: 'Master_Password1!'
  }
});

// Search API remains the same
const result = await client.search({
  index: 'my-app-data-*',
  body: {
    query: {
      match: { title: 'migration guide' }
    }
  }
});
```

## Handling Index Templates

Your existing index templates need to be recreated in OpenSearch. Export them from Elasticsearch and apply them to your new cluster.

```bash
# Export all index templates from Elasticsearch
curl -s "http://localhost:9200/_index_template/*" | jq '.' > templates.json

# You may need to adjust templates for OpenSearch compatibility
# Then apply them to OpenSearch
curl -X PUT "https://my-search-cluster.us-east-1.es.amazonaws.com/_index_template/my_template" \
  -H 'Content-Type: application/json' -d @template_fixed.json
```

## Monitoring After Migration

Once migration is complete, you'll want to keep a close eye on cluster health. OpenSearch integrates with CloudWatch for metrics, but you should also set up proper monitoring for your search endpoints. For application-level monitoring of your search latency and availability, consider setting up [uptime monitoring](https://oneuptime.com/blog/post/2026-02-12-set-up-cloudwatch-alarms-for-ec2-cpu-and-memory/view) to catch issues before your users do.

```bash
# Quick health check
curl -s "https://my-search-cluster.us-east-1.es.amazonaws.com/_cluster/health" | jq '.'

# Check shard allocation
curl -s "https://my-search-cluster.us-east-1.es.amazonaws.com/_cat/shards?v&h=index,shard,prirep,state,docs,store,node"
```

## Common Pitfalls

A few things that catch people off guard during this migration:

- **Security plugin differences**: OpenSearch uses its own security plugin instead of X-Pack. Your authentication and authorization setup will need reworking.
- **Plugin compatibility**: Not all Elasticsearch plugins have OpenSearch equivalents. Check your plugin list before committing to the migration.
- **Kibana vs OpenSearch Dashboards**: If you're using Kibana, you'll switch to OpenSearch Dashboards. Saved objects can usually be exported and imported, but some visualizations may need tweaking.
- **Scroll API changes**: If your application uses the scroll API heavily, test thoroughly. There are subtle behavior differences in some edge cases.

The migration itself isn't the hard part - it's the testing afterward. Run your full test suite against the new cluster, compare query results between old and new, and do a gradual traffic cutover rather than a big-bang switch. Your future self will thank you.
