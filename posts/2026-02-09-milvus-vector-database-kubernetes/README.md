# How to Deploy Milvus Vector Database on Kubernetes for AI Similarity Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Milvus, Vector Database

Description: Deploy Milvus vector database on Kubernetes for AI-powered similarity search applications with embedding storage, indexing, and scalable query processing.

---

Milvus is an open-source vector database designed for embedding vectors from deep learning and machine learning models. It powers similarity search for applications like recommendation systems, image search, natural language processing, and anomaly detection. Running Milvus on Kubernetes provides scalability and operational simplicity for production AI workloads. This guide shows you how to deploy and configure Milvus for high-performance vector similarity search.

## Understanding Milvus Architecture

Milvus uses a cloud-native, distributed architecture with separate components for different functions. Coordinator services handle metadata and orchestration. Worker nodes perform indexing and query execution. Storage nodes persist vector data and metadata. This separation allows independent scaling of compute and storage.

The system stores vectors in collections, which are analogous to tables in relational databases. Each collection has a schema defining vector dimensions and additional scalar fields. Milvus builds indexes on collections to accelerate similarity searches using algorithms like HNSW, IVF, and ANNOY.

## Installing Milvus with Helm

Deploy Milvus using the official Helm chart:

```bash
# Add Milvus Helm repository
helm repo add milvus https://milvus-io.github.io/milvus-helm/
helm repo update

# Create namespace
kubectl create namespace milvus

# Install Milvus
helm install milvus milvus/milvus \
  --namespace milvus \
  --set cluster.enabled=true \
  --set pulsar.enabled=true \
  --set minio.enabled=true \
  --set etcd.replicaCount=3

# Wait for pods to be ready
kubectl get pods -n milvus -w
```

This deploys a complete cluster with all dependencies including Pulsar for messaging, MinIO for object storage, and etcd for metadata.

## Configuring Resource Limits

Customize resource allocation for production workloads:

```yaml
# milvus-values.yaml
cluster:
  enabled: true

# Query nodes handle search requests
queryNode:
  replicas: 3
  resources:
    limits:
      cpu: 4
      memory: 16Gi
    requests:
      cpu: 2
      memory: 8Gi

# Data nodes handle data insertion
dataNode:
  replicas: 2
  resources:
    limits:
      cpu: 2
      memory: 8Gi
    requests:
      cpu: 1
      memory: 4Gi

# Index nodes build indexes
indexNode:
  replicas: 2
  resources:
    limits:
      cpu: 4
      memory: 16Gi
    requests:
      cpu: 2
      memory: 8Gi

# Root coordinator manages metadata
rootCoordinator:
  resources:
    limits:
      cpu: 1
      memory: 2Gi
    requests:
      cpu: 500m
      memory: 1Gi

# Proxy handles client connections
proxy:
  replicas: 2
  resources:
    limits:
      cpu: 2
      memory: 4Gi
    requests:
      cpu: 1
      memory: 2Gi

# Storage configuration
minio:
  mode: distributed
  replicas: 4
  persistence:
    enabled: true
    size: 500Gi
    storageClass: fast-ssd

# Message queue
pulsar:
  broker:
    replicaCount: 3
    resources:
      requests:
        cpu: 1
        memory: 4Gi
  bookkeeper:
    replicaCount: 3
    volumes:
      journal:
        size: 50Gi
      ledgers:
        size: 200Gi

# Metadata storage
etcd:
  replicaCount: 3
  persistence:
    enabled: true
    size: 10Gi
```

Deploy with custom values:

```bash
helm install milvus milvus/milvus \
  --namespace milvus \
  --values milvus-values.yaml
```

## Creating Collections and Inserting Vectors

Connect to Milvus and create a collection:

