# How to Deploy Kong Gateway with PostgreSQL via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kong Gateway, API Gateway, PostgreSQL, HelmRelease, Ingress

Description: Deploy Kong API Gateway with a PostgreSQL database backend using Flux CD HelmRelease for production-grade API management with persistent configuration storage.

---

## Introduction

Kong Gateway is one of the most widely deployed API gateways in Kubernetes environments, offering a rich plugin ecosystem, high-performance proxying, and robust configuration management. When deployed with a PostgreSQL backend, Kong stores its configuration durably in a database, enabling features like the Admin API for dynamic configuration and the Kong Manager UI for visual administration.

Deploying Kong with PostgreSQL through Flux CD gives you the best of both worlds: Kong's powerful API management features combined with GitOps-driven infrastructure management. Your Kong deployment configuration, service routes, and plugin settings are all version controlled and automatically reconciled, while the database provides the runtime configuration flexibility that database-backed Kong offers.

This guide deploys Kong Gateway in database mode with a managed PostgreSQL instance using Flux CD HelmRelease resources, configures the Admin API, and sets up a basic routing example.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- kubectl with cluster-admin access
- A Git repository connected to Flux CD
- A storage class for PostgreSQL persistent volumes
- TLS certificates or cert-manager for HTTPS termination

## Step 1: Add the Kong HelmRepository

Register the Kong Helm chart repository with Flux CD.

```yaml
# infrastructure/kong/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kong
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.konghq.com
```

## Step 2: Deploy PostgreSQL for Kong

Deploy a dedicated PostgreSQL instance for Kong's configuration storage.

```yaml
# infrastructure/kong/postgresql-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kong-postgresql
  namespace: kong
spec:
  interval: 30m
  chart:
    spec:
      chart: postgresql
      version: ">=13.0.0 <14.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 12h
  values:
    auth:
      username: kong
      database: kong
      # Reference a pre-created secret for the password
      existingSecret: kong-postgresql-secret
      secretKeys:
        adminPasswordKey: postgres-password
        userPasswordKey: password

    primary:
      persistence:
        enabled: true
        size: 10Gi
        storageClass: "standard"
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
        limits:
          cpu: "1"
          memory: 1Gi
```

## Step 3: Create Kong Database Credentials Secret

Create the credentials secret using a sealed secret or external secrets operator.

```bash
# Create the secret (do not commit to Git - use sealed secrets or ESO)
kubectl create namespace kong
kubectl create secret generic kong-postgresql-secret \
  --from-literal=postgres-password=CHANGE_ME_STRONG_PASSWORD \
  --from-literal=password=CHANGE_ME_KONG_PASSWORD \
  -n kong
```

## Step 4: Deploy Kong Gateway

Deploy Kong in database mode, pointing to the PostgreSQL instance.

```yaml
# infrastructure/kong/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kong
  namespace: kong
spec:
  interval: 30m
  chart:
    spec:
      chart: kong
      version: ">=2.30.0 <3.0.0"
      sourceRef:
        kind: HelmRepository
        name: kong
        namespace: flux-system
      interval: 12h
  values:
    # Database mode - Kong stores config in PostgreSQL
    env:
      database: postgres
      pg_host: kong-postgresql.kong.svc.cluster.local
      pg_port: "5432"
      pg_database: kong
      pg_user: kong
      pg_password:
        valueFrom:
          secretKeyRef:
            name: kong-postgresql-secret
            key: password

    # Run migrations as an init job
    migrations:
      preUpgrade: true
      postUpgrade: true

    # Admin API configuration
    admin:
      enabled: true
      http:
        enabled: true
        servicePort: 8001
      tls:
        enabled: false  # Enable TLS in production

    # Proxy configuration
    proxy:
      enabled: true
      http:
        enabled: true
        servicePort: 80
      tls:
        enabled: true
        servicePort: 443

    # Ingress controller for managing Kong via Kubernetes resources
    ingressController:
      enabled: true
      installCRDs: false  # CRDs managed separately

    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: "2"
        memory: 2Gi

    replicaCount: 2
```

## Step 5: Create the Flux Kustomization

Apply all Kong resources with proper dependency ordering.

```yaml
# clusters/production/kong-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kong-infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/kong
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure-controllers
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: kong-kong
      namespace: kong
  timeout: 10m
```

## Step 6: Verify Kong is Running

Validate the Kong deployment and test a basic API route.

```bash
# Check all Kong pods are running
kubectl get pods -n kong

# Verify Kong HelmRelease status
flux get helmrelease kong -n kong
flux get helmrelease kong-postgresql -n kong

# Port-forward to the Admin API
kubectl port-forward -n kong svc/kong-kong-admin 8001:8001 &

# Check Kong status
curl http://localhost:8001/status

# Create a test service through the Admin API
curl -X POST http://localhost:8001/services \
  --data name=example-service \
  --data url=http://httpbin.org

# Create a route for the service
curl -X POST http://localhost:8001/services/example-service/routes \
  --data 'paths[]=/example'
```

## Best Practices

- Use Sealed Secrets or External Secrets Operator to manage Kong database credentials rather than creating secrets manually; secrets should be managed as code.
- Enable Kong Manager and the Admin API only with strong authentication; expose the Admin API internally only, never to the internet.
- Run Kong with at least 2 replicas and configure anti-affinity rules to spread them across availability zones.
- Set up automated PostgreSQL backups using a CronJob managed by Flux; Kong's database contains all your routing and plugin configuration.
- Use Kong's deck CLI in CI/CD pipelines to validate declarative Kong configuration before applying it through the Admin API.
- Monitor Kong with Prometheus metrics enabled in the Helm values and add Kong-specific Grafana dashboards.

## Conclusion

Kong Gateway with PostgreSQL, deployed through Flux CD, provides a production-grade API management platform with GitOps governance. Your Kong infrastructure is reproducible, auditable, and automatically reconciled — while Kong's database backend gives you the dynamic configuration capabilities needed for complex routing scenarios and plugin management at scale.
