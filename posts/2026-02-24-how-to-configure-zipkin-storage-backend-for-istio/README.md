# How to Configure Zipkin Storage Backend for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Zipkin, Tracing, Elasticsearch, Storage Backend

Description: Set up production storage backends for Zipkin tracing in Istio including Elasticsearch, MySQL, and Cassandra configurations.

---

Zipkin is one of the tracing backends that Istio supports out of the box, and it's often chosen for its simplicity and lighter resource footprint compared to Jaeger. But like Jaeger, the default Zipkin installation uses in-memory storage that won't survive a restart. For production, you need to back it with a real storage engine. Zipkin supports Elasticsearch, Cassandra, and MySQL as storage backends.

## Default Zipkin Installation

Istio can be configured to send traces to Zipkin. First, deploy Zipkin:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zipkin
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zipkin
  template:
    metadata:
      labels:
        app: zipkin
    spec:
      containers:
        - name: zipkin
          image: openzipkin/zipkin:3.0
          ports:
            - containerPort: 9411
          env:
            - name: STORAGE_TYPE
              value: mem
---
apiVersion: v1
kind: Service
metadata:
  name: zipkin
  namespace: istio-system
spec:
  selector:
    app: zipkin
  ports:
    - port: 9411
      targetPort: 9411
```

This runs Zipkin with in-memory storage. It's fine for testing but trace data is lost on restart.

## Configuring Istio to Use Zipkin

Tell Istio to send traces to your Zipkin deployment:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        zipkin:
          address: zipkin.istio-system:9411
        sampling: 1.0
```

Apply with:

```bash
istioctl install -f istio-operator.yaml
```

## Elasticsearch Backend

Elasticsearch is the recommended production backend for Zipkin. Here is the setup:

Deploy Elasticsearch (if you don't already have one):

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: istio-system
spec:
  serviceName: elasticsearch
  replicas: 1
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
              value: "-Xms512m -Xmx512m"
          ports:
            - containerPort: 9200
          volumeMounts:
            - name: data
              mountPath: /usr/share/elasticsearch/data
          resources:
            requests:
              memory: 1Gi
              cpu: 500m
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 30Gi
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
```

Now deploy Zipkin with Elasticsearch:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zipkin
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zipkin
  template:
    metadata:
      labels:
        app: zipkin
    spec:
      containers:
        - name: zipkin
          image: openzipkin/zipkin:3.0
          ports:
            - containerPort: 9411
          env:
            - name: STORAGE_TYPE
              value: elasticsearch
            - name: ES_HOSTS
              value: http://elasticsearch.istio-system:9200
            - name: ES_INDEX
              value: zipkin
            - name: ES_INDEX_REPLICAS
              value: "1"
            - name: ES_INDEX_SHARDS
              value: "3"
          resources:
            requests:
              memory: 512Mi
              cpu: 250m
```

The environment variables configure the connection and index settings:
- `STORAGE_TYPE`: Tells Zipkin to use Elasticsearch
- `ES_HOSTS`: Elasticsearch URL
- `ES_INDEX`: Prefix for index names
- `ES_INDEX_REPLICAS`: Number of replica shards
- `ES_INDEX_SHARDS`: Number of primary shards

## MySQL Backend

For smaller deployments, MySQL can work as a storage backend:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: zipkin-mysql
  namespace: istio-system
spec:
  serviceName: zipkin-mysql
  replicas: 1
  selector:
    matchLabels:
      app: zipkin-mysql
  template:
    metadata:
      labels:
        app: zipkin-mysql
    spec:
      containers:
        - name: mysql
          image: openzipkin/zipkin-mysql:3.0
          ports:
            - containerPort: 3306
          volumeMounts:
            - name: data
              mountPath: /var/lib/mysql
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: zipkin-mysql
  namespace: istio-system
spec:
  selector:
    app: zipkin-mysql
  ports:
    - port: 3306
```

Then configure Zipkin to use it:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zipkin
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zipkin
  template:
    metadata:
      labels:
        app: zipkin
    spec:
      containers:
        - name: zipkin
          image: openzipkin/zipkin:3.0
          ports:
            - containerPort: 9411
          env:
            - name: STORAGE_TYPE
              value: mysql
            - name: MYSQL_HOST
              value: zipkin-mysql.istio-system
            - name: MYSQL_TCP_PORT
              value: "3306"
            - name: MYSQL_USER
              value: zipkin
            - name: MYSQL_PASS
              value: zipkin
```

MySQL works fine for low to moderate traffic but doesn't scale as well as Elasticsearch for high-cardinality trace data.

## Cassandra Backend

Cassandra handles high write throughput well, making it suitable for large-scale tracing:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zipkin
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zipkin
  template:
    metadata:
      labels:
        app: zipkin
    spec:
      containers:
        - name: zipkin
          image: openzipkin/zipkin:3.0
          ports:
            - containerPort: 9411
          env:
            - name: STORAGE_TYPE
              value: cassandra3
            - name: CASSANDRA_CONTACT_POINTS
              value: cassandra.istio-system
            - name: CASSANDRA_KEYSPACE
              value: zipkin
            - name: CASSANDRA_LOCAL_DC
              value: dc1
            - name: CASSANDRA_ENSURE_SCHEMA
              value: "true"
```

Setting `CASSANDRA_ENSURE_SCHEMA=true` tells Zipkin to create the keyspace and tables automatically on startup.

## Managing Trace Retention

Traces accumulate quickly. Set up automated cleanup based on your storage backend.

For Elasticsearch, use a CronJob to delete old indices:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: zipkin-es-cleanup
  namespace: istio-system
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: curator
              image: bitnami/elasticsearch-curator:5.8.4
              command:
                - curator_cli
                - --host
                - elasticsearch.istio-system
                - delete_indices
                - --filter_list
                - '[{"filtertype":"age","source":"name","direction":"older","timestring":"%Y-%m-%d","unit":"days","unit_count":7},{"filtertype":"pattern","kind":"prefix","value":"zipkin"}]'
          restartPolicy: OnFailure
```

This deletes Zipkin indices older than 7 days.

For MySQL, add a cleanup script:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: zipkin-mysql-cleanup
  namespace: istio-system
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cleanup
              image: mysql:8.0
              command:
                - mysql
                - -h
                - zipkin-mysql.istio-system
                - -u
                - zipkin
                - -pzipkin
                - -e
                - "DELETE FROM zipkin_spans WHERE start_ts < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 7 DAY)) * 1000000;"
          restartPolicy: OnFailure
```

## Verifying the Storage Backend

Check that Zipkin is connected to the storage backend and traces are being persisted:

```bash
# Check Zipkin logs
kubectl logs -n istio-system -l app=zipkin --tail=50

# Access the Zipkin UI
kubectl port-forward -n istio-system svc/zipkin 9411:9411
# Open http://localhost:9411

# For Elasticsearch, verify indices exist
kubectl exec -n istio-system elasticsearch-0 -- curl -s localhost:9200/_cat/indices?v | grep zipkin
```

Generate some traffic and check that traces appear in the Zipkin UI and survive a Zipkin pod restart.

## Scaling for Production

For production workloads, consider running multiple Zipkin instances behind a load balancer:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zipkin
  namespace: istio-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: zipkin
  template:
    metadata:
      labels:
        app: zipkin
    spec:
      containers:
        - name: zipkin
          image: openzipkin/zipkin:3.0
          env:
            - name: STORAGE_TYPE
              value: elasticsearch
            - name: ES_HOSTS
              value: http://elasticsearch.istio-system:9200
          resources:
            requests:
              memory: 1Gi
              cpu: 500m
            limits:
              memory: 2Gi
```

Zipkin is stateless (all state is in the storage backend), so you can scale horizontally without coordination.

## Summary

Configuring Zipkin's storage backend for Istio means choosing between Elasticsearch (recommended for most cases), Cassandra (for very high throughput), or MySQL (for simplicity at small scale). Deploy the storage backend with persistent volumes, configure Zipkin through environment variables, and set up automated index cleanup to manage storage growth. Verify the setup by generating traces and confirming they persist across pod restarts.