```python
# milvus_client.py
from pymilvus import connections, Collection, FieldSchema, CollectionSchema, DataType, utility

# Connect to Milvus
connections.connect(
    alias="default",
    host="milvus-proxy.milvus.svc.cluster.local",
    port="19530"
)

# Define collection schema
fields = [
    FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=False),
    FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=768),
    FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=1000),
    FieldSchema(name="category", dtype=DataType.VARCHAR, max_length=100)
]

schema = CollectionSchema(
    fields=fields,
    description="Document embeddings collection"
)

# Create collection
collection = Collection(
    name="documents",
    schema=schema,
    using="default"
)

print(f"Collection created: {collection.name}")

# Insert vectors
import numpy as np

# Generate sample embeddings (normally from ML model)
num_entities = 10000
embeddings = np.random.random((num_entities, 768)).tolist()
ids = list(range(num_entities))
texts = [f"Document {i}" for i in range(num_entities)]
categories = [f"Category {i % 10}" for i in range(num_entities)]

# Insert data
entities = [ids, embeddings, texts, categories]
insert_result = collection.insert(entities)

print(f"Inserted {len(insert_result.primary_keys)} entities")

# Flush data to storage
collection.flush()
```

## Building Indexes for Fast Search

Create indexes to accelerate similarity search:

```python
# Create HNSW index for high-performance search
index_params = {
    "metric_type": "L2",  # Or "IP" for inner product
    "index_type": "HNSW",
    "params": {
        "M": 16,  # Number of bi-directional links
        "efConstruction": 200  # Size of dynamic candidate list
    }
}

collection.create_index(
    field_name="embedding",
    index_params=index_params
)

print("Index created successfully")

# Wait for index to be built
utility.index_building_progress("documents")

# Load collection into memory for searching
collection.load()
print("Collection loaded into memory")
```

Different index types for different use cases:

```python
# IVF_FLAT - Good balance of speed and accuracy
ivf_flat_params = {
    "metric_type": "L2",
    "index_type": "IVF_FLAT",
    "params": {"nlist": 128}  # Number of clusters
}

# IVF_SQ8 - Compressed index for memory efficiency
ivf_sq8_params = {
    "metric_type": "L2",
    "index_type": "IVF_SQ8",
    "params": {"nlist": 128}
}

# ANNOY - Fast approximate search
annoy_params = {
    "metric_type": "L2",
    "index_type": "ANNOY",
    "params": {"n_trees": 8}
}
```

## Performing Similarity Searches

Query the collection for similar vectors:

```python
# Generate query vector (normally from ML model)
query_vectors = np.random.random((1, 768)).tolist()

# Search parameters
search_params = {
    "metric_type": "L2",
    "params": {"ef": 100}  # Size of search list
}

# Perform search
results = collection.search(
    data=query_vectors,
    anns_field="embedding",
    param=search_params,
    limit=10,  # Return top 10 results
    output_fields=["text", "category"]
)

# Process results
for hits in results:
    for hit in hits:
        print(f"ID: {hit.id}, Distance: {hit.distance}")
        print(f"Text: {hit.entity.get('text')}")
        print(f"Category: {hit.entity.get('category')}")
        print("---")
```

Search with filters:

```python
# Search with scalar field filtering
search_expr = "category == 'Category 5'"

results = collection.search(
    data=query_vectors,
    anns_field="embedding",
    param=search_params,
    limit=10,
    expr=search_expr,  # Filter expression
    output_fields=["text", "category"]
)
```

## Implementing a Document Search Application

Build a complete similarity search application:

```python
# document_search.py
from pymilvus import connections, Collection
from sentence_transformers import SentenceTransformer
import numpy as np

class DocumentSearchEngine:
    def __init__(self, collection_name="documents"):
        # Connect to Milvus
        connections.connect(
            host="milvus-proxy.milvus.svc.cluster.local",
            port="19530"
        )

        # Load collection
        self.collection = Collection(collection_name)
        self.collection.load()

        # Load embedding model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

    def add_documents(self, documents):
        """Add documents to the search engine"""
        # Generate embeddings
        texts = [doc['text'] for doc in documents]
        embeddings = self.model.encode(texts)

        # Prepare data
        ids = [doc['id'] for doc in documents]
        categories = [doc.get('category', 'default') for doc in documents]

        # Insert into Milvus
        entities = [ids, embeddings.tolist(), texts, categories]
        self.collection.insert(entities)
        self.collection.flush()

        return len(ids)

    def search(self, query_text, top_k=10, category=None):
        """Search for similar documents"""
        # Generate query embedding
        query_embedding = self.model.encode([query_text])

        # Build search expression
        search_expr = None
        if category:
            search_expr = f"category == '{category}'"

        # Search parameters
        search_params = {
            "metric_type": "L2",
            "params": {"ef": 100}
        }

        # Perform search
        results = self.collection.search(
            data=query_embedding.tolist(),
            anns_field="embedding",
            param=search_params,
            limit=top_k,
            expr=search_expr,
            output_fields=["text", "category"]
        )

        # Format results
        search_results = []
        for hits in results:
            for hit in hits:
                search_results.append({
                    'id': hit.id,
                    'distance': hit.distance,
                    'text': hit.entity.get('text'),
                    'category': hit.entity.get('category')
                })

        return search_results

# Usage example
engine = DocumentSearchEngine()

# Add documents
documents = [
    {'id': 1, 'text': 'Machine learning is a subset of AI', 'category': 'AI'},
    {'id': 2, 'text': 'Deep learning uses neural networks', 'category': 'AI'},
    {'id': 3, 'text': 'Kubernetes orchestrates containers', 'category': 'DevOps'}
]
engine.add_documents(documents)

# Search
results = engine.search('What is artificial intelligence?', top_k=5)
for result in results:
    print(f"{result['text']} (distance: {result['distance']:.4f})")
```

