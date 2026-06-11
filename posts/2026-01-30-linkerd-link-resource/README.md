# How to Create Linkerd Link Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Linkerd, Kubernetes, ServiceMesh, MultiCluster

Description: A practical guide to configuring Linkerd Link resources for secure multi-cluster service mesh connectivity.

---

Linkerd multi-cluster enables services to communicate across Kubernetes clusters as if they were in the same cluster. The Link resource is the core custom resource that defines how one cluster connects to another.

## Multi-Cluster Architecture Overview

```mermaid
flowchart TB
    subgraph Source Cluster
        SVC1[Service A] --> SM1[Linkerd Proxy]
        SM1 --> MC1[Multi-Cluster Gateway]
    end

    subgraph Target Cluster
        MC2[Multi-Cluster Gateway] --> SM2[Linkerd Proxy]
        SM2 --> SVC2[Service B]
        SM2 --> SVC3[Service C]
    end

    MC1 -->|mTLS over Internet| MC2

    subgraph Link Resource
        LR[Link CRD]
        LR -.->|Configures| MC1
        LR -.->|References| MC2
    end
```

## Prerequisites

Before creating a Link resource, you need:

1. Linkerd installed on both clusters with multi-cluster extension
2. A shared trust anchor between clusters
3. The target cluster's gateway exposed externally

```bash
# Install Linkerd multi-cluster extension on both clusters

linkerd multicluster install | kubectl apply -f -

# Verify the installation
linkerd multicluster check
```

## Link Resource Specification

The Link resource defines how your source cluster connects to a target cluster. Here is the complete specification:

```yaml
# link.yaml - Defines connection from source to target cluster
apiVersion: multicluster.linkerd.io/v1alpha3
kind: Link
metadata:
  name: target-cluster        # Name used to identify this link
  namespace: linkerd-multicluster
spec:
  # Secret containing a kubeconfig for the target cluster
  clusterCredentialsSecret: cluster-credentials-target-cluster

  # Target cluster name - used in service mirror naming
  targetClusterName: target-cluster

  # Gateway address configuration
  gatewayAddress: gateway.target-cluster.example.com
  gatewayPort: "4143"
  gatewayIdentity: gateway.linkerd-multicluster.serviceaccount.identity.linkerd.cluster.local

  # Probe specification for health checking
  probeSpec:
    path: /ready
    port: "4191"
    period: 3s

  # Service selector - which services to mirror
  selector:
    matchLabels:
      mirror.linkerd.io/exported: "true"

  # Remote discovery selector - which services to mirror in remote discovery mode
  remoteDiscoverySelector:
    matchLabels:
      mirror.linkerd.io/exported: "remote-discovery"
```

## Gateway Address Configuration

The gateway address tells your cluster where to send traffic destined for the target cluster.

```yaml
# External gateway with DNS
spec:
  gatewayAddress: linkerd-gateway.prod-east.example.com
  gatewayPort: "4143"
  gatewayIdentity: gateway.linkerd-multicluster.serviceaccount.identity.linkerd.cluster.local
```

```yaml
# Gateway with IP address (not recommended for production)
spec:
  gatewayAddress: 203.0.113.50
  gatewayPort: "4143"
  gatewayIdentity: gateway.linkerd-multicluster.serviceaccount.identity.linkerd.cluster.local
```

### Gateway Identity

The `gatewayIdentity` field specifies the expected Linkerd identity of the target gateway for mTLS verification. It follows Linkerd's service account identity format:

```text
<service-account>.<namespace>.serviceaccount.identity.linkerd.<trust-domain>
```

## Credentials Configuration

Links require credentials to authenticate with the target cluster's Kubernetes API server. These are stored as Secrets.

```yaml
# Create the kubeconfig secret for the target cluster
apiVersion: v1
kind: Secret
metadata:
  name: cluster-credentials-target
  namespace: linkerd-multicluster
type: mirror.linkerd.io/remote-kubeconfig
data:
  # Base64 encoded kubeconfig with limited permissions
  kubeconfig: <base64-encoded-kubeconfig>
```

Generate the credentials from the target cluster:

```bash
# On the target cluster - generate link credentials and the Link resource
linkerd multicluster link-gen --cluster-name target-cluster > link-credentials.yaml

# Review the generated resources
cat link-credentials.yaml

# Apply on the source cluster
kubectl apply -f link-credentials.yaml
```

The generated kubeconfig uses the remote-access service account created by the multi-cluster extension with limited permissions:

```yaml
# ServiceAccount on target cluster for remote access
apiVersion: v1
kind: ServiceAccount
metadata:
  name: linkerd-service-mirror-remote-access-default
  namespace: linkerd-multicluster
---
# ClusterRole with read-only access to resources used for service mirroring
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: linkerd-service-mirror-remote-access-default
rules:
  - apiGroups: ["apps"]
    resources: ["replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods", "endpoints", "services"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["discovery.k8s.io"]
    resources: ["endpointslices"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["policy.linkerd.io"]
    resources: ["servers"]
    verbs: ["get", "list", "watch"]
```

