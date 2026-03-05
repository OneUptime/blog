# How to Install Flux CD with Custom Service Account

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Service Account, RBAC, Security

Description: Learn how to configure Flux CD controllers to use custom Kubernetes service accounts for fine-grained access control and integration with cloud IAM systems.

---

## Why Use Custom Service Accounts for Flux CD?

By default, Flux CD creates its own service accounts during installation. However, there are compelling reasons to use custom service accounts:

- **Cloud IAM integration**: Map Kubernetes service accounts to cloud provider IAM roles (e.g., AWS IRSA, GCP Workload Identity, Azure Workload Identity).
- **Least privilege access**: Apply specific RBAC policies that match your security requirements.
- **Audit compliance**: Use service accounts that integrate with your organization's auditing and compliance frameworks.
- **Pre-provisioned infrastructure**: In environments where service accounts are managed by a separate platform team.

This guide covers how to create and configure custom service accounts for Flux CD controllers.

## Prerequisites

- A Kubernetes cluster (v1.20+)
- `flux` CLI installed (v2.0+)
- `kubectl` configured with cluster-admin access
- Basic understanding of Kubernetes RBAC

## Understanding Flux CD Service Accounts

Flux CD runs four main controllers, each with its own service account:

| Controller | Default Service Account | Purpose |
|---|---|---|
| source-controller | source-controller | Fetches artifacts from Git, Helm, OCI sources |
| kustomize-controller | kustomize-controller | Applies Kustomize manifests to the cluster |
| helm-controller | helm-controller | Manages Helm releases |
| notification-controller | notification-controller | Handles alerts and event notifications |

## Step 1: Create Custom Service Accounts

Create service accounts before installing Flux. This example adds annotations for AWS IRSA integration:

```yaml
# custom-service-accounts.yaml
# Service accounts with AWS IAM Role annotations for IRSA
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-source-controller
  namespace: flux-system
  annotations:
    # AWS IRSA annotation to allow source-controller to access S3/ECR
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-source-controller
  labels:
    app.kubernetes.io/part-of: flux
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-kustomize-controller
  namespace: flux-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-kustomize-controller
  labels:
    app.kubernetes.io/part-of: flux
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-helm-controller
  namespace: flux-system
  annotations:
    # Helm controller may need access to S3/ECR for Helm chart storage
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-helm-controller
  labels:
    app.kubernetes.io/part-of: flux
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-notification-controller
  namespace: flux-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-notification-controller
  labels:
    app.kubernetes.io/part-of: flux
```

Apply the service accounts:

```bash
# Create the namespace and service accounts
kubectl create namespace flux-system --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f custom-service-accounts.yaml
```

## Step 2: Create Custom RBAC for the Service Accounts

Define ClusterRoles and ClusterRoleBindings that give each controller only the permissions it needs:

```yaml
# rbac-source-controller.yaml
# RBAC for source-controller - needs access to source CRDs and secrets
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-source-controller
rules:
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["*"]
    verbs: ["*"]
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-source-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-source-controller
subjects:
  - kind: ServiceAccount
    name: flux-source-controller
    namespace: flux-system
```

```yaml
# rbac-kustomize-controller.yaml
# RBAC for kustomize-controller - needs broad access to apply manifests
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-kustomize-controller
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["*"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-kustomize-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-kustomize-controller
subjects:
  - kind: ServiceAccount
    name: flux-kustomize-controller
    namespace: flux-system
```

## Step 3: Install Flux with Custom Service Accounts

Export Flux manifests, modify them to use your custom service accounts, and apply:

```bash
# Export Flux installation manifests
flux install --export > flux-install.yaml
```

Use a patch to reference your custom service accounts. Create a Kustomize overlay:

```yaml
# kustomization.yaml
# Kustomize overlay to patch Flux deployments with custom service accounts
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - flux-install.yaml
patches:
  # Patch source-controller to use the custom service account
  - target:
      kind: Deployment
      name: source-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        template:
          spec:
            serviceAccountName: flux-source-controller
  # Patch kustomize-controller to use the custom service account
  - target:
      kind: Deployment
      name: kustomize-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: kustomize-controller
      spec:
        template:
          spec:
            serviceAccountName: flux-kustomize-controller
  # Patch helm-controller to use the custom service account
  - target:
      kind: Deployment
      name: helm-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: helm-controller
      spec:
        template:
          spec:
            serviceAccountName: flux-helm-controller
  # Patch notification-controller to use the custom service account
  - target:
      kind: Deployment
      name: notification-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: notification-controller
      spec:
        template:
          spec:
            serviceAccountName: flux-notification-controller
```

Apply the installation:

```bash
# Apply the patched Flux installation
kubectl apply -k .
```

## Step 4: GCP Workload Identity Example

For Google Cloud, annotate service accounts for Workload Identity:

```yaml
# GCP Workload Identity annotation for source-controller
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-source-controller
  namespace: flux-system
  annotations:
    # Map to a GCP service account for accessing Artifact Registry
    iam.gke.io/gcp-service-account: flux-source@my-project.iam.gserviceaccount.com
```

Bind the GCP service account to the Kubernetes service account:

```bash
# Allow the Kubernetes service account to impersonate the GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  flux-source@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[flux-system/flux-source-controller]"
```

## Step 5: Verify the Configuration

Confirm each controller is running with the correct service account:

```bash
# Verify service accounts assigned to each controller
kubectl get deployments -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.serviceAccountName}{"\n"}{end}'
```

Expected output:

```
source-controller       flux-source-controller
kustomize-controller    flux-kustomize-controller
helm-controller         flux-helm-controller
notification-controller flux-notification-controller
```

Test that the service accounts have the required permissions:

```bash
# Test if source-controller service account can list secrets
kubectl auth can-i list secrets \
  --as=system:serviceaccount:flux-system:flux-source-controller \
  -n flux-system
```

## Using Service Account Impersonation in Kustomizations

Flux also supports `spec.serviceAccountName` in Kustomization resources, allowing each Kustomization to impersonate a different service account when applying resources:

```yaml
# Kustomization that uses a specific service account for applying resources
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-deployment
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-app
  path: ./deploy
  prune: true
  # Use a dedicated service account for this application
  serviceAccountName: app-deployer
  targetNamespace: app-namespace
```

This is useful for multi-tenancy, where different teams have different levels of access.

## Summary

Custom service accounts in Flux CD provide fine-grained control over what each controller can access. This is essential for cloud IAM integration (IRSA, Workload Identity), compliance requirements, and multi-tenant clusters. By using Kustomize overlays to patch the Flux installation manifests, you can maintain a clean upgrade path while using custom service accounts. The `serviceAccountName` field in Kustomization and HelmRelease resources adds another layer of control for workload-level permissions.
