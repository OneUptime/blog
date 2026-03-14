# How to Deploy Gitea Self-Hosted Git with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Gitea, Git, Self-Hosted, Source Control

Description: Deploy Gitea self-hosted Git service to Kubernetes using Flux CD for a fully GitOps-managed source control platform.

---

## Introduction

Gitea is a painless, lightweight self-hosted Git service written in Go. It provides a GitHub-like experience—repositories, pull requests, issues, wikis, CI integration via Gitea Actions—without the resource overhead of GitLab. It is an ideal choice for teams that want full control over their source code without relying on third-party SaaS platforms.

Running Gitea on Kubernetes through Flux CD means your source control infrastructure is managed with the same GitOps discipline you apply to your applications. The Gitea Helm chart supports PostgreSQL as the database backend, persistent volume claims for repository data, and SSH ingress for Git-over-SSH operations.

This guide deploys Gitea with a PostgreSQL database backend, SSH LoadBalancer service, and HTTP Ingress using Flux CD's `HelmRelease`.

## Prerequisites

- Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- An Ingress controller (e.g., ingress-nginx)
- A LoadBalancer-capable service (for SSH access) or NodePort if using a bare-metal cluster
- Persistent storage available
- `flux` and `kubectl` CLIs configured

## Step 1: Create Namespace and Secrets

```bash
kubectl create namespace gitea

# Admin credentials for Gitea
kubectl create secret generic gitea-admin-secret \
  --namespace gitea \
  --from-literal=username=gitea_admin \
  --from-literal=password=strongpassword123 \
  --from-literal=email=admin@example.com

# PostgreSQL password
kubectl create secret generic gitea-db-secret \
  --namespace gitea \
  --from-literal=postgres-password=pgpassword123 \
  --from-literal=password=gitea_db_pass
```

## Step 2: Add the Gitea Helm Repository

```yaml
# clusters/my-cluster/gitea/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: gitea-charts
  namespace: flux-system
spec:
  url: https://dl.gitea.com/charts/
  interval: 12h
```

## Step 3: Create the HelmRelease

```yaml
# clusters/my-cluster/gitea/gitea-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: gitea
  namespace: gitea
spec:
  interval: 10m
  chart:
    spec:
      chart: gitea
      version: ">=10.0.0 <11.0.0"
      sourceRef:
        kind: HelmRepository
        name: gitea-charts
        namespace: flux-system
  values:
    # Gitea application configuration
    gitea:
      admin:
        existingSecret: gitea-admin-secret

      config:
        APP_NAME: "My Gitea"
        server:
          DOMAIN: gitea.example.com
          ROOT_URL: https://gitea.example.com
          SSH_DOMAIN: gitea-ssh.example.com
          SSH_PORT: 22
          START_SSH_SERVER: false   # Use the Kubernetes SSH service
        repository:
          DEFAULT_BRANCH: main
        service:
          DISABLE_REGISTRATION: true   # Invite-only after initial setup

    # Use external PostgreSQL (bundled chart)
    postgresql-ha:
      enabled: false

    postgresql:
      enabled: true
      auth:
        existingSecret: gitea-db-secret
        username: gitea
        database: gitea
      primary:
        persistence:
          size: 20Gi

    persistence:
      enabled: true
      size: 50Gi     # Storage for all repositories

    # HTTP ingress
    ingress:
      enabled: true
      ingressClassName: nginx
      hosts:
        - host: gitea.example.com
          paths:
            - path: /
              pathType: Prefix
      tls:
        - secretName: gitea-tls
          hosts:
            - gitea.example.com

    # SSH service via LoadBalancer
    service:
      ssh:
        type: LoadBalancer
        port: 22
        annotations:
          service.beta.kubernetes.io/aws-load-balancer-type: nlb

    resources:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: "1"
        memory: 1Gi
```

## Step 4: Create the Kustomization

```yaml
# clusters/my-cluster/gitea/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gitea
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/gitea
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: gitea
      namespace: gitea
```

## Step 5: Verify and Configure Gitea

```bash
# Watch Flux reconcile
flux get helmreleases -n gitea --watch

# Confirm all pods are running
kubectl get pods -n gitea

# Check Gitea logs
kubectl logs -n gitea -l app.kubernetes.io/name=gitea -f
```

Once running, navigate to `https://gitea.example.com` and log in with the admin credentials stored in `gitea-admin-secret`.

## Step 6: Bootstrap Flux Against Gitea

You can use Gitea as the Git backend for Flux itself:

```bash
flux bootstrap gitea \
  --owner=my-org \
  --repository=fleet-repo \
  --branch=main \
  --path=clusters/my-cluster \
  --hostname=gitea.example.com \
  --token-auth
```

Flux will create the repository in Gitea and push the bootstrap manifests automatically.

## Best Practices

- Set `DISABLE_REGISTRATION: true` after the initial admin account is created to prevent unauthorized sign-ups.
- Enable Gitea Actions (`ACTIONS: true` in the `gitea.config` block) for native CI/CD without a separate runner.
- Use `gitea backup` to export repositories and database periodically; store backups in object storage.
- Configure SMTP settings via `gitea.config.mailer` for email notifications and password resets.
- For high-availability, enable `postgresql-ha` instead of the single-instance PostgreSQL.

## Conclusion

Gitea is now deployed on Kubernetes and managed entirely by Flux CD. Your self-hosted source control infrastructure follows the same GitOps patterns as the applications it hosts, giving your team a fully auditable, repeatable deployment process. Updates to Gitea's configuration or version are as simple as a pull request against your fleet repository.
