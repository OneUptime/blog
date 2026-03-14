# How to Configure mTLS for Cross-Cluster Communication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, Multi-Cluster, Security, Kubernetes

Description: Set up mutual TLS for service-to-service communication across multiple Kubernetes clusters in an Istio multi-cluster mesh deployment.

---

When you run Istio across multiple Kubernetes clusters, services in one cluster need to securely communicate with services in another. mTLS is the mechanism that makes this possible, but getting it right across cluster boundaries requires careful configuration of shared trust roots, network connectivity, and service discovery.

This guide covers how to configure mTLS for cross-cluster communication in Istio's multi-cluster deployment models.

## Multi-Cluster Deployment Models

Istio supports two primary multi-cluster models:

**Primary-Remote**: One cluster runs the full Istio control plane (primary), and other clusters connect to it (remote). All clusters share the same mesh.

**Multi-Primary**: Each cluster runs its own Istio control plane, and they synchronize configuration. Services can communicate across clusters.

In both models, mTLS works the same way at the data plane level. The key requirement is that all clusters must share a common root certificate so that workload certificates from one cluster are trusted by sidecars in another cluster.

## Setting Up a Shared Root Certificate

The most important step for cross-cluster mTLS is establishing a shared trust root. Each cluster's Istio CA signs workload certificates with an intermediate CA, but all intermediate CAs must chain to the same root CA.

Generate the shared root CA:

```bash
openssl req -x509 -sha256 -nodes -days 3650 -newkey rsa:4096 \
  -subj "/O=MyOrg/CN=Shared Root CA" \
  -keyout root-key.pem -out root-cert.pem
```

Generate intermediate CAs for each cluster:

```bash
# Cluster 1 intermediate CA
openssl req -sha256 -nodes -newkey rsa:4096 \
  -subj "/O=MyOrg/CN=Cluster1 Intermediate CA" \
  -keyout cluster1-ca-key.pem -out cluster1-ca-csr.pem

openssl x509 -req -sha256 -days 1825 -CA root-cert.pem -CAkey root-key.pem \
  -CAcreateserial -in cluster1-ca-csr.pem -out cluster1-ca-cert.pem \
  -extfile <(printf "basicConstraints=critical,CA:TRUE\nkeyUsage=critical,digitalSignature,keyCertSign,cRLSign\nsubjectKeyIdentifier=hash")

# Cluster 2 intermediate CA
openssl req -sha256 -nodes -newkey rsa:4096 \
  -subj "/O=MyOrg/CN=Cluster2 Intermediate CA" \
  -keyout cluster2-ca-key.pem -out cluster2-ca-csr.pem

openssl x509 -req -sha256 -days 1825 -CA root-cert.pem -CAkey root-key.pem \
  -CAcreateserial -in cluster2-ca-csr.pem -out cluster2-ca-cert.pem \
  -extfile <(printf "basicConstraints=critical,CA:TRUE\nkeyUsage=critical,digitalSignature,keyCertSign,cRLSign\nsubjectKeyIdentifier=hash")
```

Create the certificate chains and install them in each cluster:

```bash
# Cluster 1
cat cluster1-ca-cert.pem root-cert.pem > cluster1-cert-chain.pem

kubectl create secret generic cacerts -n istio-system \
  --context=cluster1 \
  --from-file=ca-cert.pem=cluster1-ca-cert.pem \
  --from-file=ca-key.pem=cluster1-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cluster1-cert-chain.pem

# Cluster 2
cat cluster2-ca-cert.pem root-cert.pem > cluster2-cert-chain.pem

kubectl create secret generic cacerts -n istio-system \
  --context=cluster2 \
  --from-file=ca-cert.pem=cluster2-ca-cert.pem \
  --from-file=ca-key.pem=cluster2-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cluster2-cert-chain.pem
```

With this setup, workload certificates in cluster 1 are signed by Cluster1 Intermediate CA, and workload certificates in cluster 2 are signed by Cluster2 Intermediate CA. Both chain to the same root, so they trust each other.

## Configuring Multi-Primary Multi-Network

In a multi-primary setup where each cluster is on a different network, configure Istio to use east-west gateways for cross-cluster traffic:

