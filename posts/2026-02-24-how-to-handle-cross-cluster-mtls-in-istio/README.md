# How to Handle Cross-Cluster mTLS in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, Multi-Cluster, Security, Service Mesh

Description: How to configure and troubleshoot mutual TLS authentication across clusters in an Istio multi-cluster service mesh deployment.

---

Mutual TLS (mTLS) is the backbone of Istio's security model. Every sidecar proxy gets a certificate, and workloads authenticate each other using these certificates on every request. In a single-cluster setup, this just works because all certificates come from the same certificate authority (CA). But in a multi-cluster mesh, you need to make sure clusters trust each other's certificates.

Getting cross-cluster mTLS right is non-negotiable. If the certificate trust chain is broken, workloads in one cluster simply cannot talk to workloads in another. Here is how it all fits together.

## How mTLS Works in Istio

When Istiod starts, it creates a CA (or uses one you provide). It then issues short-lived X.509 certificates to every sidecar proxy through the SDS (Secret Discovery Service) API. These certificates contain the workload's SPIFFE identity in the SAN (Subject Alternative Name) field, formatted as:

```text
spiffe://<trust-domain>/ns/<namespace>/sa/<service-account>
```

When two sidecars communicate, they perform a TLS handshake where both sides present their certificates. Each side validates:

1. The certificate is signed by a trusted CA
2. The SPIFFE identity is allowed by the authorization policy

In a multi-cluster mesh, the challenge is #1. Both clusters need to trust certificates issued by the other cluster's Istiod.

## The Shared Root CA Approach

The standard approach is to use a shared root CA with per-cluster intermediate CAs. Here is the hierarchy:

```text
Root CA (shared)
├── Intermediate CA (cluster1)
│   └── Workload cert (cluster1 pods)
└── Intermediate CA (cluster2)
    └── Workload cert (cluster2 pods)
```

Each cluster's Istiod signs workload certificates using its own intermediate CA. Since both intermediate CAs chain back to the same root, any workload in the mesh can validate any other workload's certificate.

## Generating the Certificate Hierarchy

Istio provides Makefiles to generate these certificates. Start with the root:

```bash
mkdir -p certs && cd certs

# Generate root CA (keep root-key.pem safe!)
make -f ../tools/certs/Makefile.selfsigned.mk root-ca
```

This creates:
- `root-cert.pem` - the root certificate
- `root-key.pem` - the root private key (protect this)
- `root-ca.conf` - the OpenSSL configuration used

Generate intermediate CAs:

```bash
make -f ../tools/certs/Makefile.selfsigned.mk cluster1-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk cluster2-cacerts
```

Each cluster directory contains:
- `ca-cert.pem` - intermediate CA certificate
- `ca-key.pem` - intermediate CA private key
- `root-cert.pem` - copy of the root certificate
- `cert-chain.pem` - the full certificate chain (intermediate + root)

## Installing Certificates in Clusters

The certificates go into a Kubernetes Secret called `cacerts` in the `istio-system` namespace. Istiod looks for this secret at startup:

```bash
# Cluster 1
kubectl create secret generic cacerts -n istio-system --context="${CTX_CLUSTER1}" \
  --from-file=cluster1/ca-cert.pem \
  --from-file=cluster1/ca-key.pem \
  --from-file=cluster1/root-cert.pem \
  --from-file=cluster1/cert-chain.pem

# Cluster 2
kubectl create secret generic cacerts -n istio-system --context="${CTX_CLUSTER2}" \
  --from-file=cluster2/ca-cert.pem \
  --from-file=cluster2/ca-key.pem \
  --from-file=cluster2/root-cert.pem \
  --from-file=cluster2/cert-chain.pem
```

If Istiod is already running, you need to restart it to pick up the new CA:

```bash
kubectl rollout restart deployment istiod -n istio-system --context="${CTX_CLUSTER1}"
kubectl rollout restart deployment istiod -n istio-system --context="${CTX_CLUSTER2}"
```

Then restart all workloads so they get new certificates signed by the new CA:

```bash
kubectl rollout restart deployment --all -n sample --context="${CTX_CLUSTER1}"
kubectl rollout restart deployment --all -n sample --context="${CTX_CLUSTER2}"
```

## Configuring mTLS Mode

Istio supports three mTLS modes through PeerAuthentication resources:

**STRICT** - only mTLS traffic is accepted:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

**PERMISSIVE** - both plaintext and mTLS are accepted (default):

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

**DISABLE** - mTLS is not used.

For cross-cluster communication, STRICT mode is recommended in production. Apply it to both clusters:

```bash
kubectl apply -f - --context="${CTX_CLUSTER1}" <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
EOF

kubectl apply -f - --context="${CTX_CLUSTER2}" <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
EOF
```

## Trust Domain Configuration

The trust domain is part of every workload identity. In a multi-cluster mesh, all clusters should use the same trust domain so that authorization policies work consistently:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: my-mesh.example.com
```

If clusters have different trust domains, you need trust domain aliases:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: cluster1.example.com
    trustDomainAliases:
    - cluster2.example.com
```

## Verifying Cross-Cluster mTLS

Check what certificate a workload is using:

```bash
istioctl proxy-config secret deployment/sleep -n sample --context="${CTX_CLUSTER1}"
```

Inspect the actual certificate:

```bash
istioctl proxy-config secret deployment/sleep -n sample --context="${CTX_CLUSTER1}" -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 --decode | openssl x509 -text -noout
```

Look for:
- The issuer should be your intermediate CA
- The SAN should contain the SPIFFE identity
- The certificate chain should include the root CA

To verify mTLS is actually being used for cross-cluster calls:

```bash
# Check the TLS mode on a specific listener
istioctl proxy-config listeners deployment/helloworld-v1 -n sample --context="${CTX_CLUSTER1}" -o json | \
  jq '.[].filterChains[].transportSocket'
```

## Troubleshooting Cross-Cluster mTLS

**Connection refused or TLS errors**: The most common cause is mismatched root CAs. Verify both clusters use the same root:

```bash
# Compare root certs
kubectl get secret cacerts -n istio-system --context="${CTX_CLUSTER1}" -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -fingerprint -noout

kubectl get secret cacerts -n istio-system --context="${CTX_CLUSTER2}" -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -fingerprint -noout
```

The fingerprints must match.

**Certificate expired**: Workload certificates are short-lived (24 hours by default). Istiod auto-rotates them. If rotation fails, check Istiod logs:

```bash
kubectl logs -n istio-system -l app=istiod --context="${CTX_CLUSTER1}" | grep "SDS"
```

**RBAC denied**: If mTLS works but requests are denied, check authorization policies. Cross-cluster, the source identity still uses the same SPIFFE format, so authorization policies should work the same way.

## Summary

Cross-cluster mTLS in Istio requires a shared root CA. Each cluster gets its own intermediate CA, and workload certificates chain back to the common root. The setup involves generating the certificate hierarchy, loading it as Kubernetes secrets, and making sure all clusters use the same trust domain. Once in place, mTLS works transparently across clusters, providing strong identity and encryption for every request.
