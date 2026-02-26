# How to Install ArgoCD Core Without the UI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, DevOps

Description: Learn how to install ArgoCD in core-only mode without the web UI, API server, or Dex for a lightweight, CLI-driven GitOps experience.

---

ArgoCD ships with a full web UI, API server, Dex authentication server, and Redis cache. For many use cases, all of that is unnecessary overhead. If you are running ArgoCD purely as a GitOps engine and managing everything through the CLI or declarative YAML, the core installation gives you just the essential components - the Application Controller and the Repo Server - without the rest.

ArgoCD Core mode was introduced to address environments where the UI and API server add unwanted attack surface, consume resources you cannot spare, or simply are not needed because everything is managed as code.

## What ArgoCD Core Includes and Excludes

Here is what changes in core mode compared to a full installation:

| Component | Full Install | Core Install |
|---|---|---|
| Application Controller | Yes | Yes |
| Repo Server | Yes | Yes |
| API Server | Yes | No |
| Web UI | Yes | No |
| Dex (SSO) | Yes | No |
| Redis | Yes | Yes (for caching) |
| Notifications Controller | Optional | Optional |

The Application Controller is the brain that watches Git repositories and reconciles the cluster state. The Repo Server handles cloning repos and generating manifests. These two are all you need for GitOps to work.

## When to Use Core Mode

Core mode is ideal when:

- You manage ArgoCD entirely through Kubernetes manifests (Application CRDs)
- You want to reduce resource usage on constrained clusters
- You want to minimize the attack surface in production
- You are running ArgoCD in CI/CD pipelines where no human interacts with the UI
- You are running multiple ArgoCD instances and do not need a UI on each one

## Step 1: Install ArgoCD Core

ArgoCD provides a separate manifest for core-only installation.

```bash
# Create the namespace
kubectl create namespace argocd

# Install ArgoCD in core mode
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/core-install.yaml
```

This installs only the Application Controller, Repo Server, and Redis.

Verify the installation.

```bash
# Check running pods - you should see fewer pods than a full install
kubectl get pods -n argocd
```

You should see something like:

```
NAME                                  READY   STATUS    RESTARTS   AGE
argocd-application-controller-0       1/1     Running   0          1m
argocd-redis-5b6967fdfc-xxxxx         1/1     Running   0          1m
argocd-repo-server-7598bf5999-xxxxx   1/1     Running   0          1m
```

Notice there is no `argocd-server` or `argocd-dex-server` pod.

## Step 2: Configure the ArgoCD CLI for Core Mode

Without the API server, the ArgoCD CLI communicates directly with the Kubernetes API using your kubeconfig. This is called "core mode" for the CLI as well.

```bash
# Install the ArgoCD CLI
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd
sudo mv argocd /usr/local/bin/

# Set the CLI to use core mode
# This tells the CLI to talk to Kubernetes directly, not the ArgoCD API server
export ARGOCD_OPTS="--core"
```

You can also add this to your shell profile so it persists.

```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export ARGOCD_OPTS="--core"' >> ~/.bashrc
```

Now the CLI works without needing to `argocd login` first. It uses your current kubeconfig context.

```bash
# List applications - works without logging in
argocd app list --core

# Create an application
argocd app create guestbook \
  --core \
  --repo https://github.com/argoproj/argocd-example-apps.git \
  --path guestbook \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default

# Sync an application
argocd app sync guestbook --core
```

## Step 3: Deploy Applications Declaratively

In core mode, the primary way to manage applications is through Kubernetes manifests. Create Application resources directly.

```yaml
# guestbook-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

```bash
kubectl apply -f guestbook-app.yaml
```

The Application Controller picks it up and syncs it automatically.

## Step 4: Monitor Applications Without the UI

Since there is no web UI, you monitor applications through the CLI or Kubernetes-native tools.

### Using the CLI

```bash
# Get detailed application status
argocd app get guestbook --core

# Watch application sync progress
argocd app wait guestbook --core --sync

