# How to Set Up ArgoCD on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, ArgoCD, GitOps, Kubernetes, Continuous Delivery, Deployments

Description: Deploy ArgoCD on Talos Linux for declarative GitOps-based application delivery with a visual dashboard and sync management.

---

ArgoCD is a declarative GitOps continuous delivery tool for Kubernetes. It watches your Git repositories and automatically synchronizes the desired state defined there with your live cluster. On Talos Linux, where the entire operating system is already managed declaratively, ArgoCD extends that approach to your application layer. This guide walks through deploying ArgoCD on a Talos Linux cluster, connecting it to your Git repositories, and managing applications through both the CLI and the web UI.

## Why ArgoCD for Talos Linux

ArgoCD is one of the most popular GitOps tools in the Kubernetes ecosystem. It stands out because of:

- A rich web UI that shows real-time sync status and resource health
- Multi-cluster support for managing several Talos clusters from a single ArgoCD instance
- Application-of-apps pattern for managing large numbers of applications
- Built-in health checks for Kubernetes resources
- RBAC with SSO integration for team-based access control
- Automated sync with self-healing capability

## Prerequisites

You need:

- A Talos Linux Kubernetes cluster
- kubectl configured for your cluster
- A Git repository with Kubernetes manifests
- Helm 3 installed

## Step 1: Install ArgoCD

```bash
# Create the ArgoCD namespace
kubectl create namespace argocd

# Install ArgoCD using the official manifests
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Alternatively, install with Helm for more configuration options:

```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
```

```yaml
# argocd-values.yaml
server:
  # Run with 2 replicas for HA
  replicas: 2

  # Extra arguments
  extraArgs:
    - --insecure  # Disable TLS on server (terminate TLS at ingress)

  # Resources
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

controller:
  # Resources for the application controller
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi

  # Processing settings
  args:
    appResyncPeriod: "180"  # Resync every 3 minutes
    repoServerTimeoutSeconds: "120"

repoServer:
  replicas: 2
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

redis:
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      cpu: 200m
      memory: 256Mi

# Global configurations
configs:
  params:
    # Application controller settings
    controller.status.processors: "20"
    controller.operation.processors: "10"
    controller.self.heal.timeout.seconds: "5"
    # Ignore differences in fields managed by mutating webhooks
    server.insecure: "true"

  # Repository credentials
  repositories:
    private-repo:
      url: https://github.com/myorg/my-manifests
      type: git
```

```bash
helm install argocd argo/argo-cd \
  --namespace argocd \
  --values argocd-values.yaml
```

Wait for all pods to be ready:

```bash
kubectl get pods -n argocd -w
```

## Step 2: Access the ArgoCD UI

Get the initial admin password:

```bash
# Get the auto-generated admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

Port-forward to access the UI:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Open https://localhost:8080 and log in with username `admin` and the password from above.

## Step 3: Install the ArgoCD CLI

```bash
# macOS
brew install argocd

# Linux
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd
sudo mv argocd /usr/local/bin/

# Log in to your ArgoCD instance
argocd login localhost:8080 --insecure
```

Change the admin password:

```bash
argocd account update-password
```

## Step 4: Connect a Git Repository

Register your Git repository with ArgoCD:

```bash
# Add a public repository
argocd repo add https://github.com/myorg/my-manifests

# Add a private repository with SSH key
argocd repo add git@github.com:myorg/my-manifests.git \
  --ssh-private-key-path ~/.ssh/id_rsa

# Add a private repository with HTTPS credentials
argocd repo add https://github.com/myorg/my-manifests \
  --username myuser \
  --password mytoken
```

Or create the repository secret declaratively:

```yaml
# argocd-repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/myorg/my-manifests
  username: myuser
  password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 5: Create Your First Application

Define an ArgoCD Application that points to your Git repository:

```yaml
# app-frontend.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-manifests
    targetRevision: main
    path: apps/frontend
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true       # Delete resources removed from Git
      selfHeal: true    # Revert manual changes to match Git
      allowEmpty: false
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
kubectl apply -f app-frontend.yaml

# Or use the CLI
argocd app create frontend \
  --repo https://github.com/myorg/my-manifests \
  --path apps/frontend \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --sync-policy automated \
  --auto-prune \
  --self-heal
```

## Step 6: Use the App of Apps Pattern

For managing many applications, use the app-of-apps pattern where one parent application manages all child applications:

```yaml
# app-of-apps.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-manifests
    targetRevision: main
    path: argocd-apps
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
```

Inside the `argocd-apps/` directory, define all your applications:

```yaml
# argocd-apps/frontend.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-manifests
    path: apps/frontend
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
---
# argocd-apps/backend.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-manifests
    path: apps/backend
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Step 7: Set Up Helm-Based Applications

ArgoCD natively supports Helm charts:

```yaml
# app-prometheus.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prometheus-stack
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://prometheus-community.github.io/helm-charts
    chart: kube-prometheus-stack
    targetRevision: "55.*"
    helm:
      releaseName: prometheus-stack
      values: |
        prometheus:
          prometheusSpec:
            retention: 15d
            storageSpec:
              volumeClaimTemplate:
                spec:
                  accessModes: ["ReadWriteOnce"]
                  resources:
                    requests:
                      storage: 50Gi
        grafana:
          persistence:
            enabled: true
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

## Step 8: Configure RBAC and SSO

For production, set up proper access control:

```yaml
# argocd-rbac.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    # Admins can do everything
    p, role:admin, applications, *, */*, allow
    p, role:admin, clusters, *, *, allow
    p, role:admin, repositories, *, *, allow
    p, role:admin, projects, *, *, allow

    # Developers can sync and view their namespace apps
    p, role:developer, applications, get, default/*, allow
    p, role:developer, applications, sync, default/*, allow

    # Map GitHub teams to roles
    g, my-org:platform-team, role:admin
    g, my-org:developers, role:developer
```

## Step 9: Monitor ArgoCD

Set up monitoring for ArgoCD itself:

```bash
# Check application sync status
argocd app list

# Get detailed status
argocd app get frontend

# View sync history
argocd app history frontend
```

Create Prometheus alerts for ArgoCD:

```yaml
# argocd-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-alerts
  namespace: monitoring
spec:
  groups:
    - name: argocd
      rules:
        - alert: ArgoAppOutOfSync
          expr: argocd_app_info{sync_status!="Synced"} == 1
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD app {{ $labels.name }} is out of sync"
```

## Conclusion

ArgoCD on Talos Linux creates a powerful GitOps pipeline where your entire cluster state - from infrastructure to applications - is defined in Git and continuously reconciled. The web UI provides excellent visibility into sync status and resource health, making it accessible to the whole team. Start with a few applications, adopt the app-of-apps pattern as you scale, and integrate SSO for proper access control. Combined with Talos Linux's declarative OS management, you get a fully GitOps-driven infrastructure stack.
