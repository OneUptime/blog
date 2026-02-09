# Implementing Hot-Warm-Cold Architecture for Elasticsearch on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Elasticsearch, Hot-Warm-Cold, Kubernetes, Data Lifecycle, Search

Description: A complete guide to deploying Elasticsearch with hot-warm-cold data tiers on Kubernetes for cost-effective data lifecycle management

---

Elasticsearch clusters that handle time-series data like logs, metrics, and traces face a fundamental tension between performance and cost. Recent data needs fast NVMe storage and powerful CPUs for real-time queries, while historical data is rarely accessed but must be retained for compliance or troubleshooting. The hot-warm-cold architecture addresses this by tiering data across different node types with varying hardware profiles. On Kubernetes, this architecture maps naturally to node pools with different instance types and storage classes, giving you fine-grained control over both performance and cost.

## Understanding Data Tiers

The hot-warm-cold architecture divides Elasticsearch nodes into three tiers based on data age and access patterns:

**Hot tier**: Handles all indexing (writes) and serves the most recent, frequently queried data. These nodes use fast NVMe SSDs, high CPU counts, and generous memory. Data typically stays on hot nodes for hours to a few days.

**Warm tier**: Stores data that is still occasionally queried but no longer being written to. These nodes use slower but cheaper SSD storage with moderate CPU and memory. Data resides on warm nodes for days to weeks.

**Cold tier**: Holds data that is rarely accessed but must be retained. These nodes can use the cheapest available storage, including HDD or network-attached volumes. Data stays on cold nodes for weeks to months before being deleted or archived.

## Kubernetes Node Pool Setup

Create dedicated Kubernetes node pools for each tier. On AWS EKS:

```bash
# Hot tier node pool - high performance
eksctl create nodegroup \
  --cluster=elasticsearch-cluster \
  --name=es-hot \
  --node-type=i3en.2xlarge \
  --nodes=3 \
  --nodes-min=3 \
  --nodes-max=6 \
  --node-labels="elasticsearch.tier=hot" \
  --node-taints="elasticsearch.tier=hot:NoSchedule"

# Warm tier node pool - balanced
eksctl create nodegroup \
  --cluster=elasticsearch-cluster \
  --name=es-warm \
  --node-type=r6g.2xlarge \
  --nodes=3 \
  --nodes-min=3 \
  --nodes-max=9 \
  --node-labels="elasticsearch.tier=warm" \
  --node-taints="elasticsearch.tier=warm:NoSchedule"

# Cold tier node pool - cost optimized
eksctl create nodegroup \
  --cluster=elasticsearch-cluster \
  --name=es-cold \
  --node-type=r6g.xlarge \
  --nodes=2 \
  --nodes-min=2 \
  --nodes-max=6 \
  --node-labels="elasticsearch.tier=cold" \
  --node-taints="elasticsearch.tier=cold:NoSchedule"
```

## Deploying Elasticsearch with the ECK Operator

The Elastic Cloud on Kubernetes (ECK) operator simplifies Elasticsearch deployment. Install it first:

```bash
kubectl create -f https://download.elastic.co/downloads/eck/2.12.0/crds.yaml
kubectl apply -f https://download.elastic.co/downloads/eck/2.12.0/operator.yaml
```

Now deploy an Elasticsearch cluster with tiered node sets:

```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: production
  namespace: elasticsearch
spec:
  version: 8.12.0
  nodeSets:
    # Master nodes - dedicated for cluster management
    - name: master
      count: 3
      config:
        node.roles: ["master"]
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  memory: 4Gi
                  cpu: 2
                limits:
                  memory: 4Gi
                  cpu: 2
          affinity:
            nodeAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                nodeSelectorTerms:
                  - matchExpressions:
                      - key: elasticsearch.tier
                        operator: In
                        values: ["hot"]
          tolerations:
            - key: elasticsearch.tier
              value: "hot"
              effect: NoSchedule
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: gp3
            resources:
              requests:
                storage: 10Gi

    # Hot data nodes
    - name: hot
      count: 3
      config:
        node.roles: ["data_hot", "data_content", "ingest"]
        node.attr.data_tier: hot
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  memory: 32Gi
                  cpu: 8
                limits:
                  memory: 32Gi
                  cpu: 8
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms16g -Xmx16g"
          affinity:
            nodeAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                nodeSelectorTerms:
                  - matchExpressions:
                      - key: elasticsearch.tier
                        operator: In
                        values: ["hot"]
          tolerations:
            - key: elasticsearch.tier
              value: "hot"
              effect: NoSchedule
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: io2-nvme
            resources:
              requests:
                storage: 1000Gi

    # Warm data nodes
    - name: warm
      count: 3
      config:
        node.roles: ["data_warm"]
        node.attr.data_tier: warm
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  memory: 16Gi
                  cpu: 4
                limits:
                  memory: 16Gi
                  cpu: 4
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms8g -Xmx8g"
          affinity:
            nodeAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                nodeSelectorTerms:
                  - matchExpressions:
                      - key: elasticsearch.tier
                        operator: In
                        values: ["warm"]
          tolerations:
            - key: elasticsearch.tier
              value: "warm"
              effect: NoSchedule
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: gp3
            resources:
              requests:
                storage: 2000Gi

    # Cold data nodes
    - name: cold
      count: 2
      config:
        node.roles: ["data_cold"]
        node.attr.data_tier: cold
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  memory: 8Gi
                  cpu: 2
                limits:
                  memory: 8Gi
                  cpu: 2
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms4g -Xmx4g"
          affinity:
            nodeAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                nodeSelectorTerms:
                  - matchExpressions:
                      - key: elasticsearch.tier
                        operator: In
                        values: ["cold"]
          tolerations:
            - key: elasticsearch.tier
              value: "cold"
              effect: NoSchedule
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: sc1
            resources:
              requests:
                storage: 5000Gi
```

