# How to Use cert-manager Trust Manager to Distribute CA Bundles Across Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Security

Description: Learn how to use cert-manager trust-manager to automatically distribute CA certificate bundles across Kubernetes namespaces for consistent trust configuration.

---

Managing CA certificates across multiple namespaces is tedious. Each namespace needs access to CA certificates for validating TLS connections, but manually copying ConfigMaps to every namespace doesn't scale. When CA certificates rotate, updating hundreds of ConfigMaps becomes error-prone and time-consuming.

trust-manager solves this by automatically distributing CA certificate bundles to all namespaces. Define trust bundles once, and trust-manager keeps them synchronized across your cluster. This ensures consistent trust configuration and simplifies CA certificate management significantly.

## Understanding trust-manager Architecture

trust-manager is a Kubernetes operator that watches Bundle resources and synchronizes trust bundles (collections of CA certificates) to ConfigMaps in all or selected namespaces. It handles:

Automatic synchronization of CA certificates to target namespaces
Real-time updates when source CA certificates change
Namespace creation detection, automatically adding bundles to new namespaces
Format conversion and validation of CA certificates

The core concept is the Bundle custom resource, which defines:
- Source CA certificates (from secrets, ConfigMaps, or inline)
- Target ConfigMap name and key
- Namespace selector (all namespaces or specific labels)

## Installing trust-manager

Install trust-manager in your cluster:

```bash
# Install trust-manager
kubectl apply -f https://github.com/cert-manager/trust-manager/releases/download/v0.7.0/trust-manager.yaml

# Verify installation
kubectl get pods -n cert-manager -l app.kubernetes.io/name=trust-manager

# Check trust-manager logs
kubectl logs -n cert-manager -l app.kubernetes.io/name=trust-manager
```

trust-manager installs in the cert-manager namespace and watches Bundle resources cluster-wide.

## Creating a Simple Trust Bundle

Create a Bundle that distributes your internal CA certificate:

```yaml
# internal-ca-bundle.yaml
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: internal-ca-bundle
spec:
  # Sources of CA certificates
  sources:
  # CA certificate from a secret
  - secret:
      name: "mtls-ca-key-pair"
      key: "tls.crt"

  # Target ConfigMap configuration
  target:
    # ConfigMap name in each namespace
    configMap:
      key: "ca-bundle.crt"

    # Sync to all namespaces
    namespaceSelector:
      matchLabels: {}
```

Apply the Bundle:

```bash
kubectl apply -f internal-ca-bundle.yaml

# Verify Bundle status
kubectl get bundle internal-ca-bundle
kubectl describe bundle internal-ca-bundle

# Check ConfigMaps created in namespaces
kubectl get configmap internal-ca-bundle --all-namespaces
```

trust-manager creates a ConfigMap named `internal-ca-bundle` containing the key `ca-bundle.crt` in every namespace. Applications mount this ConfigMap to access the CA certificate.

## Multiple CA Sources in a Bundle

Combine multiple CA certificates into a single bundle:

```yaml
# multi-source-bundle.yaml
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: all-cas-bundle
spec:
  sources:
  # Internal CA from secret
  - secret:
      name: "internal-ca-key-pair"
      key: "tls.crt"

  # Public CA from ConfigMap
  - configMap:
      name: "public-ca-certs"
      key: "ca.crt"

  # Inline CA certificate
  - inLine: |
      -----BEGIN CERTIFICATE-----
      MIIDXTCCAkWgAwIBAgIJAKL0UG+mRbK5MA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
      BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
      aWRnaXRzIFB0eSBMdGQwHhcNMjEwMTAxMDAwMDAwWhcNMzEwMTAxMDAwMDAwWjBF
      ... (rest of certificate)
      -----END CERTIFICATE-----

  # Use system trust store as well
  - useDefaultCAs: true

  target:
    configMap:
      key: "ca-bundle.crt"
    namespaceSelector:
      matchLabels: {}
```

trust-manager concatenates all CA certificates into a single bundle in the order specified. The resulting ConfigMap contains all CAs, allowing applications to trust multiple certificate authorities.

## Namespace Selectors

Control which namespaces receive trust bundles using namespace selectors:

