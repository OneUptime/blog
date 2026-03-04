# How to Manage Backup Configurations with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Backups, Disaster Recovery

Description: Learn how to manage Kubernetes backup configurations declaratively with ArgoCD, including Velero schedules, backup policies, and disaster recovery workflows through GitOps.

---

Backup configurations are one of the most critical pieces of your Kubernetes infrastructure. When managed through ArgoCD and GitOps, your backup policies become version-controlled, auditable, and reproducible across clusters. This post covers how to manage backup tools like Velero, backup schedules, retention policies, and restore procedures through ArgoCD.

## Why GitOps for Backup Configurations

Traditionally, backup schedules and policies get configured imperatively - someone runs a CLI command or clicks through a UI. The problem is that these configurations drift, get lost during cluster rebuilds, and are hard to audit. By managing backup configurations through ArgoCD, you get:

- Version history of every backup policy change
- Consistent backup configurations across all clusters
- Automatic drift detection if someone modifies backup settings manually
- Easy disaster recovery since the backup configuration itself is in Git

## Deploying Velero with ArgoCD

Velero is the most widely used backup tool for Kubernetes. Here is how to deploy it through ArgoCD using a Helm chart:

```yaml
# applications/velero.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: velero
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://vmware-tanzu.github.io/helm-charts
    chart: velero
    targetRevision: 6.0.0
    helm:
      values: |
        initContainers:
          - name: velero-plugin-for-aws
            image: velero/velero-plugin-for-aws:v1.9.0
            volumeMounts:
              - mountPath: /target
                name: plugins
        configuration:
          backupStorageLocation:
            - name: default
              provider: aws
              bucket: my-cluster-backups
              config:
                region: us-east-1
          volumeSnapshotLocation:
            - name: default
              provider: aws
              config:
                region: us-east-1
        credentials:
          useSecret: true
          existingSecret: velero-aws-credentials
        schedules: {}  # We manage schedules separately
  destination:
    server: https://kubernetes.default.svc
    namespace: velero
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - CreateNamespace=true
```

This deploys Velero itself. Notice we leave the `schedules` empty in the Helm values because we will manage backup schedules as separate Kubernetes resources in Git.

## Defining Backup Schedules

Create Velero Schedule resources in your Git repository:

```yaml
# backups/daily-full-backup.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-full-backup
  namespace: velero
  labels:
    backup-type: full
    managed-by: argocd
spec:
  schedule: "0 1 * * *"  # Daily at 1 AM UTC
  template:
    # Include all namespaces except system ones
    excludedNamespaces:
      - kube-system
      - kube-public
      - kube-node-lease
      - velero
    includedResources:
      - '*'
    storageLocation: default
    volumeSnapshotLocations:
      - default
    ttl: 720h0m0s  # 30 days retention
    snapshotVolumes: true
    defaultVolumesToFsBackup: false
    metadata:
      labels:
        backup-type: full
```

```yaml
# backups/hourly-database-backup.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: hourly-database-backup
  namespace: velero
  labels:
    backup-type: database
    managed-by: argocd
spec:
  schedule: "0 * * * *"  # Every hour
  template:
    includedNamespaces:
      - database
      - redis
    includedResources:
      - persistentvolumeclaims
      - persistentvolumes
      - secrets
      - configmaps
      - statefulsets
      - services
    storageLocation: default
    volumeSnapshotLocations:
      - default
    ttl: 168h0m0s  # 7 days retention
    snapshotVolumes: true
    metadata:
      labels:
        backup-type: database
```

These schedules are managed as regular Kubernetes resources by ArgoCD. When you push a change to the schedule (like adjusting the retention period from 30 to 60 days), ArgoCD will sync the change automatically.

## ArgoCD Application for Backup Schedules

Organize backup configurations in a dedicated ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backup-schedules
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://github.com/your-org/k8s-configs.git
    targetRevision: main
    path: backups
  destination:
    server: https://kubernetes.default.svc
    namespace: velero
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - RespectIgnoreDifferences=true
  ignoreDifferences:
    - group: velero.io
      kind: Schedule
      jsonPointers:
        - /status
