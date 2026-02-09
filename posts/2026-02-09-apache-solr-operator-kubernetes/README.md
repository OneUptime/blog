# How to Deploy Apache Solr on Kubernetes Using the Solr Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Apache Solr, Search

Description: Deploy and manage Apache Solr search clusters on Kubernetes using the Solr Operator for scalable full-text search with automated operations and ZooKeeper coordination.

---

Apache Solr provides powerful full-text search capabilities for applications requiring complex queries, faceting, and analytics. The Solr Operator simplifies deploying Solr on Kubernetes by managing cluster configuration, scaling, and upgrades automatically. This guide walks you through deploying production-ready Solr clusters for enterprise search applications.

## Understanding Solr Architecture

Solr operates in SolrCloud mode for distributed deployments. Multiple Solr nodes form a cluster coordinated through ZooKeeper. Collections are logical indexes distributed across nodes as shards. Each shard can have replicas for high availability. This architecture scales horizontally by adding more nodes and distributing shards.

The operator manages the entire lifecycle including cluster bootstrapping, configuration updates, rolling restarts, and backup operations. It creates StatefulSets for Solr pods and handles ZooKeeper ensemble management.

## Installing the Solr Operator

Deploy the operator using Helm:

```bash
# Add Solr operator Helm repository
helm repo add apache-solr https://solr.apache.org/charts
helm repo update

# Install the operator
kubectl create namespace solr
helm install solr-operator apache-solr/solr-operator \
  --namespace solr-operator-system

# Verify installation
kubectl get pods -n solr-operator-system
```

The operator watches for SolrCloud custom resources and manages the underlying infrastructure.

## Deploying a Basic Solr Cluster

Create a simple three-node cluster:

```yaml
# solr-cloud.yaml
apiVersion: solr.apache.org/v1beta1
kind: SolrCloud
metadata:
  name: search-cluster
  namespace: solr
spec:
  replicas: 3
  solrImage:
    repository: solr
    tag: 9.4.0

  # ZooKeeper configuration
  zookeeperRef:
    provided:
      replicas: 3
      persistence:
        reclaimPolicy: Retain
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 5Gi

  # Storage for Solr data
  dataStorage:
    persistent:
      reclaimPolicy: Retain
      pvcTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 50Gi
          storageClassName: fast-ssd

  # Resource limits
  solrJavaMem: "-Xms2g -Xmx2g"
  customSolrKubeOptions:
    podOptions:
      resources:
        requests:
          cpu: 1
          memory: 3Gi
        limits:
          cpu: 2
          memory: 4Gi

  # Service configuration
  solrAddressability:
    external:
      method: Ingress
      domainName: solr.example.com
      useExternalAddress: true
```

Deploy the cluster:

```bash
kubectl apply -f solr-cloud.yaml

# Watch cluster creation
kubectl get solrcloud -n solr -w

# Check pod status
kubectl get pods -n solr -l solr-cloud=search-cluster
```

## Configuring Production Settings

Enhance the cluster for production workloads:

```yaml
# solr-production.yaml
apiVersion: solr.apache.org/v1beta1
kind: SolrCloud
metadata:
  name: prod-search
  namespace: solr
spec:
  replicas: 6

  solrImage:
    repository: solr
    tag: 9.4.0
    imagePullPolicy: IfNotPresent

  # Separate ZooKeeper ensemble
  zookeeperRef:
    provided:
      replicas: 5  # 5 nodes for better fault tolerance
      persistence:
        reclaimPolicy: Retain
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 10Gi
          storageClassName: fast-ssd
      zookeeperPodPolicy:
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1
            memory: 2Gi

  # Data storage configuration
  dataStorage:
    persistent:
      reclaimPolicy: Retain
      pvcTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 200Gi
          storageClassName: fast-ssd

  # JVM settings
  solrJavaMem: "-Xms8g -Xmx8g"
  solrOpts: "-XX:+UseG1GC -XX:MaxGCPauseMillis=250"

  # Pod configuration
  customSolrKubeOptions:
    podOptions:
      # Resource limits
      resources:
        requests:
          cpu: 4
          memory: 12Gi
        limits:
          cpu: 8
          memory: 16Gi

      # Anti-affinity for high availability
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: solr-cloud
                    operator: In
                    values:
                      - prod-search
              topologyKey: kubernetes.io/hostname

      # Liveness and readiness probes
      livenessProbe:
        initialDelaySeconds: 60
        periodSeconds: 10
        timeoutSeconds: 5
      readinessProbe:
        initialDelaySeconds: 30
        periodSeconds: 5
        timeoutSeconds: 3

  # Backup configuration
  backupRepositories:
    - name: s3-backup
      s3:
        region: us-east-1
        bucket: solr-backups
        credentials:
          accessKeyIdSecret:
            name: s3-credentials
            key: access-key-id
          secretAccessKeySecret:
            name: s3-credentials
            key: secret-access-key

  # Update strategy
  updateStrategy:
    method: StatefulSet
    managed:
      maxPodsUnavailable: 1
```