```yaml
# production-only-bundle.yaml
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: production-ca-bundle
spec:
  sources:
  - secret:
      name: "production-ca-key-pair"
      key: "tls.crt"

  target:
    configMap:
      key: "ca-bundle.crt"

    # Only sync to production namespaces
    namespaceSelector:
      matchLabels:
        environment: production
```

Label your namespaces appropriately:

```bash
# Label production namespaces
kubectl label namespace prod-api environment=production
kubectl label namespace prod-web environment=production
kubectl label namespace prod-data environment=production

# Verify bundle only in production namespaces
kubectl get configmap production-ca-bundle --all-namespaces
```

This enables environment-specific trust configuration without manual ConfigMap management.

## Multiple Bundles for Different Purposes

Create multiple bundles for different trust domains:

```yaml
# external-services-bundle.yaml
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: external-services-ca
spec:
  sources:
  # Public CAs for external services
  - useDefaultCAs: true

  target:
    configMap:
      key: "external-ca.crt"
    namespaceSelector:
      matchLabels:
        needs-external-ca: "true"
---
# internal-services-bundle.yaml
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: internal-services-ca
spec:
  sources:
  # Internal CA only
  - secret:
      name: "internal-ca-key-pair"
      key: "tls.crt"

  target:
    configMap:
      key: "internal-ca.crt"
    namespaceSelector:
      matchLabels:
        needs-internal-ca: "true"
---
# all-services-bundle.yaml
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: all-services-ca
spec:
  sources:
  # Both public and internal CAs
  - useDefaultCAs: true
  - secret:
      name: "internal-ca-key-pair"
      key: "tls.crt"

  target:
    configMap:
      key: "all-ca.crt"
    namespaceSelector:
      matchLabels: {}
```

Applications choose the appropriate bundle based on their trust requirements.

## Using Trust Bundles in Applications

Mount trust bundles in your application pods:

```yaml
# app-with-trust-bundle.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
      - name: api
        image: api-service:latest
        env:
        # Set CA bundle path for application
        - name: SSL_CERT_FILE
          value: /etc/ssl/certs/ca-bundle.crt
        - name: REQUESTS_CA_BUNDLE
          value: /etc/ssl/certs/ca-bundle.crt
        volumeMounts:
        # Mount trust bundle
        - name: ca-bundle
          mountPath: /etc/ssl/certs/ca-bundle.crt
          subPath: ca-bundle.crt
          readOnly: true
      volumes:
      - name: ca-bundle
        configMap:
          name: internal-ca-bundle
```

The application automatically trusts certificates signed by CAs in the bundle.

## Automatic Updates on CA Rotation

When source CA certificates change, trust-manager automatically updates target ConfigMaps:

```bash
# Rotate the internal CA certificate
openssl genrsa -out new-ca.key 4096
openssl req -new -x509 -days 3650 -key new-ca.key -out new-ca.crt -subj \
  "/CN=New Internal CA"

# Update the CA secret
kubectl create secret tls internal-ca-key-pair \
  --cert=new-ca.crt \
  --key=new-ca.key \
  -n cert-manager \
  --dry-run=client -o yaml | kubectl apply -f -

# trust-manager detects the change and updates all ConfigMaps
# Watch the updates propagate
kubectl get configmap internal-ca-bundle -n production -w
```

Applications referencing the ConfigMap receive the updated CA certificate. Applications that cache certificates need mechanisms to reload when ConfigMaps change.

## Filtering Certificates in Bundles

trust-manager can filter certificates based on validity and format:

```yaml
# filtered-bundle.yaml
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: filtered-ca-bundle
spec:
  sources:
  - secret:
      name: "ca-certificates"
      key: "ca-bundle.crt"

  # Additional bundle options
  target:
    configMap:
      key: "ca-bundle.crt"

    # Additional metadata on target ConfigMap
    additionalFormats:
      # Also create JKS format for Java applications
      jks:
        key: "ca-bundle.jks"
        password: "changeit"

    namespaceSelector:
      matchLabels: {}
```

This feature is useful when dealing with bundles containing expired or invalid certificates that need filtering.

## Monitoring Trust Bundle Synchronization

Monitor Bundle status and synchronization:

