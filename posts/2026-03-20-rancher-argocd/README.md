# How to Set Up ArgoCD with Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, ArgoCD, GitOps, CI/CD

Description: Deploy and configure ArgoCD on Rancher-managed clusters to implement GitOps continuous delivery with multi-cluster application management.

## Introduction

ArgoCD is a declarative GitOps continuous delivery tool for Kubernetes. When combined with Rancher, ArgoCD handles application delivery while Rancher handles cluster lifecycle and access management. This guide covers installing ArgoCD, registering Rancher-managed clusters, and setting up multi-environment application deployments.

## Prerequisites

- Rancher managing one or more Kubernetes clusters
- `kubectl`, `helm`, and `argocd` CLIs installed
- A Git repository with Kubernetes manifests or Helm charts

## Step 1: Install ArgoCD

```bash
# Install ArgoCD on the Rancher-managed cluster designated as the ArgoCD hub

kubectl create namespace argocd

kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
kubectl wait --for=condition=Available \
  deployment/argocd-server \
  -n argocd \
  --timeout=120s

# Get the initial admin password
kubectl get secret argocd-initial-admin-secret \
  -n argocd \
  -o jsonpath='{.data.password}' | base64 -d

# Port-forward to access the UI locally
kubectl port-forward service/argocd-server -n argocd 8080:443 &
```

## Step 2: Expose ArgoCD via Ingress

```yaml
# argocd-ingress.yaml
# Requires ingress-nginx with --enable-ssl-passthrough
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - argocd.example.com
      secretName: argocd-server-tls
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  name: https
```

```bash
kubectl apply -f argocd-ingress.yaml
```

## Step 3: Register Rancher Clusters in ArgoCD

```bash
# Log in to ArgoCD
argocd login argocd.example.com \
  --username admin \
  --password <initial-password> \
  --grpc-web

# List available contexts (one per Rancher cluster)
kubectl config get-contexts

# Add a downstream cluster to ArgoCD and label it for ApplicationSet targeting
argocd cluster add rancher-prod-cluster \
  --name rancher-production \
  --label environment=production \
  --label cloud=aws \
  --grpc-web

# Verify
argocd cluster list
```

## Step 4: Create an ArgoCD Application

```yaml
# myapp-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
  # Auto-delete application resources when the Application is deleted
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default

  # Source: Git repository
  source:
    repoURL: https://github.com/my-org/my-app-repo
    targetRevision: main
    path: deploy/kubernetes

  # Destination: a specific Rancher-managed cluster and namespace
  destination:
    name: rancher-production
    namespace: production

  # Sync policy
  syncPolicy:
    automated:
      prune: true        # Remove resources deleted from Git
      selfHeal: true     # Auto-correct manual changes
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

```bash
kubectl apply -f myapp-application.yaml
argocd app list
```

## Step 5: Multi-Cluster Application with ApplicationSet

ArgoCD's ApplicationSet controller enables deploying the same application to multiple clusters:

```yaml
# myapp-applicationset.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-all-clusters
  namespace: argocd
spec:
  generators:
    # Deploy to all clusters with a specific label
    - clusters:
        selector:
          matchLabels:
            argocd.argoproj.io/secret-type: cluster
            environment: production

  template:
    metadata:
      name: 'myapp-{{name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/my-org/my-app-repo
        targetRevision: main
        path: deploy/
        helm:
          valueFiles:
            - values.yaml
            - 'values-{{metadata.labels.cloud}}.yaml'  # Cloud-specific values
      destination:
        server: '{{server}}'
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

```bash
kubectl apply -f myapp-applicationset.yaml
```

## Step 6: Configure RBAC in ArgoCD

```yaml
# argocd-rbac-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    # Platform engineers can sync all apps
    p, role:platform-engineer, applications, sync, */*, allow
    p, role:platform-engineer, applications, update, */*, allow

    # Developers can only sync apps in their project
    p, role:developer, applications, sync, myteam-project/*, allow
    p, role:developer, applications, get, myteam-project/*, allow

    # Group bindings
    g, platform-engineers@example.com, role:platform-engineer
    g, developers@example.com, role:developer
```

## Step 7: Integrate with Rancher SSO

```bash
# Configure ArgoCD to use the same external OIDC provider that Rancher uses
# argocd-cm.yaml (patch)
kubectl patch configmap argocd-cm -n argocd --patch '{
  "data": {
    "url": "https://argocd.example.com",
    "oidc.config": "name: Corporate SSO\nissuer: https://idp.example.com/realms/platform\nclientID: argocd\nclientSecret: $oidc.argocd.clientSecret\nrequestedScopes: [\"openid\",\"profile\",\"email\",\"groups\"]\nrequestedIDTokenClaims: {\"groups\": {\"essential\": true}}"
  }
}'
```

## Conclusion

ArgoCD and Rancher are complementary tools in a modern Kubernetes platform: Rancher handles cluster lifecycle, RBAC, and multi-cluster observability, while ArgoCD delivers and continuously reconciles application state from Git. The ApplicationSet controller makes multi-cluster rollouts trivial, and ArgoCD's sync status provides instant visibility into configuration drift across all clusters.
