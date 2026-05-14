# How to Configure HelmRepository Pass Credentials in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRepository, Authentication, Credential, Security

Description: Learn how to configure the passCredentials option in Flux CD HelmRepository resources to forward authentication credentials to downstream chart requests.

---

When working with Helm repositories that advertise chart download URLs on a different host than the repository index, you may need the `passCredentials` option in Flux CD. By default, Flux does not forward repository credentials to a host that does not match the repository URL. The `passCredentials` field tells Flux to include those credentials even when downloading charts from a different advertised host. This guide covers when and how to use this feature.

## Why passCredentials Matters

A Helm repository interaction involves two distinct HTTP requests. First, Flux fetches the repository index file (`index.yaml`) to discover available charts and versions. Second, when a HelmRelease references a chart, Flux downloads the actual chart tarball from a URL specified in the index.

Some repository setups serve charts from a different host than the index. Without `passCredentials`, the authentication header is not forwarded to that different host. If the chart download URL also requires the same authentication, it will fail with a 401 or 403 error.

## Basic Configuration

Here is how to set up a HelmRepository with `passCredentials` enabled along with authentication credentials:

```yaml
# Create a Secret containing the Helm repository credentials

apiVersion: v1
kind: Secret
metadata:
  name: private-repo-creds
  namespace: flux-system
type: Opaque
stringData:
  # Username and password for HTTP basic authentication
  username: my-username
  password: my-password
---
# HelmRepository with passCredentials enabled
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: private-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.example.com
  # Reference the credentials Secret
  secretRef:
    name: private-repo-creds
  # Forward credentials to chart download requests too
  passCredentials: true
```

The key field is `passCredentials: true`. Without it, the username and password from `secretRef` would not be forwarded to chart download URLs whose host differs from the HelmRepository URL.

## Supported Authentication Methods

Flux supports several authentication methods for HelmRepositories. The `passCredentials` option applies to HTTP/S Helm repositories and forwards the credentials configured with `secretRef` when chart URLs in the index point at a different host.

### HTTP Basic Authentication

The most common method, shown above. Create a Secret with `username` and `password` fields:

```bash
# Create the credentials Secret using kubectl
kubectl create secret generic private-repo-creds \
  --namespace=flux-system \
  --from-literal=username=my-username \
  --from-literal=password=my-password
```

### TLS Client Certificate Authentication

For repositories that require mutual TLS, provide client certificate and key:

```yaml
# Secret containing TLS client certificate and key
apiVersion: v1
kind: Secret
metadata:
  name: tls-repo-creds
  namespace: flux-system
type: kubernetes.io/tls
data:
  # Base64-encoded client certificate
  tls.crt: <base64-encoded-cert>
  # Base64-encoded client private key
  tls.key: <base64-encoded-key>
  # Optional: Base64-encoded CA certificate for verifying the server
  ca.crt: <base64-encoded-ca-cert>
---
# HelmRepository using TLS client authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: tls-secured-repo
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.secure-example.com
  certSecretRef:
    name: tls-repo-creds
```

## Using passCredentials with OCI Repositories

For OCI-based Helm repositories, the authentication model is different. OCI registries use registry credentials, and `passCredentials` is not applicable because the field only applies to HTTP/S Helm repositories.

For OCI repositories, use `type: oci` and provide Docker config credentials:

```yaml
# Docker config Secret for OCI registry authentication
apiVersion: v1
kind: Secret
metadata:
  name: oci-repo-creds
  namespace: flux-system
type: kubernetes.io/dockerconfigjson
data:
  # Base64-encoded Docker config JSON
  .dockerconfigjson: <base64-encoded-docker-config>
---
# OCI HelmRepository with authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: private-oci-repo
  namespace: flux-system
spec:
  type: oci
  interval: 10m
  url: oci://registry.example.com/charts
  secretRef:
    name: oci-repo-creds
```

Note that for OCI repositories, `passCredentials` is not needed because Flux authenticates to the OCI registry using the configured registry credentials.

## Managing Secrets Securely with SOPS

Storing credentials in plain YAML files in your Git repository is a security risk. Use Mozilla SOPS or Sealed Secrets to encrypt sensitive values.

Here is an example of creating an encrypted Secret with SOPS:

```bash
# Create the Secret YAML and encrypt it with SOPS before committing to Git
kubectl create secret generic private-repo-creds \
  --namespace=flux-system \
  --from-literal=username=my-username \
  --from-literal=password=my-password \
  --dry-run=client -o yaml > secret.yaml

# Encrypt the Secret with SOPS using your AGE key
sops --encrypt --age <your-age-public-key> \
  --encrypted-regex '^(data|stringData)$' \
  --in-place secret.yaml
```

Then configure Flux to decrypt SOPS-encrypted files in your Kustomization:

```yaml
# Kustomization that decrypts SOPS-encrypted secrets
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: helm-repos
  namespace: flux-system
spec:
  interval: 10m
  path: ./helm-repos
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Verifying Credential Configuration

After deploying, verify that your HelmRepository can authenticate successfully:

```bash
# Check that the HelmRepository is ready and credentials work
flux get sources helm -n flux-system

# Force a reconciliation to test immediately
flux reconcile source helm private-charts -n flux-system

# Check source-controller logs for authentication errors
kubectl logs -n flux-system deployment/source-controller | grep "private-charts"
```

## Common Pitfalls

There are a few mistakes to watch out for when using `passCredentials`:

1. **Forgetting passCredentials**: If chart downloads fail with 401 but the index fetch works and the chart URL uses a different host than the HelmRepository URL, you likely need `passCredentials: true`.

2. **Wrong Secret keys**: HTTP basic auth needs a Secret with `username` and `password` fields. The Secret can be `Opaque` or `kubernetes.io/basic-auth`, but the key names must match what Flux expects.

3. **Namespace mismatch**: The Secret must be in the same namespace as the HelmRepository resource, typically `flux-system`.

4. **Secret key names**: The keys in your Secret must be exactly `username` and `password` for basic auth, or `tls.crt` and `tls.key` for TLS authentication.

By using `passCredentials` correctly, you ensure that Flux can authenticate when private Helm repositories advertise chart download URLs on another host, keeping your private Helm chart deployments working smoothly.