## Scaling Milvus for High Throughput

Scale different node types based on workload:

```bash
# Scale query nodes for more concurrent searches
kubectl scale statefulset milvus-querynode -n milvus --replicas=5

# Scale index nodes for faster index building
kubectl scale statefulset milvus-indexnode -n milvus --replicas=3

# Scale data nodes for higher insertion throughput
kubectl scale statefulset milvus-datanode -n milvus --replicas=3
```

Configure horizontal pod autoscaling:

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: milvus-querynode-hpa
  namespace: milvus
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: milvus-querynode
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Monitoring Milvus Performance

Access Milvus metrics via Prometheus:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: milvus-metrics
  namespace: milvus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: milvus
  endpoints:
  - port: metrics
    interval: 30s
```

Key metrics to monitor:

- `milvus_search_latency` - Query response time
- `milvus_insert_throughput` - Insertion rate
- `milvus_query_node_memory_usage` - Memory utilization
- `milvus_index_build_duration` - Index building time
- `milvus_connection_num` - Active client connections

Create Grafana dashboard:

```json
{
  "dashboard": {
    "title": "Milvus Performance",
    "panels": [
      {
        "title": "Search Latency (P99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(milvus_search_latency_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Insert Throughput",
        "targets": [
          {
            "expr": "rate(milvus_insert_total[5m])"
          }
        ]
      }
    ]
  }
}
```

## Backup and Recovery

Back up Milvus data stored in MinIO:

```bash
# Install MinIO client
kubectl run -it --rm mc --image=minio/mc --restart=Never -- /bin/sh

# Inside the pod, configure MinIO client
mc alias set myminio http://milvus-minio:9000 minioadmin minioadmin

# Create backup
mc mirror myminio/milvus-bucket /backups/milvus-$(date +%Y%m%d)

# Upload to S3
mc mirror /backups/milvus-$(date +%Y%m%d) s3/my-backup-bucket/milvus/
```

Restore from backup:

```bash
# Download from S3
mc mirror s3/my-backup-bucket/milvus/milvus-20260209 /restore/

# Restore to MinIO
mc mirror /restore/ myminio/milvus-bucket
```

## Best Practices

Follow these guidelines:

1. **Choose appropriate index types** - HNSW for accuracy, IVF for speed/memory balance
2. **Size query nodes properly** - Allocate memory for loaded collections
3. **Use partitions for large collections** - Improve query performance
4. **Monitor index build times** - Adjust parameters if too slow
5. **Scale horizontally** - Add query nodes for more concurrent searches
6. **Batch insertions** - Better throughput than single inserts
7. **Use connection pooling** - Reuse connections in applications
8. **Regular backups** - Protect against data loss

## Conclusion

Milvus on Kubernetes provides a scalable platform for AI-powered similarity search. By properly configuring node types, building appropriate indexes, and implementing efficient query patterns, you can build high-performance vector search applications. The cloud-native architecture allows independent scaling of different components based on workload characteristics. Monitor performance metrics, tune index parameters for your use case, and leverage Kubernetes autoscaling to handle variable query loads efficiently.
