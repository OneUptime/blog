# How to Set Up Amazon OpenSearch Service Domains

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, OpenSearch, Elasticsearch, Search, Logging

Description: Complete guide to creating and configuring Amazon OpenSearch Service domains for search, logging, and analytics workloads with production-ready settings.

---

Amazon OpenSearch Service (the successor to Amazon Elasticsearch Service) gives you a managed search and analytics engine. Whether you're building full-text search for your application, a log analytics platform, or a real-time monitoring dashboard, OpenSearch handles the cluster management while you focus on indexing and querying data.

Setting up a domain isn't just clicking "create" though. The choices you make during setup - instance types, storage, networking, and access policies - directly determine your cluster's performance, security, and cost. Let's get it right from the start.

## Choosing Your Configuration

Before creating a domain, plan your cluster based on your workload:

- **Log analytics** - Typically write-heavy, needs lots of storage, can tolerate some latency
- **Application search** - Read-heavy, needs fast queries, moderate storage
- **Real-time dashboards** - Balanced read/write, needs consistent low latency

Quick sizing guide:

| Workload | Recommended Instance | Storage per Node |
|----------|---------------------|-----------------|
| Dev/test | t3.small.search | 10-100 GB |
| Small production | r6g.large.search | 500 GB |
| Medium production | r6g.xlarge.search | 1-2 TB |
| Large production | r6g.2xlarge.search | 2-4 TB |

A common rule of thumb: plan for each node to handle 30-50 GB of data (after accounting for replicas and overhead). More memory means more data cached and faster queries.

## Creating a Basic Domain

This creates a production-grade OpenSearch domain in a VPC with encryption and fine-grained access control.

```bash
aws opensearch create-domain \
  --domain-name my-search-domain \
  --engine-version OpenSearch_2.11 \
  --cluster-config '{
    "InstanceType": "r6g.large.search",
    "InstanceCount": 3,
    "DedicatedMasterEnabled": true,
    "DedicatedMasterType": "m6g.large.search",
    "DedicatedMasterCount": 3,
    "ZoneAwarenessEnabled": true,
    "ZoneAwarenessConfig": {
      "AvailabilityZoneCount": 3
    },
    "WarmEnabled": false
  }' \
  --ebs-options '{
    "EBSEnabled": true,
    "VolumeType": "gp3",
    "VolumeSize": 500,
    "Iops": 3000,
    "Throughput": 125
  }' \
  --vpc-options '{
    "SubnetIds": ["subnet-az1-abc", "subnet-az2-def", "subnet-az3-ghi"],
    "SecurityGroupIds": ["sg-opensearch"]
  }' \
  --encryption-at-rest-options '{
    "Enabled": true,
    "KmsKeyId": "arn:aws:kms:us-east-1:123456789:key/my-key"
  }' \
  --node-to-node-encryption-options '{
    "Enabled": true
  }' \
  --domain-endpoint-options '{
    "EnforceHTTPS": true,
    "TLSSecurityPolicy": "Policy-Min-TLS-1-2-PFS-2023-10"
  }' \
  --advanced-security-options '{
    "Enabled": true,
    "InternalUserDatabaseEnabled": true,
    "MasterUserOptions": {
      "MasterUserName": "admin",
      "MasterUserPassword": "Admin$ecure123!"
    }
  }'
```

Let's unpack the important choices:

- **3 data nodes across 3 AZs** - Provides high availability. If one AZ goes down, the cluster stays healthy.
- **3 dedicated master nodes** - Separate the master role from data nodes. Critical for cluster stability.
- **gp3 EBS volumes** - Better performance-per-dollar than gp2. You can tune IOPS and throughput independently.
- **Fine-grained access control** - Enables role-based access at the index and field level.

## VPC vs Public Access

