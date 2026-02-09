# How to Configure Elasticsearch Hot-Warm-Cold Architecture on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Kubernetes, Storage, Performance, Architecture

Description: Implement Elasticsearch hot-warm-cold architecture on Kubernetes to optimize storage costs and query performance by tiering data based on age and access patterns across different node types.

---

Elasticsearch hot-warm-cold architecture separates data across different hardware tiers based on age and access frequency. Hot nodes use fast SSD storage for recent, frequently queried data. Warm nodes use slower but cheaper storage for older data that's queried less often. Cold nodes provide the most economical storage for archived data rarely accessed. On Kubernetes, this architecture requires careful node labeling, pod affinity rules, and index lifecycle management.

## Understanding Data Tiering Strategy

Most log and time-series data follows a predictable access pattern. Recent data from the last few hours or days receives the majority of queries. This active data needs fast storage and powerful compute resources. Data from weeks ago gets occasional queries for historical analysis. Very old data is rarely accessed except for compliance or forensic investigations.

Without tiering, all data sits on expensive high-performance storage. A hot-warm-cold architecture moves data through progressively cheaper storage tiers as it ages, dramatically reducing infrastructure costs while maintaining acceptable query performance. The key is automating this movement so older data seamlessly transitions to appropriate tiers without manual intervention.

## Preparing Kubernetes Node Pools

Create distinct node pools for each tier with appropriate hardware characteristics. Hot nodes need fast CPUs, substantial memory, and SSD storage. Warm nodes can use moderate resources with HDD storage. Cold nodes prioritize storage capacity over performance.

For GKE:

```bash
# Create hot node pool with SSD
gcloud container node-pools create es-hot \
  --cluster=logging-cluster \
  --machine-type=n2-standard-8 \
  --disk-type=pd-ssd \
  --disk-size=500 \
  --num-nodes=3 \
  --node-labels=node-type=elasticsearch-hot,data-tier=hot

# Create warm node pool with balanced persistent disk
gcloud container node-pools create es-warm \
  --cluster=logging-cluster \
  --machine-type=n2-standard-4 \
  --disk-type=pd-balanced \
  --disk-size=2000 \
  --num-nodes=3 \
  --node-labels=node-type=elasticsearch-warm,data-tier=warm

# Create cold node pool with standard disk
gcloud container node-pools create es-cold \
  --cluster=logging-cluster \
  --machine-type=n2-standard-2 \
  --disk-type=pd-standard \
  --disk-size=4000 \
  --num-nodes=2 \
  --node-labels=node-type=elasticsearch-cold,data-tier=cold
```

For EKS:

```bash
# Create hot node group with io2 volumes
eksctl create nodegroup \
  --cluster=logging-cluster \
  --name=es-hot \
  --node-type=m5.2xlarge \
  --nodes=3 \
  --node-labels="node-type=elasticsearch-hot,data-tier=hot" \
  --node-volume-type=io2 \
  --node-volume-size=500

# Create warm node group with gp3 volumes
eksctl create nodegroup \
  --cluster=logging-cluster \
  --name=es-warm \
  --node-type=m5.xlarge \
  --nodes=3 \
  --node-labels="node-type=elasticsearch-warm,data-tier=warm" \
  --node-volume-type=gp3 \
  --node-volume-size=2000

# Create cold node group with st1 volumes
eksctl create nodegroup \
  --cluster=logging-cluster \
  --name=es-cold \
  --node-type=m5.large \
  --nodes=2 \
  --node-labels="node-type=elasticsearch-cold,data-tier=cold" \
  --node-volume-type=st1 \
  --node-volume-size=4000
```

## Deploying Hot Tier Elasticsearch Nodes

Create a StatefulSet for hot tier nodes with appropriate affinity rules:

