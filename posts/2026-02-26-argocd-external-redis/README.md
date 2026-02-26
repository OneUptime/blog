# How to Configure ArgoCD with External Redis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Redis, Infrastructure

Description: Learn how to configure ArgoCD to use an external Redis instance such as AWS ElastiCache, Google Memorystore, or Azure Cache for Redis instead of the built-in Redis.

---

ArgoCD ships with a built-in Redis instance, but production environments often benefit from using a managed external Redis service. External Redis provides better persistence, monitoring, automatic patching, and can be shared across multiple ArgoCD instances. This guide covers how to connect ArgoCD to AWS ElastiCache, Google Memorystore, Azure Cache for Redis, and self-hosted external Redis.

## Why Use External Redis

There are several advantages to running Redis outside the ArgoCD installation:

- **Managed HA**: Cloud providers handle replication, failover, and patching
- **Better monitoring**: Native cloud monitoring tools (CloudWatch, Cloud Monitoring, Azure Monitor)
- **Persistence guarantees**: Managed services offer configurable backup and restore
- **Resource isolation**: Redis does not compete with ArgoCD pods for node resources
- **Compliance**: Some organizations require databases to run on managed services

The downside is added network latency between ArgoCD pods and the external Redis. For most deployments, this latency (typically under 1ms within the same region) is negligible.

## General Configuration

Regardless of which external Redis you use, the ArgoCD configuration follows the same pattern. You need to:

1. Disable the built-in Redis
2. Point ArgoCD components at the external Redis endpoint
3. Configure authentication if required

### Helm Configuration

```yaml
# argocd-external-redis-values.yaml

# Disable built-in Redis
redis:
  enabled: false

# Disable Redis HA (we are using external)
redis-ha:
  enabled: false

# Configure external Redis
externalRedis:
  host: your-redis-endpoint.example.com
  port: 6379
  # Optional: password for AUTH
  password: ""
  # Optional: reference to an existing secret containing the password
  existingSecret: "argocd-redis-password"
  secretKey: "redis-password"
```

### ConfigMap Configuration (Without Helm)

If you are not using Helm, configure external Redis through the argocd-cmd-params-cm ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  redis.server: "your-redis-endpoint.example.com:6379"
```

For password authentication, create a Secret and reference it:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-redis-password
  namespace: argocd
type: Opaque
stringData:
  redis-password: "your-secure-redis-password"
```

Then update the ArgoCD deployments to use this password. Each component needs the REDIS_PASSWORD environment variable:

```yaml
# Patch for the API server
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: argocd-redis-password
                  key: redis-password
```

Apply the same patch to argocd-application-controller and argocd-repo-server.

## AWS ElastiCache Configuration

### Create ElastiCache Redis Cluster

```bash
# Create a subnet group in the same VPC as your EKS cluster
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name argocd-redis \
  --cache-subnet-group-description "Subnet group for ArgoCD Redis" \
  --subnet-ids subnet-abc123 subnet-def456

# Create a security group
aws ec2 create-security-group \
  --group-name argocd-redis-sg \
  --description "Security group for ArgoCD Redis" \
  --vpc-id vpc-123456

# Allow traffic from EKS nodes
aws ec2 authorize-security-group-ingress \
  --group-id sg-redis123 \
  --protocol tcp \
  --port 6379 \
  --source-group sg-eks-nodes

# Create ElastiCache replication group (HA)
aws elasticache create-replication-group \
  --replication-group-id argocd-redis \
  --replication-group-description "ArgoCD Redis cache" \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.r6g.large \
  --num-cache-clusters 3 \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --cache-subnet-group-name argocd-redis \
  --security-group-ids sg-redis123 \
  --transit-encryption-enabled \
  --auth-token "your-secure-auth-token" \
  --at-rest-encryption-enabled
```

### Configure ArgoCD for ElastiCache

```yaml
# argocd-elasticache-values.yaml
redis:
  enabled: false

redis-ha:
  enabled: false

externalRedis:
  host: argocd-redis.abcdef.ng.0001.use1.cache.amazonaws.com
  port: 6379
  existingSecret: argocd-redis-password
  secretKey: redis-password

# If using TLS (transit encryption enabled)
configs:
  params:
    redis.tls.enabled: "true"
    # ElastiCache uses Amazon-signed certificates
    redis.tls.insecure: "false"
```

Create the password Secret:

