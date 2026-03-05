# How to Configure HelmRepository Pass Credentials in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRepository, Authentication, Credentials, Security

Description: Learn how to configure the passCredentials option in Flux CD HelmRepository resources to forward authentication credentials to downstream chart requests.

---

When working with Helm repositories that require authentication not just for the index but also for downloading individual chart archives, you need the `passCredentials` option in Flux CD. By default, Flux only sends credentials when fetching the repository index. The `passCredentials` field tells Flux to also include those credentials when downloading charts from the repository. This guide covers when and how to use this feature.

## Why passCredentials Matters

A Helm repository interaction involves two distinct HTTP requests. First, Flux fetches the repository index file (`index.yaml`) to discover available charts and versions. Second, when a HelmRelease references a chart, Flux downloads the actual chart tarball from a URL specified in the index.

Some repository setups serve charts from a different path or even a different host than the index. Without `passCredentials`, the authentication header is only sent with the index request. If the chart download URL also requires authentication, it will fail with a 401 or 403 error.

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

The key field is `passCredentials: true`. Without it, the username and password from `secretRef` would only be used when fetching the index file.

## Supported Authentication Methods

Flux supports several authentication methods for HelmRepositories. The `passCredentials` option works with all of them.

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
# HelmRepository using TLS client authentication with passCredentials
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: tls-secured-repo
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.secure-example.com
  secretRef:
    name: tls-repo-creds
  certSecretRef:
    name: tls-repo-creds
  passCredentials: true
```

## Using passCredentials with OCI Repositories

For OCI-based Helm repositories, the authentication model is different. OCI registries use Docker-style credentials, and `passCredentials` is not applicable in the same way because OCI authentication is handled per-registry by the container runtime.

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

Note that for OCI repositories, `passCredentials` is not needed because the registry authentication applies to all interactions automatically.

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

1. **Forgetting passCredentials**: If chart downloads fail with 401 but the index fetch works, you almost certainly need `passCredentials: true`.

2. **Wrong Secret type**: HTTP basic auth needs an `Opaque` Secret with `username` and `password` fields. Do not use `kubernetes.io/basic-auth` type as Flux does not recognize it.

3. **Namespace mismatch**: The Secret must be in the same namespace as the HelmRepository resource, typically `flux-system`.

4. **Secret key names**: The keys in your Secret must be exactly `username` and `password` for basic auth, or `tls.crt` and `tls.key` for TLS authentication.

By using `passCredentials` correctly, you ensure that Flux can authenticate for both repository index fetches and individual chart downloads, keeping your private Helm chart deployments working smoothly.
