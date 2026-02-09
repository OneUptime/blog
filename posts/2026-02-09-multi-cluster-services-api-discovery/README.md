# How to Configure Multi-Cluster Services API for Cross-Cluster Service Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, Service Discovery

Description: Learn how to implement the Kubernetes Multi-Cluster Services API (MCS) for standardized cross-cluster service discovery and load balancing without vendor lock-in.

---

The Multi-Cluster Services API (MCS API) is a Kubernetes standard (KEP-1645) for discovering and consuming services across multiple clusters. Unlike vendor-specific solutions, MCS API provides a portable way to export services from one cluster and import them into others, enabling cross-cluster service communication with a consistent API.

## Understanding the MCS API

The MCS API introduces two new resources:

- **ServiceExport**: Marks a Service for export to other clusters
- **ServiceImport**: Represents an imported Service from another cluster

When you create a ServiceExport, a controller propagates the Service to other clusters as ServiceImports, making it discoverable via DNS.

## Installing an MCS Implementation

Several projects implement the MCS API. We'll use the reference implementation with Submariner:

```bash
# Deploy Submariner with service discovery
subctl deploy-broker \
  --kubeconfig ~/.kube/config \
  --context cluster-1

# Join clusters with service discovery enabled
subctl join broker-info.subm \
  --kubeconfig ~/.kube/config \
  --context cluster-1 \
  --clusterid cluster-1 \
  --service-discovery \
  --cable-driver libreswan
```

Alternatively, use Cilium ClusterMesh or Istio multi-cluster, both of which support MCS API.

## Exporting Services

Export a service by creating a ServiceExport resource:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: database
  namespace: production
spec:
  selector:
    app: postgres
  ports:
  - name: postgres
    port: 5432
    targetPort: 5432
  type: ClusterIP
---
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceExport
metadata:
  name: database
  namespace: production
```

Apply in cluster-1:

```bash
kubectl apply -f service-export.yaml --context cluster-1
```

The service becomes available in other clusters automatically.

## Importing Services

In cluster-2, a ServiceImport is created automatically:

```bash
kubectl get serviceimports -n production --context cluster-2
```

Output:

```
NAME       TYPE        IP                  AGE
database   ClusterSetIP   242.254.1.10       30s
```

The ServiceImport has a `ClusterSetIP` that's accessible from any cluster in the clusterset.

## Accessing Imported Services

Use standard Kubernetes DNS to access imported services:

```bash
# From a pod in cluster-2
kubectl run client --image=postgres:14 --context cluster-2 -- sleep 3600

# Connect to database service in cluster-1
kubectl exec client --context cluster-2 -- \
  psql -h database.production.svc.clusterset.local -U admin
```

The DNS name format is: `<service>.<namespace>.svc.clusterset.local`

## Understanding ClusterSetIP

ClusterSetIP is a virtual IP that load-balances across all clusters exporting the service:

```yaml
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceImport
metadata:
  name: api-service
  namespace: production
spec:
  type: ClusterSetIP
  ips:
  - 242.254.1.15
  ports:
  - name: http
    protocol: TCP
    port: 8080
```

Traffic to 242.254.1.15:8080 is routed to backend pods in any cluster exporting api-service.

## Using Headless Services Across Clusters

Export headless services for discovering individual pod endpoints:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cassandra
  namespace: database
spec:
  clusterIP: None
  selector:
    app: cassandra
  ports:
  - name: cql
    port: 9042
---
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceExport
metadata:
  name: cassandra
  namespace: database
```

The ServiceImport type becomes Headless:

```yaml
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceImport
metadata:
  name: cassandra
  namespace: database
spec:
  type: Headless
  ports:
  - name: cql
    protocol: TCP
    port: 9042
```

DNS returns all pod IPs from all clusters:

```bash
# Resolve cassandra.database.svc.clusterset.local
nslookup cassandra.database.svc.clusterset.local
```

Returns:

```
cassandra.database.svc.clusterset.local has address 10.1.2.3
cassandra.database.svc.clusterset.local has address 10.1.2.4
cassandra.database.svc.clusterset.local has address 10.2.3.5
```

## Implementing Multi-Cluster Load Balancing

Deploy the same service in multiple clusters for high availability:

