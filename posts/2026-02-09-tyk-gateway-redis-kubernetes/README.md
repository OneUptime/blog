# How to Deploy Tyk Gateway on Kubernetes with Redis Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tyk, API Gateway, Kubernetes

Description: Learn how to deploy Tyk API Gateway on Kubernetes with Redis as the configuration and analytics backend, enabling scalable API management with real-time rate limiting and session storage.

---

Tyk Gateway uses Redis as its primary datastore for API definitions, rate limiting counters, session tokens, and analytics data. This architecture enables horizontal scaling of gateway nodes while maintaining consistent state across the cluster. Redis provides the low-latency data access required for high-throughput API gateways without sacrificing consistency.

## Understanding Tyk Architecture

Tyk consists of several components:

**Tyk Gateway** - The data plane that proxies API requests and enforces policies.

**Tyk Dashboard** - Web UI for API management (enterprise/paid feature).

**Tyk Pump** - Analytics processor that moves data from Redis to long-term storage.

**Redis** - Stores API definitions, rate limit counters, and analytics buffer.

For production deployments, Gateway and Redis are the minimum required components.

## Deploying Redis for Tyk

Deploy Redis with persistence:

```yaml
# redis-tyk.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: tyk
data:
  redis.conf: |
    appendonly yes
    appendfsync everysec
    maxmemory 2gb
    maxmemory-policy allkeys-lru
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: tyk
spec:
  serviceName: redis
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
          name: redis
        command: ["redis-server", "/etc/redis/redis.conf"]
        volumeMounts:
        - name: config
          mountPath: /etc/redis
        - name: data
          mountPath: /data
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
          name: redis-config
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
  name: redis
  namespace: tyk
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  clusterIP: None
```

Deploy Redis:

```bash
kubectl create namespace tyk
kubectl apply -f redis-tyk.yaml
```

## Deploying Tyk Gateway

Create Tyk Gateway configuration:

```yaml
# tyk-gateway-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tyk-gateway-config
  namespace: tyk
data:
  tyk.conf: |
    {
      "listen_port": 8080,
      "secret": "your-secret-key-change-me",
      "node_secret": "your-node-secret",
      "template_path": "/opt/tyk-gateway/templates",
      "tyk_js_path": "/opt/tyk-gateway/js/tyk.js",
      "middleware_path": "/opt/tyk-gateway/middleware",
      "use_db_app_configs": false,
      "app_path": "/opt/tyk-gateway/apps",
      "storage": {
        "type": "redis",
        "host": "redis.tyk.svc.cluster.local",
        "port": 6379,
        "username": "",
        "password": "",
        "database": 0,
        "optimisation_max_idle": 2000,
        "optimisation_max_active": 4000,
        "enable_cluster": false
      },
      "enable_analytics": true,
      "analytics_config": {
        "type": "redis",
        "ignored_ips": [],
        "enable_detailed_recording": true,
        "enable_geo_ip": false,
        "normalise_urls": {
          "enabled": true,
          "normalise_uuids": true,
          "normalise_numbers": true
        }
      },
      "health_check": {
        "enable_health_checks": true,
        "health_check_value_timeouts": 60
      },
      "optimisations_use_async_session_write": true,
      "allow_master_keys": false,
      "policies": {
        "policy_source": "file",
        "policy_record_name": "/opt/tyk-gateway/policies/policies.json"
      },
      "hash_keys": true,
      "suppress_redis_signal_reload": false,
      "close_connections": false,
      "local_session_cache": {
        "disable_cached_session_state": false
      },
      "uptime_tests": {
        "disable": false,
        "config": {
          "enable_uptime_analytics": true,
          "failure_trigger_sample_size": 3,
          "time_wait": 10,
          "checker_pool_size": 50
        }
      },
      "hostname": "",
      "enable_custom_domains": true,
      "enable_jsvm": true,
      "coprocess_options": {
        "enable_coprocess": false
      },
      "enable_bundle_downloader": true,
      "bundle_base_url": "",
      "global_session_lifetime": 100,
      "force_global_session_lifetime": false,
      "max_idle_connections_per_host": 500
    }
```

Deploy Tyk Gateway:

```yaml
# tyk-gateway-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tyk-gateway
  namespace: tyk
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tyk-gateway
  template:
    metadata:
      labels:
        app: tyk-gateway
    spec:
      containers:
      - name: tyk-gateway
        image: tykio/tyk-gateway:v5.2
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: TYK_GW_STORAGE_HOST
          value: redis.tyk.svc.cluster.local
        - name: TYK_GW_STORAGE_PORT
          value: "6379"
        - name: TYK_GW_STORAGE_DATABASE
          value: "0"
        volumeMounts:
        - name: config
          mountPath: /opt/tyk-gateway/tyk.conf
          subPath: tyk.conf
        livenessProbe:
          httpGet:
            path: /hello
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /hello
            port: 8080
          initialDelaySeconds: 5
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
          name: tyk-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: tyk-gateway
  namespace: tyk
spec:
  selector:
    app: tyk-gateway
  ports:
  - port: 8080
    targetPort: 8080
    name: http
  type: LoadBalancer
```

