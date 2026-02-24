# How to Configure Istio for Elasticsearch Connections

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Elasticsearch, Service Mesh, Kubernetes, Search

Description: Configure Istio to properly route Elasticsearch HTTP and transport traffic in Kubernetes with correct protocol handling, mTLS, and access control.

---

Elasticsearch is different from most databases when it comes to Istio configuration because it actually uses HTTP for its client API. That means you get more out of Istio than just TCP-level metrics - you can get full HTTP observability, retry policies, and more granular routing.

But Elasticsearch also has an internal transport protocol for node-to-node communication that runs on port 9300, and that is a binary protocol. So you need to handle two different protocols for one system.

## Elasticsearch Port Configuration

Elasticsearch has two ports:
- Port 9200: REST API (HTTP)
- Port 9300: Transport protocol (TCP, binary)

The Service definition reflects this:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  namespace: search
spec:
  selector:
    app: elasticsearch
  ports:
    - name: http
      port: 9200
      targetPort: 9200
    - name: tcp-transport
      port: 9300
      targetPort: 9300
```

Port 9200 is named `http` so Istio applies HTTP-level processing. Port 9300 uses the `tcp-` prefix since the transport protocol is binary. This distinction is crucial because if you name port 9200 with a `tcp-` prefix, you lose all the HTTP-level features that make Istio valuable.

## Elasticsearch Deployment

Here is a basic single-node Elasticsearch deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elasticsearch
  namespace: search
  labels:
    app: elasticsearch
spec:
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
          image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
          ports:
            - containerPort: 9200
              name: http
            - containerPort: 9300
              name: tcp-transport
          env:
            - name: discovery.type
              value: single-node
            - name: xpack.security.enabled
              value: "false"
            - name: ES_JAVA_OPTS
              value: "-Xms1g -Xmx1g"
          resources:
            requests:
              memory: 2Gi
              cpu: "1"
            limits:
              memory: 2Gi
```

## Multi-Node Elasticsearch with StatefulSet

For production, you want multiple nodes. Use a StatefulSet with a headless service for node discovery:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch-headless
  namespace: search
spec:
  clusterIP: None
  selector:
    app: elasticsearch
  ports:
    - name: http
      port: 9200
      targetPort: 9200
    - name: tcp-transport
      port: 9300
      targetPort: 9300
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: search
spec:
  serviceName: elasticsearch-headless
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
          image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
          ports:
            - containerPort: 9200
              name: http
            - containerPort: 9300
              name: tcp-transport
          env:
            - name: cluster.name
              value: my-cluster
            - name: discovery.seed_hosts
              value: "elasticsearch-headless"
            - name: cluster.initial_master_nodes
              value: "elasticsearch-0,elasticsearch-1,elasticsearch-2"
            - name: ES_JAVA_OPTS
              value: "-Xms2g -Xmx2g"
```

## DestinationRule with HTTP Settings

Since port 9200 is HTTP, you can use HTTP-specific connection pool settings:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: elasticsearch
  namespace: search
spec:
  host: elasticsearch.search.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 5s
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
        maxRequestsPerConnection: 100
        idleTimeout: 600s
    tls:
      mode: ISTIO_MUTUAL
```

The `h2UpgradePolicy: DO_NOT_UPGRADE` keeps connections as HTTP/1.1 since some Elasticsearch client libraries do not handle HTTP/2 well. The `maxRequestsPerConnection` limits how many requests are sent over a single connection before creating a new one, which helps with load distribution.

## VirtualService with Retry Policy

One of the advantages of HTTP traffic is that you can configure retries. Elasticsearch queries that fail due to temporary issues can be retried automatically:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: elasticsearch
  namespace: search
spec:
  hosts:
    - elasticsearch.search.svc.cluster.local
  http:
    - route:
        - destination:
            host: elasticsearch.search.svc.cluster.local
            port:
              number: 9200
      timeout: 30s
      retries:
        attempts: 2
        perTryTimeout: 10s
        retryOn: 5xx,reset,connect-failure
```

Be careful with retries for write operations. You probably only want retries for read queries. If your application uses different URL paths for reads and writes, you can set up separate match rules:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: elasticsearch-routing
  namespace: search
spec:
  hosts:
    - elasticsearch.search.svc.cluster.local
  http:
    - match:
        - method:
            exact: GET
      route:
        - destination:
            host: elasticsearch.search.svc.cluster.local
            port:
              number: 9200
      retries:
        attempts: 3
        perTryTimeout: 10s
        retryOn: 5xx,reset
    - route:
        - destination:
            host: elasticsearch.search.svc.cluster.local
            port:
              number: 9200
      timeout: 60s
```

GET requests get retries, while all other methods (POST, PUT, DELETE) just get a longer timeout.

## External Elasticsearch

For Elastic Cloud or other hosted Elasticsearch:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: elastic-cloud
  namespace: search
spec:
  hosts:
    - my-deployment.es.us-east-1.aws.elastic-cloud.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: elastic-cloud
  namespace: search
spec:
  host: my-deployment.es.us-east-1.aws.elastic-cloud.com
  trafficPolicy:
    tls:
      mode: SIMPLE
```

Elastic Cloud uses HTTPS on port 443, so you configure it as HTTPS traffic rather than the usual port 9200.

## Access Control

Restrict which services can query Elasticsearch:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: elasticsearch-access
  namespace: search
spec:
  selector:
    matchLabels:
      app: elasticsearch
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/app/sa/search-service
              - cluster.local/ns/app/sa/indexer
              - cluster.local/ns/monitoring/sa/kibana
      to:
        - operation:
            ports: ["9200"]
    - from:
        - source:
            principals:
              - cluster.local/ns/search/sa/default
      to:
        - operation:
            ports: ["9300"]
```

This separates access: application services and Kibana can reach the HTTP API on 9200, while only Elasticsearch nodes themselves can use the transport port 9300.

## Monitoring Elasticsearch Through Istio

Because port 9200 is HTTP, you get rich metrics:

```
# Request rate
rate(istio_requests_total{destination_service="elasticsearch.search.svc.cluster.local"}[5m])

# Request duration (p99)
histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket{destination_service="elasticsearch.search.svc.cluster.local"}[5m]))

# Error rate
rate(istio_requests_total{destination_service="elasticsearch.search.svc.cluster.local", response_code=~"5.."}[5m])
```

These HTTP-level metrics are far more useful than the TCP-level metrics you get for other databases. You can see query latency distributions, error rates by response code, and request volumes per path.

## Key Takeaways

Elasticsearch stands out from other databases in Istio because its REST API gives you HTTP-level features. Name port 9200 as `http` (not `tcp-`), and name port 9300 as `tcp-transport`. Use HTTP connection pool settings and retry policies for the REST API. Keep the transport port as TCP-only and lock it down so only Elasticsearch nodes can use it. This combination gives you the best observability and control over your Elasticsearch traffic.
