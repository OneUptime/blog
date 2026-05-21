# How to Use Istio with Multi-Cluster Service API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Kubernetes, Service Mesh, MCS API

Description: How to set up Istio multi-cluster service mesh using the Kubernetes Multi-Cluster Services API for cross-cluster communication.

---

Running services across multiple Kubernetes clusters is increasingly common for high availability, disaster recovery, or geographic distribution. The Kubernetes Multi-Cluster Services (MCS) API provides a standardized way for services in one cluster to discover and communicate with services in another cluster. Istio integrates with this API to extend its service mesh capabilities across cluster boundaries.

This guide walks through setting up Istio with the MCS API for cross-cluster service communication.

## What Is the Multi-Cluster Services API

The MCS API introduces two key resources:

- **ServiceExport**: Marks a service in your cluster as available to other clusters
- **ServiceImport**: Represents a service from another cluster that is available locally

When you export a service in Cluster A, other clusters in the fleet can import it and route traffic to it as if it were a local service. The DNS convention uses `<service>.<namespace>.svc.clusterset.local` for cross-cluster service names.

## Prerequisites

You need:

- Two or more Kubernetes clusters with Istio installed
- Network connectivity between clusters (pod-to-pod or through east-west gateways)
- A shared root CA for mTLS across clusters
- The MCS API CRDs installed on each cluster

## Installing MCS API CRDs

Install the MCS API CRDs on each cluster:

```bash
kubectl apply \
  -f https://raw.githubusercontent.com/kubernetes-sigs/mcs-api/v0.5.0/config/crd/multicluster.x-k8s.io_serviceexports.yaml \
  -f https://raw.githubusercontent.com/kubernetes-sigs/mcs-api/v0.5.0/config/crd/multicluster.x-k8s.io_serviceimports.yaml
```

Verify the CRDs are present:

```bash
kubectl get crd | grep multicluster
```

You should see `serviceexports.multicluster.x-k8s.io` and `serviceimports.multicluster.x-k8s.io`.

## Setting Up Istio for Multi-Cluster

First, configure both clusters with a shared trust domain and root CA. Generate a shared root certificate:

```bash
mkdir -p certs
cd certs

# Create root CA

openssl req -x509 -sha256 -nodes -days 3650 \
  -newkey rsa:4096 \
  -subj '/O=example Inc./CN=example.com' \
  -keyout root-key.pem \
  -out root-cert.pem
```

Create intermediate CAs for each cluster:

```bash
# For cluster1
openssl req -newkey rsa:4096 -sha256 -nodes \
  -subj '/O=example Inc./CN=cluster1' \
  -keyout cluster1-ca-key.pem \
  -out cluster1-ca-csr.pem

openssl x509 -req -sha256 -days 3650 \
  -CA root-cert.pem -CAkey root-key.pem \
  -set_serial 1 \
  -extfile <(printf "basicConstraints=critical,CA:TRUE,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign") \
  -in cluster1-ca-csr.pem \
  -out cluster1-ca-cert.pem

cat cluster1-ca-cert.pem root-cert.pem > cluster1-cert-chain.pem
```

Create the `cacerts` secret in each cluster:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=cluster1-ca-cert.pem \
  --from-file=ca-key.pem=cluster1-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cluster1-cert-chain.pem
```

## Installing Istio with Multi-Cluster and MCS Support

Install Istio on each cluster with the appropriate multi-cluster configuration. For a primary-remote setup where cluster1 is primary:

On cluster1 (primary):

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-primary
spec:
  values:
    global:
      meshID: mesh1
      externalIstiod: true
      multiCluster:
        clusterName: cluster1
      network: network1
    pilot:
      env:
        ENABLE_MCS_SERVICE_DISCOVERY: "true"
        ENABLE_MCS_HOST: "true"
        MCS_API_VERSION: "v1beta1"
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

```bash
istioctl install --context="${CTX_CLUSTER1}" -f cluster1-config.yaml
```

On cluster2 (remote):

```bash
# Install the primary cluster's east-west gateway first
samples/multicluster/gen-eastwest-gateway.sh \
  --network network1 | \
  istioctl install --context="${CTX_CLUSTER1}" -f -

kubectl --context="${CTX_CLUSTER2}" create namespace istio-system
kubectl --context="${CTX_CLUSTER2}" annotate namespace istio-system \
  topology.istio.io/controlPlaneClusters=cluster1
kubectl --context="${CTX_CLUSTER2}" label namespace istio-system \
  topology.istio.io/network=network2

kubectl apply --context="${CTX_CLUSTER1}" -n istio-system -f \
  samples/multicluster/expose-istiod.yaml

