# How to Configure Vault Performance Standby Nodes on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, High Availability, Performance Standbys, Kubernetes, Enterprise

Description: Learn how to deploy and configure HashiCorp Vault Enterprise performance standby nodes in Kubernetes for improved read scalability and disaster recovery capabilities.

---

HashiCorp Vault Enterprise performance standby nodes provide read scalability while maintaining high availability. Unlike traditional standby nodes that forward requests to the active node, performance standbys can serve most read-only requests locally, significantly improving cluster capacity. This guide covers deploying and configuring performance standby nodes in Kubernetes environments.

## Understanding Performance Standbys

In a standard Vault cluster, only the active node handles all requests directly. Standby nodes forward requests to the active node and wait to take over if the active node fails. Performance standbys change this model by enabling standby nodes to handle read-only operations, reducing load on the active node.

Performance standbys maintain replicas of Vault's data through replication from the active node. They can serve token lookups, secret reads, and other read-only requests without forwarding requests to the active node. Write operations still route to the active node.

This architecture provides several benefits. Read throughput scales with the number of performance standbys. Applications can connect to any node, improving availability. Failover is faster because standbys are already processing requests.

Performance standbys are an Enterprise feature requiring a Vault Enterprise license.

## Configuring Raft Storage for Performance Standbys

Performance standbys work with Integrated Storage (Raft). Configure Raft for high availability:

```hcl
# vault-config.hcl

ui = true

listener "tcp" {
  address         = "0.0.0.0:8200"
  cluster_address = "0.0.0.0:8201"
  tls_cert_file   = "/vault/tls/tls.crt"
  tls_key_file    = "/vault/tls/tls.key"
}

storage "raft" {
  path = "/vault/data"

  retry_join {
    leader_api_addr = "https://vault-0.vault-internal:8200"
    leader_ca_cert_file = "/vault/tls/ca.crt"
  }

  retry_join {
    leader_api_addr = "https://vault-1.vault-internal:8200"
    leader_ca_cert_file = "/vault/tls/ca.crt"
  }

  retry_join {
    leader_api_addr = "https://vault-2.vault-internal:8200"
    leader_ca_cert_file = "/vault/tls/ca.crt"
  }
}

seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/abc-123"
}

# Set VAULT_API_ADDR, VAULT_CLUSTER_ADDR, and VAULT_RAFT_NODE_ID per pod in Kubernetes.

license_path = "/vault/license/license.hclic"
```

## Deploying Vault StatefulSet with Performance Standbys

Create a StatefulSet that supports multiple performance standbys:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: vault-internal
  namespace: vault-system
spec:
  publishNotReadyAddresses: true
  clusterIP: None
  ports:
  - name: api
    port: 8200
    targetPort: 8200
  - name: cluster
    port: 8201
    targetPort: 8201
  selector:
    app: vault
---
apiVersion: v1
kind: Service
metadata:
  name: vault
  namespace: vault-system
spec:
  type: LoadBalancer
  ports:
  - name: api
    port: 8200
    targetPort: 8200
  selector:
    app: vault
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: vault
  namespace: vault-system