```yaml
# Cluster 1
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-cluster1
spec:
  values:
    global:
      meshID: shared-mesh
      multiCluster:
        clusterName: cluster1
      network: network1
```

```yaml
# Cluster 2
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-cluster2
spec:
  values:
    global:
      meshID: shared-mesh
      multiCluster:
        clusterName: cluster2
      network: network2
```

Install the east-west gateway in each cluster:

```bash
# Generate east-west gateway manifest
istioctl install -f samples/multicluster/gen-eastwest-gateway.sh --context=cluster1 --network network1
istioctl install -f samples/multicluster/gen-eastwest-gateway.sh --context=cluster2 --network network2
```

Expose services through the east-west gateway:

```yaml
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

## Enabling Cross-Cluster Service Discovery

For services in one cluster to discover services in another cluster, you need to set up remote secrets:

```bash
# Allow cluster1 to discover services in cluster2
istioctl create-remote-secret --context=cluster2 --name=cluster2 | kubectl apply -f - --context=cluster1

# Allow cluster2 to discover services in cluster1
istioctl create-remote-secret --context=cluster1 --name=cluster1 | kubectl apply -f - --context=cluster2
```

This creates Kubernetes secrets that contain the kubeconfig for the remote cluster. Istio uses this to watch for service changes across clusters.

## Verifying Cross-Cluster mTLS

Deploy a test service in both clusters and verify they can communicate:

```bash
# Deploy in cluster 1
kubectl apply -f samples/helloworld/helloworld.yaml -l version=v1 --context=cluster1
kubectl apply -f samples/helloworld/helloworld.yaml -l service=helloworld --context=cluster1

# Deploy in cluster 2
kubectl apply -f samples/helloworld/helloworld.yaml -l version=v2 --context=cluster2
kubectl apply -f samples/helloworld/helloworld.yaml -l service=helloworld --context=cluster2

# Deploy sleep in cluster 1
kubectl apply -f samples/sleep/sleep.yaml --context=cluster1
```

Test cross-cluster communication:

```bash
kubectl exec --context=cluster1 deploy/sleep -- curl -s helloworld:5000/hello
```

If cross-cluster mTLS is working, you should see responses from both v1 (local) and v2 (remote) when calling repeatedly.

Check that the traffic is encrypted:

```bash
istioctl proxy-config secret --context=cluster1 deploy/sleep
```

The certificate should be signed by Cluster1 Intermediate CA and trusted by Cluster2 because they share the same root.

## Enforcing Strict mTLS Across Clusters

Set strict mTLS in both clusters:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Apply in both contexts:

```bash
kubectl apply -f strict-mtls.yaml --context=cluster1
kubectl apply -f strict-mtls.yaml --context=cluster2
```

After this, all cross-cluster communication requires mTLS. Services without sidecars in either cluster will not be able to communicate across the mesh.

## Cross-Cluster Authorization Policies

You can write AuthorizationPolicies that reference service accounts from other clusters. Since the trust domain is shared, the SPIFFE identities work across clusters:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-cross-cluster
  namespace: default
spec:
  selector:
    matchLabels:
      app: helloworld
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/sleep"]
```

This policy allows the `sleep` service account from any cluster in the mesh to access the `helloworld` service. Because the trust domain is the same (`cluster.local`), the SPIFFE identity works regardless of which cluster the caller is in.

## Troubleshooting Cross-Cluster mTLS

**Certificate trust errors**: If you see "certificate unknown" or "handshake failure" errors, the root certificates do not match. Verify that both clusters have the same `root-cert.pem`:

```bash
kubectl get secret cacerts -n istio-system --context=cluster1 -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -fingerprint -noout

kubectl get secret cacerts -n istio-system --context=cluster2 -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -fingerprint -noout
```

The fingerprints should match.

**Service discovery not working**: Check that the remote secrets are properly configured:

```bash
kubectl get secrets -n istio-system --context=cluster1 -l istio/multiCluster=true
```

**East-west gateway not routing**: Verify the gateway is up and has an external IP:

```bash
kubectl get svc istio-eastwestgateway -n istio-system --context=cluster1
```

Cross-cluster mTLS requires more setup than single-cluster mTLS, but the shared root certificate model makes it reliable once configured. The key is ensuring the trust root is consistent across all clusters in the mesh.