export DISCOVERY_ADDRESS=$(kubectl --context="${CTX_CLUSTER1}" \
  -n istio-system get svc istio-eastwestgateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
```

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-remote
spec:
  profile: remote
  values:
    istiodRemote:
      injectionPath: /inject/cluster/cluster2/net/network2
    global:
      remotePilotAddress: ${DISCOVERY_ADDRESS}
```

```bash
envsubst < cluster2-config.yaml | \
  istioctl install --context="${CTX_CLUSTER2}" -f -

istioctl create-remote-secret \
  --context="${CTX_CLUSTER2}" \
  --name=cluster2 | \
  kubectl apply -f - --context="${CTX_CLUSTER1}"
```

## Setting Up East-West Gateways

If your clusters are on different networks and pods cannot communicate directly, you need east-west gateways. Install one on cluster2 as well:

```bash
# On cluster2
samples/multicluster/gen-eastwest-gateway.sh \
  --network network2 | \
  istioctl install --context="${CTX_CLUSTER2}" -f -

# Expose services through the gateway
kubectl apply --context="${CTX_CLUSTER1}" -n istio-system -f \
  samples/multicluster/expose-services.yaml
```

Because cluster2 is installed with the remote profile, exposing services on the primary cluster exposes them on the east-west gateways of both clusters.

## Exporting a Service

Now comes the MCS API part. Say you have a `payment-service` running in cluster1 that you want to make available to cluster2. Create a ServiceExport:

```yaml
apiVersion: multicluster.x-k8s.io/v1beta1
kind: ServiceExport
metadata:
  name: payment-service
  namespace: payments
```

Apply it in cluster1:

```bash
kubectl apply --context="${CTX_CLUSTER1}" -f payment-service-export.yaml
```

With MCS service discovery enabled, Istio watches for ServiceExport resources and makes the service discoverable across the mesh.

## Consuming an Exported Service

In cluster2, a ServiceImport resource will be created automatically (or you can create one manually depending on your setup):

```yaml
apiVersion: multicluster.x-k8s.io/v1beta1
kind: ServiceImport
metadata:
  name: payment-service
  namespace: payments
spec:
  type: ClusterSetIP
  ports:
    - port: 8080
      protocol: TCP
```

Services in cluster2 can now reach the payment service using the clusterset DNS name:

```bash
curl http://payment-service.payments.svc.clusterset.local:8080
```

The clusterset DNS name is the MCS-standard name. If the service also exists locally as a Kubernetes Service, Istio can route the regular `svc.cluster.local` host according to its normal multicluster service discovery behavior.

## Traffic Management Across Clusters

You can use Istio's DestinationRule to control traffic policy across clusters. For example, to enable outlier detection for an exported service:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service-dr
  namespace: payments
spec:
  host: payment-service.payments.svc.clusterset.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 60s
    connectionPool:
      tcp:
        maxConnections: 100
```

Istio load balances across discovered endpoints by default. To prefer local endpoints or fail over between regions, configure Istio locality load balancing in addition to outlier detection.

## Monitoring Cross-Cluster Traffic

You can see cross-cluster traffic in Istio's telemetry. The source and destination cluster labels are automatically added to metrics:

```bash
# Check metrics for cross-cluster requests
kubectl exec -n istio-system deploy/prometheus -- \
  curl -s 'localhost:9090/api/v1/query?query=istio_requests_total{destination_cluster="cluster2"}'
```

In Kiali, cross-cluster traffic shows up as edges between services with different cluster labels, making it easy to visualize the flow.

## Debugging Cross-Cluster Issues

If services cannot reach each other across clusters, check these things:

```bash
# Verify endpoints are discovered
istioctl proxy-config endpoint deploy/my-app.default --context="${CTX_CLUSTER2}" | grep payment-service

# Check that the east-west gateway is reachable
kubectl get svc istio-eastwestgateway -n istio-system --context="${CTX_CLUSTER1}"

# Verify workload certificates are available to the proxy
istioctl proxy-config secret deploy/my-app.default --context="${CTX_CLUSTER2}"
```

Common problems include firewall rules blocking east-west gateway traffic, mismatched trust domains (different root CAs), and missing remote secrets that allow clusters to discover each other's endpoints.

## Summary

Using Istio with the Multi-Cluster Services API gives you a standardized way to expose and consume services across Kubernetes cluster boundaries. The MCS API handles service export and discovery while Istio manages the actual data plane traffic, mTLS, and observability. Together, they make multi-cluster service communication almost as straightforward as single-cluster communication, with the added bonus of locality-aware load balancing and failover when you configure the relevant Istio traffic policy.