spec:
  serviceName: vault-internal
  replicas: 5  # 1 active + 4 performance standbys
  selector:
    matchLabels:
      app: vault
  template:
    metadata:
      labels:
        app: vault
    spec:
      serviceAccountName: vault
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: vault
            topologyKey: kubernetes.io/hostname
      containers:
      - name: vault
        image: hashicorp/vault-enterprise:1.21
        env:
        - name: HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: VAULT_K8S_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: VAULT_K8S_POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: VAULT_RAFT_NODE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: VAULT_API_ADDR
          value: "https://$(HOSTNAME).vault-internal.$(VAULT_K8S_NAMESPACE).svc.cluster.local:8200"
        - name: VAULT_CLUSTER_ADDR
          value: "https://$(HOSTNAME).vault-internal.$(VAULT_K8S_NAMESPACE).svc.cluster.local:8201"
        args:
        - "server"
        - "-config=/vault/config/vault.hcl"
        ports:
        - containerPort: 8200
          name: api
        - containerPort: 8201
          name: cluster
        readinessProbe:
          httpGet:
            path: /v1/sys/health?standbyok=true&perfstandbyok=true
            port: 8200
            scheme: HTTPS
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /v1/sys/health?standbyok=true&perfstandbyok=true
            port: 8200
            scheme: HTTPS
          initialDelaySeconds: 60
          periodSeconds: 10
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        volumeMounts:
        - name: config
          mountPath: /vault/config
        - name: data
          mountPath: /vault/data
        - name: tls
          mountPath: /vault/tls
        - name: license
          mountPath: /vault/license
      volumes:
      - name: config
        configMap:
          name: vault-config
      - name: tls
        secret:
          secretName: vault-tls
      - name: license
        secret:
          secretName: vault-license
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 10Gi
```

Note the health check endpoint uses `standbyok=true&perfstandbyok=true` to consider standby and performance standby nodes healthy.

## Initializing the Vault Cluster

Initialize and unseal the cluster:

```bash
# Initialize on first pod
kubectl exec -n vault-system vault-0 -- vault operator init \
    -key-shares=5 \
    -key-threshold=3 \
    -format=json > vault-keys.json

# With auto-unseal, Vault unseals automatically
# Verify status
kubectl exec -n vault-system vault-0 -- vault status

# The retry_join stanzas add the remaining nodes after the first node is initialized.
# Check cluster members
kubectl exec -n vault-system vault-0 -- vault operator raft list-peers
```

## Verifying Performance Standby Status

Check which nodes are performance standbys:

```bash
# Check status of each node
for i in {0..4}; do
    echo "Node vault-$i:"
    kubectl exec -n vault-system vault-$i -- vault status | grep -E "HA Mode|Performance Standby Node"
done

# Output shows:
# Node vault-0:
# HA Mode             active
# Performance Standby Node    false
# Node vault-1:
# HA Mode             standby
# Performance Standby Node    true
# Node vault-2:
# HA Mode             standby
# Performance Standby Node    true
```

Query detailed information:

```bash
# Get detailed cluster info (requires admin token)
kubectl exec -n vault-system vault-0 -- vault read sys/leader

# Check enterprise replication status, if performance or DR replication is enabled
kubectl exec -n vault-system vault-0 -- vault read -format=json sys/replication/status
```

## Configuring Applications to Use Performance Standbys

Applications should connect to any Vault node. The Kubernetes service load balances across all pods:

```go
package main

import (
    "fmt"
    "github.com/hashicorp/vault/api"
)

func createVaultClient() (*api.Client, error) {
    config := api.DefaultConfig()

    // Use service name - will load balance across all nodes
    config.Address = "https://vault.vault-system.svc.cluster.local:8200"

    // Configure retry on standby forwarding
    config.MaxRetries = 3

    client, err := api.NewClient(config)
    if err != nil {
        return nil, fmt.Errorf("failed to create client: %w", err)
    }

    return client, nil
}

// Read operations automatically use performance standbys
func readSecret(client *api.Client, path string) (map[string]interface{}, error) {
    secret, err := client.Logical().Read(path)
    if err != nil {
        return nil, err
    }

    return secret.Data, nil
}

// Write operations automatically forward to active node
func writeSecret(client *api.Client, path string, data map[string]interface{}) error {
    _, err := client.Logical().Write(path, data)
    return err
}
```

## Implementing Client-Side Load Balancing

For more control, implement client-side load balancing:

```go
package main

import (
    "fmt"
    "math/rand"
    "sync"
    "github.com/hashicorp/vault/api"
)

type VaultClientPool struct {
    clients []*api.Client
    mu      sync.Mutex
    index   int
}

func NewVaultClientPool(addresses []string) (*VaultClientPool, error) {
    pool := &VaultClientPool{
        clients: make([]*api.Client, len(addresses)),
    }

    for i, addr := range addresses {
        config := api.DefaultConfig()
        config.Address = addr

        client, err := api.NewClient(config)
        if err != nil {
            return nil, fmt.Errorf("failed to create client for %s: %w", addr, err)
        }

        pool.clients[i] = client
    }

    return pool, nil
}