## Cluster Link Topology

```mermaid
flowchart LR
    subgraph Cluster A - US East
        A_APP[Application Pod]
        A_PROXY[Linkerd Proxy]
        A_MIRROR[Service Mirror Controller]
        A_GW[Gateway :4143]
        A_APP --> A_PROXY
        A_MIRROR --> A_PROXY
    end

    subgraph Cluster B - US West
        B_GW[Gateway :4143]
        B_PROXY[Linkerd Proxy]
        B_SVC[Backend Service]
        B_GW --> B_PROXY
        B_PROXY --> B_SVC
    end

    subgraph Cluster C - EU
        C_GW[Gateway :4143]
        C_PROXY[Linkerd Proxy]
        C_SVC[Backend Service]
        C_GW --> C_PROXY
        C_PROXY --> C_SVC
    end

    A_PROXY -->|Link to B| B_GW
    A_PROXY -->|Link to C| C_GW

    B_GW -.->|Link to A| A_GW
    C_GW -.->|Link to A| A_GW
```

## Service Selector for Mirror Scope

The selector field determines which services from the target cluster get mirrored to your source cluster.

### Mirror All Exported Services

```yaml
# Mirror all services with the export label
spec:
  selector:
    matchLabels:
      mirror.linkerd.io/exported: "true"
```

On the target cluster, export services by adding the label:

```bash
# Export a specific service
kubectl label svc my-service mirror.linkerd.io/exported=true

# Export all services in a namespace
kubectl label svc --all mirror.linkerd.io/exported=true -n production
```

### Mirror by Remote Discovery

```yaml
# Mirror selected services in remote discovery mode
spec:
  selector:
    matchLabels:
      mirror.linkerd.io/exported: "true"
  remoteDiscoverySelector:
    matchLabels:
      mirror.linkerd.io/exported: "remote-discovery"
```

Label the service on the target cluster:

```bash
kubectl label svc my-service mirror.linkerd.io/exported=remote-discovery -n production
```

### Mirror by Custom Labels

```yaml
# Mirror services with custom team labels
spec:
  selector:
    matchExpressions:
      - key: mirror.linkerd.io/exported
        operator: In
        values: ["true"]
      - key: team
        operator: In
        values: ["platform", "payments"]
```

## Probe Specifications for Health Checking

The probe spec defines how Linkerd checks the health of the gateway connection.

```yaml
# Standard probe configuration
spec:
  probeSpec:
    path: /ready        # Health check endpoint path
    port: "4191"        # Probe port on the gateway
    period: 3s          # How often to probe
```

### Understanding Probe Behavior

```mermaid
sequenceDiagram
    participant SM as Service Mirror
    participant GW as Remote Gateway
    participant SVC as Remote Service

    loop Every 3 seconds
        SM->>GW: GET /ready on port 4191
        alt Gateway Healthy
            GW-->>SM: 200 OK
            SM->>SM: Mark endpoints alive
        else Gateway Unhealthy
            GW-->>SM: 5xx or timeout
            SM->>SM: Mark endpoints not ready
        end
    end

    Note over SM,SVC: Traffic only flows when probes pass
```

### Custom Probe Configuration

```yaml
# Aggressive probing for critical services
spec:
  probeSpec:
    path: /ready
    port: "4191"
    period: 1s          # Check every second
```

```yaml
# Relaxed probing for stable connections
spec:
  probeSpec:
    path: /ready
    port: "4191"
    period: 10s         # Check every 10 seconds
```

## Complete Example: Three Cluster Setup

### Step 1: Install Multi-Cluster on All Clusters

```bash
# Generate shared trust anchor (do this once)
step certificate create root.linkerd.cluster.local ca.crt ca.key \
  --profile root-ca --no-password --insecure
step certificate create identity.linkerd.cluster.local issuer.crt issuer.key \
  --profile intermediate-ca --not-after 8760h --no-password --insecure \
  --ca ca.crt --ca-key ca.key

# Install Linkerd with shared trust anchor on each cluster
cat > cluster-a-multicluster-values.yaml <<EOF
controllers:
  - link:
      ref:
        name: cluster-b
  - link:
      ref:
        name: cluster-c
EOF

for ctx in cluster-a cluster-b cluster-c; do
  linkerd install --crds --context=$ctx | kubectl apply --context=$ctx -f -
  linkerd install --context=$ctx \
    --identity-trust-anchors-file ca.crt \
    --identity-issuer-certificate-file issuer.crt \
    --identity-issuer-key-file issuer.key | kubectl apply --context=$ctx -f -
  if [ "$ctx" = "cluster-a" ]; then
    linkerd multicluster install --context=$ctx -f cluster-a-multicluster-values.yaml | kubectl apply --context=$ctx -f -
  else
    linkerd multicluster install --context=$ctx | kubectl apply --context=$ctx -f -
  fi
done
```