```bash
kubectl create secret generic argocd-redis-password \
  -n argocd \
  --from-literal=redis-password="your-secure-auth-token"
```

## Google Memorystore Configuration

### Create Memorystore Instance

```bash
# Create a Redis instance
gcloud redis instances create argocd-redis \
  --size=2 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=standard \
  --reserved-ip-range=redis-range \
  --auth-enabled \
  --transit-encryption-mode=SERVER_AUTHENTICATION

# Get the connection details
gcloud redis instances describe argocd-redis --region=us-central1
```

### Configure ArgoCD for Memorystore

```yaml
redis:
  enabled: false

redis-ha:
  enabled: false

externalRedis:
  host: 10.0.0.3  # Memorystore private IP
  port: 6379
  existingSecret: argocd-redis-password
  secretKey: redis-password
```

## Azure Cache for Redis Configuration

### Create Azure Cache

```bash
# Create Azure Cache for Redis
az redis create \
  --name argocd-redis \
  --resource-group myResourceGroup \
  --location eastus \
  --sku Premium \
  --vm-size P1 \
  --replicas-per-master 2 \
  --enable-non-ssl-port false \
  --minimum-tls-version 1.2

# Get the connection string
az redis show \
  --name argocd-redis \
  --resource-group myResourceGroup \
  --query "[hostName,sslPort]" -o tsv

# Get the access key
az redis list-keys \
  --name argocd-redis \
  --resource-group myResourceGroup
```

### Configure ArgoCD for Azure Cache

```yaml
redis:
  enabled: false

redis-ha:
  enabled: false

externalRedis:
  host: argocd-redis.redis.cache.windows.net
  port: 6380  # Azure uses 6380 for TLS
  existingSecret: argocd-redis-password
  secretKey: redis-password

configs:
  params:
    redis.tls.enabled: "true"
```

## Self-Hosted External Redis

If you run your own Redis outside the ArgoCD namespace:

```yaml
redis:
  enabled: false

redis-ha:
  enabled: false

externalRedis:
  host: redis.infrastructure.svc.cluster.local
  port: 6379
  existingSecret: argocd-redis-password
  secretKey: redis-password
```

## TLS Configuration

Most managed Redis services require or strongly recommend TLS. Configure ArgoCD to use TLS:

```yaml
configs:
  params:
    # Enable Redis TLS
    redis.tls.enabled: "true"
    # Set to true only for self-signed certs in development
    redis.tls.insecure: "false"
```

If using a custom CA for your Redis TLS:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  redis-ca.pem: |
    -----BEGIN CERTIFICATE-----
    ... your CA certificate ...
    -----END CERTIFICATE-----
```

## Connection Testing

After configuring external Redis, verify the connection:

```bash
# Run a test pod in the argocd namespace
kubectl run redis-test --rm -it \
  --namespace=argocd \
  --image=redis:7-alpine \
  --restart=Never -- sh

# Inside the pod, test the connection
redis-cli -h your-redis-endpoint.example.com -p 6379 -a "your-password" ping
# Expected: PONG

# Test with TLS
redis-cli -h your-redis-endpoint.example.com -p 6380 --tls -a "your-password" ping
# Expected: PONG

# Check info
redis-cli -h your-redis-endpoint.example.com -p 6379 -a "your-password" info server
```

Then verify ArgoCD components can connect:

```bash
# Check ArgoCD controller logs for Redis errors
kubectl logs deployment/argocd-application-controller -n argocd | grep -i redis

# Check API server logs
kubectl logs deployment/argocd-server -n argocd | grep -i redis

# If everything is clean, test ArgoCD functionality
argocd app list
```

## Performance Considerations

- **Latency**: Keep external Redis in the same region/zone as your ArgoCD cluster. Cross-region latency adds up with hundreds of cache operations per second.
- **Instance size**: ArgoCD's Redis usage is moderate. A cache.r6g.medium (ElastiCache) or P1 (Azure) is sufficient for most deployments.
- **Connection limits**: Managed Redis instances have connection limits. With 3 API servers, 3 repo servers, and 2 controllers, you need at least 8 connections. Most managed services support thousands.

Using external Redis simplifies ArgoCD operations by offloading cache management to a dedicated service. Cloud-managed Redis provides better availability guarantees than running Redis inside Kubernetes. For monitoring both ArgoCD and its Redis dependency, check out our guide on [monitoring ArgoCD component health](https://oneuptime.com/blog/post/2026-02-26-argocd-monitor-component-health/view).
