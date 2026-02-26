# How to Add a GKE Cluster to ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Google GKE, Multi-Cluster

Description: Learn how to register a Google Kubernetes Engine cluster with ArgoCD for multi-cluster GitOps management, covering GCP service account authentication, Workload Identity, and secure cluster registration.

---

Adding a Google Kubernetes Engine (GKE) cluster to ArgoCD lets you manage GKE workloads from a central ArgoCD instance. GKE's authentication model works differently from vanilla Kubernetes, using Google Cloud IAM and OAuth2 tokens instead of static bearer tokens. This guide covers the practical steps to register GKE clusters, from basic setup to production-ready Workload Identity configurations.

## GKE Authentication Options

GKE supports several authentication methods that ArgoCD can use:

1. **Service Account Key** - A JSON key file for a GCP service account (simple but less secure)
2. **Workload Identity** - Maps Kubernetes service accounts to GCP service accounts (recommended)
3. **Static Token** - A Kubernetes service account token in the GKE cluster (bypasses GCP IAM)

## Method 1: Static Token (Simplest)

The quickest way to get started. Create a service account in the GKE cluster and use its token:

```bash
# Get GKE credentials
gcloud container clusters get-credentials my-gke-cluster \
  --zone us-central1-a \
  --project my-gcp-project

# Add the cluster using ArgoCD CLI
argocd cluster add gke_my-gcp-project_us-central1-a_my-gke-cluster
```

This creates a Kubernetes ServiceAccount in the GKE cluster with a long-lived token. For production use, prefer Workload Identity.

## Method 2: GCP Service Account Key

Create a GCP service account with GKE access and use its key for authentication:

### Step 1: Create the GCP Service Account

```bash
# Create a service account
gcloud iam service-accounts create argocd-gke-manager \
  --description="ArgoCD GKE cluster manager" \
  --display-name="ArgoCD GKE Manager" \
  --project=my-gcp-project

# Grant GKE cluster access
gcloud projects add-iam-policy-binding my-gcp-project \
  --member="serviceAccount:argocd-gke-manager@my-gcp-project.iam.gserviceaccount.com" \
  --role="roles/container.developer"

# Create a key file
gcloud iam service-accounts keys create argocd-gke-key.json \
  --iam-account=argocd-gke-manager@my-gcp-project.iam.gserviceaccount.com
```

### Step 2: Create RBAC in the GKE Cluster

```yaml
# Apply to the GKE cluster
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: argocd-manager-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin  # Or a custom role for least privilege
subjects:
  - kind: User
    name: argocd-gke-manager@my-gcp-project.iam.gserviceaccount.com
    apiGroup: rbac.authorization.k8s.io
```

### Step 3: Register the Cluster

Get the cluster details:

```bash
# Get the cluster endpoint
ENDPOINT=$(gcloud container clusters describe my-gke-cluster \
  --zone us-central1-a \
  --project my-gcp-project \
  --format='get(endpoint)')

# Get the CA certificate
CA_CERT=$(gcloud container clusters describe my-gke-cluster \
  --zone us-central1-a \
  --project my-gcp-project \
  --format='get(masterAuth.clusterCaCertificate)')

echo "Endpoint: https://$ENDPOINT"
echo "CA: $CA_CERT"
```

Create the cluster secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gke-production-cluster
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
    environment: production
    provider: gcp
    region: us-central1
type: Opaque
stringData:
  name: gke-production
  server: "https://34.123.45.67"
  config: |
    {
      "execProviderConfig": {
        "command": "argocd-k8s-auth",
        "args": ["gcp"],
        "apiVersion": "client.authentication.k8s.io/v1beta1"
      },
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<base64-encoded-ca-cert>"
      }
    }
```

### Step 4: Mount the GCP Service Account Key

The ArgoCD application controller needs access to the GCP service account key:

```yaml
# Patch the ArgoCD application controller deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-application-controller
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-application-controller
          env:
            - name: GOOGLE_APPLICATION_CREDENTIALS
              value: /var/run/secrets/gcp/argocd-gke-key.json
          volumeMounts:
            - name: gcp-credentials
              mountPath: /var/run/secrets/gcp
              readOnly: true
      volumes:
        - name: gcp-credentials
          secret:
            secretName: gcp-service-account-key
```

Store the key as a secret:

```bash
kubectl create secret generic gcp-service-account-key \
  --from-file=argocd-gke-key.json=argocd-gke-key.json \
  -n argocd
```

## Method 3: Workload Identity (Recommended for Production)

Workload Identity eliminates the need for service account key files by letting Kubernetes service accounts act as GCP service accounts.

### Prerequisites

Workload Identity must be enabled on both the ArgoCD cluster and the target GKE cluster:

```bash
# Enable Workload Identity on the ArgoCD cluster
gcloud container clusters update argocd-cluster \
  --zone us-central1-a \
  --workload-pool=my-gcp-project.svc.id.goog

