# How to Add a Public Git Repository to ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git, Repository Management

Description: Learn how to add and configure public Git repositories in ArgoCD for deploying applications from open-source and public codebases to your Kubernetes clusters.

---

Adding a public Git repository to ArgoCD is one of the first things you will do when setting up your GitOps workflow. While it might seem straightforward, there are several nuances around configuration, performance tuning, and best practices that are worth understanding before you start deploying applications from public repos.

## Why You Might Use Public Repositories

Public Git repositories are common in many scenarios. You might be deploying open-source tools like Prometheus, Grafana, or NGINX configurations from a public repo. You might maintain a public infrastructure-as-code repository for community projects. Or you might simply be testing ArgoCD with a public demo repository before moving to private repos.

ArgoCD treats public repositories differently from private ones because no authentication is required. This simplifies the setup considerably, but you still need to register the repository properly for ArgoCD to track it.

## Adding a Public Repository via the CLI

The ArgoCD CLI provides the simplest way to register a public repository:

```bash
# Add a public GitHub repository
argocd repo add https://github.com/argoproj/argocd-example-apps.git
```

That is literally all you need. ArgoCD will verify it can connect to the repository and register it. You can confirm the repository was added successfully:

```bash
# List all registered repositories
argocd repo list

# Check the connection status of a specific repo
argocd repo get https://github.com/argoproj/argocd-example-apps.git
```

The output should show a status of `Successful` with the connection type listed as `git`.

## Adding a Public Repository via the UI

If you prefer the graphical interface, navigate to Settings in the ArgoCD UI, then click on Repositories. Click the "Connect Repo" button, and you will see a form with several fields.

For a public repository, configure it as follows:

- Connection method: VIA HTTPS
- Type: git
- Repository URL: The full HTTPS clone URL
- Leave username and password empty

Click "Connect" and ArgoCD will test the connection and add the repository.

## Adding a Public Repository Declaratively

For production environments, declaring your repositories as Kubernetes resources is the recommended approach. This way your repository configurations are version-controlled and reproducible.

```yaml
# public-repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: public-example-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/argoproj/argocd-example-apps.git
```

Apply this with kubectl:

```bash
# Apply the repository secret
kubectl apply -f public-repo-secret.yaml
```

Even though no credentials are needed, ArgoCD uses Kubernetes Secrets to store all repository configurations. The `argocd.argoproj.io/secret-type: repository` label is what tells ArgoCD to treat this Secret as a repository configuration.

## Creating an Application from a Public Repository

Once the repository is registered, you can create an application that deploys from it:

```yaml
# example-app.yaml
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
    namespace: guestbook
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Apply this manifest:

```bash
kubectl apply -f example-app.yaml
```

ArgoCD will sync the application and deploy whatever manifests exist in the `guestbook` directory of that repository.

## Important Considerations for Public Repositories

### Rate Limiting

Public Git hosting services like GitHub, GitLab, and Bitbucket impose rate limits on unauthenticated requests. GitHub, for instance, limits unauthenticated API calls to 60 per hour per IP address. ArgoCD periodically polls repositories to detect changes, which means a busy ArgoCD instance with many public repositories can hit these limits.

To mitigate this, you can configure the polling interval:

```yaml
# In the argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Increase the timeout between repository polls (default is 3 minutes)
  timeout.reconciliation: 300s
```

Even for public repos, consider adding a personal access token with no special permissions. This bumps GitHub's rate limit from 60 to 5,000 requests per hour:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: public-repo-with-token
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/argoproj/argocd-example-apps.git
  username: your-github-username
  password: ghp_your_personal_access_token
```

### Webhook Configuration

Instead of relying solely on polling, you can configure webhooks to notify ArgoCD immediately when changes are pushed. For a public GitHub repository where you have admin access:

```yaml
# In the argocd-cm ConfigMap, add a webhook secret
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  webhook.github.secret: my-webhook-secret
```

Then configure the webhook in your GitHub repository settings to point to your ArgoCD server's webhook endpoint at `https://argocd.example.com/api/webhook`.

### Repository Caching

ArgoCD's repo-server component caches repository content to reduce the number of Git clone operations. For large public repositories, you might want to tune the cache settings:

```yaml
# argocd-repo-server deployment adjustment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          env:
            # Set repo cache expiration (default is 24h)
            - name: ARGOCD_REPO_CACHE_EXPIRATION
              value: "48h"
```

## Connecting to Different Git Providers

Public repositories exist on many platforms. Here are the URL formats ArgoCD expects:

```bash
# GitHub
argocd repo add https://github.com/org/repo.git

# GitLab
argocd repo add https://gitlab.com/org/repo.git

# Bitbucket
argocd repo add https://bitbucket.org/org/repo.git

# Custom Gitea instance
argocd repo add https://gitea.example.com/org/repo.git
```

All of these work the same way for public repositories. ArgoCD does not care which Git provider you use as long as the HTTPS endpoint is accessible.

## Verifying Repository Health

After adding a repository, verify its health:

```bash
# Check all repositories
argocd repo list

# Expected output for a healthy public repo
# TYPE  NAME  REPO                                                      INSECURE  OCI    LFS    CREDS  STATUS      MESSAGE
# git         https://github.com/argoproj/argocd-example-apps.git       false     false  false  false  Successful
```

If the status shows `Failed`, check the message column for details. Common issues with public repositories include:

- The URL is incorrect or the repository does not exist
- Network connectivity issues between ArgoCD and the Git provider
- DNS resolution failures
- Corporate firewalls blocking outbound HTTPS traffic

## Removing a Public Repository

If you need to remove a repository:

```bash
# Remove via CLI
argocd repo rm https://github.com/argoproj/argocd-example-apps.git

# Or delete the corresponding Secret
kubectl delete secret public-example-repo -n argocd
```

Note that removing a repository does not delete the applications that reference it. Those applications will simply fail to sync until the repository is re-added or the applications are updated to point elsewhere.

## Best Practices

First, always use HTTPS URLs for public repositories. SSH URLs require key configuration and are unnecessary for public repos. Second, even for public repos, add an authentication token to avoid rate limiting. Third, use declarative repository definitions stored in Git so your ArgoCD configuration itself follows GitOps principles. Fourth, configure webhooks when possible to reduce polling overhead and get faster sync responses.

For monitoring your ArgoCD deployments and tracking the health of applications deployed from public repositories, consider using [OneUptime](https://oneuptime.com/blog/post/2026-01-25-gitops-argocd-kubernetes/view) to get visibility into your GitOps pipeline.

Public repositories are the simplest type of repository to configure in ArgoCD, but paying attention to rate limits, caching, and webhook configuration will save you headaches as your ArgoCD deployment scales.
