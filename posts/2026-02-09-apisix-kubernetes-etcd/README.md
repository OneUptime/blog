# How to Deploy Apache APISIX on Kubernetes with etcd Configuration Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: APISIX, Kubernetes, API Gateway

Description: Learn how to deploy Apache APISIX API Gateway on Kubernetes with etcd as the configuration backend, enabling dynamic routing and high-performance API management at scale.

---

Apache APISIX is a cloud-native API Gateway built on NGINX and LuaJIT, using etcd for configuration storage. This architecture enables dynamic configuration updates without reloads, high throughput with low latency, and horizontal scalability. APISIX provides rich traffic management capabilities through its plugin system while maintaining performance suitable for production workloads.

## Understanding APISIX Architecture

APISIX consists of two main components:

**APISIX Gateway** - The data plane that handles requests, applies plugins, and routes traffic to upstreams. Built on NGINX for performance.

**etcd** - Distributed key-value store that holds configuration (routes, upstreams, plugins). APISIX watches etcd for changes and updates routing dynamically.

This separation enables:
- Zero-downtime configuration updates
- Consistent configuration across multiple gateway nodes
- Real-time configuration synchronization
- Declarative configuration management

## Deploying etcd for APISIX

Deploy a three-node etcd cluster for production use:

```yaml
# etcd-cluster.yaml
apiVersion: v1
kind: Service
metadata:
  name: etcd-cluster
  namespace: apisix
spec:
  clusterIP: None
  ports:
  - port: 2379
    name: client
  - port: 2380
    name: peer
  selector:
    app: etcd
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: etcd
  namespace: apisix
spec:
  serviceName: etcd-cluster
  replicas: 3
  selector:
    matchLabels:
      app: etcd
  template:
    metadata:
      labels:
        app: etcd
    spec:
      containers:
      - name: etcd
        image: quay.io/coreos/etcd:v3.5.10
        ports:
        - containerPort: 2379
          name: client
        - containerPort: 2380
          name: peer
        env:
        - name: ETCD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: ETCD_INITIAL_CLUSTER
          value: "etcd-0=http://etcd-0.etcd-cluster:2380,etcd-1=http://etcd-1.etcd-cluster:2380,etcd-2=http://etcd-2.etcd-cluster:2380"
        - name: ETCD_INITIAL_ADVERTISE_PEER_URLS
          value: "http://$(ETCD_NAME).etcd-cluster:2380"
        - name: ETCD_LISTEN_PEER_URLS
          value: "http://0.0.0.0:2380"
        - name: ETCD_LISTEN_CLIENT_URLS
          value: "http://0.0.0.0:2379"
        - name: ETCD_ADVERTISE_CLIENT_URLS
          value: "http://$(ETCD_NAME).etcd-cluster:2379"
        - name: ETCD_INITIAL_CLUSTER_STATE
          value: "new"
        - name: ETCD_INITIAL_CLUSTER_TOKEN
          value: "apisix-etcd-cluster"
        volumeMounts:
        - name: etcd-data
          mountPath: /var/lib/etcd
  volumeClaimTemplates:
  - metadata:
      name: etcd-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

Deploy etcd:

```bash
kubectl create namespace apisix
kubectl apply -f etcd-cluster.yaml

# Wait for etcd to be ready
kubectl wait --for=condition=ready pod -l app=etcd -n apisix --timeout=300s
```

## Deploying APISIX Gateway

Deploy APISIX configured to use etcd:

```yaml
# apisix-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: apisix-config
  namespace: apisix
