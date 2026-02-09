# How to Set Up Istio Multi-Cluster Mesh with Multi-Primary Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Service Mesh

Description: Learn how to configure Istio multi-cluster service mesh using multi-primary topology for distributed control planes with high availability and reduced latency.

---

Istio's multi-primary architecture runs a full control plane in each cluster. Unlike primary-remote, this provides better fault tolerance and lower latency since each cluster manages its own mesh configuration while sharing service discovery across the mesh. If one control plane fails, others continue operating independently.

## Understanding Multi-Primary Architecture

In multi-primary topology:

- Each cluster runs its own Istio control plane (istiod)
- Control planes communicate to share service discovery
- Each cluster can operate independently if network partitions occur
- Configuration must be applied to each cluster

This architecture provides better resilience at the cost of more operational complexity.

## Setting Up CA Certificates

Create shared root CA for mutual TLS across clusters:

```bash
mkdir -p certs
cd certs

# Generate root CA
make -f ../tools/certs/Makefile.selfsigned.mk root-ca

# Generate certs for each cluster
make -f ../tools/certs/Makefile.selfsigned.mk cluster1-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk cluster2-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk cluster3-cacerts
```

Create cacerts secrets in each cluster:

```bash
# Cluster 1
kubectl create namespace istio-system --context cluster-1
kubectl create secret generic cacerts -n istio-system \
  --from-file=cluster1/ca-cert.pem \
  --from-file=cluster1/ca-key.pem \
  --from-file=cluster1/root-cert.pem \
  --from-file=cluster1/cert-chain.pem \
  --context cluster-1

# Cluster 2
kubectl create namespace istio-system --context cluster-2
kubectl create secret generic cacerts -n istio-system \
  --from-file=cluster2/ca-cert.pem \
  --from-file=cluster2/ca-key.pem \
  --from-file=cluster2/root-cert.pem \
  --from-file=cluster2/cert-chain.pem \
  --context cluster-2

# Cluster 3
kubectl create namespace istio-system --context cluster-3
kubectl create secret generic cacerts -n istio-system \
  --from-file=cluster3/ca-cert.pem \
  --from-file=cluster3/ca-key.pem \
  --from-file=cluster3/root-cert.pem \
  --from-file=cluster3/cert-chain.pem \
  --context cluster-3
```

## Installing Istio in All Clusters

Install Istio with multi-primary configuration in cluster-1:

```bash
cat <<EOF > cluster1-multiprimary.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-cluster1
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster-1
      network: network1
EOF

istioctl install -f cluster1-multiprimary.yaml --context cluster-1
```

Install in cluster-2:

```bash
cat <<EOF > cluster2-multiprimary.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-cluster2
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster-2
      network: network1
EOF

istioctl install -f cluster2-multiprimary.yaml --context cluster-2
```

Install in cluster-3:

```bash
cat <<EOF > cluster3-multiprimary.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-cluster3
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster-3
      network: network1
EOF

istioctl install -f cluster3-multiprimary.yaml --context cluster-3
```

## Configuring Cross-Cluster Service Discovery

Create remote secrets for each cluster pair. In cluster-1, add secrets for cluster-2 and cluster-3:

```bash
istioctl create-remote-secret \
  --context=cluster-2 \
  --name=cluster-2 | \
  kubectl apply -f - --context=cluster-1

istioctl create-remote-secret \
  --context=cluster-3 \
  --name=cluster-3 | \
  kubectl apply -f - --context=cluster-1
```

In cluster-2, add secrets for cluster-1 and cluster-3:

```bash
istioctl create-remote-secret \
  --context=cluster-1 \
  --name=cluster-1 | \
  kubectl apply -f - --context=cluster-2

istioctl create-remote-secret \
  --context=cluster-3 \
  --name=cluster-3 | \
  kubectl apply -f - --context=cluster-2
```

In cluster-3, add secrets for cluster-1 and cluster-2:

```bash
istioctl create-remote-secret \
  --context=cluster-1 \
  --name=cluster-1 | \
  kubectl apply -f - --context=cluster-3

istioctl create-remote-secret \
  --context=cluster-2 \
  --name=cluster-2 | \
  kubectl apply -f - --context=cluster-3
```

Verify secrets:

```bash
kubectl get secrets -n istio-system --context cluster-1 | grep istio-remote-secret
kubectl get secrets -n istio-system --context cluster-2 | grep istio-remote-secret
kubectl get secrets -n istio-system --context cluster-3 | grep istio-remote-secret
```

## Deploying Applications Across Clusters

