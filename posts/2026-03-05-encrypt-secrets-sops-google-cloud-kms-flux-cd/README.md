# How to Encrypt Secrets with SOPS and Google Cloud KMS for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secrets, SOPS, Google Cloud KMS, GCP, Encryption

Description: Learn how to encrypt Kubernetes secrets using SOPS with Google Cloud KMS for secure GitOps workflows with Flux CD on GKE.

---

Google Cloud KMS provides a fully managed encryption key service that integrates with SOPS to encrypt Kubernetes secrets for Flux CD GitOps workflows. For teams running on Google Kubernetes Engine (GKE), this approach leverages Workload Identity and IAM for seamless, secure access to encryption keys without managing local key material.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped (GKE recommended)
- `sops` CLI installed (v3.7+)
- `gcloud` CLI configured and authenticated
- A Google Cloud project with Cloud KMS API enabled
- `kubectl` access to your cluster

## Step 1: Enable the Cloud KMS API

Ensure the Cloud KMS API is enabled in your Google Cloud project.

```bash
# Enable the Cloud KMS API
gcloud services enable cloudkms.googleapis.com --project my-project
```

## Step 2: Create a KMS Key Ring and Key

Create a key ring and a symmetric encryption key for SOPS.

```bash
# Create a key ring
gcloud kms keyrings create flux-sops \
  --location global \
  --project my-project

# Create a symmetric encryption key
gcloud kms keys create sops-key \
  --keyring flux-sops \
  --location global \
  --purpose encryption \
  --project my-project
```

## Step 3: Get the Key Resource Name

Retrieve the full resource name of the key for use with SOPS.

```bash
# The full resource name follows this pattern:
# projects/PROJECT/locations/LOCATION/keyRings/KEYRING/cryptoKeys/KEY
export GCP_KMS_KEY="projects/my-project/locations/global/keyRings/flux-sops/cryptoKeys/sops-key"
echo $GCP_KMS_KEY
```

## Step 4: Configure IAM for the Kustomize Controller

On GKE, use Workload Identity to grant the kustomize-controller access to the KMS key.

```bash
# Create a Google service account
gcloud iam service-accounts create flux-kustomize \
  --display-name "Flux Kustomize Controller" \
  --project my-project

# Grant the service account the Cloud KMS CryptoKey Decrypter role
gcloud kms keys add-iam-policy-binding sops-key \
  --keyring flux-sops \
  --location global \
  --member "serviceAccount:flux-kustomize@my-project.iam.gserviceaccount.com" \
  --role roles/cloudkms.cryptoKeyDecrypter \
  --project my-project

# Bind the Kubernetes service account to the Google service account
gcloud iam service-accounts add-iam-policy-binding \
  flux-kustomize@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[flux-system/kustomize-controller]" \
  --project my-project

# Annotate the Kubernetes service account
kubectl annotate serviceaccount kustomize-controller \
  --namespace flux-system \
  iam.gke.io/gcp-service-account=flux-kustomize@my-project.iam.gserviceaccount.com
```

Alternatively, for non-GKE clusters, use a service account key file.

```bash
# Create a service account key (for non-GKE clusters)
gcloud iam service-accounts keys create gcp-sa-key.json \
  --iam-account flux-kustomize@my-project.iam.gserviceaccount.com

# Store the key as a Kubernetes secret
kubectl create secret generic sops-gcp \
  --namespace=flux-system \
  --from-file=gcp-sa-key.json=gcp-sa-key.json

# Clean up the local key file
rm gcp-sa-key.json
```

## Step 5: Create and Encrypt a Secret

Create a Kubernetes secret manifest and encrypt it with SOPS using the GCP KMS key.

```yaml
# secret.yaml - Plaintext secret
apiVersion: v1
kind: Secret
metadata:
  name: gcp-app-secret
  namespace: default
type: Opaque
stringData:
  firestore-project: my-project
  service-api-key: AIzaSyB-example-key-here
  webhook-secret: whsec_abcdef123456
```

```bash
# Encrypt using the Google Cloud KMS key
sops --encrypt \
  --gcp-kms ${GCP_KMS_KEY} \
  --encrypted-regex '^(data|stringData)$' \
  secret.yaml > secret.enc.yaml
```

## Step 6: Configure the Flux Kustomization

Set up the Flux Kustomization resource with SOPS decryption.

```yaml
# clusters/my-cluster/apps-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # For GKE with Workload Identity, no secretRef is needed
  decryption:
    provider: sops
```

If using a service account key secret, add the secretRef.

```yaml
# For non-GKE clusters using a service account key
  decryption:
    provider: sops
    secretRef:
      name: sops-gcp
```

## Step 7: Set Up Repository-Level Configuration

Create a `.sops.yaml` file to simplify encryption for your team.

```yaml
# .sops.yaml - Google Cloud KMS configuration
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    gcp_kms: projects/my-project/locations/global/keyRings/flux-sops/cryptoKeys/sops-key
```

```bash
# Now encrypt without specifying the key
sops --encrypt secret.yaml > secret.enc.yaml
```

## Step 8: Commit and Verify

Push the encrypted secret and confirm Flux processes it correctly.

```bash
# Remove the plaintext file and commit
rm secret.yaml
git add secret.enc.yaml .sops.yaml
git commit -m "Add GCP KMS encrypted secrets"
git push

# Reconcile and verify
flux reconcile kustomization my-app --with-source
kubectl get secret gcp-app-secret -n default -o jsonpath='{.data.service-api-key}' | base64 -d
```

## Troubleshooting

When decryption fails on GKE with Workload Identity, verify the binding is correct.

```bash
# Check the service account annotation
kubectl get sa kustomize-controller -n flux-system -o yaml | grep gcp-service-account

# Verify the IAM binding
gcloud iam service-accounts get-iam-policy \
  flux-kustomize@my-project.iam.gserviceaccount.com

# Check kustomize-controller logs for errors
kubectl logs -n flux-system deployment/kustomize-controller | grep -i "kms\|decrypt\|gcp"

# Test KMS access directly
gcloud kms keys describe sops-key \
  --keyring flux-sops \
  --location global \
  --project my-project
```

Common issues include missing IAM bindings, Workload Identity not being enabled on the GKE cluster, or the Cloud KMS API not being enabled. Ensure the GKE node pool has the `cloud-platform` OAuth scope if not using Workload Identity.

Google Cloud KMS with SOPS provides a fully managed, auditable encryption solution that integrates natively with GKE and Flux CD, making it the recommended approach for secret management on Google Cloud.
