# How to Configure Bucket Source Authentication in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Bucket, Authentication, Security

Description: Learn how to configure authentication for Flux CD Bucket sources across different providers including static credentials, cloud IAM roles, and TLS certificates.

---

## Introduction

Flux CD Bucket sources support multiple authentication methods depending on the cloud provider and storage backend. Choosing the right authentication method is critical for both security and operational simplicity. This guide provides a comprehensive reference for configuring authentication across all supported Bucket source providers, including static credentials, cloud-native IAM integration, and TLS-based authentication.

## Prerequisites

- Flux CD v2.0 or later installed on your cluster
- `kubectl` access to the cluster running Flux
- An object storage bucket with Kubernetes manifests
- Credentials or IAM configuration for your storage provider

## Authentication Methods by Provider

Each provider supports different authentication approaches.

| Provider | Static Credentials | Cloud IAM | Notes |
|----------|--------------------|-----------|-------|
| `generic` | accesskey/secretkey | N/A | S3-compatible API |
| `aws` | accesskey/secretkey | IRSA | EKS recommended |
| `gcp` | Service account JSON | Workload Identity | GKE recommended |
| `azure` | Account key, SAS token | Managed Identity | AKS recommended |

## Static Credentials for Generic S3 Provider

The `generic` provider uses S3-compatible authentication with access key and secret key. This works for MinIO, DigitalOcean Spaces, Alibaba Cloud OSS, and other S3-compatible services.

```bash
# Create a secret with S3-compatible credentials
kubectl create secret generic bucket-creds \
  --namespace flux-system \
  --from-literal=accesskey=YOUR_ACCESS_KEY \
  --from-literal=secretkey=YOUR_SECRET_KEY
```

Reference the secret in the Bucket source.

```yaml
# flux-system/bucket-generic-auth.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  provider: generic
  bucketName: my-manifests
  endpoint: s3-compatible.example.com
  secretRef:
    name: bucket-creds
```

## AWS S3 Authentication

### Static Credentials

```bash
# Create a secret with AWS credentials
kubectl create secret generic aws-bucket-creds \
  --namespace flux-system \
  --from-literal=accesskey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretkey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

```yaml
# flux-system/bucket-aws-static.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  provider: aws
  bucketName: my-manifests
  endpoint: s3.amazonaws.com
  region: us-east-1
  secretRef:
    name: aws-bucket-creds
```

### IAM Roles for Service Accounts (IRSA)

IRSA eliminates static credentials by binding an IAM role to the source-controller service account. No `secretRef` is needed.

```bash
# Annotate the source-controller service account with the IAM role ARN
kubectl annotate serviceaccount source-controller \
  --namespace flux-system \
  --overwrite \
  eks.amazonaws.com/role-arn=arn:aws:iam::123456789:role/flux-s3-reader

# Restart source-controller to pick up the annotation
kubectl rollout restart deployment/source-controller -n flux-system
```

```yaml
# flux-system/bucket-aws-irsa.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  provider: aws
  bucketName: my-manifests
  endpoint: s3.amazonaws.com
  region: us-east-1
  # No secretRef -- IRSA provides credentials automatically
```

## GCP Authentication

### Service Account Key

```bash
# Create a secret with the GCP service account key JSON file
kubectl create secret generic gcp-bucket-creds \
  --namespace flux-system \
  --from-file=serviceaccount=./gcs-sa-key.json
```

```yaml
# flux-system/bucket-gcp-sa.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  provider: gcp
  bucketName: my-manifests
  endpoint: storage.googleapis.com
  secretRef:
    name: gcp-bucket-creds
```

### GKE Workload Identity

```bash
# Annotate the source-controller service account with the GCP service account
kubectl annotate serviceaccount source-controller \
  --namespace flux-system \
  --overwrite \
  iam.gke.io/gcp-service-account=flux-reader@my-project.iam.gserviceaccount.com

# Restart source-controller
kubectl rollout restart deployment/source-controller -n flux-system
```

```yaml
# flux-system/bucket-gcp-wi.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  provider: gcp
  bucketName: my-manifests
  endpoint: storage.googleapis.com
  # No secretRef -- Workload Identity provides credentials
