# How to Deploy Mattermost Chat with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Mattermost, Team Chat, Collaboration

Description: Deploy Mattermost team collaboration platform to Kubernetes using Flux CD for a self-hosted, GitOps-managed alternative to Slack.

---

## Introduction

Mattermost is an open-source, self-hosted messaging platform that gives teams the Slack-like experience they want without sending private conversations to a third-party cloud. It supports channels, direct messages, file sharing, bot integrations, and webhooks, making it a powerful collaboration hub for engineering-focused organizations.

Deploying Mattermost on Kubernetes with Flux CD brings the same GitOps rigor you apply to your applications to your internal communications platform. The official Mattermost Helm chart configures the application server, connects it to a PostgreSQL database, and exposes it through an Ingress. Flux ensures that any drift between the declared configuration and the running cluster is corrected automatically.

This guide uses the Mattermost Team Edition (free, open-source) Helm chart with PostgreSQL and persistent volume support.

## Prerequisites

- Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- An Ingress controller installed
- Persistent storage available
- `flux` and `kubectl` CLIs configured

## Step 1: Create Namespace and Secrets

```bash
kubectl create namespace mattermost

# Mattermost database credentials
kubectl create secret generic mattermost-db-secret \
  --namespace mattermost \
  --from-literal=DB_PASSWORD=mm_db_pass \
  --from-literal=MM_SQLSETTINGS_DATASOURCE="postgres://mattermost:mm_db_pass@mattermost-postgresql:5432/mattermost?sslmode=disable"
```

## Step 2: Register the Mattermost Helm Repository

```yaml
# clusters/my-cluster/mattermost/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: mattermost
  namespace: flux-system
spec:
  url: https://helm.mattermost.com
  interval: 12h
```

## Step 3: Deploy PostgreSQL

```yaml
# clusters/my-cluster/mattermost/postgresql-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: mattermost-postgresql
  namespace: mattermost
spec:
  interval: 10m
  chart:
    spec:
      chart: postgresql
      version: ">=13.0.0 <14.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    auth:
      database: mattermost
      username: mattermost
      existingSecret: mattermost-db-secret
      secretKeys:
        userPasswordKey: DB_PASSWORD
    primary:
      persistence:
        size: 20Gi
```

## Step 4: Deploy Mattermost

```yaml
# clusters/my-cluster/mattermost/mattermost-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: mattermost
  namespace: mattermost
spec:
  interval: 10m
  dependsOn:
    - name: mattermost-postgresql
  chart:
    spec:
      chart: mattermost-team-edition
      version: ">=6.6.0 <7.0.0"
      sourceRef:
        kind: HelmRepository
        name: mattermost
        namespace: flux-system
  values:
    # Disable bundled database
    mysql:
      enabled: false

    # Use external PostgreSQL via secret
    externalDB:
      enabled: true
      existingDatabaseUrlSecret: mattermost-db-secret
      existingDatabaseUrlSecretKey: MM_SQLSETTINGS_DATASOURCE

    # Mattermost application configuration
    mattermostEnvs:
      MM_SERVICESETTINGS_SITEURL: https://chat.example.com
      MM_TEAMSETTINGS_ENABLETEAMCREATION: "false"
      MM_EMAILSETTINGS_ENABLESIGNUPWITHEMAIL: "true"
      # File storage: use local (or switch to S3)
      MM_FILESETTINGS_DRIVERNAME: local

    # Persistent volume for file uploads
    persistence:
      data:
        enabled: true
        size: 50Gi

    ingress:
      enabled: true
      ingressClassName: nginx
      hosts:
        - host: chat.example.com
          paths:
            - path: /
              pathType: Prefix
      tls:
        - secretName: mattermost-tls
          hosts:
            - chat.example.com

    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        cpu: "1"
        memory: 2Gi
```

## Step 5: Add the Kustomization

```yaml
# clusters/my-cluster/mattermost/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: mattermost
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/mattermost
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: mattermost
      namespace: mattermost
```

## Step 6: Verify and Create the Admin Account

```bash
# Watch Flux reconcile
flux get helmreleases -n mattermost --watch

# Check all pods
kubectl get pods -n mattermost

# Open a shell into the Mattermost pod for admin CLI operations
kubectl exec -it -n mattermost \
  $(kubectl get pod -n mattermost -l app=mattermost-team-edition -o name | head -1) \
  -- /mattermost/bin/mmctl --local user create \
     --email admin@example.com \
     --username admin \
     --password Admin1234! \
     --system-admin
```

Navigate to `https://chat.example.com` and log in as the admin user.

## Best Practices

- Switch `MM_FILESETTINGS_DRIVERNAME` to `amazons3` (or compatible) and configure S3 settings to offload file storage from the pod volume.
- Configure SMTP in `mattermostEnvs` for email notifications, password resets, and team invitations.
- Enable push notifications by registering with the Mattermost push notification service or running the self-hosted push proxy.
- Use `podAnnotations` to annotate the Mattermost pod for log shipping to your observability stack.
- Enable database read replicas in the enterprise edition for high-traffic environments.

## Conclusion

Mattermost is now deployed on Kubernetes and fully managed by Flux CD. Your team gets a self-hosted, privacy-respecting collaboration platform, and your operations team gets a fully auditable, GitOps-managed deployment. Configuration changes—from SMTP settings to resource limits—flow through Git pull requests and are applied by Flux automatically.
