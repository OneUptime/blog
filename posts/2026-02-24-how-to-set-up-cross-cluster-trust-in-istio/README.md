# How to Set Up Cross-Cluster Trust in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Trust, Security, MTLS, Kubernetes

Description: Step-by-step instructions for establishing cross-cluster trust in Istio multi-cluster deployments using shared root CAs and trust domains.

---

Running Istio across multiple Kubernetes clusters is increasingly common, but one thing trips people up more than anything else: establishing trust between clusters. If cluster A does not trust the certificates from cluster B, services cannot communicate securely across the mesh boundary. Getting cross-cluster trust right is the critical first step before anything else works.

## Why Cross-Cluster Trust Is Needed

Each Istio installation has its own Certificate Authority (CA) that issues mTLS certificates to workloads. By default, two independent Istio installations will have completely different root CAs, meaning they cannot verify each other's certificates. A workload in cluster A will reject connections from cluster B because it does not recognize the CA that signed cluster B's certificates.

To fix this, both clusters need to trust the same root CA. There are two approaches: a shared root CA with different intermediate CAs, or plugging both clusters into the same CA hierarchy.

## Generating the Root CA

Start by generating a root CA certificate that both clusters will trust. You can use OpenSSL or a tool like step-cli:

```bash
# Create a root CA
mkdir -p certs
openssl req -new -newkey rsa:4096 -x509 -sha256 \
  -days 3650 -nodes \
  -out certs/root-cert.pem \
  -keyout certs/root-key.pem \
  -subj "/O=MyCompany/CN=Root CA"
```

## Creating Intermediate CAs for Each Cluster

Each cluster gets its own intermediate CA, signed by the shared root. This is a good practice because if one cluster's intermediate CA is compromised, you can revoke it without affecting the other cluster.

For cluster 1:

```bash
# Generate intermediate CA key for cluster 1
openssl req -new -newkey rsa:4096 -nodes \
  -out certs/cluster1-ca-cert.csr \
  -keyout certs/cluster1-ca-key.pem \
  -subj "/O=MyCompany/CN=Cluster1 Intermediate CA"

# Sign with root CA
openssl x509 -req -sha256 -days 1825 \
  -CA certs/root-cert.pem \
  -CAkey certs/root-key.pem \
  -CAcreateserial \
  -in certs/cluster1-ca-cert.csr \
  -out certs/cluster1-ca-cert.pem \
  -extfile <(printf "basicConstraints=CA:TRUE\nkeyUsage=critical,digitalSignature,keyCertSign")

# Create cert chain
cat certs/cluster1-ca-cert.pem certs/root-cert.pem > certs/cluster1-cert-chain.pem
```

Repeat for cluster 2:

```bash
openssl req -new -newkey rsa:4096 -nodes \
  -out certs/cluster2-ca-cert.csr \
  -keyout certs/cluster2-ca-key.pem \
  -subj "/O=MyCompany/CN=Cluster2 Intermediate CA"

openssl x509 -req -sha256 -days 1825 \
  -CA certs/root-cert.pem \
  -CAkey certs/root-key.pem \
  -CAcreateserial \
  -in certs/cluster2-ca-cert.csr \
  -out certs/cluster2-ca-cert.pem \
  -extfile <(printf "basicConstraints=CA:TRUE\nkeyUsage=critical,digitalSignature,keyCertSign")

cat certs/cluster2-ca-cert.pem certs/root-cert.pem > certs/cluster2-cert-chain.pem
```

## Installing CA Secrets in Each Cluster

Create the `cacerts` secret that Istio expects in each cluster:

```bash
# Cluster 1
kubectl --context=cluster1 create namespace istio-system

kubectl --context=cluster1 create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=certs/cluster1-ca-cert.pem \
  --from-file=ca-key.pem=certs/cluster1-ca-key.pem \
  --from-file=root-cert.pem=certs/root-cert.pem \
  --from-file=cert-chain.pem=certs/cluster1-cert-chain.pem
```

