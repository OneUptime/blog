# How to Manage Kubernetes Operators with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes Operator, GitOps, Helm, CRD, Lifecycle Management

Description: A practical guide to installing, upgrading, and managing Kubernetes Operators using Flux CD with proper CRD handling and dependency ordering.

---

Kubernetes Operators extend the Kubernetes API to manage complex applications. Managing Operators with Flux CD brings GitOps benefits to your infrastructure layer: version-controlled operator configurations, automated upgrades, and drift detection. However, Operators introduce challenges around CRD management, upgrade ordering, and dependency chains that require careful handling.

## Why Manage Operators with Flux CD

Operators managed through Flux CD provide:

- Version-pinned operator installations tracked in Git
- Automated CRD updates with proper ordering
- Consistent operator versions across clusters
- Drift detection for operator configurations
- Audit trail for all operator changes

## Common Operators You Might Manage

- cert-manager for TLS certificates
- Prometheus Operator for monitoring
- Istio Operator for service mesh
- Strimzi for Kafka
- Zalando Postgres Operator for PostgreSQL
- Crossplane for cloud resources

## Step 1: Repository Structure for Operators

Organize operators separately from application workloads.

```bash
fleet-infra/
  clusters/
    production/
      flux-system/
      infrastructure/
        sources/            # Helm repositories for operators
        controllers/        # Operator installations
        configs/            # Operator custom resources
      apps/                 # Application workloads
```

## Step 2: Install cert-manager with Flux CD

cert-manager is one of the most common operators. It illustrates the CRD management challenge well.

```yaml
# clusters/production/infrastructure/sources/jetstack.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jetstack
  namespace: flux-system
spec:
  url: https://charts.jetstack.io
  interval: 1h
```

```yaml
# clusters/production/infrastructure/controllers/cert-manager.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: cert-manager
  chart:
    spec:
      chart: cert-manager
      version: "v1.14.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
  # Install CRDs via the Helm chart
  values:
    installCRDs: true
    # Enable DNS01 challenge support
    dns01RecursiveNameservers: "8.8.8.8:53"
    # Configure resource limits for the controller
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
    # Webhook configuration
    webhook:
      resources:
        requests:
          cpu: 25m
          memory: 32Mi
    # CA injector configuration
    cainjector:
      resources:
        requests:
          cpu: 25m
          memory: 64Mi
  install:
    createNamespace: true
    # CRDs must be created before other resources
    crds: Create
    remediation:
      retries: 5
  upgrade:
    # Update CRDs during upgrades
    crds: CreateReplace
    remediation:
      retries: 5
      remediateLastFailure: true
```

```yaml
# clusters/production/infrastructure/configs/cert-manager-issuers.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager-issuers
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager/issuers
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Wait for cert-manager to be fully ready before creating issuers
  dependsOn:
    - name: cert-manager
  # Health check ensures CRDs are available
  wait: true
  timeout: 5m
```

```yaml
# infrastructure/cert-manager/issuers/letsencrypt.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: platform@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: platform@example.com
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

## Step 3: Install Prometheus Operator

```yaml
# clusters/production/infrastructure/sources/prometheus-community.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  url: https://prometheus-community.github.io/helm-charts
  interval: 1h
```

```yaml
# clusters/production/infrastructure/controllers/kube-prometheus-stack.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: monitoring
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "56.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
  values:
    # Prometheus configuration
    prometheus:
      prometheusSpec:
        retention: 30d
        storageSpec:
          volumeClaimTemplate:
            spec:
              accessModes: ["ReadWriteOnce"]
              resources:
                requests:
                  storage: 50Gi
        # Enable service monitor auto-discovery
        serviceMonitorSelectorNilUsesHelmValues: false
        podMonitorSelectorNilUsesHelmValues: false
    # Grafana configuration
    grafana:
      adminPassword:
        existingSecret: grafana-admin
        key: password
      persistence:
        enabled: true
        size: 10Gi
    # AlertManager configuration
    alertmanager:
      alertmanagerSpec:
        storage:
          volumeClaimTemplate:
            spec:
              accessModes: ["ReadWriteOnce"]
              resources:
                requests:
                  storage: 10Gi
  install:
    createNamespace: true
    crds: Create
    remediation:
      retries: 5
  upgrade:
    crds: CreateReplace
    remediation:
      retries: 5
  # Long timeout due to the size of this chart
  timeout: 15m
```

## Step 4: Managing CRDs Separately

For operators where you want fine-grained control over CRD updates, manage CRDs separately from the operator itself.

```yaml
# clusters/production/infrastructure/controllers/cert-manager-crds.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager-crds
  namespace: flux-system
spec:
  interval: 30m
  path: ./infrastructure/cert-manager/crds
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
```

```yaml
# infrastructure/cert-manager/crds/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  # Download CRDs from the cert-manager release
  - https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.crds.yaml
```

```yaml
# clusters/production/infrastructure/controllers/cert-manager.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: cert-manager
  chart:
    spec:
      chart: cert-manager
      version: "v1.14.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
  values:
    # Do NOT install CRDs via Helm since we manage them separately
    installCRDs: false
  install:
    createNamespace: true
    # Skip CRD management in HelmRelease
    crds: Skip
    remediation:
      retries: 3
  upgrade:
    crds: Skip
    remediation:
      retries: 3
```

## Step 5: Dependency Ordering for Operators

Operators often depend on each other. Use Flux dependencies to enforce installation order.

```yaml
# clusters/production/infrastructure/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure-sources
  namespace: flux-system
