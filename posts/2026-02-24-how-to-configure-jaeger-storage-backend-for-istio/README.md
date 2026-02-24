# How to Configure Jaeger Storage Backend for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Jaeger, Tracing, Elasticsearch, Storage

Description: Configure production-grade storage backends for Jaeger tracing in Istio including Elasticsearch, Cassandra, and Kafka setups.

---

The default Jaeger installation for Istio uses in-memory storage, which is fine for trying things out but completely unsuitable for production. Traces disappear when the pod restarts, and memory usage grows unchecked. For any real deployment, you need a proper storage backend like Elasticsearch or Cassandra that persists traces and can handle the volume of data a busy mesh generates.

## Default Jaeger Installation

The Istio addon Jaeger uses the all-in-one deployment with in-memory storage:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
```

This creates a single pod that acts as collector, query service, and storage all in one. It works for development but has hard limits on trace retention and no persistence.

## Setting Up Elasticsearch Backend

Elasticsearch is the most popular production backend for Jaeger. Here is how to set it up.

First, deploy Elasticsearch. You can use the official Elastic operator or a simple StatefulSet:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: istio-system
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
        - name: elasticsearch
          image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
          env:
            - name: discovery.type
              value: single-node
            - name: xpack.security.enabled
              value: "false"
            - name: ES_JAVA_OPTS
              value: "-Xms1g -Xmx1g"
          ports:
            - containerPort: 9200
              name: http
            - containerPort: 9300
              name: transport
          volumeMounts:
            - name: data
              mountPath: /usr/share/elasticsearch/data
          resources:
            requests:
              memory: 2Gi
              cpu: "1"
            limits:
              memory: 2Gi
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 50Gi
---
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  namespace: istio-system
spec:
  selector:
    app: elasticsearch
  ports:
    - port: 9200
      name: http
    - port: 9300
      name: transport
```

Now deploy Jaeger with Elasticsearch as the backend:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger-collector
  namespace: istio-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: jaeger
      component: collector
  template:
    metadata:
      labels:
        app: jaeger
        component: collector
    spec:
      containers:
        - name: jaeger-collector
          image: jaegertracing/jaeger-collector:1.53
          args:
            - --es.server-urls=http://elasticsearch.istio-system:9200
            - --es.index-prefix=istio
            - --es.num-shards=3
            - --es.num-replicas=1
            - --collector.num-workers=50
            - --collector.queue-size=2000
          ports:
            - containerPort: 14268
              name: http
            - containerPort: 14250
              name: grpc
          env:
            - name: SPAN_STORAGE_TYPE
              value: elasticsearch
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger-query
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
      component: query
  template:
    metadata:
      labels:
        app: jaeger
        component: query
    spec:
      containers:
        - name: jaeger-query
          image: jaegertracing/jaeger-query:1.53
          args:
            - --es.server-urls=http://elasticsearch.istio-system:9200
            - --es.index-prefix=istio
          ports:
            - containerPort: 16686
              name: http
          env:
            - name: SPAN_STORAGE_TYPE
              value: elasticsearch
---
apiVersion: v1
kind: Service
metadata:
  name: tracing
  namespace: istio-system
  labels:
    app: jaeger
spec:
  selector:
    app: jaeger
    component: query
  ports:
    - port: 80
      targetPort: 16686
      name: http-query
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-collector
  namespace: istio-system
spec:
  selector:
    app: jaeger
    component: collector
  ports:
    - port: 14268
      name: http
    - port: 14250
      name: grpc
```

## Configuring Istio to Send Traces to Jaeger

Update your Istio installation to point to the Jaeger collector:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        zipkin:
          address: jaeger-collector.istio-system:9411
        sampling: 1.0
```

Apply with:

```bash
istioctl install -f istio-operator.yaml
```

The `sampling: 1.0` means 1% of traces are sampled. For production with high traffic, start with 1% and adjust based on your storage capacity.

## Setting Up Cassandra Backend

Cassandra is another solid option, especially if you already run it in your infrastructure:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger-collector
  namespace: istio-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: jaeger
      component: collector
  template:
    metadata:
      labels:
        app: jaeger
        component: collector
    spec:
      containers:
        - name: jaeger-collector
          image: jaegertracing/jaeger-collector:1.53
          args:
            - --cassandra.servers=cassandra.istio-system
            - --cassandra.keyspace=jaeger_v1_istio
          env:
            - name: SPAN_STORAGE_TYPE
              value: cassandra
          ports:
            - containerPort: 14268
            - containerPort: 14250
```

Before starting the collector, you need to initialize the Cassandra schema:

```bash
# Run the schema creation job
kubectl run jaeger-cassandra-schema \
  --image=jaegertracing/jaeger-cassandra-schema:1.53 \
  --restart=Never \
  --env="CQLSH_HOST=cassandra.istio-system" \
  --env="DATACENTER=dc1" \
  --env="MODE=prod" \
  -n istio-system
```

## Index Management for Elasticsearch

Traces accumulate fast. Set up index lifecycle management to automatically delete old traces:

```bash
# Create an ILM policy
curl -X PUT "http://elasticsearch.istio-system:9200/_ilm/policy/jaeger-traces" \
  -H 'Content-Type: application/json' \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_age": "1d",
              "max_size": "50gb"
            }
          }
        },
        "delete": {
          "min_age": "7d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'
```

Alternatively, use Jaeger's built-in index cleaner:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: jaeger-es-index-cleaner
  namespace: istio-system
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: jaeger-es-index-cleaner
              image: jaegertracing/jaeger-es-index-cleaner:1.53
              args:
                - "7"
                - "http://elasticsearch.istio-system:9200"
                - --index-prefix=istio
          restartPolicy: OnFailure
```

This runs daily at 2 AM and deletes indices older than 7 days.

## Verifying the Setup

Check that traces are being stored:

```bash
# Port-forward to Jaeger query service
kubectl port-forward -n istio-system svc/tracing 16686:80

# Open http://localhost:16686 in your browser
```

Generate some traffic and look for traces in the Jaeger UI. If no traces appear:

```bash
# Check Jaeger collector logs
kubectl logs -n istio-system -l app=jaeger,component=collector --tail=50

# Check Elasticsearch health
kubectl exec -n istio-system elasticsearch-0 -- curl -s localhost:9200/_cluster/health | python3 -m json.tool

# Check that Elasticsearch has Jaeger indices
kubectl exec -n istio-system elasticsearch-0 -- curl -s localhost:9200/_cat/indices?v | grep istio
```

## Performance Tuning

For high-throughput meshes, tune the collector:

```yaml
args:
  - --collector.num-workers=100
  - --collector.queue-size=5000
  - --es.bulk.size=10000000
  - --es.bulk.workers=5
  - --es.bulk.flush-interval=1s
```

These settings increase the number of workers processing spans and batch writes to Elasticsearch for better throughput.

## Summary

Configuring a production storage backend for Jaeger in Istio means choosing between Elasticsearch and Cassandra, deploying the chosen backend with persistent storage, and configuring Jaeger's collector and query components to use it. Set up index lifecycle management to control storage growth, tune the collector for your traffic volume, and verify everything works by checking for traces in the Jaeger UI. The key is matching your storage capacity to your sampling rate and traffic volume.
