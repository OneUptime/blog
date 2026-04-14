# How to Configure Dapr Sentry for Multi-Cluster Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sentry, Multi-Cluster, Federation, Security

Description: Configure Dapr Sentry across multiple Kubernetes clusters using a shared root CA so services can authenticate each other across cluster boundaries with mTLS.

---

## Multi-Cluster mTLS Architecture

For services in different Kubernetes clusters to communicate over Dapr mTLS, both clusters must trust the same root CA. Each cluster runs its own Sentry instance, but both use issuer certificates derived from a shared root CA. This enables cross-cluster identity verification without sharing private keys.

## Step 1 - Create a Shared Root CA

Generate a single root CA that both clusters will trust:

```bash
openssl genrsa -out shared-root-ca.key 4096
openssl req -new -x509 -days 3650 \
  -key shared-root-ca.key \
  -out shared-root-ca.crt \
  -subj "/CN=Shared Dapr Root CA/O=MyOrg"
```

## Step 2 - Create Per-Cluster Issuer Certificates

Each cluster gets a unique issuer certificate signed by the shared root CA:

```bash
# Create a CA extensions config for issuer certificates
cat > ca-ext.cnf << EOF
[v3_ca]
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
EOF

# Cluster 1 issuer
openssl genrsa -out cluster1-issuer.key 2048
openssl req -new -key cluster1-issuer.key -out cluster1-issuer.csr \
  -subj "/CN=Dapr Cluster 1 Issuer/O=MyOrg"
openssl x509 -req -in cluster1-issuer.csr \
  -CA shared-root-ca.crt -CAkey shared-root-ca.key -CAcreateserial \
  -out cluster1-issuer.crt -days 365 -extfile ca-ext.cnf -extensions v3_ca

# Cluster 2 issuer
openssl genrsa -out cluster2-issuer.key 2048
openssl req -new -key cluster2-issuer.key -out cluster2-issuer.csr \
  -subj "/CN=Dapr Cluster 2 Issuer/O=MyOrg"
openssl x509 -req -in cluster2-issuer.csr \
  -CA shared-root-ca.crt -CAkey shared-root-ca.key -CAcreateserial \
  -out cluster2-issuer.crt -days 365 -extfile ca-ext.cnf -extensions v3_ca
```

## Step 3 - Deploy Dapr with Certificates on Each Cluster

Install Dapr on each cluster, passing the certificate files via Helm values. The Dapr Helm chart manages the `dapr-trust-bundle` secret internally, so certificates must be provided during installation rather than as a manually created secret.

```bash
# Cluster 1
helm install dapr dapr/dapr \
  --kube-context=cluster1 \
  --namespace dapr-system \
  --create-namespace \
  --set-file dapr_sentry.tls.root.certPEM=shared-root-ca.crt \
  --set-file dapr_sentry.tls.issuer.certPEM=cluster1-issuer.crt \
  --set-file dapr_sentry.tls.issuer.keyPEM=cluster1-issuer.key

# Cluster 2
helm install dapr dapr/dapr \
  --kube-context=cluster2 \
  --namespace dapr-system \
  --create-namespace \
  --set-file dapr_sentry.tls.root.certPEM=shared-root-ca.crt \
  --set-file dapr_sentry.tls.issuer.certPEM=cluster2-issuer.crt \
  --set-file dapr_sentry.tls.issuer.keyPEM=cluster2-issuer.key
```

## Step 4 - Configure Cross-Cluster Name Resolution

Use a name resolution component like Consul or an ingress to route cross-cluster calls. Configure Consul name resolution in the Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "consul"
    configuration:
      client:
        address: "consul.cluster2.example.com:8500"
      selfRegister: true
```

## Verifying Cross-Cluster mTLS

Test cross-cluster service invocation:

```bash
# From cluster 1 app to cluster 2 app
curl http://localhost:3500/v1.0/invoke/target-service/method/health
```

## Summary

Multi-cluster Dapr mTLS requires a shared root CA with per-cluster issuer certificates. Deploy the shared root CA as a trust anchor in both clusters, use unique issuer certs per cluster, and configure cross-cluster name resolution. Services in different clusters can then authenticate each other because their workload certificates chain to the same trusted root CA.
