# How to Set Up Istio Multi-Cluster Mesh with Primary-Remote Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Service Mesh

Description: Learn how to configure Istio multi-cluster service mesh using primary-remote topology for centralized control plane management across Kubernetes clusters.

---

Istio's primary-remote multi-cluster model uses one cluster (primary) to host the control plane while other clusters (remotes) connect to it for service mesh management. This architecture simplifies operations by centralizing configuration while enabling service communication across clusters.

## Understanding Primary-Remote Architecture

In primary-remote topology:

- **Primary cluster**: Runs the full Istio control plane (istiod)
- **Remote clusters**: Run only the data plane (Envoy sidecars)
- **Control plane**: Manages configuration for all clusters from primary
- **Mesh network**: All clusters share a single service mesh

This reduces operational overhead compared to running separate control planes in each cluster.

## Prerequisites

Ensure clusters meet requirements:

- Direct pod-to-pod connectivity (flat network or VPN)
- API server accessibility between clusters
- Same trust domain for mTLS
- Kubernetes 1.24+
- Istio 1.18+

## Installing Istio in Primary Cluster

Download istioctl:

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.20.0 sh -
cd istio-1.20.0
export PATH=$PWD/bin:$PATH
```

Set up CA certificates for cross-cluster trust:

```bash
# Create root CA
mkdir -p certs
cd certs

# Generate root cert and key
make -f ../tools/certs/Makefile.selfsigned.mk root-ca

# Generate intermediate certs for each cluster
make -f ../tools/certs/Makefile.selfsigned.mk cluster1-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk cluster2-cacerts
```

Create cacerts secret in primary cluster:

```bash
kubectl create namespace istio-system --context cluster-1
kubectl create secret generic cacerts -n istio-system \
  --from-file=cluster1/ca-cert.pem \
  --from-file=cluster1/ca-key.pem \
  --from-file=cluster1/root-cert.pem \
  --from-file=cluster1/cert-chain.pem \
  --context cluster-1
```

Install Istio control plane in primary cluster:

```bash
cat <<EOF > cluster1-config.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-primary
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

istioctl install -f cluster1-config.yaml --context cluster-1
```

Expose Istio control plane for remote clusters:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: istiod-external
  namespace: istio-system
spec:
  type: LoadBalancer
  selector:
    app: istiod
  ports:
  - name: https-dns
    port: 15012
    protocol: TCP
    targetPort: 15012
  - name: https-webhook
    port: 15017
    protocol: TCP
    targetPort: 15017
EOF --context cluster-1
```

Get the external IP:

```bash
export ISTIOD_EXTERNAL_IP=$(kubectl get svc istiod-external -n istio-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}' --context cluster-1)
echo "Istiod external IP: $ISTIOD_EXTERNAL_IP"
```

## Installing Istio in Remote Cluster

Create namespace and cacerts secret:

```bash
kubectl create namespace istio-system --context cluster-2
kubectl create secret generic cacerts -n istio-system \
  --from-file=cluster2/ca-cert.pem \
  --from-file=cluster2/ca-key.pem \
  --from-file=cluster2/root-cert.pem \
  --from-file=cluster2/cert-chain.pem \
  --context cluster-2
```

Label the namespace:

```bash
kubectl label namespace istio-system topology.istio.io/network=network1 --context cluster-2
```

Install remote Istio configuration:

```bash
cat <<EOF > cluster2-config.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-remote
spec:
  profile: remote
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster-2
      network: network1
      remotePilotAddress: ${ISTIOD_EXTERNAL_IP}
    istiodRemote:
      injectionURL: https://${ISTIOD_EXTERNAL_IP}:15017/inject
EOF

istioctl install -f cluster2-config.yaml --context cluster-2
```

## Enabling Cross-Cluster Service Discovery

Create a secret in the primary cluster with remote cluster credentials:

```bash
istioctl create-remote-secret \
  --context=cluster-2 \
  --name=cluster-2 | \
  kubectl apply -f - --context=cluster-1
```

This allows the primary control plane to discover services in remote clusters.

Verify:

```bash
kubectl get secrets -n istio-system --context cluster-1 | grep cluster-2
```

## Deploying Cross-Cluster Applications

Deploy an application in the primary cluster:

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
        version: v1
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
```

Apply to cluster-1:

```bash
kubectl apply -f frontend.yaml --context cluster-1
```

Deploy backend in remote cluster:

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
  name: backend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
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

Apply to cluster-2:

```bash
kubectl apply -f backend.yaml --context cluster-2
```

The frontend in cluster-1 can call backend in cluster-2 using the service name:

```bash
curl http://backend.production.svc.cluster.local
```

## Configuring Traffic Management

Create a VirtualService in the primary cluster:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: backend-route
  namespace: production
spec:
  hosts:
  - backend.production.svc.cluster.local
  http:
  - match:
    - headers:
        version:
          exact: v2
    route:
    - destination:
        host: backend.production.svc.cluster.local
        subset: v2
  - route:
    - destination:
        host: backend.production.svc.cluster.local
        subset: v1
      weight: 80
    - destination:
        host: backend.production.svc.cluster.local
        subset: v2
      weight: 20
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-destination
  namespace: production
spec:
  host: backend.production.svc.cluster.local
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

Apply in primary cluster:

```bash
kubectl apply -f traffic-management.yaml --context cluster-1
```

The configuration applies to all clusters automatically.

## Implementing Cross-Cluster Failover

Use locality load balancing for automatic failover:

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
        failover:
        - from: us-east-1
          to: us-west-2
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

When backends in us-east-1 fail health checks, traffic fails over to us-west-2.

## Monitoring Multi-Cluster Mesh

View mesh configuration from primary cluster:

```bash
istioctl proxy-status --context cluster-1
```

Shows all proxies across clusters:

```
NAME                              CLUSTER      VERSION    STATUS      ISTIO VERSION
frontend-xxx.production           cluster-1    1.20.0     SYNCED      1.20.0
backend-yyy.production            cluster-2    1.20.0     SYNCED      1.20.0
```

Check cross-cluster connectivity:

```bash
kubectl exec -it frontend-xxx -n production --context cluster-1 -- \
  curl -v backend.production.svc.cluster.local/health
```

View metrics in Kiali or Grafana.

## Best Practices

**Use a dedicated primary cluster**: Don't overload the primary cluster with application workloads. Keep it focused on control plane operations.

**Implement HA for control plane**: Run multiple istiod replicas in the primary cluster:

```yaml
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
```

**Monitor control plane connectivity**: Alert if remote clusters can't reach the primary control plane:

```promql
sum(pilot_xds_pushes{cluster="cluster-2"}) == 0
```

**Secure control plane access**: Use network policies and firewalls to limit access to istiod-external service.

**Plan for primary cluster failure**: Have a documented procedure for promoting a remote cluster to primary if needed.

**Test configuration rollouts**: Test Istio configuration changes in a staging mesh before applying to production.

**Use resource quotas**: Limit control plane resource consumption in the primary cluster.

**Version carefully**: Keep all clusters on the same Istio version to avoid compatibility issues.

The primary-remote architecture provides centralized management for multi-cluster Istio deployments. By running the control plane in one cluster and connecting remotes to it, you simplify operations while maintaining the benefits of multi-cluster service mesh.