data:
  config.yaml: |
    apisix:
      node_listen: 9080
      enable_ipv6: false
      enable_control: true
      enable_admin: true
      allow_admin:
        - 0.0.0.0/0

    deployment:
      role: traditional
      role_traditional:
        config_provider: etcd

      etcd:
        host:
          - "http://etcd-0.etcd-cluster:2379"
          - "http://etcd-1.etcd-cluster:2379"
          - "http://etcd-2.etcd-cluster:2379"
        prefix: "/apisix"
        timeout: 30
        watch_timeout: 300

    nginx_config:
      error_log: "logs/error.log"
      error_log_level: "warn"
      worker_processes: auto
      worker_rlimit_nofile: 20480
      worker_shutdown_timeout: 240s
      event:
        worker_connections: 10620

    plugins:
      - real-ip
      - client-control
      - proxy-rewrite
      - ext-plugin-pre-req
      - request-id
      - zipkin
      - prometheus
      - key-auth
      - jwt-auth
      - basic-auth
      - authz-keycloak
      - wolf-rbac
      - openid-connect
      - hmac-auth
      - authz-casbin
      - uri-blocker
      - request-validation
      - openwhisk
      - serverless-pre-function
      - serverless-post-function
      - azure-functions
      - ip-restriction
      - ua-restriction
      - referer-restriction
      - csrf
      - public-api
      - gzip
      - server-info
      - traffic-split
      - limit-req
      - limit-count
      - limit-conn
      - proxy-cache
      - proxy-mirror
      - api-breaker
      - redirect
      - response-rewrite
      - grpc-transcode
      - grpc-web
      - fault-injection
      - mocking
      - degraphql
      - kafka-logger
      - rocketmq-logger
      - sls-logger
      - tcp-logger
      - kafka-proxy
      - cors
      - echo
      - loggly
      - http-logger
      - syslog
      - udp-logger
      - file-logger
      - clickhouse-logger
      - tencent-cloud-cls
      - google-cloud-logging
      - prometheus-native
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: apisix
  namespace: apisix
spec:
  replicas: 3
  selector:
    matchLabels:
      app: apisix
  template:
    metadata:
      labels:
        app: apisix
    spec:
      containers:
      - name: apisix
        image: apache/apisix:3.7.0-debian
        ports:
        - containerPort: 9080
          name: http
        - containerPort: 9443
          name: https
        - containerPort: 9180
          name: admin
        - containerPort: 9092
          name: control
        volumeMounts:
        - name: config
          mountPath: /usr/local/apisix/conf/config.yaml
          subPath: config.yaml
        livenessProbe:
          httpGet:
            path: /apisix/status
            port: 9080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /apisix/status
            port: 9080
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
      volumes:
      - name: config
        configMap:
          name: apisix-config
---
apiVersion: v1
kind: Service
metadata:
  name: apisix-gateway
  namespace: apisix
spec:
  selector:
    app: apisix
  ports:
  - port: 80
    targetPort: 9080
    name: http
  - port: 443
    targetPort: 9443
    name: https
  type: LoadBalancer
---
apiVersion: v1
kind: Service
metadata:
  name: apisix-admin
  namespace: apisix
spec:
  selector:
    app: apisix
  ports:
  - port: 9180
    targetPort: 9180
    name: admin
  type: ClusterIP
```

Deploy APISIX:

```bash
kubectl apply -f apisix-config.yaml

# Wait for APISIX to be ready
kubectl wait --for=condition=ready pod -l app=apisix -n apisix --timeout=300s
```

## Installing APISIX Using Helm

Alternatively, use Helm for simplified deployment:

```bash
# Add APISIX Helm repository
helm repo add apisix https://charts.apiseven.com
helm repo update

# Install with custom values
cat > apisix-values.yaml <<EOF
apisix:
  enabled: true
  replicaCount: 3

gateway:
  type: LoadBalancer
  http:
    enabled: true
  tls:
    enabled: true

admin:
  enabled: true
  type: ClusterIP
  allow:
    ipList:
    - 0.0.0.0/0

etcd:
  enabled: true
  replicaCount: 3
  persistence:
    enabled: true
    size: 10Gi
EOF

helm install apisix apisix/apisix \
  --namespace apisix \
  --create-namespace \
  -f apisix-values.yaml
```

## Deploying APISIX Ingress Controller

For Kubernetes-native configuration, deploy the APISIX Ingress Controller:

```bash
# Install CRDs and controller
kubectl apply -f https://raw.githubusercontent.com/apache/apisix-ingress-controller/master/samples/deploy/crd/v1/ApisixRoute.yaml
kubectl apply -f https://raw.githubusercontent.com/apache/apisix-ingress-controller/master/samples/deploy/crd/v1/ApisixUpstream.yaml
kubectl apply -f https://raw.githubusercontent.com/apache/apisix-ingress-controller/master/samples/deploy/crd/v1/ApisixTls.yaml
kubectl apply -f https://raw.githubusercontent.com/apache/apisix-ingress-controller/master/samples/deploy/crd/v1/ApisixClusterConfig.yaml
kubectl apply -f https://raw.githubusercontent.com/apache/apisix-ingress-controller/master/samples/deploy/crd/v1/ApisixConsumer.yaml
kubectl apply -f https://raw.githubusercontent.com/apache/apisix-ingress-controller/master/samples/deploy/crd/v1/ApisixPluginConfig.yaml