```

## Azure Authentication

### Storage Account Key

```bash
# Create a secret with the Azure storage account key
kubectl create secret generic azure-bucket-creds \
  --namespace flux-system \
  --from-literal=accountKey=YOUR_STORAGE_ACCOUNT_KEY
```

```yaml
# flux-system/bucket-azure-key.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  provider: azure
  bucketName: my-manifests
  endpoint: https://mystorageaccount.blob.core.windows.net
  secretRef:
    name: azure-bucket-creds
```

### SAS Token

```bash
# Create a secret with a SAS token
kubectl create secret generic azure-sas-creds \
  --namespace flux-system \
  --from-literal=sasToken=YOUR_SAS_TOKEN
```

```yaml
# flux-system/bucket-azure-sas.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  provider: azure
  bucketName: my-manifests
  endpoint: https://mystorageaccount.blob.core.windows.net
  secretRef:
    name: azure-sas-creds
```

### Azure Managed Identity

With Managed Identity enabled on AKS, no secret is needed.

```yaml
# flux-system/bucket-azure-mi.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  provider: azure
  bucketName: my-manifests
  endpoint: https://mystorageaccount.blob.core.windows.net
  # No secretRef -- Managed Identity provides credentials
```

## TLS Certificate Authentication

For storage endpoints with self-signed or internal CA certificates, provide the CA certificate through a `certSecretRef`.

```bash
# Create a secret with the CA certificate
kubectl create secret generic bucket-ca-cert \
  --namespace flux-system \
  --from-file=ca.crt=/path/to/ca.crt
```

For mutual TLS (mTLS), include client certificate and key.

```bash
# Create a secret with CA cert, client cert, and client key
kubectl create secret generic bucket-mtls \
  --namespace flux-system \
  --from-file=ca.crt=/path/to/ca.crt \
  --from-file=tls.crt=/path/to/client.crt \
  --from-file=tls.key=/path/to/client.key
```

```yaml
# flux-system/bucket-tls.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  provider: generic
  bucketName: my-manifests
  endpoint: minio.internal.example.com
  secretRef:
    name: bucket-creds
  # Trust the internal CA certificate
  certSecretRef:
    name: bucket-mtls
```

## Credential Rotation

When rotating credentials, update the Kubernetes secret and trigger a reconciliation.

```bash
# Update the secret with new credentials
kubectl delete secret bucket-creds -n flux-system
kubectl create secret generic bucket-creds \
  --namespace flux-system \
  --from-literal=accesskey=NEW_ACCESS_KEY \
  --from-literal=secretkey=NEW_SECRET_KEY

# Trigger a reconciliation to use the new credentials
flux reconcile source bucket my-app -n flux-system
```

## Authentication Decision Flowchart

```mermaid
flowchart TD
    A[Choose provider] --> B{Cloud managed K8s?}
    B -->|Yes, EKS| C[Use IRSA]
    B -->|Yes, GKE| D[Use Workload Identity]
    B -->|Yes, AKS| E[Use Managed Identity]
    B -->|No| F{Self-hosted storage?}
    F -->|Yes| G[Use generic + static creds]
    F -->|No| H[Use provider-specific static creds]
    G --> I{TLS with internal CA?}
    I -->|Yes| J[Add certSecretRef]
    I -->|No, HTTP| K[Set insecure: true]
```

## Best Practices

1. **Prefer cloud IAM over static credentials.** Use IRSA, Workload Identity, or Managed Identity whenever running on a managed Kubernetes service.

2. **Scope credentials to minimum permissions.** Grant only read access to the specific bucket Flux needs.

3. **Rotate static credentials regularly.** If you must use static credentials, set up a rotation schedule and automate the secret update.

4. **Use TLS certificates over insecure mode.** Even with self-signed certificates, TLS is preferable to plain HTTP.

5. **Store credentials in external secrets managers.** Use tools like External Secrets Operator to sync credentials from Vault, AWS Secrets Manager, or Azure Key Vault into Kubernetes secrets.

## Conclusion

Flux CD provides flexible authentication options for Bucket sources across all major cloud providers and S3-compatible storage backends. Cloud-native IAM integration (IRSA, Workload Identity, Managed Identity) is the recommended approach for managed Kubernetes services, while static credentials with the `generic` provider cover self-hosted and S3-compatible storage. Regardless of the method you choose, follow the principle of least privilege and rotate credentials regularly.
