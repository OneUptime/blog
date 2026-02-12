# How to Set Up ArgoCD for GitOps on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes, ArgoCD, GitOps

Description: Learn how to install and configure ArgoCD on Amazon EKS to implement GitOps workflows for automated, declarative application deployments.

---

GitOps is a simple idea with powerful implications: your Git repository is the single source of truth for what should be running in your cluster. If you want to change something - deploy a new version, update a config, scale a service - you commit to Git. An agent in the cluster detects the change and makes it happen automatically.

ArgoCD is the most popular GitOps tool for Kubernetes. It watches your Git repositories, compares the desired state with what's actually running, and reconciles any differences. This guide covers setting it up on EKS from scratch.

## Why GitOps on EKS

Traditional deployment pipelines push changes to the cluster from the outside - a CI system runs kubectl apply or helm upgrade. This creates several problems:

- The CI system needs cluster credentials
- There's no easy way to know if the cluster matches what's in Git
- Rollbacks require re-running pipelines
- Audit trails are fragmented across CI logs and cluster events

GitOps flips this model. The cluster pulls its desired state from Git. Credentials stay inside the cluster. Rollbacks are just Git reverts. And your Git history is a complete audit trail.

## Prerequisites

You'll need:

- An EKS cluster (see our [eksctl guide](https://oneuptime.com/blog/post/create-eks-cluster-with-eksctl/view))
- kubectl configured
- A Git repository for your application manifests

## Step 1: Install ArgoCD

Create a namespace and install ArgoCD:

```bash
# Create the ArgoCD namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for all pods to be ready
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s
```

Verify everything is running:

```bash
# Check ArgoCD pods
kubectl get pods -n argocd
```

You should see the argocd-server, argocd-repo-server, argocd-application-controller, argocd-redis, and argocd-dex-server pods all running.

## Step 2: Access the ArgoCD UI

Get the initial admin password:

```bash
# Retrieve the initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

Port-forward the ArgoCD server:

```bash
# Access ArgoCD UI through port-forwarding
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Open https://localhost:8080 in your browser. Log in with username `admin` and the password from above.

For production access, set up an [ALB Ingress](https://oneuptime.com/blog/post/set-up-ingress-with-alb-on-eks/view) with TLS.

## Step 3: Install the ArgoCD CLI

The CLI makes managing ArgoCD much easier:

```bash
# Install ArgoCD CLI on macOS
brew install argocd

# Login to your ArgoCD instance
argocd login localhost:8080 --username admin --password YOUR_PASSWORD --insecure
```

Change the admin password:

```bash
# Update the admin password
argocd account update-password \
  --current-password YOUR_INITIAL_PASSWORD \
  --new-password YOUR_NEW_PASSWORD
```

## Step 4: Connect a Git Repository

Register your Git repository with ArgoCD:

```bash
# Add a private Git repository using SSH
argocd repo add git@github.com:your-org/k8s-manifests.git \
  --ssh-private-key-path ~/.ssh/id_ed25519

# Or add a public repository (no auth needed)
argocd repo add https://github.com/your-org/k8s-manifests.git
```

For private repositories on GitHub, you can also use a personal access token:

```bash
# Add a private repository using a GitHub token
argocd repo add https://github.com/your-org/k8s-manifests.git \
  --username git \
  --password ghp_your_token_here
```

## Step 5: Create an Application

ArgoCD Applications define the link between a Git repo path and a Kubernetes namespace. Here's how to create one:

```yaml
# argocd-app.yaml - ArgoCD Application definition
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-web-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    targetRevision: main
    path: apps/web-app
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

```bash
# Create the application
kubectl apply -f argocd-app.yaml
```

The `automated` sync policy means ArgoCD will automatically apply changes when it detects drift from Git. `prune: true` means it'll delete resources that are no longer in Git. `selfHeal: true` means it'll revert manual changes made directly to the cluster.

## Step 6: Deploy a Helm-Based Application

ArgoCD natively supports Helm charts. You can deploy from a Helm repository:

```yaml
# argocd-helm-app.yaml - Helm-based application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: nginx
    targetRevision: 15.4.0
    helm:
      valuesObject:
        replicaCount: 3
        service:
          type: ClusterIP
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
  destination:
    server: https://kubernetes.default.svc
    namespace: web
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Or reference a values file from your Git repo:

```yaml
# argocd-helm-git-app.yaml - Helm chart from Git with values
spec:
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    path: charts/my-app
    targetRevision: main
    helm:
      valueFiles:
        - values-production.yaml
```

For more on using Helm, see our [Helm deployment guide](https://oneuptime.com/blog/post/deploy-applications-on-eks-with-helm/view).

## Setting Up App of Apps Pattern

For managing multiple applications, use the App of Apps pattern. Create one ArgoCD Application that manages other Applications:

```yaml
# apps-of-apps.yaml - Root application that manages other apps
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-apps
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    path: argocd-apps
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      selfHeal: true
```

In your repo, the `argocd-apps/` directory contains Application manifests for each of your services. When you add a new Application manifest and push to Git, ArgoCD automatically creates and syncs it.

## Managing Secrets

ArgoCD works with several secret management approaches:

- **Sealed Secrets** - encrypt secrets in Git
- **External Secrets Operator** - sync from AWS Secrets Manager or SSM Parameter Store
- **SOPS** with ArgoCD plugin - decrypt secrets during sync

Here's a quick setup with External Secrets:

```yaml
# external-secret.yaml - Pull secrets from AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: my-app-secrets
  data:
    - secretKey: database-url
      remoteRef:
        key: production/my-app/db-url
```

## Monitoring ArgoCD

ArgoCD exposes Prometheus metrics. If you've set up [Prometheus on EKS](https://oneuptime.com/blog/post/set-up-prometheus-and-grafana-on-eks/view), add a ServiceMonitor:

```yaml
# argocd-servicemonitor.yaml - Prometheus monitoring for ArgoCD
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  endpoints:
    - port: metrics
  namespaceSelector:
    matchNames:
      - argocd
```

## Best Practices

- Keep your ArgoCD Applications in a separate repo from your application code
- Use branch protection on your manifest repo - it's now a deployment mechanism
- Set up notifications to Slack or email for sync failures
- Use ArgoCD projects to isolate teams and restrict which namespaces they can deploy to
- Regularly update ArgoCD itself - it gets frequent security patches

ArgoCD transforms how you think about deployments. Instead of triggering pipelines and hoping for the best, you commit to Git and ArgoCD handles the rest. It's a cleaner, more auditable way to run applications on EKS.
