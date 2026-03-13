# How to Use ArtifactGenerator with HelmChart Sources in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, kubernetes, gitops, artifactgenerator, helm, helmchart

Description: Learn how to use the Flux ArtifactGenerator to combine Helm chart sources with custom manifests for enhanced Kubernetes deployments.

---

## Introduction

Helm charts are widely used for packaging Kubernetes applications, but production deployments often require additional manifests that sit alongside the chart: custom resource definitions, monitoring configurations, or supplementary services. The Flux ArtifactGenerator lets you combine HelmChart sources with other sources, creating unified artifacts that include both the Helm chart content and your additional manifests.

This guide shows you how to configure ArtifactGenerators that reference HelmChart sources, combine them with Git-based configurations, and deploy the result through Flux Kustomizations.

## Prerequisites

- A Kubernetes cluster running Flux v2.4 or later
- The Flux Operator with ArtifactGenerator CRD installed
- A Helm repository or OCI-based Helm chart
- `kubectl`, `flux`, and `helm` CLI tools

## Understanding HelmChart Sources

In Flux, a HelmChart source fetches a Helm chart from a HelmRepository or an OCIRepository and makes it available as an artifact. The ArtifactGenerator can reference this artifact to extract rendered templates or chart content and combine it with other sources.

## Step 1: Define a HelmRepository and HelmChart

Set up the Helm source:

```yaml
# helm-sources.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.bitnami.com/bitnami
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: postgresql
  namespace: flux-system
spec:
  interval: 10m
  chart: postgresql
  version: "15.x"
  sourceRef:
    kind: HelmRepository
    name: bitnami
  reconcileStrategy: ChartVersion
```

```bash
kubectl apply -f helm-sources.yaml
```

Verify the chart is fetched:

```bash
kubectl get helmchart -n flux-system postgresql
```

## Step 2: Create Supplementary Configuration in Git

Maintain additional configurations in a Git repository that complement the Helm chart:

```yaml
# In your git repo: supplements/postgresql/
# monitoring.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: postgresql-metrics
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: postgresql
  endpoints:
    - port: metrics
      interval: 30s
---
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgresql-backup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:15
              command:
                - /bin/sh
                - -c
                - pg_dump -h postgresql -U postgres mydb > /backup/dump.sql
              volumeMounts:
                - name: backup-storage
                  mountPath: /backup
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: postgresql-backup-pvc
          restartPolicy: OnFailure
```

Create the GitRepository source:

```yaml
# git-supplements.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: deployment-supplements
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/your-org/deployment-supplements
  ref:
    branch: main
```

```bash
kubectl apply -f git-supplements.yaml
```

## Step 3: Combine HelmChart and Git Sources

Create an ArtifactGenerator that merges the Helm chart content with supplementary manifests:

```yaml
# pg-combined-artifact.yaml
apiVersion: generators.fluxcd.io/v1
kind: ArtifactGenerator
metadata:
  name: postgresql-complete
  namespace: flux-system
spec:
  interval: 10m
  inputs:
    - name: chart
      sourceRef:
        kind: HelmChart
        name: postgresql
      path: "./"
      targetPath: "./chart"
    - name: monitoring
      sourceRef:
        kind: GitRepository
        name: deployment-supplements
      path: "./supplements/postgresql"
      targetPath: "./extras"
  output:
    artifact:
      path: "./"
```

```bash
kubectl apply -f pg-combined-artifact.yaml
```

## Step 4: Deploy Using HelmRelease and Kustomization

Use a HelmRelease for the chart itself and a Kustomization for the supplementary manifests, both sourced from the combined artifact:

```yaml
# pg-deployment.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: postgresql
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: postgresql
      version: "15.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
  values:
    auth:
      postgresPassword: "${POSTGRES_PASSWORD}"
      database: mydb
    metrics:
      enabled: true
      serviceMonitor:
        enabled: false  # We manage this separately
    primary:
      persistence:
        size: 50Gi
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: postgresql-extras
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ArtifactGenerator
    name: postgresql-complete
  path: "./extras"
  prune: true
  targetNamespace: database
  dependsOn:
    - name: postgresql
```

```bash
kubectl apply -f pg-deployment.yaml
```

## Step 5: Multi-Chart Composition

For complex stacks, combine multiple Helm charts with shared configuration:

```yaml
# stack-artifact.yaml
apiVersion: generators.fluxcd.io/v1
kind: ArtifactGenerator
metadata:
  name: observability-stack
  namespace: flux-system
spec:
  interval: 15m
  inputs:
    - name: prometheus-chart
      sourceRef:
        kind: HelmChart
        name: kube-prometheus-stack
      path: "./"
      targetPath: "./charts/prometheus"
    - name: loki-chart
      sourceRef:
        kind: HelmChart
        name: loki
      path: "./"
      targetPath: "./charts/loki"
    - name: dashboards
      sourceRef:
        kind: GitRepository
        name: deployment-supplements
      path: "./observability/dashboards"
      targetPath: "./dashboards"
    - name: alerting-rules
      sourceRef:
        kind: GitRepository
        name: deployment-supplements
      path: "./observability/alerts"
      targetPath: "./alerts"
  output:
    artifact:
      path: "./"
```

## Verification

Verify the combined artifact is generated:

```bash
kubectl get artifactgenerator -n flux-system postgresql-complete
kubectl describe artifactgenerator -n flux-system postgresql-complete
```

Check that the supplementary resources are deployed:

```bash
kubectl get servicemonitor -n database postgresql-metrics
kubectl get cronjob -n database postgresql-backup
```

## Conclusion

The ArtifactGenerator with HelmChart sources bridges the gap between Helm-based deployments and custom Kubernetes manifests. By combining chart content with supplementary configurations from Git, you can maintain clean separation between upstream charts and your operational additions like monitoring, backups, and custom resources. This pattern is especially useful for platform teams that need to augment third-party Helm charts with organization-specific operational tooling without forking the charts.