### Step 2: Generate and Apply Links

```bash
# From cluster-b, generate link for cluster-a to use
linkerd --context=cluster-b multicluster link-gen --cluster-name=cluster-b > link-b.yaml

# From cluster-c, generate link for cluster-a to use
linkerd --context=cluster-c multicluster link-gen --cluster-name=cluster-c > link-c.yaml

# Apply links on cluster-a
kubectl apply --context=cluster-a -f link-b.yaml
kubectl apply --context=cluster-a -f link-c.yaml
```

### Step 3: Custom Link Resource

```yaml
# link-to-production.yaml
apiVersion: multicluster.linkerd.io/v1alpha3
kind: Link
metadata:
  name: production-cluster
  namespace: linkerd-multicluster
spec:
  clusterCredentialsSecret: cluster-credentials-production-cluster
  targetClusterName: production-cluster

  # Gateway configuration
  gatewayAddress: gateway.prod.example.com
  gatewayPort: "4143"
  gatewayIdentity: gateway.linkerd-multicluster.serviceaccount.identity.linkerd.cluster.local

  # Health checking
  probeSpec:
    path: /ready
    port: "4191"
    period: 3s

  # Only mirror production services
  selector:
    matchLabels:
      mirror.linkerd.io/exported: "true"
      env: production

  # Mirror selected services in remote discovery mode
  remoteDiscoverySelector:
    matchExpressions:
      - key: mirror.linkerd.io/exported
        operator: In
        values: ["remote-discovery"]
      - key: env
        operator: NotIn
        values: ["dev", "staging"]
```

### Step 4: Export Services on Target Cluster

```yaml
# service-export.yaml - Apply on the target cluster
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
  labels:
    mirror.linkerd.io/exported: "true"   # Enable mirroring
    env: production
spec:
  selector:
    app: api
  ports:
    - port: 8080
      targetPort: 8080
```

### Step 5: Verify the Link

```bash
# Check link status
linkerd multicluster check

# View mirrored services
kubectl get svc -n production | grep -E ".*-cluster-[a-z]$"

# Example output:
# api-service-cluster-b   ClusterIP   10.96.45.123   <none>   8080/TCP
# api-service-cluster-c   ClusterIP   10.96.45.124   <none>   8080/TCP

# Check gateway health
linkerd multicluster gateways
```

## Consuming Mirrored Services

Once the Link is established, mirrored services appear with a cluster suffix:

```yaml
# Application calling a mirrored service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            # Call the service in the remote cluster
            - name: API_URL
              value: "http://api-service-production-cluster.production.svc.cluster.local:8080"
```

### Traffic Splitting Across Clusters

If the Linkerd SMI extension is installed, you can use a TrafficSplit to distribute load across clusters:

```yaml
# TrafficSplit to distribute load across clusters
apiVersion: split.smi-spec.io/v1alpha1
kind: TrafficSplit
metadata:
  name: api-service-split
  namespace: production
spec:
  service: api-service
  backends:
    - service: api-service              # Local cluster
      weight: 500
    - service: api-service-cluster-b    # Remote cluster B
      weight: 300
    - service: api-service-cluster-c    # Remote cluster C
      weight: 200
```

## Troubleshooting Links

### Check Link Status

```bash
# Get link resources
kubectl get links -n linkerd-multicluster

# Describe a specific link
kubectl describe link production-cluster -n linkerd-multicluster

# Check service mirror controller logs
kubectl logs -n linkerd-multicluster deploy/controller-production-cluster -f
```

### Common Issues

**Gateway unreachable:**
```bash
# Verify gateway is exposed
kubectl get svc -n linkerd-multicluster linkerd-gateway

# Test the gateway health endpoint from the source cluster
kubectl run -it --rm debug --image=curlimages/curl -- \
  curl -v http://gateway.prod.example.com:4191/ready
```

**Services not mirroring:**
```bash
# Check if services have the export label
kubectl get svc -l mirror.linkerd.io/exported=true --all-namespaces

# Check services selected for remote discovery
kubectl get svc -l mirror.linkerd.io/exported=remote-discovery --all-namespaces
```

**Probe failures:**
```bash
# Check gateway health
linkerd multicluster gateways

# View probe metrics
kubectl port-forward -n linkerd-multicluster deploy/controller-production-cluster 9999:9999
curl localhost:9999/metrics | grep gateway
```

---

The Link resource is the foundation of Linkerd multi-cluster networking. Start with a simple configuration using the generated link-gen command, then customize selectors and probe settings based on your requirements. Always verify connectivity with `linkerd multicluster check` before deploying applications that depend on cross-cluster communication.