```bash
# List all Bundles
kubectl get bundles

# Check Bundle synchronization status
kubectl describe bundle internal-ca-bundle

# View trust-manager logs for sync activity
kubectl logs -n cert-manager -l app.kubernetes.io/name=trust-manager -f

# Check ConfigMap presence across namespaces
kubectl get configmap internal-ca-bundle --all-namespaces \
  -o custom-columns=NAMESPACE:.metadata.namespace,AGE:.metadata.creationTimestamp
```

Bundle status shows:
- Number of namespaces synced
- Last sync time
- Synchronization errors

## Handling New Namespaces

trust-manager automatically adds trust bundles to new namespaces:

```bash
# Create a new namespace
kubectl create namespace new-app

# Bundle automatically synced to new namespace
kubectl get configmap internal-ca-bundle -n new-app

# Verify ConfigMap contents
kubectl get configmap internal-ca-bundle -n new-app -o yaml
```

This ensures new applications automatically have access to required CA certificates without manual intervention.

## Bundle Priority and Conflicts

If multiple Bundles target the same ConfigMap name, the behavior depends on Bundle configuration. Avoid conflicts by using unique ConfigMap names for each Bundle:

```yaml
# Good: unique ConfigMap names
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: internal-ca
spec:
  sources:
  - secret:
      name: "internal-ca-key-pair"
      key: "tls.crt"
  target:
    configMap:
      key: "ca-bundle.crt"
    # Use Bundle name as ConfigMap name (default behavior)
---
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: external-ca
spec:
  sources:
  - useDefaultCAs: true
  target:
    configMap:
      key: "ca-bundle.crt"
```

Each Bundle creates a ConfigMap matching its name, avoiding conflicts.

## Using Bundles with Service Meshes

Integrate trust bundles with service meshes like Istio:

```yaml
# mesh-ca-bundle.yaml
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: mesh-ca-bundle
spec:
  sources:
  # Service mesh CA
  - secret:
      name: "istio-ca-secret"
      key: "ca-cert.pem"

  # Application CAs
  - secret:
      name: "internal-ca-key-pair"
      key: "tls.crt"

  target:
    configMap:
      key: "ca-bundle.crt"

    # Only namespaces with service mesh enabled
    namespaceSelector:
      matchLabels:
        istio-injection: enabled
```

This ensures mesh-enabled namespaces trust both mesh and application CAs.

## Best Practices

Use descriptive Bundle names that indicate purpose (internal-ca-bundle, production-ca-bundle).

Implement namespace selectors to distribute bundles only where needed. This reduces ConfigMap proliferation and improves security.

Monitor Bundle synchronization status. Set up alerts for synchronization failures.

Document which Bundles applications should use. Provide clear guidance on trust bundle selection.

Test CA rotation procedures before production rollout. Verify applications handle CA updates correctly.

Use trust-manager for CA distribution instead of manual ConfigMap copying. This ensures consistency and reduces operational overhead.

Consider additional formats (JKS for Java) when applications require specific trust store formats.

## Troubleshooting

### Bundle Not Syncing to Namespace

```bash
# Check Bundle status
kubectl describe bundle <bundle-name>

# Verify namespace labels match selector
kubectl get namespace <namespace> --show-labels

# Check trust-manager logs
kubectl logs -n cert-manager -l app.kubernetes.io/name=trust-manager
```

### ConfigMap Not Updating After CA Rotation

```bash
# Verify source secret updated
kubectl get secret <ca-secret> -o yaml

# Check Bundle generation number increased
kubectl get bundle <bundle-name> -o jsonpath='{.metadata.generation}'

# Force reconciliation by annotating Bundle
kubectl annotate bundle <bundle-name> force-sync="$(date)"
```

### Application Not Trusting Certificates

```bash
# Verify ConfigMap mounted correctly
kubectl exec -it <pod> -- cat /etc/ssl/certs/ca-bundle.crt

# Check CA certificate in bundle
kubectl get configmap <bundle-name> -n <namespace> \
  -o jsonpath='{.data.ca-bundle\.crt}' | openssl x509 -text
```

## Conclusion

cert-manager trust-manager eliminates the operational burden of distributing CA certificates across Kubernetes namespaces. By automating trust bundle synchronization, it ensures consistent trust configuration while simplifying CA rotation procedures.

This automation is essential for large clusters with many namespaces, where manual ConfigMap management doesn't scale. Combined with cert-manager for certificate issuance, trust-manager provides comprehensive, automated PKI infrastructure for Kubernetes environments.