# Enable on node pools
gcloud container node-pools update default-pool \
  --cluster=argocd-cluster \
  --zone=us-central1-a \
  --workload-metadata=GKE_METADATA
```

### Step 1: Create and Configure GCP Service Account

```bash
# Create the GCP service account
gcloud iam service-accounts create argocd-controller \
  --project=my-gcp-project

# Grant GKE access to the target cluster
gcloud projects add-iam-policy-binding my-gcp-project \
  --member="serviceAccount:argocd-controller@my-gcp-project.iam.gserviceaccount.com" \
  --role="roles/container.developer"

# Allow the Kubernetes SA to impersonate the GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  argocd-controller@my-gcp-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-gcp-project.svc.id.goog[argocd/argocd-application-controller]"
```

### Step 2: Annotate the ArgoCD Service Account

```bash
kubectl annotate serviceaccount argocd-application-controller \
  -n argocd \
  iam.gke.io/gcp-service-account=argocd-controller@my-gcp-project.iam.gserviceaccount.com
```

### Step 3: Register the Cluster

With Workload Identity, the cluster secret uses the exec provider:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gke-production
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: gke-production
  server: "https://34.123.45.67"
  config: |
    {
      "execProviderConfig": {
        "command": "argocd-k8s-auth",
        "args": ["gcp"],
        "apiVersion": "client.authentication.k8s.io/v1beta1"
      },
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<ca-data>"
      }
    }
```

## Adding Multiple GKE Clusters

For organizations with many GKE clusters, automate registration:

```bash
#!/bin/bash
# register-gke-clusters.sh

PROJECT="my-gcp-project"
CLUSTERS=$(gcloud container clusters list --project=$PROJECT --format='csv[no-heading](name,zone)')

while IFS=, read -r name zone; do
  echo "Registering cluster: $name in $zone"

  ENDPOINT=$(gcloud container clusters describe $name \
    --zone=$zone --project=$PROJECT --format='get(endpoint)')

  CA_CERT=$(gcloud container clusters describe $name \
    --zone=$zone --project=$PROJECT --format='get(masterAuth.clusterCaCertificate)')

  cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: gke-${name}
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
    provider: gcp
    zone: ${zone}
type: Opaque
stringData:
  name: ${name}
  server: "https://${ENDPOINT}"
  config: |
    {
      "execProviderConfig": {
        "command": "argocd-k8s-auth",
        "args": ["gcp"],
        "apiVersion": "client.authentication.k8s.io/v1beta1"
      },
      "tlsClientConfig": {
        "insecure": false,
        "caData": "${CA_CERT}"
      }
    }
EOF
done <<< "$CLUSTERS"
```

## Verifying the Connection

```bash
# List registered clusters
argocd cluster list

# Check the GKE cluster status
argocd cluster get https://34.123.45.67

# Test with a sample app
argocd app create gke-test \
  --repo https://github.com/argoproj/argocd-example-apps.git \
  --path guestbook \
  --dest-server https://34.123.45.67 \
  --dest-namespace default

argocd app sync gke-test
argocd app delete gke-test --yes
```

## Troubleshooting

```bash
# Check if Workload Identity is working
kubectl exec -n argocd deploy/argocd-application-controller -- \
  cat /var/run/secrets/tokens/gcp-ksa

# Test GCP authentication
kubectl run gcp-test --rm -it \
  --image=google/cloud-sdk:slim \
  --serviceaccount=argocd-application-controller \
  -n argocd \
  -- gcloud auth list

# Common errors:
# "could not get token": Workload Identity not configured
# "forbidden": GKE RBAC not set up for the GCP service account
# "connection refused": Private cluster without authorized networks
```

For private GKE clusters, you need to add the ArgoCD cluster's IP range to the authorized networks:

```bash
gcloud container clusters update my-gke-cluster \
  --zone us-central1-a \
  --enable-master-authorized-networks \
  --master-authorized-networks=<argocd-cluster-ip-range>/32
```

## Summary

Adding a GKE cluster to ArgoCD requires handling Google Cloud's authentication layer. For development, the static token approach via `argocd cluster add` works fine. For production, Workload Identity provides the most secure option by eliminating long-lived credentials entirely. The key steps are creating a GCP service account with appropriate GKE permissions, binding it to the ArgoCD Kubernetes service account via Workload Identity, and registering the cluster with the exec provider configuration. For the complete Workload Identity setup, see our guide on [GKE Workload Identity for ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-gke-workload-identity/view).