spec:
  interval: 30m
  path: ./clusters/production/infrastructure/sources
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure-controllers
  namespace: flux-system
spec:
  interval: 30m
  path: ./clusters/production/infrastructure/controllers
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Controllers depend on sources being available
  dependsOn:
    - name: infrastructure-sources
  wait: true
  timeout: 20m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure-configs
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/infrastructure/configs
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Configs depend on controllers being ready
  # (CRDs must exist before custom resources can be created)
  dependsOn:
    - name: infrastructure-controllers
  wait: true
  timeout: 10m
```

## Step 6: Install the Postgres Operator

```yaml
# clusters/production/infrastructure/sources/zalando.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: postgres-operator-charts
  namespace: flux-system
spec:
  url: https://opensource.zalando.com/postgres-operator/charts/postgres-operator
  interval: 1h
```

```yaml
# clusters/production/infrastructure/controllers/postgres-operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: postgres-operator
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: postgres-operator
  chart:
    spec:
      chart: postgres-operator
      version: "1.12.x"
      sourceRef:
        kind: HelmRepository
        name: postgres-operator-charts
  values:
    configKubernetes:
      # Enable pod disruption budgets
      enable_pod_disruption_budget: true
    configAwsOrGcp:
      # Configure S3 for WAL backups
      wal_s3_bucket: "my-postgres-backups"
      aws_region: "us-east-1"
    configGeneral:
      # Minimum number of instances for HA
      min_instances: 2
      max_instances: 10
  install:
    createNamespace: true
    crds: Create
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    remediation:
      retries: 3
```

Then create PostgreSQL clusters using the operator's CRDs:

```yaml
# infrastructure/postgres/my-database.yaml
apiVersion: acid.zalan.do/v1
kind: postgresql
metadata:
  name: my-app-db
  namespace: production
spec:
  teamId: "my-team"
  volume:
    size: 50Gi
    storageClass: gp3
  numberOfInstances: 3
  users:
    app_user:
      - superuser
      - createdb
    readonly_user: []
  databases:
    my_app_db: app_user
  postgresql:
    version: "16"
    parameters:
      max_connections: "200"
      shared_buffers: "1GB"
      work_mem: "16MB"
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2
      memory: 4Gi
```

## Step 7: Operator Upgrade Strategy

Upgrading operators requires extra care due to CRD changes.

```yaml
# Strategy 1: Pin to minor versions and upgrade incrementally
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  chart:
    spec:
      chart: cert-manager
      # Pin to patch version range within a minor version
      version: "v1.14.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
```

```bash
# Strategy 2: Test upgrades in staging first
# 1. Update the version in staging cluster path
# clusters/staging/infrastructure/controllers/cert-manager.yaml
#   version: "v1.15.x"

# 2. Verify in staging
flux get helmrelease cert-manager --context staging
kubectl get pods -n cert-manager --context staging

# 3. Test that existing certificates still work
kubectl get certificates -A --context staging

# 4. After validation, update production
# clusters/production/infrastructure/controllers/cert-manager.yaml
#   version: "v1.15.x"
```

## Step 8: Monitoring Operators

Create ServiceMonitors for operator controllers.

```yaml
# infrastructure/monitoring/operator-monitors.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cert-manager
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  namespaceSelector:
    matchNames:
      - cert-manager
  selector:
    matchLabels:
      app.kubernetes.io/name: cert-manager
  endpoints:
    - port: http-metrics
      interval: 30s
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-system
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  namespaceSelector:
    matchNames:
      - flux-system
  selector:
    matchLabels:
      app: source-controller
  endpoints:
    - port: http-prom
      interval: 30s
```

## Step 9: Multi-Cluster Operator Management

Manage the same operators across multiple clusters with different configurations.

```yaml
# clusters/staging/infrastructure/controllers/cert-manager.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: cert-manager
  chart:
    spec:
      chart: cert-manager
      # Staging can run a newer version for testing
      version: "v1.15.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
  values:
    installCRDs: true
    # Staging uses fewer resources
    resources:
      requests:
        cpu: 25m
        memory: 64Mi
    # Use staging Let's Encrypt
    replicaCount: 1
  install:
    createNamespace: true
    crds: Create
  upgrade:
    crds: CreateReplace
```

```yaml
# clusters/production/infrastructure/controllers/cert-manager.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: cert-manager
  chart:
    spec:
      chart: cert-manager
      # Production runs the proven version
      version: "v1.14.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
  values:
    installCRDs: true
    # Production uses more resources and replicas
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
    replicaCount: 2
    # Enable high availability
    webhook:
      replicaCount: 2
  install:
    createNamespace: true
    crds: Create
  upgrade:
    crds: CreateReplace
```

## Step 10: Alerting on Operator Health

```yaml
# clusters/production/notifications/operator-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: operator-health
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    # Monitor all operator HelmReleases
    - kind: HelmRelease
      name: cert-manager
    - kind: HelmRelease
      name: kube-prometheus-stack
    - kind: HelmRelease
      name: postgres-operator
    # Monitor operator configuration Kustomizations
    - kind: Kustomization
      name: infrastructure-configs
  summary: "Operator installation or configuration issue detected"
```

## Summary

Managing Kubernetes Operators with Flux CD involves installing operators via HelmRelease resources with proper CRD handling, creating operator custom resources through dependent Kustomizations, enforcing installation ordering with dependency chains, handling CRD upgrades carefully with the `crds` field in HelmRelease, testing operator upgrades in staging before production, and monitoring operator health with alerts. The key pattern is separating operators into three layers: sources, controllers, and configs, with each layer depending on the previous one.