# View application history
argocd app history guestbook --core

# Check differences between Git and live state
argocd app diff guestbook --core
```

### Using kubectl

Since ArgoCD Applications are Kubernetes CRDs, you can use kubectl directly.

```bash
# List all ArgoCD applications
kubectl get applications -n argocd

# Get detailed status
kubectl get application guestbook -n argocd -o yaml

# Watch for status changes
kubectl get applications -n argocd -w
```

### Using Prometheus Metrics

The Application Controller still exposes Prometheus metrics in core mode.

```bash
# Port-forward to the controller metrics endpoint
kubectl port-forward svc/argocd-metrics -n argocd 8082:8082

# Access metrics
curl http://localhost:8082/metrics
```

Key metrics to monitor:

- `argocd_app_info` - Application status and health
- `argocd_app_sync_total` - Sync operation counts
- `argocd_app_reconcile_count` - Reconciliation frequency

## Step 5: Manage Repositories in Core Mode

Without the API server, add repositories through Kubernetes Secrets.

```yaml
# repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-private-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: https://github.com/my-org/my-repo.git
  username: git-token
  password: ghp_xxxxxxxxxxxxxxxxxxxx
```

```bash
kubectl apply -f repo-secret.yaml
```

For SSH authentication:

```yaml
# ssh-repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-ssh-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: git@github.com:my-org/my-repo.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    <your SSH private key>
    -----END OPENSSH PRIVATE KEY-----
```

## Step 6: Configure Projects in Core Mode

AppProjects are also managed declaratively.

```yaml
# team-project.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-a
  namespace: argocd
spec:
  description: "Team A project"
  sourceRepos:
  - 'https://github.com/team-a/*'
  destinations:
  - namespace: 'team-a-*'
    server: https://kubernetes.default.svc
  clusterResourceWhitelist:
  - group: ''
    kind: Namespace
```

```bash
kubectl apply -f team-project.yaml
```

## Switching Between Core and Full Mode

You can upgrade from core to full mode later by applying the full install manifest.

```bash
# Upgrade to full install (adds API server, UI, Dex)
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

To go back to core mode, delete the extra components.

```bash
# Remove the API server, Dex, and related resources
kubectl delete deployment argocd-server -n argocd
kubectl delete deployment argocd-dex-server -n argocd
kubectl delete service argocd-server -n argocd
kubectl delete service argocd-dex-server -n argocd
```

## Resource Comparison

Here is roughly how much resources you save with core mode on a typical cluster:

| Component | CPU Request | Memory Request |
|---|---|---|
| argocd-server | 50m | 64Mi |
| argocd-dex-server | 10m | 64Mi |
| **Total Saved** | **60m** | **128Mi** |

It is not a huge saving for a single instance, but when you run multiple ArgoCD instances (e.g., one per team or per environment), it adds up.

## Troubleshooting

### CLI Says "No ArgoCD Server Found"

Make sure you are passing the `--core` flag or have `ARGOCD_OPTS` set.

```bash
argocd app list --core
```

### Application Stuck in Unknown Status

Check the Application Controller logs.

```bash
kubectl logs -n argocd statefulset/argocd-application-controller
```

### Repository Connection Failing

Check the Repo Server logs.

```bash
kubectl logs -n argocd deployment/argocd-repo-server
```

## Further Reading

- Full ArgoCD installation: [Install ArgoCD on Kubernetes](https://oneuptime.com/blog/post/2026-01-25-install-argocd-kubernetes/view)
- Managing applications declaratively: [ArgoCD Applications](https://oneuptime.com/blog/post/2026-02-02-argocd-applications/view)
- Project-based access control: [ArgoCD Projects](https://oneuptime.com/blog/post/2026-02-02-argocd-projects/view)

Core mode is the right choice when ArgoCD is a pure infrastructure component that nobody interacts with through a browser. It keeps things lean and reduces your maintenance burden while giving you the same GitOps capabilities.