Create S3 credentials for backups:

```bash
kubectl create secret generic s3-credentials -n solr \
  --from-literal=access-key-id=YOUR_ACCESS_KEY \
  --from-literal=secret-access-key=YOUR_SECRET_KEY

kubectl apply -f solr-production.yaml
```

## Creating Collections

Connect to Solr and create a collection:

```bash
# Port forward to Solr
kubectl port-forward svc/prod-search-solrcloud-common -n solr 8983:80

# Create collection with 3 shards and 2 replicas per shard
curl "http://localhost:8983/solr/admin/collections?action=CREATE&name=products&numShards=3&replicationFactor=2&maxShardsPerNode=2"
```

Or use the Solr CLI:

```bash
# Execute inside a Solr pod
kubectl exec -it prod-search-solrcloud-0 -n solr -- bash

# Inside the pod
solr create_collection -c products -shards 3 -replicationFactor 2
```

Define a schema for your collection:

```bash
# Add fields to schema
curl -X POST "http://localhost:8983/solr/products/schema" \
  -H 'Content-Type: application/json' \
  -d '{
    "add-field": [
      {
        "name": "product_id",
        "type": "string",
        "stored": true,
        "indexed": true
      },
      {
        "name": "name",
        "type": "text_general",
        "stored": true,
        "indexed": true
      },
      {
        "name": "description",
        "type": "text_general",
        "stored": true,
        "indexed": true
      },
      {
        "name": "price",
        "type": "pfloat",
        "stored": true,
        "indexed": true
      },
      {
        "name": "category",
        "type": "string",
        "stored": true,
        "indexed": true
      },
      {
        "name": "in_stock",
        "type": "boolean",
        "stored": true,
        "indexed": true
      }
    ]
  }'
```

## Indexing Documents

Index documents using the Solr API:

```python
# solr_indexer.py
import pysolr
import json

# Connect to Solr
solr = pysolr.Solr('http://localhost:8983/solr/products', always_commit=True)

# Prepare documents
documents = [
    {
        'id': '1',
        'product_id': 'PROD001',
        'name': 'Laptop Computer',
        'description': 'High-performance laptop with 16GB RAM',
        'price': 999.99,
        'category': 'Electronics',
        'in_stock': True
    },
    {
        'id': '2',
        'product_id': 'PROD002',
        'name': 'Wireless Mouse',
        'description': 'Ergonomic wireless mouse with USB receiver',
        'price': 29.99,
        'category': 'Accessories',
        'in_stock': True
    },
    {
        'id': '3',
        'product_id': 'PROD003',
        'name': 'USB-C Cable',
        'description': 'Fast charging USB-C cable 6ft',
        'price': 12.99,
        'category': 'Accessories',
        'in_stock': False
    }
]

# Index documents
solr.add(documents)
print(f"Indexed {len(documents)} documents")

# Search documents
results = solr.search('laptop', **{
    'fl': 'product_id,name,price',
    'fq': 'in_stock:true'
})

print(f"Found {len(results)} results:")
for result in results:
    print(f"- {result['name']}: ${result['price']}")
```

Bulk indexing with SolrJ:

```java
// BulkIndexer.java
import org.apache.solr.client.solrj.SolrClient;
import org.apache.solr.client.solrj.impl.CloudSolrClient;
import org.apache.solr.common.SolrInputDocument;

import java.util.ArrayList;
import java.util.List;

public class BulkIndexer {
    public static void main(String[] args) throws Exception {
        // Connect to SolrCloud
        String zkHost = "prod-search-solrcloud-zookeeper:2181";
        SolrClient solr = new CloudSolrClient.Builder(
            List.of(zkHost), Optional.empty()
        ).build();

        ((CloudSolrClient) solr).setDefaultCollection("products");

        // Prepare documents
        List<SolrInputDocument> docs = new ArrayList<>();

        for (int i = 0; i < 10000; i++) {
            SolrInputDocument doc = new SolrInputDocument();
            doc.addField("id", String.valueOf(i));
            doc.addField("product_id", "PROD" + i);
            doc.addField("name", "Product " + i);
            doc.addField("description", "Description for product " + i);
            doc.addField("price", Math.random() * 1000);
            doc.addField("category", "Category" + (i % 10));
            doc.addField("in_stock", i % 2 == 0);
            docs.add(doc);

            // Batch commit every 1000 documents
            if (docs.size() >= 1000) {
                solr.add(docs);
                solr.commit();
                docs.clear();
                System.out.println("Indexed " + (i + 1) + " documents");
            }
        }

        // Index remaining documents
        if (!docs.isEmpty()) {
            solr.add(docs);
            solr.commit();
        }

        solr.close();
        System.out.println("Indexing complete");
    }
}
```