```yaml
# es-hot-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch-hot
  namespace: logging
spec:
  serviceName: elasticsearch-hot
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
      tier: hot
  template:
    metadata:
      labels:
        app: elasticsearch
        tier: hot
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: data-tier
                operator: In
                values:
                - hot
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - elasticsearch
            topologyKey: kubernetes.io/hostname
      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
        env:
        - name: cluster.name
          value: "logging-cluster"
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: node.roles
          value: "master,data_hot,ingest"
        - name: node.attr.data_tier
          value: "hot"
        - name: discovery.seed_hosts
          value: "elasticsearch-hot-0.elasticsearch-hot,elasticsearch-hot-1.elasticsearch-hot,elasticsearch-hot-2.elasticsearch-hot"
        - name: cluster.initial_master_nodes
          value: "elasticsearch-hot-0,elasticsearch-hot-1,elasticsearch-hot-2"
        - name: ES_JAVA_OPTS
          value: "-Xms4g -Xmx4g"
        resources:
          requests:
            memory: "8Gi"
            cpu: "2000m"
          limits:
            memory: "8Gi"
            cpu: "4000m"
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 500Gi
```

## Deploying Warm and Cold Tier Nodes

Warm tier StatefulSet:

```yaml
# es-warm-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch-warm
  namespace: logging
spec:
  serviceName: elasticsearch-warm
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
      tier: warm
  template:
    metadata:
      labels:
        app: elasticsearch
        tier: warm
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: data-tier
                operator: In
                values:
                - warm
      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
        env:
        - name: node.roles
          value: "data_warm"
        - name: node.attr.data_tier
          value: "warm"
        - name: discovery.seed_hosts
          value: "elasticsearch-hot-0.elasticsearch-hot"
        - name: ES_JAVA_OPTS
          value: "-Xms2g -Xmx2g"
        resources:
          requests:
            memory: "4Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: balanced-disk
      resources:
        requests:
          storage: 2Ti
```

Cold tier StatefulSet:

```yaml
# es-cold-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch-cold
  namespace: logging
spec:
  serviceName: elasticsearch-cold
  replicas: 2
  selector:
    matchLabels:
      app: elasticsearch
      tier: cold
  template:
    metadata:
      labels:
        app: elasticsearch
        tier: cold
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: data-tier
                operator: In
                values:
                - cold
      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
        env:
        - name: node.roles
          value: "data_cold"
        - name: node.attr.data_tier
          value: "cold"
        - name: discovery.seed_hosts
          value: "elasticsearch-hot-0.elasticsearch-hot"
        - name: ES_JAVA_OPTS
          value: "-Xms1g -Xmx1g"
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: slow-disk
      resources:
        requests:
          storage: 4Ti
```

Deploy all tiers:

```bash
kubectl apply -f es-hot-statefulset.yaml
kubectl apply -f es-warm-statefulset.yaml
kubectl apply -f es-cold-statefulset.yaml
```

## Configuring Index Lifecycle Management

ILM automates data movement between tiers. Create a policy that transitions indices through hot-warm-cold lifecycle:

```bash
# Create ILM policy
curl -X PUT "http://elasticsearch:9200/_ilm/policy/logs-lifecycle" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "50gb",
            "max_age": "1d"
          },
          "set_priority": {
            "priority": 100
          }
        }
      },
      "warm": {
        "min_age": "3d",
        "actions": {
          "allocate": {
            "require": {
              "data_tier": "warm"
            }
          },
          "forcemerge": {
            "max_num_segments": 1
          },
          "set_priority": {
            "priority": 50
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "allocate": {
            "require": {
              "data_tier": "cold"
            }
          },
          "searchable_snapshot": {
            "snapshot_repository": "cold-snapshots"
          },
          "set_priority": {
            "priority": 0
          }
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
'
```

This policy keeps new data on hot nodes, moves 3-day-old data to warm nodes with forcemerge optimization, transitions 30-day-old data to cold nodes as searchable snapshots, and deletes data after 90 days.

## Creating Index Templates with Data Tiers

Configure index templates to use the ILM policy:

```bash
# Create index template for application logs
curl -X PUT "http://elasticsearch:9200/_index_template/application-logs" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["application-logs-*"],
  "data_stream": {},
  "template": {
    "settings": {
      "index.lifecycle.name": "logs-lifecycle",
      "index.lifecycle.rollover_alias": "application-logs",
      "index.routing.allocation.require.data_tier": "hot",
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "refresh_interval": "5s"
    },
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "message": {
          "type": "text"
        },
        "log.level": {
          "type": "keyword"
        },
        "service.name": {
          "type": "keyword"
        }
      }
    }
  },
  "priority": 200
}
'
```

