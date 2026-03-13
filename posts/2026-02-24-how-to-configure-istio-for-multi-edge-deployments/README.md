# How to Configure Istio for Multi-Edge Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Edge Computing, Multi-Cluster, Mesh Federation, Deployments

Description: How to set up Istio across multiple edge clusters with independent control planes while maintaining unified service mesh capabilities.

---

Running Istio at a single edge site is one thing. Running it across dozens or hundreds of edge locations and keeping them all working together is a whole different problem. You need each edge site to function independently while still being part of a larger mesh for cross-site communication and centralized observability.

## Multi-Edge Architecture Options

There are three main ways to organize Istio across multiple edge sites:

**Shared control plane**: One istiod instance manages all edge clusters. Simple but creates a single point of failure and requires constant connectivity.

**Replicated control planes with shared trust**: Each edge site runs its own istiod. They share a root CA so they can establish mTLS with each other. This is the best option for most edge deployments.

**Fully independent meshes**: Each site is its own mesh with no cross-site communication. Use this when edge sites truly do not need to talk to each other.

For this guide, we will focus on the replicated control plane approach since it gives you the best balance of independence and connectivity.

## Setting Up a Shared Root of Trust

All edge clusters need certificates derived from the same root CA. Generate the root and per-cluster intermediates:

```bash
# Create the root CA (do this once, store securely)
mkdir -p certs
openssl req -new -x509 -nodes -days 3650 \
  -keyout certs/root-key.pem \
  -out certs/root-cert.pem \
  -subj "/O=MyEdgeOrg/CN=Root CA"

# Script to generate intermediate CA for each edge site
for site in edge-site-1 edge-site-2 edge-site-3; do
  openssl req -new -nodes \
    -keyout "certs/${site}-ca-key.pem" \
    -out "certs/${site}-ca.csr" \
    -subj "/O=MyEdgeOrg/CN=${site} Intermediate CA"

  openssl x509 -req -days 1825 \
    -CA certs/root-cert.pem \
    -CAkey certs/root-key.pem \
    -CAcreateserial \
    -in "certs/${site}-ca.csr" \
    -out "certs/${site}-ca-cert.pem"
done
```

Install the certificates on each edge cluster:

```bash
# Run this against each edge cluster's kubeconfig
SITE="edge-site-1"
kubectl create namespace istio-system
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem="certs/${SITE}-ca-cert.pem" \
  --from-file=ca-key.pem="certs/${SITE}-ca-key.pem" \
  --from-file=root-cert.pem=certs/root-cert.pem \
  --from-file=cert-chain.pem="certs/${SITE}-ca-cert.pem"
```

## Installing Istio on Edge Sites

Create a template IstioOperator configuration for edge sites:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: edge-site
spec:
  profile: minimal
  meshConfig:
    accessLogFile: ""
    enableAutoMtls: true
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  values:
    global:
      meshID: edge-mesh
      multiCluster:
        clusterName: CLUSTER_NAME_PLACEHOLDER
      network: NETWORK_PLACEHOLDER
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 128Mi
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        hpaSpec:
          minReplicas: 1
          maxReplicas: 1
```

Apply with site-specific values:

```bash
# For each site, substitute the placeholders
SITE="edge-site-1"
NETWORK="edge-network-1"

sed "s/CLUSTER_NAME_PLACEHOLDER/${SITE}/g; s/NETWORK_PLACEHOLDER/${NETWORK}/g" \
  edge-istio-template.yaml > "edge-istio-${SITE}.yaml"

istioctl install -f "edge-istio-${SITE}.yaml" -y
```

## Deploying East-West Gateways

Each edge site that needs cross-site communication needs an east-west gateway:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: eastwest-gateway
spec:
  profile: empty
  components:
    ingressGateways:
      - name: istio-eastwestgateway
        label:
          istio: eastwestgateway
          topology.istio.io/network: edge-network-1
        enabled: true
        k8s:
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
          env:
            - name: ISTIO_META_REQUESTED_NETWORK_VIEW
              value: edge-network-1
          service:
            type: NodePort
            ports:
              - name: tls
                port: 15443
                targetPort: 15443
                nodePort: 31443
```

Using NodePort is practical for edge since you probably do not have cloud load balancers. Make sure port 31443 (or whatever you choose) is reachable from other edge sites.

Expose services through the gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: cross-network
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

## Connecting Edge Sites to Each Other

Create remote secrets so each site can discover services on other sites:

```bash
# Generate remote secret from edge-site-1
istioctl create-remote-secret \
  --name=edge-site-1 \
  --server=https://edge-1-api.example.com:6443 \
  > edge-site-1-remote-secret.yaml

# Apply to edge-site-2
kubectl apply -f edge-site-1-remote-secret.yaml --context=edge-site-2

# And vice versa
istioctl create-remote-secret \
  --name=edge-site-2 \
  --server=https://edge-2-api.example.com:6443 \
  > edge-site-2-remote-secret.yaml

kubectl apply -f edge-site-2-remote-secret.yaml --context=edge-site-1
```

## Managing Configuration Across Sites

For consistent configuration across all edge sites, use a GitOps approach. Store your Istio resources in a git repository and use a tool like Argo CD or Flux to sync them:

```yaml
# base/destination-rule.yaml - shared across all sites
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: default-traffic-policy
spec:
  host: "*.local"
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 5s
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

Use Kustomize overlays for site-specific configuration:

```yaml
# overlays/edge-site-1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patchesStrategicMerge:
  - site-specific-config.yaml
```

## Locality-Aware Routing Across Sites

Configure Istio to prefer local services but fail over to other edge sites or the cloud:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: locality-routing
  namespace: edge-app
spec:
  host: shared-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
          - from: "edge-site-1/*"
            to:
              "edge-site-1/*": 80
              "edge-site-2/*": 20
        failover:
          - from: edge-site-1
            to: edge-site-2
          - from: edge-site-2
            to: edge-site-1
```

This sends 80% of traffic to local instances and 20% to the nearest other edge site. If the local site's instances are all unhealthy, it fails over completely.

## Monitoring Multi-Edge Health

When you have many edge sites, you need centralized monitoring. Configure each site to export metrics to a central Prometheus or a metrics aggregation service:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_MESH_ID: "edge-mesh"
        ISTIO_META_CLUSTER_ID: "edge-site-1"
```

The cluster ID label on all metrics makes it possible to filter and aggregate by site in your dashboards.

Check connectivity between sites:

```bash
# From edge-site-1, verify you can reach services on edge-site-2
istioctl proxy-status --context=edge-site-1

# Check cross-cluster service discovery
istioctl proxy-config endpoints deploy/my-app -n edge-app --context=edge-site-1 | grep edge-site-2
```

## Handling Site Additions and Removals

When you add a new edge site, the process is:

1. Generate an intermediate CA from the shared root
2. Install Istio with the template configuration
3. Deploy the east-west gateway
4. Create and distribute remote secrets

When removing a site, delete the remote secrets from all other sites:

```bash
# Remove edge-site-3 from the mesh
kubectl delete secret istio-remote-secret-edge-site-3 \
  -n istio-system --context=edge-site-1
kubectl delete secret istio-remote-secret-edge-site-3 \
  -n istio-system --context=edge-site-2
```

Running Istio across multiple edge sites requires some upfront infrastructure work, but the result is a fleet of independently operating edge clusters that can still communicate securely when they need to. The replicated control plane model ensures that no single site failure takes down the whole mesh.
