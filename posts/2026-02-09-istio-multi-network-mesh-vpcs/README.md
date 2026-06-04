# How to Set Up Istio Multi-Network Mesh for Kubernetes Clusters on Different VPCs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Multi-Network, VPC, Kubernetes, Service Mesh

Description: Learn how to configure Istio multi-network service mesh across Kubernetes clusters running in different VPCs or networks with isolated address spaces.

---

Running Kubernetes clusters across different VPCs is common for isolation, compliance, or geographic distribution. However, VPC isolation prevents direct pod-to-pod communication. Istio's multi-network support bridges this gap by routing traffic through gateways while maintaining service mesh features like mTLS, observability, and traffic management.

## Understanding Multi-Network Architecture

In a single-network mesh, pods communicate directly using their pod IPs. In a multi-network mesh, pods in different networks can't reach each other directly. Istio solves this by routing cross-network traffic through east-west gateways deployed in each cluster.

Each cluster has a gateway that exposes local services to remote networks. When a service in VPC A calls a service in VPC B, Istio routes the request to the gateway for the destination network, which routes it to the destination pod.

This architecture maintains end-to-end mTLS encryption and service identity across networks. Istio handles service discovery automatically as services move between networks.

## Prerequisites

You need two Kubernetes clusters in different VPCs with non-overlapping pod CIDR ranges. We'll call them cluster-vpc-a and cluster-vpc-b.

Cluster requirements:

- A Kubernetes version supported by your Istio release
- Network connectivity from each Istio control plane to the remote cluster API server
- Network connectivity between gateway LoadBalancers

Verify network isolation:

```bash
# On cluster-vpc-a, try to reach a pod IP in cluster-vpc-b (should fail)

kubectl --context=cluster-vpc-a run test --image=busybox --rm -it -- ping <pod-ip-in-cluster-vpc-b>
```

The ping should timeout because networks are isolated.

## Installing Istio on Both Clusters

Install Istio with multi-network support on each cluster. On cluster-vpc-a:

```bash
kubectl config use-context cluster-vpc-a

# Create Istio configuration
cat <<EOF > cluster-vpc-a-istio.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-vpc-a
  namespace: istio-system
spec:
  profile: default
  values:
    global:
      meshID: shared-mesh
      multiCluster:
        clusterName: cluster-vpc-a
      network: vpc-a
EOF

# Install Istio
istioctl install -f cluster-vpc-a-istio.yaml
```

On cluster-vpc-b:

```bash
kubectl config use-context cluster-vpc-b

cat <<EOF > cluster-vpc-b-istio.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-vpc-b
  namespace: istio-system
spec:
  profile: default
  values:
    global:
      meshID: shared-mesh
      multiCluster:
        clusterName: cluster-vpc-b
      network: vpc-b
EOF

istioctl install -f cluster-vpc-b-istio.yaml
```

The key configurations are:

- meshID: Same across all clusters in the mesh
- network: Unique identifier for each network
- clusterName: Unique identifier for each cluster

## Installing East-West Gateways

Install gateways that handle cross-network traffic. On cluster-vpc-a:

```bash
kubectl config use-context cluster-vpc-a

# Generate gateway configuration
samples/multicluster/gen-eastwest-gateway.sh \
  --network vpc-a | \
  istioctl --context=cluster-vpc-a install -y -f -
```

If you don't have the samples directory, create the gateway manually:

```yaml
# eastwest-gateway-vpc-a.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: eastwest-gateway
  namespace: istio-system
spec:
  profile: empty
  components:
    ingressGateways:
    - name: istio-eastwestgateway
      label:
        istio: eastwestgateway
        app: istio-eastwestgateway
        topology.istio.io/network: vpc-a
      enabled: true
      k8s:
        env:
        - name: ISTIO_META_REQUESTED_NETWORK_VIEW
          value: vpc-a
        service:
          type: LoadBalancer
          ports:
          - name: status-port
            port: 15021
            targetPort: 15021
          - name: tls
            port: 15443
            targetPort: 15443
          - name: tls-istiod
            port: 15012
            targetPort: 15012
          - name: tls-webhook
            port: 15017
            targetPort: 15017
```

```bash
istioctl --context=cluster-vpc-a install -y -f eastwest-gateway-vpc-a.yaml
```

Repeat for cluster-vpc-b:

```bash
kubectl config use-context cluster-vpc-b

# Create gateway with network vpc-b
# Update topology.istio.io/network to vpc-b in the YAML
istioctl --context=cluster-vpc-b install -y -f eastwest-gateway-vpc-b.yaml
```

Verify gateways are running:

```bash
kubectl get svc -n istio-system istio-eastwestgateway
```

Note the external IP addresses of both gateways. You'll need these for cross-network routing.

## Exposing Services Through Gateways

Configure gateways to expose all services. On cluster-vpc-a:

```yaml
# expose-services-vpc-a.yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: cross-network-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
  - port:
      number: 15443
      name: tls
      protocol: TLS
    tls:
      mode: AUTO_PASSTHROUGH
    hosts:
    - "*.local"
```

```bash
kubectl config use-context cluster-vpc-a
kubectl apply -f expose-services-vpc-a.yaml
```