For production, always use VPC access. Public endpoints expose your domain to the internet (even with access policies, it's an unnecessary risk).

If you do need external access (for Kibana/Dashboards), set up a VPN or use a reverse proxy, or use AWS Cognito for authentication.

## Access Policies

If using VPC access, a simple identity-based policy works well.

This access policy allows the OpenSearch admin role and the application role to access the domain.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::123456789:role/OpenSearchAdmin",
          "arn:aws:iam::123456789:role/ApplicationRole"
        ]
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:us-east-1:123456789:domain/my-search-domain/*"
    }
  ]
}
```

Apply it:

```bash
aws opensearch update-domain-config \
  --domain-name my-search-domain \
  --access-policies '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {"AWS": "arn:aws:iam::123456789:role/OpenSearchAdmin"},
        "Action": "es:*",
        "Resource": "arn:aws:es:us-east-1:123456789:domain/my-search-domain/*"
      }
    ]
  }'
```

## UltraWarm and Cold Storage

For log analytics workloads, UltraWarm and cold storage dramatically reduce costs for older data.

- **Hot storage** - EBS-backed, fastest queries, most expensive
- **UltraWarm** - S3-backed, good query performance, 50-80% cheaper
- **Cold storage** - S3-backed, slowest (needs to be warmed up before querying), cheapest

Enable UltraWarm when creating the domain.

```bash
aws opensearch update-domain-config \
  --domain-name my-search-domain \
  --cluster-config '{
    "InstanceType": "r6g.large.search",
    "InstanceCount": 3,
    "DedicatedMasterEnabled": true,
    "DedicatedMasterType": "m6g.large.search",
    "DedicatedMasterCount": 3,
    "ZoneAwarenessEnabled": true,
    "WarmEnabled": true,
    "WarmType": "ultrawarm1.medium.search",
    "WarmCount": 2,
    "ColdStorageOptions": {
      "Enabled": true
    }
  }'
```

## Index State Management (ISM)

ISM automatically moves indices through lifecycle stages. This is essential for managing storage costs.

This ISM policy moves indices to warm storage after 7 days and deletes them after 90 days.

```bash
curl -XPUT "https://vpc-my-search-domain.us-east-1.es.amazonaws.com/_plugins/_ism/policies/log-lifecycle" \
  -H "Content-Type: application/json" \
  -u admin:Admin\$ecure123! \
  -d '{
    "policy": {
      "description": "Log index lifecycle management",
      "default_state": "hot",
      "states": [
        {
          "name": "hot",
          "actions": [
            {
              "rollover": {
                "min_index_age": "1d",
                "min_primary_shard_size": "30gb"
              }
            }
          ],
          "transitions": [
            {
              "state_name": "warm",
              "conditions": {
                "min_index_age": "7d"
              }
            }
          ]
        },
        {
          "name": "warm",
          "actions": [
            {
              "warm_migration": {}
            },
            {
              "force_merge": {
                "max_num_segments": 1
              }
            }
          ],
          "transitions": [
            {
              "state_name": "cold",
              "conditions": {
                "min_index_age": "30d"
              }
            }
          ]
        },
        {
          "name": "cold",
          "actions": [
            {
              "cold_migration": {
                "timestamp_field": "@timestamp"
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
        "index_patterns": ["logs-*"],
        "priority": 100
      }
    }
  }'
```

## Index Templates

Create index templates to standardize settings across all new indices.

```bash
curl -XPUT "https://vpc-my-search-domain.us-east-1.es.amazonaws.com/_index_template/logs-template" \
  -H "Content-Type: application/json" \
  -u admin:Admin\$ecure123! \
  -d '{
    "index_patterns": ["logs-*"],
    "template": {
      "settings": {
        "number_of_shards": 3,
        "number_of_replicas": 1,
        "index.refresh_interval": "30s",
        "index.translog.durability": "async",
        "index.translog.sync_interval": "30s"
      },
      "mappings": {
        "properties": {
          "@timestamp": {"type": "date"},
          "level": {"type": "keyword"},
          "service": {"type": "keyword"},
          "message": {"type": "text"},
          "host": {"type": "keyword"},
          "trace_id": {"type": "keyword"}
        }
      }
    }
  }'
```

## Monitoring the Domain

OpenSearch publishes many metrics to CloudWatch. Set up alarms on the critical ones.

```bash
# Alert on cluster health
aws cloudwatch put-metric-alarm \
  --alarm-name opensearch-cluster-red \
  --metric-name ClusterStatus.red \
  --namespace AWS/ES \
  --statistic Maximum \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --dimensions Name=DomainName,Value=my-search-domain Name=ClientId,Value=123456789 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:critical-alerts

# Alert on low storage
aws cloudwatch put-metric-alarm \
  --alarm-name opensearch-low-storage \
  --metric-name FreeStorageSpace \
  --namespace AWS/ES \
  --statistic Minimum \
  --period 300 \
  --threshold 25000 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DomainName,Value=my-search-domain Name=ClientId,Value=123456789 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts
```

Key metrics to watch:

| Metric | What It Means | Alert When |
|--------|--------------|------------|
| ClusterStatus.red | Primary shards unassigned | > 0 |
| ClusterStatus.yellow | Replica shards unassigned | > 0 for extended time |
| FreeStorageSpace | Available disk space | < 25% of total |
| JVMMemoryPressure | Memory usage percentage | > 80% |
| CPUUtilization | CPU usage | > 80% sustained |
| SearchLatency | Query response time | > your SLA threshold |

## CloudFormation Template

For repeatable deployments, use CloudFormation.

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  OpenSearchDomain:
    Type: AWS::OpenSearchService::Domain
    Properties:
      DomainName: my-search-domain
      EngineVersion: OpenSearch_2.11
      ClusterConfig:
        InstanceType: r6g.large.search
        InstanceCount: 3
        DedicatedMasterEnabled: true
        DedicatedMasterType: m6g.large.search
        DedicatedMasterCount: 3
        ZoneAwarenessEnabled: true
        ZoneAwarenessConfig:
          AvailabilityZoneCount: 3
      EBSOptions:
        EBSEnabled: true
        VolumeType: gp3
        VolumeSize: 500
        Iops: 3000
        Throughput: 125
      EncryptionAtRestOptions:
        Enabled: true
      NodeToNodeEncryptionOptions:
        Enabled: true
      DomainEndpointOptions:
        EnforceHTTPS: true
      AdvancedSecurityOptions:
        Enabled: true
        InternalUserDatabaseEnabled: true
        MasterUserOptions:
          MasterUserName: admin
          MasterUserPassword: !Ref AdminPassword
      VPCOptions:
        SubnetIds:
          - !Ref PrivateSubnet1
          - !Ref PrivateSubnet2
          - !Ref PrivateSubnet3
        SecurityGroupIds:
          - !Ref OpenSearchSecurityGroup
```

Once your domain is up, the next step is indexing data. Check out our guide on [indexing data into Amazon OpenSearch](https://oneuptime.com/blog/post/index-data-into-amazon-opensearch/view) and [using OpenSearch Dashboards for visualization](https://oneuptime.com/blog/post/opensearch-dashboards-for-visualization/view).

Getting the domain setup right is the foundation for everything else. Take the time to plan your instance types, storage, and network configuration - changing these later often requires a blue-green deployment, which means downtime and data migration.