New indices created from this template start on hot nodes and automatically transition through tiers based on the ILM policy.

## Setting Up Snapshot Repository for Cold Tier

Cold tier often uses searchable snapshots for storage efficiency. Configure a snapshot repository:

```bash
# Create snapshot repository using S3
curl -X PUT "http://elasticsearch:9200/_snapshot/cold-snapshots" -H 'Content-Type: application/json' -d'
{
  "type": "s3",
  "settings": {
    "bucket": "elasticsearch-cold-snapshots",
    "region": "us-east-1",
    "base_path": "cold-tier",
    "compress": true,
    "max_restore_bytes_per_sec": "100mb",
    "max_snapshot_bytes_per_sec": "100mb"
  }
}
'
```

Configure Kubernetes secrets for AWS credentials:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: elasticsearch-s3-credentials
  namespace: logging
type: Opaque
stringData:
  aws_access_key_id: YOUR_ACCESS_KEY
  aws_secret_access_key: YOUR_SECRET_KEY
```

Mount these credentials in cold tier pods and configure the Elasticsearch keystore accordingly.

## Monitoring Data Distribution

Check which indices are on which tiers:

```bash
# View index allocation by tier
curl -X GET "http://elasticsearch:9200/_cat/shards?v&h=index,shard,prirep,state,node,disk.indices" | grep -E "hot|warm|cold"

# Check ILM explain for specific index
curl -X GET "http://elasticsearch:9200/application-logs-2024.02.01/_ilm/explain?pretty"

# View overall allocation statistics
curl -X GET "http://elasticsearch:9200/_cluster/allocation/explain?pretty"
```

Monitor tier capacity:

```bash
# Check disk usage per tier
kubectl exec -n logging elasticsearch-hot-0 -- df -h /usr/share/elasticsearch/data
kubectl exec -n logging elasticsearch-warm-0 -- df -h /usr/share/elasticsearch/data
kubectl exec -n logging elasticsearch-cold-0 -- df -h /usr/share/elasticsearch/data
```

Set up alerts for capacity thresholds:

```bash
# Create Elasticsearch alert for disk usage
curl -X PUT "http://elasticsearch:9200/_watcher/watch/disk-usage-alert" -H 'Content-Type: application/json' -d'
{
  "trigger": {
    "schedule": {
      "interval": "5m"
    }
  },
  "input": {
    "http": {
      "request": {
        "host": "localhost",
        "port": 9200,
        "path": "/_nodes/stats/fs"
      }
    }
  },
  "condition": {
    "script": {
      "source": "return ctx.payload.nodes.values().stream().anyMatch(node -> node.fs.total.available_in_bytes < 50000000000L)"
    }
  },
  "actions": {
    "log_alert": {
      "logging": {
        "text": "Low disk space on Elasticsearch node"
      }
    }
  }
}
'
```

## Performance Optimization

Tune shard allocation settings per tier:

```bash
# Optimize hot tier for indexing performance
curl -X PUT "http://elasticsearch:9200/application-logs-2024.02.09/_settings" -H 'Content-Type: application/json' -d'
{
  "index": {
    "refresh_interval": "5s",
    "translog.durability": "async",
    "translog.sync_interval": "5s"
  }
}
'

# Optimize warm tier for search performance
curl -X PUT "http://elasticsearch:9200/application-logs-2024.01.01/_settings" -H 'Content-Type: application/json' -d'
{
  "index": {
    "refresh_interval": "30s",
    "codec": "best_compression"
  }
}
'
```

Configure query routing preferences:

```bash
# Prefer querying hot and warm tiers
curl -X GET "http://elasticsearch:9200/application-logs-*/_search?preference=_local" -H 'Content-Type: application/json' -d'
{
  "query": {
    "range": {
      "@timestamp": {
        "gte": "now-7d"
      }
    }
  }
}
'
```

## Conclusion

Hot-warm-cold architecture on Kubernetes optimizes Elasticsearch deployments by matching data storage costs to access patterns. By creating dedicated node pools, configuring proper pod affinity, and implementing ILM policies, you automate data lifecycle management while maintaining query performance. Start with clear tier definitions based on your data retention needs, then fine-tune transition timings based on actual query patterns. This architecture can reduce storage costs by 60-80% compared to keeping all data on hot tier storage.