Apply configurations:

```bash
kubectl apply -f tyk-gateway-config.yaml
kubectl apply -f tyk-gateway-deployment.yaml
```

## Installing with Helm

Use Tyk's Helm chart for simplified deployment:

```bash
helm repo add tyk-helm https://helm.tyk.io/public/helm/charts/
helm repo update

# Create values file
cat > tyk-values.yaml <<EOF
gateway:
  kind: Deployment
  replicaCount: 3
  service:
    type: LoadBalancer

redis:
  shards: 1
  useSSL: false

  storage:
    master:
      persistence:
        enabled: true
        size: 20Gi
EOF

helm install tyk tyk-helm/tyk-oss \
  -n tyk --create-namespace \
  -f tyk-values.yaml
```

## Creating API Definitions

Define an API:

```json
{
  "name": "Example API",
  "slug": "example-api",
  "api_id": "example-api-id",
  "org_id": "default",
  "use_keyless": false,
  "auth": {
    "auth_header_name": "Authorization"
  },
  "definition": {
    "location": "header",
    "key": "x-api-version"
  },
  "version_data": {
    "not_versioned": true,
    "versions": {
      "Default": {
        "name": "Default",
        "use_extended_paths": true,
        "extended_paths": {
          "ignored": [],
          "white_list": [],
          "black_list": []
        }
      }
    }
  },
  "proxy": {
    "listen_path": "/example/",
    "target_url": "http://backend-service.default.svc.cluster.local:8080/",
    "strip_listen_path": true
  },
  "active": true
}
```

Load API definition via Tyk's API:

```bash
# Port-forward to Tyk Gateway
kubectl port-forward -n tyk svc/tyk-gateway 8080:8080

# Create API
curl http://localhost:8080/tyk/apis \
  -H "X-Tyk-Authorization: your-secret-key-change-me" \
  -H "Content-Type: application/json" \
  -d @api-definition.json

# Reload Tyk
curl http://localhost:8080/tyk/reload \
  -H "X-Tyk-Authorization: your-secret-key-change-me"
```

## Managing APIs via Kubernetes ConfigMaps

Store API definitions in ConfigMaps:

```yaml
# api-definitions.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-definitions
  namespace: tyk
data:
  example-api.json: |
    {
      "name": "Example API",
      "api_id": "example-api-id",
      "org_id": "default",
      "use_keyless": true,
      "proxy": {
        "listen_path": "/api/",
        "target_url": "http://backend.default.svc.cluster.local:8080/",
        "strip_listen_path": true
      },
      "active": true
    }
```

Mount in Gateway deployment:

```yaml
volumeMounts:
- name: apis
  mountPath: /opt/tyk-gateway/apps
volumes:
- name: apis
  configMap:
    name: api-definitions
```

## Redis Clustering for High Availability

Deploy Redis cluster for production:

```bash
helm install redis bitnami/redis-cluster \
  -n tyk \
  --set cluster.nodes=6 \
  --set cluster.replicas=1 \
  --set persistence.enabled=true \
  --set persistence.size=20Gi
```

Update Tyk configuration:

```json
"storage": {
  "type": "redis",
  "host": "redis-cluster.tyk.svc.cluster.local",
  "port": 6379,
  "enable_cluster": true,
  "addrs": [
    "redis-cluster-0.redis-cluster-headless.tyk.svc.cluster.local:6379",
    "redis-cluster-1.redis-cluster-headless.tyk.svc.cluster.local:6379",
    "redis-cluster-2.redis-cluster-headless.tyk.svc.cluster.local:6379"
  ]
}
```

## Testing Tyk Gateway

Test API access:

```bash
TYK_GATEWAY=$(kubectl get svc tyk-gateway -n tyk -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Health check
curl http://${TYK_GATEWAY}:8080/hello

# API request
curl http://${TYK_GATEWAY}:8080/api/test
```

## Monitoring Tyk and Redis

Enable Prometheus metrics:

```json
"enable_analytics": true,
"analytics_config": {
  "type": "prometheus"
}
```

Monitor Redis:

```bash
kubectl exec -it redis-0 -n tyk -- redis-cli INFO stats
kubectl exec -it redis-0 -n tyk -- redis-cli DBSIZE
```

## Best Practices

**Use Redis persistence** - Enable AOF or RDB snapshots to prevent data loss.

**Cluster Redis for HA** - Deploy Redis in cluster mode for production resilience.

**Monitor Redis memory** - Set maxmemory policies and monitor usage.

**Configure rate limits appropriately** - Balance protection with legitimate usage patterns.

**Use connection pooling** - Configure optimal Redis connection pool sizes.

**Enable TLS** - Encrypt Redis connections in production environments.

**Backup Redis regularly** - Implement automated Redis backup procedures.

## Conclusion

Deploying Tyk Gateway with Redis on Kubernetes creates a scalable API management platform suitable for production workloads. Redis provides the low-latency data store required for rate limiting and session management, while Tyk's horizontal scaling enables handling high request volumes. By leveraging Kubernetes for orchestration and Redis clustering for high availability, this architecture delivers enterprise-grade API Gateway capabilities with operational simplicity and proven scalability.