## Configuring Index Lifecycle Management

Index Lifecycle Management (ILM) policies automate data movement between tiers. Create an ILM policy that defines when data transitions:

```bash
# Create ILM policy via Elasticsearch API
curl -X PUT "https://elasticsearch-es-http:9200/_ilm/policy/logs-policy" \
  -H "Content-Type: application/json" \
  -u "elastic:${ES_PASSWORD}" \
  -d '{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_age": "1d",
            "max_primary_shard_size": "50gb"
          },
          "set_priority": {
            "priority": 100
          }
        }
      },
      "warm": {
        "min_age": "3d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          },
          "set_priority": {
            "priority": 50
          },
          "allocate": {
            "number_of_replicas": 1
          }
        }
      },
      "cold": {
        "min_age": "14d",
        "actions": {
          "set_priority": {
            "priority": 0
          },
          "allocate": {
            "number_of_replicas": 0
          },
          "freeze": {}
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
}'
```

## Creating Index Templates

Apply the ILM policy to new indices through an index template:

```bash
curl -X PUT "https://elasticsearch-es-http:9200/_index_template/logs-template" \
  -H "Content-Type: application/json" \
  -u "elastic:${ES_PASSWORD}" \
  -d '{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "index.lifecycle.name": "logs-policy",
      "index.lifecycle.rollover_alias": "logs",
      "index.number_of_shards": 3,
      "index.number_of_replicas": 1,
      "index.routing.allocation.include._tier_preference": "data_hot"
    }
  },
  "priority": 200
}'
```

Bootstrap the first index:

```bash
curl -X PUT "https://elasticsearch-es-http:9200/logs-000001" \
  -H "Content-Type: application/json" \
  -u "elastic:${ES_PASSWORD}" \
  -d '{
  "aliases": {
    "logs": {
      "is_write_index": true
    }
  }
}'
```

## Storage Class Configuration

Define Kubernetes storage classes that match each tier's performance requirements:

```yaml
# High-performance storage for hot tier
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: io2-nvme
provisioner: ebs.csi.aws.com
parameters:
  type: io2
  iopsPerGB: "50"
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# Balanced storage for warm tier
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# Cost-optimized storage for cold tier
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: sc1
provisioner: ebs.csi.aws.com
parameters:
  type: sc1
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## Monitoring Tier Health

Monitor the distribution of data across tiers:

```bash
# Check data tier allocation
curl -s "https://elasticsearch-es-http:9200/_cat/allocation?v&h=node,shards,disk.used,disk.avail,disk.percent" \
  -u "elastic:${ES_PASSWORD}"

# View indices by tier
curl -s "https://elasticsearch-es-http:9200/_cat/indices?v&h=index,pri,rep,store.size,status&s=index" \
  -u "elastic:${ES_PASSWORD}"

# Check ILM status for all indices
curl -s "https://elasticsearch-es-http:9200/logs-*/_ilm/explain" \
  -u "elastic:${ES_PASSWORD}" | jq '.indices | to_entries[] | {index: .key, phase: .value.phase, age: .value.age}'
```

Set up Prometheus monitoring for tier-level metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: elasticsearch-tier-alerts
spec:
  groups:
    - name: elasticsearch-tiers
      rules:
        - alert: HotTierDiskHigh
          expr: elasticsearch_filesystem_data_available_bytes{node_roles=~".*data_hot.*"} / elasticsearch_filesystem_data_size_bytes{node_roles=~".*data_hot.*"} < 0.2
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Hot tier disk usage above 80%"
        - alert: ILMPolicyError
          expr: elasticsearch_ilm_index_status{status="ERROR"} > 0
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "ILM policy execution error detected"
```

## Cost Optimization

The primary benefit of hot-warm-cold is cost reduction. Here is a typical cost comparison for 10TB of log data:

| Tier | Storage Type | Cost/GB/Month | Data Volume | Monthly Cost |
|------|-------------|--------------|-------------|-------------|
| Hot | io2 NVMe | $0.125 | 1 TB | $128 |
| Warm | gp3 | $0.08 | 3 TB | $245 |
| Cold | sc1 | $0.015 | 6 TB | $92 |
| **Total** | | | **10 TB** | **$465** |

Compare this to storing all 10TB on io2 NVMe at $1,280/month. The tiered approach saves over 60% on storage costs alone, with additional savings from using smaller instance types for warm and cold nodes.

## Conclusion

The hot-warm-cold architecture on Kubernetes gives you the performance of premium storage for active data while keeping costs manageable for historical data. The ECK operator makes deploying tiered Elasticsearch clusters straightforward, with node affinity and tolerations ensuring each tier lands on the appropriate hardware. ILM policies automate the entire data lifecycle from ingestion through deletion, requiring no manual intervention once configured. By matching your storage performance to actual access patterns, you can retain more data for longer periods without proportionally increasing costs. Start with a clear understanding of your data access patterns, size each tier accordingly, and let ILM handle the transitions automatically.
