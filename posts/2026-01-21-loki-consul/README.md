# How to Use Loki with Consul for Service Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Consul, Service Discovery, KV Store, Distributed Systems, HashiCorp

Description: A comprehensive guide to using Consul with Grafana Loki for service discovery and KV store, covering Consul configuration, ring setup, multi-datacenter deployments, and production best practices.

---

Consul provides robust service discovery and key-value storage for distributed systems. This guide covers how to integrate Loki with Consul for reliable cluster coordination in enterprise environments.

## Prerequisites

Before starting, ensure you have:

- Consul cluster deployed and healthy
- Loki deployed in distributed mode
- Network connectivity between Loki and Consul
- Understanding of Consul concepts

## Why Use Consul with Loki

### Benefits Over Memberlist

- Persistent state storage
- Built-in ACLs and security
- Multi-datacenter support
- External observability
- Battle-tested at scale

### Use Cases

- Large-scale deployments (100+ nodes)
- Multi-datacenter setups
- Enterprise environments with existing Consul
- Strict security requirements

## Consul Setup

### Consul Cluster Configuration

```hcl
# consul-server.hcl
datacenter = "dc1"
server = true
bootstrap_expect = 3

ui_config {
  enabled = true
}

connect {
  enabled = true
}

ports {
  http = 8500
  dns = 8600
  server = 8300
  serf_lan = 8301
  serf_wan = 8302
}

# ACL configuration
acl {
  enabled = true
  default_policy = "deny"
  enable_token_persistence = true
}
```

### Consul Kubernetes Deployment

```yaml
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: consul
  namespace: consul
spec:
  chart: consul
  repo: https://helm.releases.hashicorp.com
  targetNamespace: consul
  valuesContent: |-
    global:
      datacenter: dc1
      gossipEncryption:
        secretName: consul-gossip-key
        secretKey: key
    server:
      replicas: 3
      storage: 10Gi
      storageClass: fast-ssd
    connectInject:
      enabled: true
```

## Loki Configuration with Consul

### Basic Configuration

```yaml
common:
  ring:
    kvstore:
      store: consul
      consul:
        host: consul.consul.svc:8500
```

### Complete Consul KV Configuration

```yaml
common:
  ring:
    kvstore:
      store: consul
      prefix: loki/
      consul:
        host: consul.consul.svc:8500
        acl_token: ${CONSUL_ACL_TOKEN}
        http_client_timeout: 20s
        consistent_reads: false
        watch_rate_limit: 1
        watch_burst_size: 1
```

### Per-Component Ring Configuration

```yaml
ingester:
  lifecycler:
    ring:
      kvstore:
        store: consul
        consul:
          host: consul.consul.svc:8500
      replication_factor: 3
    num_tokens: 128

distributor:
  ring:
    kvstore:
      store: consul
      consul:
        host: consul.consul.svc:8500

compactor:
  compactor_ring:
    kvstore:
      store: consul
      consul:
        host: consul.consul.svc:8500

ruler:
  ring:
    kvstore:
      store: consul
      consul:
        host: consul.consul.svc:8500
```

## Consul ACL Setup

### Create Loki Policy

```hcl
# loki-policy.hcl
key_prefix "loki/" {
  policy = "write"
}

service_prefix "loki" {
  policy = "write"
}

session_prefix "" {
  policy = "write"
}
```

### Create Token

```bash
# Create policy
consul acl policy create \
  -name loki \
  -rules @loki-policy.hcl

# Create token
consul acl token create \
  -policy-name loki \
  -description "Loki service token"
```

### Kubernetes Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: loki-consul-token
  namespace: loki
type: Opaque
stringData:
  token: "your-consul-acl-token"
```

### Use Token in Loki

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki-ingester
spec:
  template:
    spec:
      containers:
        - name: ingester
          env:
            - name: CONSUL_ACL_TOKEN
              valueFrom:
                secretKeyRef:
                  name: loki-consul-token
                  key: token
```

## TLS Configuration

### Consul TLS

```yaml
common:
  ring:
    kvstore:
      store: consul
      consul:
        host: consul.consul.svc:8501  # HTTPS port
        ca_path: /etc/consul/ca.crt
        cert_path: /etc/consul/client.crt
        key_path: /etc/consul/client.key
```

### Mount Certificates

```yaml
spec:
  containers:
    - name: ingester
      volumeMounts:
        - name: consul-certs
          mountPath: /etc/consul
          readOnly: true
  volumes:
    - name: consul-certs
      secret:
        secretName: consul-client-certs
```

## Multi-Datacenter Setup

### Consul WAN Federation

```hcl
# DC1 configuration
datacenter = "dc1"
primary_datacenter = "dc1"
translate_wan_addrs = true

# DC2 configuration
datacenter = "dc2"
primary_datacenter = "dc1"
retry_join_wan = ["dc1-consul.example.com:8302"]
```

### Loki Multi-DC Configuration

```yaml
# DC1 Loki
common:
  ring:
    kvstore:
      store: consul
      prefix: loki-dc1/
      consul:
        host: consul-dc1.consul.svc:8500

# DC2 Loki
common:
  ring:
    kvstore:
      store: consul
      prefix: loki-dc2/
      consul:
        host: consul-dc2.consul.svc:8500
```

