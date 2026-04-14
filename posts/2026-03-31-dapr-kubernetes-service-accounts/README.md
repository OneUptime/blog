# How to Use Dapr with Kubernetes Service Accounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Service Account, Security, IRSA

Description: Configure Kubernetes Service Accounts for Dapr-enabled applications to control pod identity, enable IRSA/Workload Identity, and secure component authentication.

---

## Why Service Accounts Matter for Dapr

Kubernetes Service Accounts provide pod identity. For Dapr applications, the service account determines:
- Which cloud provider credentials the pod can access (via IRSA/Workload Identity)
- Which Kubernetes secrets the pod can read
- What RBAC permissions the app has for accessing Dapr CRDs

## Creating a Dedicated Service Account

```bash
kubectl create serviceaccount order-service-sa -n default

# Or declaratively:
```

```yaml
# service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service-sa
  namespace: default
  labels:
    app: order-service
automountServiceAccountToken: false
```

```bash
kubectl apply -f service-account.yaml
```

## Assigning a Service Account to a Dapr Pod

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
    spec:
      serviceAccountName: order-service-sa
      containers:
      - name: order-service
        image: myregistry/order-service:latest
```

## IRSA for AWS EKS

Annotate the service account to assume an IAM role:

```bash
eksctl create iamserviceaccount \
  --name order-service-sa \
  --namespace default \
  --cluster my-eks-cluster \
  --region us-east-1 \
  --attach-policy-arn arn:aws:iam::123456789012:policy/OrderServicePolicy \
  --override-existing-serviceaccounts \
  --approve

# The SA gets the annotation automatically:
kubectl describe serviceaccount order-service-sa
# Annotations: eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/...
```

## Workload Identity for GKE

```bash
# Annotate the Kubernetes SA to use a GCP service account
kubectl annotate serviceaccount order-service-sa \
  --namespace default \
  iam.gke.io/gcp-service-account=order-service@my-project.iam.gserviceaccount.com

# Grant GKE Workload Identity binding
gcloud iam service-accounts add-iam-policy-binding \
  order-service@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[default/order-service-sa]"
```

## Using Service Account Tokens in Dapr Components

For Dapr components that authenticate via a token file (e.g., Vault):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-secrets
  namespace: default
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.internal:8200"
  - name: skipVerify
    value: "false"
  - name: vaultTokenMountPath
    value: "/var/run/secrets/vault/token"
```

## Summary

Kubernetes Service Accounts control the cloud identity of Dapr-enabled pods. Assign dedicated service accounts to each application for least-privilege access, and annotate them with IRSA (AWS) or Workload Identity (GCP) bindings to give Dapr components secure, keyless access to cloud services. Disabling `automountServiceAccountToken` by default reduces attack surface.
