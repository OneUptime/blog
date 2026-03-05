# How to Configure HelmRepository with Authentication in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRepository, Authentication, Secrets

Description: Learn how to configure authenticated access to Helm chart repositories in Flux CD using Kubernetes secrets for basic auth, TLS certificates, and cloud provider credentials.

---

## Introduction

Many organizations host Helm charts in private repositories that require authentication. Flux CD supports several authentication methods for HelmRepository sources, including basic authentication (username and password), TLS client certificates, and cloud provider-specific credentials. This guide covers each method with practical examples so you can securely connect Flux to your private Helm repositories.

## Prerequisites

- A running Kubernetes cluster with Flux CD v2.x installed
- kubectl configured to access the cluster
- Access credentials for your private Helm repository
- Familiarity with Kubernetes secrets

## Basic Authentication with Username and Password

The most common authentication method uses a Kubernetes secret containing a username and password. First, create the secret, then reference it in your HelmRepository.

Create a Kubernetes secret with your repository credentials.

```bash
# Create a secret with basic auth credentials for the Helm repository
kubectl create secret generic helm-repo-creds \
  --namespace flux-system \
  --from-literal=username=my-username \
  --from-literal=password=my-password
```

Now create a HelmRepository that references this secret.

```yaml
# helmrepository-auth.yaml
# HelmRepository with basic authentication using a Kubernetes secret
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: private-charts
  namespace: flux-system
spec:
  url: https://charts.example.com/private
  interval: 30m
  # Reference the secret containing username and password
  secretRef:
    name: helm-repo-creds
```

Apply both the secret and the HelmRepository.

```bash
# Apply the HelmRepository with authentication
kubectl apply -f helmrepository-auth.yaml
```

## Defining the Secret Declaratively

For a fully GitOps approach, you can define the secret in your Git repository. However, you should encrypt secrets before committing them. A common pattern is to use Mozilla SOPS or Sealed Secrets.

Here is the secret structure that Flux expects for basic authentication.

```yaml
# helm-repo-secret.yaml
# Secret containing basic auth credentials for a HelmRepository
# IMPORTANT: Encrypt this file with SOPS or Sealed Secrets before committing to Git
apiVersion: v1
kind: Secret
metadata:
  name: helm-repo-creds
  namespace: flux-system
type: Opaque
stringData:
  # Username for the Helm repository
  username: my-username
  # Password or token for the Helm repository
  password: my-password
```

## TLS Client Certificate Authentication

Some Helm repositories require TLS client certificates for mutual TLS (mTLS) authentication. Create a secret with the certificate, key, and optionally a CA certificate.

```bash
# Create a TLS secret with client certificate, key, and CA certificate
kubectl create secret generic helm-repo-tls \
  --namespace flux-system \
  --from-file=certFile=client.crt \
  --from-file=keyFile=client.key \
  --from-file=caFile=ca.crt
```

Reference this secret in your HelmRepository.

```yaml
# helmrepository-tls.yaml
# HelmRepository with TLS client certificate authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: tls-secured-charts
  namespace: flux-system
spec:
  url: https://charts.secure-example.com
  interval: 30m
  # Reference the TLS secret containing client cert, key, and CA
  secretRef:
    name: helm-repo-tls
```

The secret must contain these specific keys for TLS authentication:

| Key | Description | Required |
|-----|-------------|----------|
| `certFile` | TLS client certificate (PEM format) | Yes (for mTLS) |
| `keyFile` | TLS client private key (PEM format) | Yes (for mTLS) |
| `caFile` | CA certificate for verifying the server (PEM format) | No |
| `username` | Basic auth username | No |
| `password` | Basic auth password | No |

## Cloud Provider Authentication

Flux supports native authentication for cloud-hosted Helm repositories. Use the `spec.provider` field to specify the cloud provider.

### AWS ECR (Elastic Container Registry)

```yaml
# helmrepository-aws.yaml
# HelmRepository using AWS provider authentication for ECR-hosted charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: aws-charts
  namespace: flux-system
spec:
  type: oci
  url: oci://123456789012.dkr.ecr.us-east-1.amazonaws.com
  interval: 30m
  # Use AWS provider for automatic IAM-based authentication
  provider: aws
```

### Azure Container Registry

```yaml
# helmrepository-azure.yaml
# HelmRepository using Azure provider authentication for ACR-hosted charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: azure-charts
  namespace: flux-system
spec:
  type: oci
  url: oci://myregistry.azurecr.io
  interval: 30m
  # Use Azure provider for workload identity authentication
  provider: azure
```

### Google Artifact Registry

```yaml
# helmrepository-gcp.yaml
# HelmRepository using GCP provider authentication for Artifact Registry
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: gcp-charts
  namespace: flux-system
spec:
  type: oci
  url: oci://us-central1-docker.pkg.dev/my-project/my-repo
  interval: 30m
  # Use GCP provider for workload identity federation
  provider: gcp
```

## Verifying Authentication

After applying an authenticated HelmRepository, check its status to confirm that Flux can connect.

```bash
# Verify the HelmRepository is ready and authenticated
kubectl get helmrepository -n flux-system private-charts

# Get detailed conditions if authentication fails
kubectl describe helmrepository -n flux-system private-charts
```

A successful authentication will show `READY: True`. If authentication fails, the conditions will include an error message indicating the cause.

```bash
# Check events for authentication errors
kubectl get events -n flux-system --field-selector involvedObject.name=private-charts
```

## Troubleshooting Authentication Issues

Common authentication problems and their solutions:

**Secret not found** -- Ensure the secret exists in the same namespace as the HelmRepository.

```bash
# Verify the secret exists in the correct namespace
kubectl get secret -n flux-system helm-repo-creds
```

**Invalid credentials** -- Check that the username and password are correct and that the secret keys match what Flux expects (`username` and `password` for basic auth).

```bash
# Decode and verify the secret values
kubectl get secret -n flux-system helm-repo-creds -o jsonpath='{.data.username}' | base64 -d
```

**Certificate errors** -- Verify that the certificate files are valid PEM-encoded files and that the CA certificate matches the server certificate chain.

```bash
# Verify the certificate is valid
kubectl get secret -n flux-system helm-repo-tls -o jsonpath='{.data.certFile}' | base64 -d | openssl x509 -text -noout
```

## Rotating Credentials

When you need to rotate credentials, update the Kubernetes secret and Flux will pick up the new credentials on the next reconciliation cycle.

```bash
# Update the secret with new credentials
kubectl create secret generic helm-repo-creds \
  --namespace flux-system \
  --from-literal=username=my-username \
  --from-literal=password=new-password \
  --dry-run=client -o yaml | kubectl apply -f -

# Force an immediate reconciliation to use the new credentials
flux reconcile source helm private-charts
```

## Summary

Flux CD provides flexible authentication options for HelmRepository sources. Basic authentication covers most private repositories, TLS client certificates handle mTLS requirements, and cloud provider integration simplifies access to managed registries. Always store credentials in Kubernetes secrets and encrypt them before committing to Git. Verify authentication status using kubectl and the Flux CLI to quickly diagnose connection issues.