## Service Registration

### Register Loki Services

```yaml
# Consul service definition for Loki gateway
apiVersion: v1
kind: ConfigMap
metadata:
  name: consul-loki-service
data:
  loki-gateway.json: |
    {
      "service": {
        "name": "loki-gateway",
        "port": 3100,
        "tags": ["loki", "gateway"],
        "check": {
          "http": "http://localhost:3100/ready",
          "interval": "10s",
          "timeout": "5s"
        }
      }
    }
```

### Service Discovery for Promtail

```yaml
# Promtail using Consul for Loki discovery
clients:
  - url: http://loki-gateway.service.consul:3100/loki/api/v1/push
```

## Monitoring

### Consul Metrics

```promql
# Consul health checks
consul_health_service_status{service="loki"}

# KV operations
rate(consul_kvs_apply_count[5m])

# Session operations
consul_session_ttl_active
```

### Loki Consul Metrics

```promql
# KV store operations
rate(cortex_kv_request_duration_seconds_count[5m])

# Ring membership from Consul
cortex_ring_members{name="ingester"}
```

### Alerts

```yaml
groups:
  - name: loki-consul
    rules:
      - alert: ConsulUnhealthy
        expr: consul_health_service_status{service="loki"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Consul reports Loki service unhealthy"

      - alert: ConsulKVLatencyHigh
        expr: |
          histogram_quantile(0.99, rate(cortex_kv_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High Consul KV latency"
```

## Troubleshooting

### Check Consul Health

```bash
# Check Consul cluster
consul members

# Check service health
consul catalog services
consul health service loki

# Check KV entries
consul kv get -recurse loki/
```

### Common Issues

#### 1. Connection Refused

```bash
# Verify Consul connectivity
kubectl exec -n loki loki-ingester-0 -- nc -zv consul.consul.svc 8500

# Check Consul logs
kubectl logs -n consul consul-server-0
```

#### 2. ACL Denied

```bash
# Test token permissions
consul kv put -token=<token> loki/test "test"

# Check ACL policy
consul acl policy read loki
```

#### 3. Ring Not Syncing

```bash
# Check Loki logs
kubectl logs -n loki loki-ingester-0 | grep -i consul

# Check ring status
curl http://loki:3100/ring
```

## Migration from Memberlist

### Step 1: Deploy Consul

```bash
helm install consul hashicorp/consul -n consul
```

### Step 2: Update Configuration

```yaml
# Add Consul configuration while keeping memberlist
common:
  ring:
    kvstore:
      store: consul
      consul:
        host: consul.consul.svc:8500
```

### Step 3: Rolling Restart

```bash
kubectl rollout restart statefulset/loki-ingester -n loki
kubectl rollout restart deployment/loki-distributor -n loki
```

### Step 4: Verify

```bash
# Check ring uses Consul
curl http://loki:3100/ring

# Verify in Consul
consul kv get -recurse loki/
```

## Complete Configuration Example

```yaml
auth_enabled: true

server:
  http_listen_port: 3100
  grpc_listen_port: 9095
  log_level: info

common:
  path_prefix: /loki
  replication_factor: 3
  ring:
    kvstore:
      store: consul
      prefix: loki/
      consul:
        host: consul.consul.svc:8500
        acl_token: ${CONSUL_ACL_TOKEN}
        http_client_timeout: 20s

ingester:
  lifecycler:
    ring:
      kvstore:
        store: consul
        consul:
          host: consul.consul.svc:8500
          acl_token: ${CONSUL_ACL_TOKEN}
      replication_factor: 3
    num_tokens: 128
    heartbeat_period: 5s
    join_after: 30s
    min_ready_duration: 15s
    final_sleep: 30s
  wal:
    enabled: true
    dir: /loki/wal

distributor:
  ring:
    kvstore:
      store: consul
      consul:
        host: consul.consul.svc:8500
        acl_token: ${CONSUL_ACL_TOKEN}

compactor:
  compactor_ring:
    kvstore:
      store: consul
      consul:
        host: consul.consul.svc:8500
        acl_token: ${CONSUL_ACL_TOKEN}

ruler:
  ring:
    kvstore:
      store: consul
      consul:
        host: consul.consul.svc:8500
        acl_token: ${CONSUL_ACL_TOKEN}

storage_config:
  aws:
    s3: s3://us-east-1/loki-bucket

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: loki_index_
        period: 24h
```

## Best Practices

### Security

1. Always use ACL tokens
2. Enable TLS for Consul communication
3. Use separate tokens per environment
4. Rotate tokens regularly

### Performance

1. Use local Consul agents when possible
2. Set appropriate timeouts
3. Monitor KV latency
4. Consider consistent reads for critical operations

### Operations

1. Monitor Consul health
2. Back up Consul data
3. Plan for Consul maintenance
4. Document ACL policies

## Conclusion

Consul provides enterprise-grade service discovery for Loki. Key takeaways:

- Configure ACLs for security
- Use TLS for encrypted communication
- Monitor Consul health alongside Loki
- Consider Consul for multi-DC deployments
- Migrate carefully from memberlist

With proper Consul integration, Loki gains robust, persistent cluster coordination suitable for large-scale deployments.