Apply the same configuration to cluster-vpc-b (it's network-agnostic):

```bash
kubectl config use-context cluster-vpc-b
kubectl apply -f expose-services-vpc-a.yaml
```

## Enabling Cross-Cluster Service Discovery

Configure each cluster to discover services in the remote cluster. Create a remote secret for cluster-vpc-b on cluster-vpc-a:

```bash
# Generate remote secret from cluster-vpc-b
kubectl config use-context cluster-vpc-b
istioctl create-remote-secret \
  --context=cluster-vpc-b \
  --name=cluster-vpc-b > remote-secret-vpc-b.yaml

# Apply to cluster-vpc-a
kubectl config use-context cluster-vpc-a
kubectl apply -f remote-secret-vpc-b.yaml
```

Create a remote secret for cluster-vpc-a on cluster-vpc-b:

```bash
kubectl config use-context cluster-vpc-a
istioctl create-remote-secret \
  --context=cluster-vpc-a \
  --name=cluster-vpc-a > remote-secret-vpc-a.yaml

kubectl config use-context cluster-vpc-b
kubectl apply -f remote-secret-vpc-a.yaml
```

These secrets allow each cluster's Istio control plane to discover services in the remote cluster.

Verify that each control plane can see the remote cluster:

```bash
istioctl remote-clusters --context=cluster-vpc-a
istioctl remote-clusters --context=cluster-vpc-b
```

Both remote clusters should show a synced status.

## Deploying Test Applications

Deploy a service in each cluster. On cluster-vpc-a:

```yaml
# service-a.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-a
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: service-a
  template:
    metadata:
      labels:
        app: service-a
    spec:
      containers:
      - name: service-a
        image: curlimages/curl:8.11.1
        command: ["sleep", "infinity"]
---
apiVersion: v1
kind: Service
metadata:
  name: service-a
  namespace: default
spec:
  selector:
    app: service-a
  ports:
  - port: 8080
```

```bash
kubectl config use-context cluster-vpc-a
kubectl label namespace default istio-injection=enabled --overwrite
kubectl apply -f service-a.yaml
```

On cluster-vpc-b:

```yaml
# service-b.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: service-b
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: service-b
  template:
    metadata:
      labels:
        app: service-b
    spec:
      containers:
      - name: service-b
        image: nginxdemos/hello:plain-text
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: service-b
  namespace: default
spec:
  selector:
    app: service-b
  ports:
  - port: 8080
    targetPort: 80
```

```bash
kubectl config use-context cluster-vpc-b
kubectl label namespace default istio-injection=enabled --overwrite
kubectl apply -f service-b.yaml
```

For Kubernetes DNS lookup to succeed from cluster-vpc-a, create the same Service object there without the Deployment:

```yaml
# service-b-dns-vpc-a.yaml
apiVersion: v1
kind: Service
metadata:
  name: service-b
  namespace: default
spec:
  selector:
    app: service-b
  ports:
  - port: 8080
    targetPort: 80
```

```bash
kubectl config use-context cluster-vpc-a
kubectl apply -f service-b-dns-vpc-a.yaml
```

## Testing Cross-Network Communication

Test that services can communicate across networks. From cluster-vpc-a, call service-b in cluster-vpc-b:

```bash
kubectl config use-context cluster-vpc-a
kubectl exec -it deploy/service-a -- curl http://service-b.default.svc.cluster.local:8080/
```

The request should succeed, routing through the east-west gateways. Check the traffic path:

```bash
# View logs from service-a's sidecar
kubectl logs deploy/service-a -c istio-proxy | grep service-b

# View logs from east-west gateway in cluster-vpc-a
kubectl logs -n istio-system -l istio=eastwestgateway | grep service-b
```

You'll see traffic flowing from service-a through the gateway for the destination network to service-b.

## Implementing Locality-Aware Routing

Configure locality preferences to keep traffic in the same locality when possible. This is useful when the same service has instances in both clusters and your nodes have Kubernetes locality labels such as `topology.kubernetes.io/region`:

```yaml
# destinationrule-locality.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: service-b
  namespace: default
spec:
  host: service-b.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
        - from: region-a
          to: region-b
    outlierDetection:
      consecutive5xxErrors: 1
      interval: 1s
      baseEjectionTime: 1m
```

Apply to both clusters. This routes to local instances first, falling back to the configured region when local instances become unhealthy.

## Monitoring Cross-Network Traffic

Query Prometheus for cross-network metrics:

```promql
# Requests crossing networks
sum(rate(istio_requests_total{
  source_cluster="cluster-vpc-a",
  destination_cluster="cluster-vpc-b"
}[5m]))

# Gateway traffic
sum(rate(istio_requests_total{
  destination_workload="istio-eastwestgateway"
}[5m]))

# Cross-network latency
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    source_cluster!="",
    destination_cluster!="",
    source_cluster!=destination_cluster
  }[5m])) by (le)
)
```

## Conclusion

Istio multi-network mesh enables service communication across isolated VPCs while maintaining service mesh features. Install Istio with unique network identifiers on each cluster, deploy east-west gateways, and configure cross-cluster service discovery.

Traffic routes through gateways with end-to-end mTLS encryption. Services use standard Kubernetes DNS names regardless of which network they run in. Implement locality-aware routing to prefer local instances and reduce cross-network traffic.

Monitor cross-network traffic with Istio metrics and optimize gateway placement for performance. This architecture provides flexibility for multi-cloud, hybrid cloud, and isolated network deployments while unifying them into a single service mesh.