// GetClient returns a client using round-robin selection
func (p *VaultClientPool) GetClient() *api.Client {
    p.mu.Lock()
    defer p.mu.Unlock()

    client := p.clients[p.index]
    p.index = (p.index + 1) % len(p.clients)

    return client
}

// GetRandomClient returns a random client
func (p *VaultClientPool) GetRandomClient() *api.Client {
    return p.clients[rand.Intn(len(p.clients))]
}

// Usage
func main() {
    addresses := []string{
        "https://vault-0.vault-internal.vault-system.svc.cluster.local:8200",
        "https://vault-1.vault-internal.vault-system.svc.cluster.local:8200",
        "https://vault-2.vault-internal.vault-system.svc.cluster.local:8200",
    }

    pool, err := NewVaultClientPool(addresses)
    if err != nil {
        panic(err)
    }

    // Use different nodes for each request
    client := pool.GetClient()
    secret, err := client.Logical().Read("secret/data/myapp")
    if err != nil {
        panic(err)
    }

    fmt.Printf("Secret: %v\n", secret.Data)
}
```

## Monitoring Performance Standby Health

Track performance standby metrics with Prometheus:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-vault-rules
  namespace: monitoring
data:
  performance-standby-rules.yaml: |
    groups:
    - name: vault-performance-standbys
      rules:
      - record: vault_performance_standby_count
        expr: sum(vault_core_performance_standby)

      - alert: PerformanceStandbyDown
        expr: vault_performance_standby_count < 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Insufficient performance standbys available"

      - alert: PerformanceStandbyReplicationLag
        expr: vault_ha_rpc_client_echo_sum / vault_ha_rpc_client_echo_count > 1000
        labels:
          severity: warning
        annotations:
          summary: "Performance standby active-node echo latency is high"

      - record: vault_read_request_distribution
        expr: |
          sum by (instance) (rate(vault_core_handle_request_count[5m]))
```

## Handling Failover and Recovery

Voting standby nodes automatically take over when the active node fails:

```bash
# Simulate active node failure
kubectl delete pod vault-0 -n vault-system

# Watch failover occur
kubectl get pods -n vault-system -w

# One standby becomes active automatically
# Check new active node
kubectl exec -n vault-system vault-1 -- vault status
```

Configure fast failover detection:

```hcl
storage "raft" {
  path = "/vault/data"

  # Lower values detect leader failures faster at the cost of more network and CPU usage.
  performance_multiplier = 1
}
```

## Scaling Performance Standbys

Add more performance standbys by increasing replicas:

```bash
# Scale to 7 nodes (1 active + 6 performance standbys)
kubectl scale statefulset vault -n vault-system --replicas=7

# Wait for new pods
kubectl wait --for=condition=ready pod/vault-5 -n vault-system --timeout=300s
kubectl wait --for=condition=ready pod/vault-6 -n vault-system --timeout=300s

# The retry_join stanzas add the new pods to the cluster.

# Verify cluster membership
kubectl exec -n vault-system vault-0 -- vault operator raft list-peers
```

## Best Practices

Deploy performance standbys in different availability zones for geographic distribution. This improves both availability and read latency for distributed applications.

Size performance standby nodes appropriately. They handle the same read load as the active node, so provide similar resource allocations.

Monitor replication lag between active and standby nodes. High lag indicates network issues or insufficient resources on standby nodes.

Use client-side load balancing for applications with high read volumes. This ensures even distribution across all performance standbys.

Plan capacity based on read/write ratio. Performance standbys help scale read operations but don't improve write throughput.

## Conclusion

Performance standby nodes transform Vault from a single-node bottleneck into a horizontally scalable secrets management platform. By distributing read operations across multiple nodes while maintaining consistency through streaming replication, you can support larger application fleets without sacrificing high availability. This architecture is essential for production Kubernetes environments with demanding performance requirements.

Implement performance standbys to improve both scalability and resilience of your Vault deployment.