Deploy backend service in cluster-1:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    istio-injection: enabled
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-v1
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
      version: v1
  template:
    metadata:
      labels:
        app: backend
        version: v1
    spec:
      containers:
      - name: backend
        image: backend:v1
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: production
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 8080
```

Apply:

```bash
kubectl apply -f backend.yaml --context cluster-1
```

Deploy the same backend in cluster-2 for redundancy:

```bash
kubectl apply -f backend.yaml --context cluster-2
```

Deploy frontend in cluster-3:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    istio-injection: enabled
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: frontend:v1
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: production
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

Apply:

```bash
kubectl apply -f frontend.yaml --context cluster-3
```

Frontend in cluster-3 can call backend service, and Istio load-balances across backends in both cluster-1 and cluster-2.

## Configuring Traffic Distribution

Apply the same traffic rules to all clusters. Create VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: backend-routing
  namespace: production
spec:
  hosts:
  - backend.production.svc.cluster.local
  http:
  - route:
    - destination:
        host: backend.production.svc.cluster.local
        subset: v1
      weight: 100
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-destination
  namespace: production
spec:
  host: backend.production.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
  subsets:
  - name: v1
    labels:
      version: v1
```

Apply to all clusters:

```bash
kubectl apply -f traffic-rules.yaml --context cluster-1
kubectl apply -f traffic-rules.yaml --context cluster-2
kubectl apply -f traffic-rules.yaml --context cluster-3
```

## Implementing Locality-Based Load Balancing

Configure traffic to prefer local endpoints:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-locality
  namespace: production
spec:
  host: backend.production.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
        - from: us-east-1/*
          to:
            "us-east-1/*": 80
            "us-west-2/*": 20
        - from: us-west-2/*
          to:
            "us-west-2/*": 80
            "us-east-1/*": 20
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

Apply to all clusters:

```bash
kubectl apply -f locality-lb.yaml --context cluster-1
kubectl apply -f locality-lb.yaml --context cluster-2
kubectl apply -f locality-lb.yaml --context cluster-3
```

This routes 80% of traffic to local backends and 20% to remote for testing and redundancy.

## Synchronizing Configuration Across Clusters

Use GitOps to ensure consistent configuration:

```yaml
# ArgoCD ApplicationSet for multi-cluster sync
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: istio-config
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - cluster: cluster-1
        url: https://cluster-1.example.com
      - cluster: cluster-2
        url: https://cluster-2.example.com
      - cluster: cluster-3
        url: https://cluster-3.example.com
  template:
    metadata:
      name: '{{cluster}}-istio-config'
    spec:
      project: default
      source:
        repoURL: https://github.com/example/istio-config
        targetRevision: main
        path: production
      destination:
        server: '{{url}}'
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Monitoring Multi-Primary Mesh

Check proxy status from any cluster:

```bash
istioctl proxy-status --context cluster-1
```

View endpoints from all clusters:

```bash
istioctl proxy-config endpoints frontend-xxx.production --context cluster-3
```

Output shows backends from all clusters:

```
ENDPOINT                  STATUS      CLUSTER      SERVICE
10.1.2.3:8080            HEALTHY     cluster-1    backend.production.svc.cluster.local
10.1.2.4:8080            HEALTHY     cluster-1    backend.production.svc.cluster.local
10.2.3.5:8080            HEALTHY     cluster-2    backend.production.svc.cluster.local
10.2.3.6:8080            HEALTHY     cluster-2    backend.production.svc.cluster.local
```

Monitor control plane metrics:

```promql
# Request rate across all clusters
sum(rate(istio_requests_total[5m])) by (source_cluster, destination_cluster)

# Cross-cluster latency
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    source_cluster!="destination_cluster"
  }[5m])) by (le)
)
```

## Handling Control Plane Failures

Test resilience by stopping istiod in one cluster:

```bash
kubectl scale deployment istiod -n istio-system --replicas=0 --context cluster-2
```

Verify that:
- Cluster-2 proxies continue using cached configuration
- Cluster-1 and cluster-3 operate normally
- Services in cluster-2 remain accessible from other clusters

Restore:

```bash
kubectl scale deployment istiod -n istio-system --replicas=1 --context cluster-2
```

## Best Practices

**Apply configuration to all clusters**: Since each cluster runs its own control plane, configuration must be applied everywhere. Use GitOps for consistency.

**Monitor configuration drift**: Alert if configurations diverge across clusters:

```bash
# Compare configurations
diff <(kubectl get virtualservices -n production -o yaml --context cluster-1) \
     <(kubectl get virtualservices -n production -o yaml --context cluster-2)
```

**Use locality-aware routing**: Configure locality load balancing to reduce cross-cluster traffic and improve latency.

**Plan capacity for control planes**: Each cluster needs resources for istiod. Budget accordingly:

```yaml
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
```

**Implement gradual rollout**: When updating configuration, apply to one cluster first, verify, then roll out to others.

**Test multi-cluster failover**: Regularly test scenarios where entire clusters become unavailable.

**Use service entries for external services**: Define external services once but apply to all clusters.

**Version Istio carefully**: Keep all clusters on the same Istio version during steady state. Upgrade one cluster at a time.

Multi-primary architecture provides the highest availability for multi-cluster Istio deployments. By running independent control planes in each cluster while sharing service discovery, you gain resilience against control plane failures while maintaining seamless cross-cluster service communication.