## Performing Searches

Execute complex searches with faceting:

```bash
# Search with faceting
curl "http://localhost:8983/solr/products/select?q=*:*&facet=true&facet.field=category&facet.field=in_stock&rows=10"

# Range faceting
curl "http://localhost:8983/solr/products/select?q=*:*&facet=true&facet.range=price&facet.range.start=0&facet.range.end=1000&facet.range.gap=100"

# Geospatial search
curl "http://localhost:8983/solr/products/select?q=*:*&fq={!geofilt pt=40.7,-74.0 sfield=location d=10}&rows=10"
```

## Scaling the Cluster

Scale Solr nodes horizontally:

```bash
# Scale up to 9 nodes
kubectl patch solrcloud prod-search -n solr --type merge \
  -p '{"spec":{"replicas":9}}'

# Watch scaling
kubectl get pods -n solr -l solr-cloud=prod-search -w
```

Add shards to existing collections:

```bash
# Add a new shard
curl "http://localhost:8983/solr/admin/collections?action=CREATESHARD&collection=products&shard=shard4"

# Add replicas to new shard
curl "http://localhost:8983/solr/admin/collections?action=ADDREPLICA&collection=products&shard=shard4&node=prod-search-solrcloud-6.prod-search-solrcloud-headless.solr:8983_solr"
```

## Backing Up and Restoring

Create backups to S3:

```bash
# Create backup
curl "http://localhost:8983/solr/admin/collections?action=BACKUP&name=products-backup-$(date +%Y%m%d)&collection=products&location=s3://solr-backups/prod&repository=s3-backup"

# Check backup status
curl "http://localhost:8983/solr/admin/collections?action=REQUESTSTATUS&requestid=<request-id>"
```

Restore from backup:

```bash
# Restore collection
curl "http://localhost:8983/solr/admin/collections?action=RESTORE&name=products-backup-20260209&collection=products_restored&location=s3://solr-backups/prod&repository=s3-backup"
```

## Monitoring Solr Performance

Deploy Prometheus metrics exporter:

```yaml
# solr-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: solr-exporter
  namespace: solr
spec:
  replicas: 1
  selector:
    matchLabels:
      app: solr-exporter
  template:
    metadata:
      labels:
        app: solr-exporter
    spec:
      containers:
      - name: exporter
        image: solr:9.4.0
        command:
        - /opt/solr/contrib/prometheus-exporter/bin/solr-exporter
        - -p
        - "9854"
        - -z
        - prod-search-solrcloud-zookeeper:2181
        - -f
        - /opt/solr/contrib/prometheus-exporter/conf/solr-exporter-config.xml
        ports:
        - containerPort: 9854
          name: metrics
---
apiVersion: v1
kind: Service
metadata:
  name: solr-exporter
  namespace: solr
spec:
  selector:
    app: solr-exporter
  ports:
  - port: 9854
    targetPort: 9854
```

Key metrics to monitor:

- `solr_metrics_core_query_requests` - Query rate
- `solr_metrics_core_query_time` - Query latency
- `solr_metrics_core_index_size_bytes` - Index size
- `solr_metrics_jvm_memory_heap_used_bytes` - Memory usage
- `solr_metrics_core_searcher_warmup_time` - Searcher warmup time

## Best Practices

Follow these guidelines:

1. **Size JVM heap appropriately** - Typically 50% of container memory
2. **Use SSD storage** - Significantly improves query performance
3. **Distribute shards evenly** - Balance load across nodes
4. **Configure appropriate replicas** - Usually 2-3 replicas per shard
5. **Regular backups** - Automate backup schedules
6. **Monitor cache hit rates** - Tune cache sizes based on usage
7. **Use filters for faceting** - Better performance than queries
8. **Batch index updates** - Improve indexing throughput
9. **Optimize collections** - Run optimize after bulk indexing

## Conclusion

The Solr Operator simplifies deploying and managing Apache Solr on Kubernetes for production search applications. By properly configuring sharding, replication, and resource allocation, you build a scalable search platform that handles complex queries and large datasets. Regular monitoring of performance metrics, automated backups, and proper scaling strategies ensure your search infrastructure remains performant and reliable as data volumes grow.
