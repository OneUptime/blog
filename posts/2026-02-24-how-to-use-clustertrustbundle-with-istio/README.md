# How to Use ClusterTrustBundle with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ClusterTrustBundle, Kubernetes, TLS, Security, Certificate

Description: A practical guide to using Kubernetes ClusterTrustBundle resources with Istio for managing trust anchors across your service mesh.

---

Kubernetes introduced ClusterTrustBundle as a way to distribute trust anchors (CA certificates) across the cluster in a standardized, API-driven manner. If you run Istio, this gives you a cleaner approach to managing the root certificates that your mesh workloads trust, compared to manually distributing CA bundles through ConfigMaps or secrets.

ClusterTrustBundle is a cluster-scoped resource, meaning it is available to all namespaces. This fits naturally with how Istio distributes trust - the mesh needs a consistent set of trusted roots everywhere.

## What Problem Does ClusterTrustBundle Solve

Traditionally in Istio, root CA certificates are distributed through Kubernetes secrets (like `istio-ca-secret` or `cacerts`) or baked into the mesh configuration. This works, but it has drawbacks:

- Updating CA certificates requires touching secrets in specific namespaces
- There is no standard API for querying which CAs are trusted
- During CA rotation, you need the old and new roots available simultaneously, which means careful secret management
- Multi-cluster setups need consistent CA distribution, and secrets do not help with that

ClusterTrustBundle provides an API object specifically designed for distributing trust anchors. It is declarative, versionable, and integrates with Kubernetes RBAC.

## Prerequisites

- Kubernetes 1.33+ (ClusterTrustBundle reached beta in 1.33)
- An Istio release with ClusterTrustBundle API support
- The `ClusterTrustBundle` feature gate and the `certificates.k8s.io/v1beta1` API enabled on the API server

Check if ClusterTrustBundle is available in your cluster:

```bash
kubectl api-resources | grep trustbundle
```

If you see `clustertrustbundles` in the output, you are good to go.

## Creating a ClusterTrustBundle

First, you need your CA certificate. If you are using Istio's built-in CA, you can extract the root certificate:

```bash
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | base64 -d > root-cert.pem
```

When Istio's ClusterTrustBundle support is enabled, istiod manages a ClusterTrustBundle for the mesh root certificate. If you need to pre-create the resource, use the name and signer that Istio expects:

```yaml
apiVersion: certificates.k8s.io/v1beta1
kind: ClusterTrustBundle
metadata:
  name: istio.io:istiod-ca:root-cert
spec:
  signerName: istio.io/istiod-ca
  trustBundle: |
    -----BEGIN CERTIFICATE-----
    MIIFjTCCA3WgAwIBAgIUK2x1GmYTjORA6M6fJx4i9dDRBjwwDQYJKoZIhvcNAQEL
    BQAwVjELMAkGA1UEBhMCVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFjAUBgNVBAcT
    ... (your CA certificate content) ...
    -----END CERTIFICATE-----
```

Apply it:

```bash
kubectl apply -f istio-trust-bundle.yaml
```

Signer-linked ClusterTrustBundles are tied to a specific signer name. If `signerName` is set, the object name must start with the signer name with `/` converted to `:`:

```yaml
apiVersion: certificates.k8s.io/v1beta1
kind: ClusterTrustBundle
metadata:
  name: istio.io:istiod-ca:root-cert
spec:
  signerName: istio.io/istiod-ca
  trustBundle: |
    -----BEGIN CERTIFICATE-----
    ... (your CA certificate content) ...
    -----END CERTIFICATE-----
```

## Configuring Istio to Use ClusterTrustBundle

To have Istio store the mesh root certificate in a ClusterTrustBundle instead of the root certificate ConfigMap, enable the feature during installation.

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-config
spec:
  values:
    pilot:
      env:
        ENABLE_CLUSTER_TRUST_BUNDLE_API: "true"
```

Apply this configuration:

```bash
istioctl install -f istio-trustbundle-config.yaml -y
```

## Using ClusterTrustBundle for Peer Verification

Once Istio is configured to use the ClusterTrustBundle API, istiod keeps the Istio-managed bundle in sync with the mesh root certificate that sidecars use to verify peer certificates during mTLS connections.

You can verify this by checking the proxy configuration of a running workload:

```bash
istioctl proxy-config secret <pod-name> -n <namespace> -o json
```

The ROOTCA entry should reflect the mesh root certificate that Istio also stores in the ClusterTrustBundle.

## CA Rotation with ClusterTrustBundle

One of the biggest advantages of ClusterTrustBundle is simplified CA rotation. During rotation, you need both the old and new CA certificates to be trusted simultaneously. With Istio's ClusterTrustBundle support enabled, istiod updates the ClusterTrustBundle from Istio's CA bundle, so the source CA bundle should include both certificates during the overlap window.

```yaml
apiVersion: certificates.k8s.io/v1beta1
kind: ClusterTrustBundle
metadata:
  name: istio.io:istiod-ca:root-cert