```

## Namespace-Specific Backup Policies

Different applications have different backup requirements. Define per-namespace policies:

```yaml
# backups/production-apps-backup.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: production-apps-backup
  namespace: velero
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  template:
    includedNamespaces:
      - production
    labelSelector:
      matchLabels:
        backup-enabled: "true"
    storageLocation: default
    ttl: 336h0m0s  # 14 days
    snapshotVolumes: true
    hooks:
      resources:
        - name: freeze-database
          includedNamespaces:
            - production
          labelSelector:
            matchLabels:
              app: postgres
          pre:
            - exec:
                container: postgres
                command:
                  - /bin/sh
                  - -c
                  - "psql -U postgres -c 'SELECT pg_start_backup($$velero$$, true);'"
                onError: Fail
                timeout: 30s
          post:
            - exec:
                container: postgres
                command:
                  - /bin/sh
                  - -c
                  - "psql -U postgres -c 'SELECT pg_stop_backup();'"
                onError: Continue
                timeout: 30s
```

This schedule includes backup hooks that freeze the PostgreSQL database before and after the backup to ensure consistency.

## Backup Storage Location Management

You can manage multiple backup storage locations for different retention tiers or geographic redundancy:

```yaml
# backups/storage-locations/us-west-secondary.yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: us-west-secondary
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: my-cluster-backups-west
    prefix: secondary
  config:
    region: us-west-2
  accessMode: ReadWrite
```

```yaml
# backups/storage-locations/long-term-archive.yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: long-term-archive
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: my-cluster-archives
    prefix: yearly
  config:
    region: us-east-1
    s3ForcePathStyle: "true"
  accessMode: ReadWrite
```

## Multi-Cluster Backup Strategy

When using ArgoCD with ApplicationSets to manage multiple clusters, define backup configurations that automatically deploy across clusters:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: cluster-backups
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            backup-enabled: "true"
  template:
    metadata:
      name: "backups-{{name}}"
    spec:
      project: infrastructure
      source:
        repoURL: https://github.com/your-org/k8s-configs.git
        targetRevision: main
        path: "backups/{{metadata.labels.environment}}"
      destination:
        server: "{{server}}"
        namespace: velero
      syncPolicy:
        automated:
          selfHeal: true
```

This deploys the appropriate backup schedules to each cluster based on its environment label. Production clusters might get hourly backups while staging clusters get daily backups.

## Restore Procedures as Code

Document and codify your restore procedures as Velero Restore resources:

```yaml
# restore-templates/full-restore.yaml
# This file serves as a template - copy and customize for actual restores
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: restore-from-daily-YYYY-MM-DD
  namespace: velero
spec:
  backupName: daily-full-backup-YYYYMMDDHHMMSS
  includedNamespaces:
    - '*'
  excludedNamespaces:
    - velero
    - argocd  # ArgoCD should already be running
  restorePVs: true
  preserveNodePorts: true
  existingResourcePolicy: update
```

When you need to actually perform a restore, copy this template, fill in the backup name, commit to Git, and let ArgoCD apply it.

## Monitoring Backup Health

Create a monitoring job that checks backup health and reports failures:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-health-check
  namespace: velero
spec:
  schedule: "30 * * * *"  # Run 30 minutes after each hourly backup
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: velero
          containers:
            - name: check
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Check for failed backups in the last 2 hours
                  FAILED=$(kubectl get backups -n velero \
                    --sort-by=.metadata.creationTimestamp \
                    -o jsonpath='{range .items[*]}{.status.phase}{"\n"}{end}' | \
                    tail -5 | grep -c "Failed" || true)
                  if [ "$FAILED" -gt "0" ]; then
                    echo "WARNING: $FAILED recent backup(s) failed!"
                    exit 1
                  fi
                  echo "All recent backups healthy"
          restartPolicy: OnFailure
```

You can connect this with [OneUptime](https://oneuptime.com) for alerting when backup jobs fail.

## Summary

Managing backup configurations with ArgoCD transforms backups from an operational afterthought into a first-class, version-controlled part of your infrastructure. By storing Velero schedules, storage locations, and restore templates in Git, you ensure that backup policies are consistent, auditable, and survive cluster rebuilds. The combination of ArgoCD automated sync with Velero scheduled backups gives you a robust, self-healing backup pipeline that requires minimal manual intervention.