```yaml
# In cluster-1
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: api-server:v2.1
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: production
spec:
  selector:
    app: api
  ports:
  - port: 8080
---
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceExport
metadata:
  name: api
  namespace: production
```

Deploy the same resources in cluster-2 and cluster-3. The ServiceImport automatically load-balances across all clusters.

## Configuring Service Export Scope

Control which clusters can import a service using labels:

```yaml
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceExport
metadata:
  name: internal-api
  namespace: production
  labels:
    # Only export to specific clusters
    export-to: "cluster-2,cluster-3"
```

The MCS controller implementation must support label-based filtering.

## Implementing Locality-Aware Load Balancing

Some MCS implementations support topology-aware routing. Traffic prefers local endpoints:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: webapp
  namespace: production
  annotations:
    # Prefer local endpoints
    service.kubernetes.io/topology-mode: Auto
spec:
  selector:
    app: webapp
  ports:
  - port: 80
```

With this annotation, pods in cluster-1 accessing webapp.production.svc.clusterset.local prefer endpoints in cluster-1.

## Monitoring ServiceExports and Imports

List exported services:

```bash
kubectl get serviceexports --all-namespaces --context cluster-1
```

List imported services:

```bash
kubectl get serviceimports --all-namespaces --context cluster-2
```

Check ServiceImport details:

```bash
kubectl describe serviceimport api -n production --context cluster-2
```

Output shows backend endpoints:

```yaml
Spec:
  Type: ClusterSetIP
  IPs:
  - 242.254.1.20
  Ports:
  - Name: http
    Port: 8080
    Protocol: TCP
Status:
  Clusters:
  - Cluster: cluster-1
  - Cluster: cluster-3
```

## Implementing Service Export Policies

Use admission controllers to enforce export policies:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: service-export-policy
webhooks:
- name: validate.serviceexport.io
  rules:
  - apiGroups: ["multicluster.x-k8s.io"]
    resources: ["serviceexports"]
    operations: ["CREATE", "UPDATE"]
  clientConfig:
    service:
      name: policy-webhook
      namespace: kube-system
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

Webhook validates that only approved services can be exported.

## Troubleshooting Service Discovery

**ServiceImport not created**: Check if ServiceExport exists and MCS controller is running:

```bash
kubectl get pods -n submariner-operator | grep lighthouse
kubectl logs -n submariner-operator deployment/submariner-lighthouse-agent
```

**DNS not resolving**: Verify CoreDNS has MCS plugin configured:

```bash
kubectl get configmap coredns -n kube-system -o yaml
```

Should include:

```yaml
clusterset.local:53 {
    lighthouse
}
```

Restart CoreDNS:

```bash
kubectl rollout restart deployment coredns -n kube-system
```

**Connectivity fails**: Test if tunnel is working:

```bash
# From cluster-2, test connectivity to cluster-1 service
kubectl run test --image=curlimages/curl --context cluster-2 -- \
  curl -v http://api.production.svc.clusterset.local:8080
```

## Best Practices

**Export only necessary services**: Don't export all services. Limit exports to those genuinely needed cross-cluster to reduce complexity.

**Use meaningful service names**: ServiceImports use the same name as ServiceExports. Choose names that make sense across clusters.

**Implement health checks**: Ensure exported services have proper liveness and readiness probes. Unhealthy endpoints shouldn't receive cross-cluster traffic.

**Monitor cross-cluster latency**: Track latency for cross-cluster service calls:

```promql
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{
    destination_service=~".*\\.clusterset\\.local"
  }[5m])) by (le)
)
```

**Plan for cluster failures**: Test what happens when a cluster exporting a service fails. Verify traffic fails over to other clusters.

**Document service dependencies**: Maintain a map of which services are exported, imported, and the cross-cluster dependencies.

**Version exported services carefully**: Breaking changes to exported services affect all importing clusters. Use API versioning and gradual rollouts.

**Secure cross-cluster traffic**: Use mutual TLS for service-to-service communication:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
```

The Multi-Cluster Services API provides a standard, portable way to share services across Kubernetes clusters. By using ServiceExport and ServiceImport, you enable cross-cluster service discovery without vendor lock-in, making it easier to build resilient, distributed applications.
