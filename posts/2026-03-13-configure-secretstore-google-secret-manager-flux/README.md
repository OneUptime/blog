# How to Configure SecretStore for Google Secret Manager with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, External Secrets Operator, GCP, Secret Manager

Description: Configure an ESO SecretStore for Google Secret Manager using Flux CD, enabling GKE and other Kubernetes clusters to consume GCP-hosted secrets through GitOps.

---

## Introduction

Google Secret Manager is GCP's managed secret storage service, providing versioned secrets, automatic replication, and IAM-based access control. For workloads running on Google Kubernetes Engine (GKE), Workload Identity provides seamless, credential-free authentication between Kubernetes service accounts and GCP service accounts. This makes Google Secret Manager an excellent choice for GKE-hosted applications.

Managing the Google Secret Manager `SecretStore` through Flux CD means the authentication and access configuration is declarative, reviewed, and consistently applied. GKE Workload Identity configuration is expressed as Kubernetes annotations on service accounts, making the full trust chain from pod to GCP service account visible in your Git repository.

This guide covers configuring a `SecretStore` for Google Secret Manager using GKE Workload Identity and service account key file authentication, managed by Flux CD.

## Prerequisites

- External Secrets Operator deployed via Flux HelmRelease
- A GCP project with Secret Manager API enabled
- For Workload Identity: GKE cluster with Workload Identity enabled
- For key file auth: A GCP service account JSON key file

## Step 1: Set Up GKE Workload Identity

```bash
# Enable Workload Identity on the GKE cluster
gcloud container clusters update my-cluster \
  --workload-pool=MY_PROJECT_ID.svc.id.goog \
  --region=us-central1

# Create a GCP service account for ESO
gcloud iam service-accounts create eso-gsa \
  --display-name="External Secrets Operator"

# Grant access to Secret Manager
gcloud projects add-iam-policy-binding MY_PROJECT_ID \
  --member="serviceAccount:eso-gsa@MY_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Bind the GCP SA to the Kubernetes SA via Workload Identity
gcloud iam service-accounts add-iam-policy-binding \
  eso-gsa@MY_PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:MY_PROJECT_ID.svc.id.goog[external-secrets/external-secrets]"
```

## Step 2: Annotate the ESO Service Account

```yaml
# clusters/my-cluster/external-secrets/service-account-gcp.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets
  namespace: external-secrets
  annotations:
    # Link the KSA to the GCP SA via Workload Identity
    iam.gke.io/gcp-service-account: eso-gsa@MY_PROJECT_ID.iam.gserviceaccount.com
```

## Step 3: Configure SecretStore for Google Secret Manager (Workload Identity)

```yaml
# clusters/my-cluster/external-secrets/secretstore-gcp.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcp-secret-manager
  namespace: default
spec:
  provider:
    gcpsm:
      # GCP project ID where secrets are stored
      projectID: MY_PROJECT_ID
      auth:
        workloadIdentity:
          # Reference the annotated Kubernetes service account
          clusterLocation: us-central1
          clusterName: my-cluster
          clusterProjectID: MY_PROJECT_ID
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

## Step 4: Configure with Service Account Key (Non-GKE Clusters)

```yaml
# clusters/my-cluster/external-secrets/gcp-sa-key-secret.yaml
# Encrypt with SOPS before committing to Git
apiVersion: v1
kind: Secret
metadata:
  name: gcp-sa-key
  namespace: external-secrets
type: Opaque
stringData:
  # Paste the contents of the GCP service account JSON key here
  # Use SOPS to encrypt this file before committing
  sa-key.json: |
    {
      "type": "service_account",
      "project_id": "MY_PROJECT_ID",
      "private_key_id": "...",
      "private_key": "...",
      "client_email": "eso-gsa@MY_PROJECT_ID.iam.gserviceaccount.com"
    }
```

```yaml
# clusters/my-cluster/external-secrets/secretstore-gcp-key.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcp-secret-manager-key
  namespace: default
spec:
  provider:
    gcpsm:
      projectID: MY_PROJECT_ID
      auth:
        secretRef:
          secretAccessKeySecretRef:
            name: gcp-sa-key
            key: sa-key.json
```

## Step 5: Manage via Flux Kustomization

```yaml
# clusters/my-cluster/external-secrets/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secret-stores
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/external-secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: external-secrets
```

## Step 6: Test the SecretStore

```bash
# Check the SecretStore is valid
kubectl get secretstore gcp-secret-manager -n default

# Create a test ExternalSecret
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: test-gcp-secret
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: gcp-secret-manager
    kind: SecretStore
  target:
    name: test-gcp-k8s-secret
  data:
    - secretKey: api-key
      remoteRef:
        # Secret name in Google Secret Manager
        key: myapp-api-key
        # Optionally specify a version (defaults to "latest")
        version: latest
EOF

kubectl get secret test-gcp-k8s-secret -n default
```

## Best Practices

- Always use GKE Workload Identity on GKE clusters; it eliminates JSON key files, which are difficult to rotate and easy to leak.
- Use Secret Manager's `secretmanager.secretAccessor` role rather than broader editor/admin roles.
- Scope the service account's access to specific secrets using condition-based IAM bindings rather than project-wide access.
- Enable Secret Manager audit logs in Cloud Audit Logs to track all access by the ESO service account.
- Use secret versioning in Google Secret Manager and reference specific versions in `ExternalSecret` during testing, then switch to `latest` for production.

## Conclusion

Configuring a Google Secret Manager `SecretStore` through Flux CD creates a seamless, declarative integration between GKE workloads and GCP-hosted secrets. GKE Workload Identity makes the authentication entirely keyless, while Flux ensures the `SecretStore` configuration is consistent across clusters and auditable in your Git history.