```bash
# Cluster 2
kubectl --context=cluster2 create namespace istio-system

kubectl --context=cluster2 create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=certs/cluster2-ca-cert.pem \
  --from-file=ca-key.pem=certs/cluster2-ca-key.pem \
  --from-file=root-cert.pem=certs/root-cert.pem \
  --from-file=cert-chain.pem=certs/cluster2-cert-chain.pem
```

The key detail here is that both clusters get the same `root-cert.pem`. This is what enables cross-cluster trust - workloads in either cluster can verify certificates from the other because they trace back to the same root.

## Installing Istio with Matching Trust Domains

Both clusters must use the same trust domain. Install Istio on each cluster with matching configuration:

```yaml
# cluster1-istio.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: mycompany.com
  values:
    global:
      meshID: my-mesh
      multiCluster:
        clusterName: cluster1
      network: network1
```

```yaml
# cluster2-istio.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: mycompany.com
  values:
    global:
      meshID: my-mesh
      multiCluster:
        clusterName: cluster2
      network: network2
```

Install on each cluster:

```bash
istioctl install --context=cluster1 -f cluster1-istio.yaml
istioctl install --context=cluster2 -f cluster2-istio.yaml
```

## Setting Up Cross-Cluster Service Discovery

Trust alone is not enough. The clusters also need to discover each other's services. Create remote secrets so each cluster's istiod can access the other cluster's API server:

```bash
# Allow cluster1 to discover services in cluster2
istioctl create-remote-secret \
  --context=cluster2 \
  --name=cluster2 | \
  kubectl apply --context=cluster1 -f -

# Allow cluster2 to discover services in cluster1
istioctl create-remote-secret \
  --context=cluster1 \
  --name=cluster1 | \
  kubectl apply --context=cluster2 -f -
```

## Configuring Cross-Network Gateways

If the clusters are on different networks (cannot directly route pod IPs), you need east-west gateways:

```bash
# Generate east-west gateway for cluster1
samples/multicluster/gen-eastwest-gateway.sh \
  --mesh my-mesh --cluster cluster1 --network network1 | \
  istioctl --context=cluster1 install -y -f -

# Expose services in cluster1
kubectl --context=cluster1 apply -n istio-system -f \
  samples/multicluster/expose-services.yaml
```

The expose-services configuration looks like:

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

Repeat for cluster2.

## Verifying Cross-Cluster Trust

Deploy a test workload in both clusters and verify they can communicate:

```bash
# Deploy sleep in cluster1
kubectl --context=cluster1 create namespace sample
kubectl --context=cluster1 label namespace sample istio-injection=enabled
kubectl --context=cluster1 apply -n sample -f samples/sleep/sleep.yaml

# Deploy httpbin in cluster2
kubectl --context=cluster2 create namespace sample
kubectl --context=cluster2 label namespace sample istio-injection=enabled
kubectl --context=cluster2 apply -n sample -f samples/httpbin/httpbin.yaml
```

Now test from cluster1 to cluster2:

```bash
kubectl --context=cluster1 exec -n sample deploy/sleep -- \
  curl -s httpbin.sample.svc.cluster.local:8000/headers
```

If cross-cluster trust is working, you will see a successful response. The mTLS handshake happens transparently - cluster1's workload presents its certificate, cluster2's workload verifies it against the shared root CA, and the connection succeeds.

## Troubleshooting Trust Issues

If cross-cluster communication fails, check these things:

Verify both clusters have the correct root certificate:

```bash
kubectl --context=cluster1 get secret cacerts -n istio-system -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -text -noout | grep "Issuer"

kubectl --context=cluster2 get secret cacerts -n istio-system -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -text -noout | grep "Issuer"
```

Both should show the same issuer. Check that workload certs chain back to the root:

```bash
istioctl --context=cluster1 proxy-config secret deploy/sleep -n sample -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl verify -CAfile certs/root-cert.pem
```

If you see "unable to get local issuer certificate", the certificate chain is broken. Double-check your cert-chain.pem files include both the intermediate and root certificates.

Cross-cluster trust is the foundation of multi-cluster Istio. Once you have a shared root CA with per-cluster intermediates, matching trust domains, and proper service discovery, services communicate across cluster boundaries as naturally as they do within a single cluster. The mTLS handshake takes care of the rest.
