# How to Configure OCIRepository with Insecure Registries in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, OCI, Registry, Security

Description: Learn how to configure Flux CD OCIRepository to work with insecure (HTTP) and self-signed certificate registries for development and testing environments.

---

## Introduction

In development, testing, and certain on-premises environments, you may need Flux CD to pull OCI artifacts from registries that use plain HTTP or self-signed TLS certificates. By default, Flux requires HTTPS connections with valid certificates. This guide shows you how to configure the OCIRepository resource to work with insecure registries while understanding the security implications.

## Prerequisites

- Flux CD v2.1.0 or later installed on your cluster
- An OCI-compatible registry running with HTTP or self-signed TLS
- `kubectl` access to the cluster running Flux
- Flux CLI installed locally

## When to Use Insecure Registries

Insecure registries are appropriate in limited scenarios:

- Local development clusters (kind, minikube, k3d)
- Internal testing environments behind a firewall
- Registries with self-signed certificates during initial setup
- Air-gapped environments where a CA is not yet established

Insecure registries should never be used in production environments.

## Option 1: Self-Signed Certificates with certSecretRef

The preferred approach for non-public certificates is to provide the CA certificate to Flux via a Kubernetes secret. This maintains TLS encryption while trusting your internal CA.

First, create a secret containing the CA certificate.

```bash
# Create a secret with the CA certificate that signed the registry's TLS cert
kubectl create secret generic registry-ca-cert \
  --namespace flux-system \
  --from-file=ca.crt=/path/to/your-ca.crt
```

Then reference it in the OCIRepository.

```yaml
# flux-system/oci-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.internal.example.com/my-app/manifests
  ref:
    tag: latest
  # Trust the self-signed CA certificate
  certSecretRef:
    name: registry-ca-cert
```

If the registry also requires client certificate authentication, include the client certificate and key in the same secret.

```bash
# Create a secret with CA cert, client cert, and client key
kubectl create secret generic registry-mtls \
  --namespace flux-system \
  --from-file=ca.crt=/path/to/ca.crt \
  --from-file=tls.crt=/path/to/client.crt \
  --from-file=tls.key=/path/to/client.key
```

```yaml
# flux-system/oci-source-mtls.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: my-app-mtls
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.internal.example.com/my-app/manifests
  ref:
    tag: latest
  certSecretRef:
    name: registry-mtls
```

## Option 2: Insecure HTTP Registries

For registries running over plain HTTP (no TLS at all), set the `insecure` field to `true` on the OCIRepository.

```yaml
# flux-system/oci-source-insecure.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: my-app-dev
  namespace: flux-system
spec:
  interval: 5m
  url: oci://localhost:5000/my-app/manifests
  ref:
    tag: latest
  # Allow plain HTTP connections -- development only
  insecure: true
```

## Setting Up a Local Development Registry

A common use case is running a local registry for development. Here is how to set one up with kind and use it with Flux.

```bash
# Create a local registry container
docker run -d --restart=always -p 5000:5000 --name kind-registry registry:2

# Create a kind cluster connected to the registry
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
containerdConfigPatches:
- |-
  [plugins."io.containerd.grpc.v1.cri".registry.mirrors."localhost:5000"]
    endpoint = ["http://kind-registry:5000"]
EOF

# Connect the registry to the kind network
docker network connect kind kind-registry
```

Push an artifact to the local registry.

```bash
# Push manifests to the local insecure registry
flux push artifact oci://localhost:5000/my-app/manifests:dev \
  --path ./manifests \
  --source="local" \
  --revision="dev/latest"
```

Configure Flux to pull from it.

```yaml
# flux-system/local-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: my-app-local
  namespace: flux-system
spec:
  interval: 1m
  url: oci://kind-registry:5000/my-app/manifests
  ref:
    tag: dev
  insecure: true
```

## Combining Insecure Settings with Authentication

Even insecure registries may require authentication. You can combine insecure access with a secret reference.

```yaml
# flux-system/oci-source-insecure-auth.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: my-app-staging
  namespace: flux-system
spec:
  interval: 5m
  url: oci://staging-registry.internal:5000/my-app/manifests
  ref:
    tag: latest
  insecure: true
  secretRef:
    name: staging-registry-creds
```

Create the credentials secret.

```bash
# Create credentials for the insecure registry
kubectl create secret docker-registry staging-registry-creds \
  --namespace flux-system \
  --docker-server=staging-registry.internal:5000 \
  --docker-username=dev \
  --docker-password="${DEV_PASSWORD}"
```

## Verifying the Configuration

After applying your OCIRepository, check that Flux can connect to the registry.

```bash
# Check the OCIRepository status
flux get sources oci -n flux-system

# Get detailed status including any error messages
kubectl describe ocirepository my-app-dev -n flux-system

# Check source-controller logs for connection issues
kubectl logs -n flux-system deployment/source-controller | grep -i "my-app-dev"
```

A healthy OCIRepository will show a "Ready" status with the artifact revision.

## Troubleshooting Common Issues

**Error: x509 certificate signed by unknown authority**

This means the registry uses a certificate that Flux does not trust. Use `certSecretRef` to provide the CA certificate.

**Error: http: server gave HTTP response to HTTPS client**

The registry is running HTTP but Flux is trying HTTPS. Set `insecure: true` on the OCIRepository.

**Error: dial tcp: connection refused**

The registry hostname or port is incorrect, or the registry is not reachable from the cluster. Verify network connectivity from a pod in the flux-system namespace.

```bash
# Test connectivity from within the cluster
kubectl run -n flux-system test-conn --rm -it --image=busybox -- \
  wget -q -O- http://staging-registry.internal:5000/v2/
```

## Security Considerations

Using insecure registries introduces risks that you should be aware of.

| Risk | Mitigation |
|------|-----------|
| Man-in-the-middle attacks | Use self-signed certs instead of plain HTTP |
| Credential exposure over HTTP | Restrict network access to the registry |
| Artifact tampering | Verify artifact digests after pull |
| Unauthorized access | Always use authentication even on insecure registries |

## Best Practices

1. **Prefer self-signed certificates over plain HTTP.** Even in development, TLS with a self-signed cert is better than no encryption.

2. **Limit insecure configurations to non-production.** Use Kustomize overlays to apply `insecure: true` only in development environments.

3. **Rotate to proper certificates.** Treat insecure configurations as temporary and plan a migration path to properly signed certificates.

4. **Document insecure registries.** Keep a record of which OCIRepository resources use insecure settings and why.

5. **Use network policies.** Restrict which pods can communicate with insecure registries to minimize the attack surface.

## Conclusion

Configuring Flux CD to work with insecure registries is straightforward using the `insecure` field and `certSecretRef` on the OCIRepository resource. While self-signed certificates are the preferred approach for non-public registries, plain HTTP access is available for development scenarios. Always treat insecure configurations as temporary and plan for proper TLS in production environments.
