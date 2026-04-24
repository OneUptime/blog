# How to Configure Consul Connect with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Consul, Service Mesh, HashiCorp

Description: Deploy and configure HashiCorp Consul Connect service mesh on Rancher-managed clusters for service discovery, mTLS, and traffic management.

## Introduction

Consul Connect is HashiCorp's service mesh solution that provides service discovery, health checking, secure service-to-service communication with mTLS, and traffic management. When deployed on Rancher-managed clusters, Consul Connect provides a consistent service networking layer across multi-cloud and hybrid environments.

## Prerequisites

- Rancher-managed Kubernetes cluster running a version supported by the Consul on Kubernetes compatibility matrix
- Helm 3.6+ installed
- kubectl with cluster-admin access
- consul-k8s CLI installed for proxy troubleshooting
- At least 3 nodes for production HA deployment

## Step 1: Add the HashiCorp Helm Repository

```bash
# Add HashiCorp Helm repository

helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Search for available Consul versions
helm search repo hashicorp/consul
```

## Step 2: Create Consul Configuration

```yaml
# consul-values.yaml - Production Consul Helm configuration
global:
  name: consul
  datacenter: dc1

  # TLS configuration
  tls:
    enabled: true
    enableAutoEncrypt: true

  # Gossip encryption
  gossipEncryption:
    autoGenerate: true

  # Metrics
  metrics:
    enabled: true

server:
  replicas: 3
  # Storage for server data
  storage: 10Gi
  storageClass: standard

  # Resource limits
  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 512Mi
      cpu: 500m

connectInject:
  enabled: true
  # Enable transparent proxy (intercepts all traffic)
  transparentProxy:
    defaultEnabled: true

controller:
  enabled: true

ui:
  enabled: true
  service:
    type: ClusterIP

dns:
  enabled: true
  enableRedirection: true
```

## Step 3: Install Consul with Helm

```bash
# Create namespace
kubectl create namespace consul

# Install Consul
helm install consul hashicorp/consul \
  --namespace consul \
  --values consul-values.yaml \
  --wait \
  --timeout 10m

# Verify all pods are running
kubectl get pods -n consul
```

## Step 4: Enable Consul Connect Injection

Annotate the pod template for automatic sidecar injection:

```yaml
# app-deployment.yaml - Deployment with Consul Connect
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-service
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend-service
  template:
    metadata:
      labels:
        app: backend-service
      annotations:
        # Enable Connect injection for this pod
        consul.hashicorp.com/connect-inject: "true"
        # Attach version metadata for traffic splitting examples
        consul.hashicorp.com/service-meta-version: "v1"
    spec:
      containers:
        - name: backend
          image: registry.example.com/backend:v1.0
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: production
spec:
  selector:
    app: backend-service
  ports:
    - name: http
      port: 8080
      targetPort: 8080
```

## Step 5: Define Service Intentions (Access Control)

```yaml
# service-intention.yaml - Allow frontend to call backend
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceIntentions
metadata:
  name: backend-allow-frontend
  namespace: production
spec:
  destination:
    name: backend-service
  sources:
    # Allow frontend service to access backend
    - name: frontend-service
      action: allow
    # Block all other services by default
    - name: "*"
      action: deny
```

## Step 6: Configure Service Defaults

```yaml
# service-defaults.yaml - Default protocol for backend service
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceDefaults
metadata:
  name: backend-service
  namespace: production
spec:
  # Set the protocol (important for L7 traffic management)
  protocol: http
---
# service-resolver.yaml - Service resolver for failover
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceResolver
metadata:
  name: backend-service
  namespace: production
spec:
  # Health check timeout
  connectTimeout: 5s
  # Define failover behavior
  failover:
    "*":
      service: backend-service
      datacenters:
        - dc2  # Failover to DC2 if DC1 is unavailable
```

## Step 7: Configure Traffic Splitting

To split traffic between versions, register both versions under the same `backend-service` Kubernetes Service and set `consul.hashicorp.com/service-meta-version` to `v1` and `v2` on the respective pod templates.

```yaml
# service-splitter.yaml - Canary deployment via Consul traffic splitting
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceSplitter
metadata:
  name: backend-service
  namespace: production
spec:
  splits:
    # Send 90% of traffic to v1
    - weight: 90
      serviceSubset: v1
    # Canary: send 10% to v2
    - weight: 10
      serviceSubset: v2
---
# Update the service resolver to add subsets while keeping failover
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceResolver
metadata:
  name: backend-service
  namespace: production
spec:
  connectTimeout: 5s
  defaultSubset: v1
  failover:
    "*":
      service: backend-service
      datacenters:
        - dc2  # Failover to DC2 if DC1 is unavailable
  subsets:
    v1:
      filter: "Service.Meta.version == v1"
    v2:
      filter: "Service.Meta.version == v2"
```

## Step 8: Access the Consul UI

```bash
# Port forward to the Consul UI over HTTPS
kubectl port-forward -n consul svc/consul-ui 8501:443

# If ACLs are enabled, get the Consul bootstrap token
kubectl get secrets/consul-bootstrap-acl-token \
  -n consul \
  --template='{{.data.token | base64decode }}'
```

## Step 9: Verify mTLS is Working

```bash
# List the upstream IPs visible from a mesh-enabled pod
consul-k8s troubleshoot upstreams -n production -pod <pod-name>

# Use one of the returned upstream IPs to validate certificates and proxy connectivity
consul-k8s troubleshoot proxy -n production -pod <pod-name> -upstream-ip <upstream-ip>
```

## Troubleshooting

```bash
# Check Consul server health
kubectl exec -n consul consul-server-0 -c consul -- consul members

# View Connect proxy logs
kubectl logs deployment/backend-service -c consul-dataplane -n production

# Check service catalog
kubectl exec -n consul consul-server-0 -c consul -- \
  consul catalog services
```

## Conclusion

Consul Connect provides a robust, multi-datacenter service mesh that integrates well with Rancher-managed clusters. Its service intentions model provides fine-grained access control, while transparent proxy makes adoption easy without application code changes. For organizations already using HashiCorp tooling (Vault, Terraform), Consul Connect is a natural fit that leverages existing expertise and provides consistent networking across cloud and on-premises environments.
