# How to Deploy Sentry Error Tracking with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Sentry, Error Tracking, Observability, Monitoring

Description: Deploy Sentry error tracking and monitoring platform to Kubernetes using Flux CD for a self-hosted, GitOps-managed application error intelligence system.

---

## Introduction

Sentry is the leading open-source application monitoring platform that captures errors, traces slow transactions, and surfaces performance bottlenecks in real time. Running Sentry on-premises is common for organizations with strict data residency requirements or those handling sensitive application data that cannot leave their network perimeter.

Deploying Sentry on Kubernetes is non-trivial-it comprises multiple services including the web server, workers, Celery beat scheduler, Snuba (event processing), Relay (ingest), Kafka, Redis, PostgreSQL, ClickHouse, and Zookeeper. The official Sentry Helm chart manages this complexity, and Flux CD ensures the entire multi-component deployment is reconciled from a single Git source of truth.

This guide uses the `sentry-kubernetes` Helm chart to deploy the self-hosted Sentry stack.

## Prerequisites

- Kubernetes cluster (v1.26+) with at least 8 GB of RAM and 4 CPU cores for Sentry's dependencies
- Flux CD bootstrapped in the cluster
- Persistent storage (at least 100 GB recommended)
- An Ingress controller installed
- `flux` and `kubectl` CLIs configured

## Step 1: Create Namespace and Secrets

```bash
kubectl create namespace sentry

# Sentry secret key (must be a cryptographically random string)
kubectl create secret generic sentry-secret \
  --namespace sentry \
  --from-literal=secret-key=$(openssl rand -hex 32) \
  --from-literal=user-password=SentryAdmin123! \
  --from-literal=user-email=admin@example.com
```

## Step 2: Add the Sentry Helm Repository

```yaml
# clusters/my-cluster/sentry/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: sentry
  namespace: flux-system
spec:
  url: https://sentry-kubernetes.github.io/charts
  interval: 12h
```

## Step 3: Create the HelmRelease

```yaml
# clusters/my-cluster/sentry/sentry-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: sentry
  namespace: sentry
spec:
  interval: 10m
  # Sentry takes several minutes to initialize on first run
  timeout: 20m
  chart:
    spec:
      chart: sentry
      version: ">=23.0.0 <24.0.0"
      sourceRef:
        kind: HelmRepository
        name: sentry
        namespace: flux-system
  values:
    # Load the secret key from the pre-created secret
    existingSecret: sentry-secret
    existingSecretKey: secret-key

    # Initial admin user
    user:
      create: true
      existingSecret: sentry-secret
      existingSecretUserKey: user-email
      existingSecretPasswordKey: user-password

    # Use bundled PostgreSQL (enable external for production)
    postgresql:
      enabled: true
      auth:
        username: sentry
        database: sentry
      primary:
        persistence:
          size: 30Gi

    # Redis for caching and task queues
    redis:
      enabled: true

    # Kafka for the Snuba event pipeline
    kafka:
      enabled: true

    # ClickHouse for analytics storage
    clickhouse:
      enabled: true
      clickhouse:
        persistentVolumeClaim:
          dataPersistentVolume:
            storage: 50Gi

    # Relay for event ingestion
    relay:
      enabled: true

    # Snuba for event processing
    snuba:
      enabled: true

    # Ingress configuration
    ingress:
      enabled: true
      ingressClassName: nginx
      hostname: sentry.example.com
      tls:
        - secretName: sentry-tls
          hosts:
            - sentry.example.com

    # Sentry web resource limits
    web:
      resources:
        requests:
          cpu: 300m
          memory: 512Mi
        limits:
          cpu: "1"
          memory: 2Gi

    # Worker resource limits
    worker:
      resources:
        requests:
          cpu: 300m
          memory: 512Mi
        limits:
          cpu: "1"
          memory: 2Gi
```

## Step 4: Create the Kustomization

```yaml
# clusters/my-cluster/sentry/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: sentry
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/sentry
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  # Sentry has a long startup time due to DB migrations
  timeout: 25m
```

## Step 5: Monitor Deployment Progress

```bash
# Watch Flux reconcile the HelmRelease
flux get helmreleases -n sentry --watch

# Sentry runs database migrations on first boot - watch the hooks
kubectl get jobs -n sentry --watch

# Check web pod logs
kubectl logs -n sentry -l app=sentry-web -f
```

The initial boot will run database migrations and ClickHouse schema setup. This can take 5–15 minutes on first run.

## Step 6: Verify Sentry is Operational

```bash
# Confirm all Sentry services are running
kubectl get pods -n sentry
```

Expected running pods: `sentry-web`, `sentry-worker`, `sentry-cron`, `sentry-relay`, `sentry-snuba-*`, `sentry-kafka-*`, `sentry-redis-*`, `sentry-postgresql-*`, `sentry-clickhouse-*`.

Navigate to `https://sentry.example.com` and log in with the admin credentials.

## Best Practices

- For production, replace bundled PostgreSQL with an external managed database (AWS RDS, Cloud SQL) to benefit from automated backups and high availability.
- Configure SMTP in the Helm values (`email.from`, `email.host`) for notifications and user invitations.
- Enable Slack or PagerDuty integrations in Sentry settings for on-call alerting.
- Set up Sentry projects per application and configure alert rules to avoid alert fatigue.
- Monitor ClickHouse disk usage closely-event data grows quickly in high-traffic environments.

## Conclusion

Sentry is now deployed on Kubernetes and managed by Flux CD. Your development teams gain a self-hosted error intelligence platform, while your operations team maintains full control over the deployment through Git. Any configuration change-from adding a new integration to bumping chart versions-is a pull request that Flux applies automatically, keeping your error tracking infrastructure in sync with its declared state.