spec:
  signerName: istio.io/istiod-ca
  trustBundle: |
    -----BEGIN CERTIFICATE-----
    ... (OLD CA certificate) ...
    -----END CERTIFICATE-----
    -----BEGIN CERTIFICATE-----
    ... (NEW CA certificate) ...
    -----END CERTIFICATE-----
```

After updating Istio's CA bundle, verify the ClusterTrustBundle:

```bash
kubectl get clustertrustbundle istio.io:istiod-ca:root-cert -o yaml
```

Istio will distribute both trust anchors to all sidecars. The timeline for a typical rotation looks like this:

```mermaid
sequenceDiagram
    participant Admin
    participant CTB as ClusterTrustBundle
    participant Istiod
    participant Sidecars

    Admin->>Istiod: Add new CA alongside old CA
    Istiod->>CTB: Update ClusterTrustBundle
    Istiod->>Sidecars: Push new trust anchors via xDS
    Note over Sidecars: Now trust both old and new CA
    Admin->>Istiod: Switch signing to new CA
    Note over Sidecars: New certs signed by new CA, old certs still valid
    Admin->>Istiod: Remove old CA certificate
    Istiod->>CTB: Update ClusterTrustBundle
    Istiod->>Sidecars: Push updated trust anchors
    Note over Sidecars: Only trust new CA
```

After all workloads have rotated their certificates to ones signed by the new CA (which happens automatically based on certificate TTL), you can remove the old CA from Istio's CA bundle.

## Multi-Cluster Trust Distribution

In multi-cluster Istio setups, ClusterTrustBundle can make it easier to inspect the mesh root certificate that each cluster is using. It does not replace the need to configure a common root of trust, or the appropriate Istio CA bundle, across clusters.

For a two-cluster setup:

Cluster 1 Istio-managed ClusterTrustBundle:

```yaml
apiVersion: certificates.k8s.io/v1beta1
kind: ClusterTrustBundle
metadata:
  name: istio.io:istiod-ca:root-cert
spec:
  signerName: istio.io/istiod-ca
  trustBundle: |
    -----BEGIN CERTIFICATE-----
    ... (Cluster 1 root CA) ...
    -----END CERTIFICATE-----
    -----BEGIN CERTIFICATE-----
    ... (Cluster 2 root CA) ...
    -----END CERTIFICATE-----
```

You can automate the synchronization of CA bundles across clusters using a controller or a CI/CD pipeline, then let istiod publish the resulting root bundle to the Istio-managed ClusterTrustBundle in each cluster.

## Monitoring ClusterTrustBundle Changes

Since ClusterTrustBundle is a Kubernetes resource, you can use standard Kubernetes tooling to monitor changes:

```bash
kubectl get clustertrustbundles -w
```

For audit purposes, Kubernetes audit logs will capture all modifications to ClusterTrustBundle resources, giving you a trail of who changed trust anchors and when.

You can also set up a simple monitoring script:

```bash
#!/bin/bash
# Check certificate expiry in ClusterTrustBundle

BUNDLE=$(kubectl get clustertrustbundle istio.io:istiod-ca:root-cert -o jsonpath='{.spec.trustBundle}')
openssl crl2pkcs7 -nocrl -certfile <(printf '%s\n' "$BUNDLE") \
  | openssl pkcs7 -print_certs -text -noout \
  | grep "Not After"
```

## RBAC for ClusterTrustBundle

Control who can modify trust anchors using Kubernetes RBAC:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: trustbundle-admin
rules:
  - apiGroups: ["certificates.k8s.io"]
    resources: ["clustertrustbundles"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["certificates.k8s.io"]
    resources: ["signers"]
    resourceNames: ["istio.io/istiod-ca"]
    verbs: ["attest"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: trustbundle-reader
rules:
  - apiGroups: ["certificates.k8s.io"]
    resources: ["clustertrustbundles"]
    verbs: ["get", "list", "watch"]
```

Bind the admin role only to platform team members who manage the CA infrastructure. Istio's istiod service account needs at least read access.

## Troubleshooting

If sidecars are not picking up the trust bundle, check a few things:

1. Verify the ClusterTrustBundle exists and has valid PEM content:

```bash
kubectl get clustertrustbundle istio.io:istiod-ca:root-cert -o yaml
```

2. Check istiod logs for trust bundle related messages:

```bash
kubectl logs -n istio-system deployment/istiod | grep -i trust
```

3. Verify the certificate content is valid:

```bash
kubectl get clustertrustbundle istio.io:istiod-ca:root-cert -o jsonpath='{.spec.trustBundle}' \
  | openssl crl2pkcs7 -nocrl -certfile /dev/stdin \
  | openssl pkcs7 -print_certs -text -noout
```

ClusterTrustBundle gives you a Kubernetes-native way to inspect and manage trust anchors for Istio. It is particularly useful during CA rotations and in multi-cluster setups where consistent trust distribution matters. As the feature matures in Kubernetes, expect tighter integration with Istio and other service mesh implementations.