# Deploy ingress controller
kubectl apply -f https://raw.githubusercontent.com/apache/apisix-ingress-controller/master/samples/deploy/composite.yaml
```

Or with Helm:

```yaml
# ingress-controller-values.yaml
controller:
  replicas: 2
  config:
    apisix:
      adminAPIVersion: v3
      baseURL: http://apisix-admin.apisix:9180/apisix/admin
```

```bash
helm install apisix-ingress-controller apisix/apisix-ingress-controller \
  --namespace apisix \
  -f ingress-controller-values.yaml
```

## Creating Routes via Admin API

Configure routes using the APISIX Admin API:

```bash
# Port-forward to admin API
kubectl port-forward -n apisix svc/apisix-admin 9180:9180 &

# Create a route
curl http://127.0.0.1:9180/apisix/admin/routes/1 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -X PUT -d '{
  "uri": "/api/*",
  "upstream": {
    "type": "roundrobin",
    "nodes": {
      "backend-service.default.svc.cluster.local:8080": 1
    }
  }
}'

# Create upstream separately
curl http://127.0.0.1:9180/apisix/admin/upstreams/1 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -X PUT -d '{
  "type": "roundrobin",
  "nodes": {
    "backend-1.default.svc.cluster.local:8080": 1,
    "backend-2.default.svc.cluster.local:8080": 1
  },
  "timeout": {
    "connect": 6,
    "send": 6,
    "read": 6
  },
  "retries": 2
}'

# Link route to upstream
curl http://127.0.0.1:9180/apisix/admin/routes/2 \
  -H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' \
  -X PUT -d '{
  "uri": "/v2/*",
  "upstream_id": "1"
}'
```

## Verifying etcd Configuration

Check that configuration is stored in etcd:

```bash
# Access etcd pod
kubectl exec -it etcd-0 -n apisix -- /bin/sh

# List all APISIX configurations
etcdctl get /apisix --prefix

# List routes
etcdctl get /apisix/routes --prefix

# List upstreams
etcdctl get /apisix/upstreams --prefix
```

View a specific route:

```bash
etcdctl get /apisix/routes/1
```

## Monitoring etcd Health

Monitor etcd cluster health:

```bash
# Check cluster status
kubectl exec -it etcd-0 -n apisix -- etcdctl \
  --endpoints=http://etcd-0.etcd-cluster:2379,http://etcd-1.etcd-cluster:2379,http://etcd-2.etcd-cluster:2379 \
  endpoint health

# Check member list
kubectl exec -it etcd-0 -n apisix -- etcdctl \
  --endpoints=http://etcd-0.etcd-cluster:2379 \
  member list
```

## Testing APISIX Gateway

Test routing through APISIX:

```bash
# Get gateway IP
APISIX_IP=$(kubectl get svc apisix-gateway -n apisix -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test the route
curl http://${APISIX_IP}/api/test

# Check APISIX status
curl http://${APISIX_IP}/apisix/status
```

## Best Practices

**Use etcd clustering for production** - Single-node etcd is a single point of failure. Always run at least 3 nodes.

**Secure etcd communication** - Enable TLS for etcd client and peer communication in production.

**Monitor etcd disk usage** - etcd performance degrades with large datasets. Use compaction and defragmentation.

**Backup etcd regularly** - Implement automated backups of etcd data for disaster recovery.

**Use namespaces** - Organize configurations in etcd using different prefixes for multiple environments.

**Limit Admin API access** - Restrict Admin API access with authentication and network policies.

**Monitor APISIX metrics** - Enable Prometheus plugin to track gateway performance.

## Conclusion

Apache APISIX with etcd provides a powerful, performant API Gateway solution for Kubernetes. The etcd-based configuration enables dynamic updates without downtime, while APISIX's NGINX foundation delivers high throughput and low latency. This architecture scales horizontally, supports rich plugin ecosystems, and integrates naturally with Kubernetes through the Ingress Controller. For teams seeking a cloud-native API Gateway with strong performance characteristics and flexible configuration management, APISIX represents a compelling choice.
