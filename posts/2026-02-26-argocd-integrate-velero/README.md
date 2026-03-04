# How to Integrate ArgoCD with Velero for Backup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Velero, Backups

Description: Learn how to integrate ArgoCD with Velero to implement GitOps-managed backup strategies, automated backup schedules, disaster recovery workflows, and pre-deployment backup hooks.

---

Velero is the standard tool for backing up and restoring Kubernetes clusters. When managed through ArgoCD, your backup configuration becomes part of your GitOps workflow - version-controlled, auditable, and consistently applied across environments. This guide covers deploying Velero through ArgoCD, configuring automated backups, and implementing pre-deployment backup strategies.

## Why Manage Velero with ArgoCD

Managing Velero through ArgoCD gives you several benefits:

- **Consistent backup policies** across all clusters managed by ArgoCD
- **Version-controlled backup schedules** that go through PR review
- **Automated deployment** of backup infrastructure alongside applications
- **Pre-sync hooks** that back up applications before deploying changes
- **Disaster recovery** where Git serves as the source of truth for both applications and backup policies

## Deploying Velero with ArgoCD

Install Velero using its Helm chart through an ArgoCD application:

```yaml
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
    targetRevision: 5.2.0
    helm:
      values: |
        # AWS S3 backend configuration
        configuration:
          backupStorageLocation:
            - name: default
              provider: aws
              bucket: my-velero-backups
              config:
                region: us-east-1
          volumeSnapshotLocation:
            - name: default
              provider: aws
              config:
                region: us-east-1
        credentials:
          useSecret: true
          secretContents:
            cloud: |
              [default]
              aws_access_key_id=${AWS_ACCESS_KEY_ID}
              aws_secret_access_key=${AWS_SECRET_ACCESS_KEY}
        initContainers:
          - name: velero-plugin-for-aws
            image: velero/velero-plugin-for-aws:v1.8.0
            volumeMounts:
              - name: plugins
                mountPath: /target
        schedules:
          daily-backup:
            disabled: false
            schedule: "0 2 * * *"
            template:
              ttl: "720h"
              includedNamespaces:
                - production
                - staging
              storageLocation: default
              volumeSnapshotLocations:
                - default
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            memory: 512Mi
  destination:
    server: https://kubernetes.default.svc
    namespace: velero
  syncPolicy:
    automated:
      prune: true
    syncOptions:
      - CreateNamespace=true
```

For GCP or Azure backends, adjust the configuration accordingly:

```yaml
# GCP configuration
configuration:
  backupStorageLocation:
    - name: default
      provider: gcp
      bucket: my-velero-backups
      config:
        serviceAccount: velero@my-project.iam.gserviceaccount.com

# Azure configuration
configuration:
  backupStorageLocation:
    - name: default
      provider: azure
      bucket: velero-backups
      config:
        resourceGroup: my-rg
        storageAccount: myvelerobackups
```

## Managing Backup Schedules in Git

Store backup schedules as Kubernetes resources in your GitOps repository:

```yaml
# Git: backup-config/schedules/production-daily.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: production-daily
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    ttl: "720h"  # Keep backups for 30 days
    includedNamespaces:
      - production
    labelSelector:
      matchExpressions:
        - key: backup
          operator: NotIn
          values:
            - "false"
    storageLocation: default
    volumeSnapshotLocations:
      - default
    hooks:
      resources:
        - name: freeze-db
          includedNamespaces:
            - production
          labelSelector:
            matchLabels:
              app: postgresql
          pre:
            - exec:
                container: postgresql
                command:
                  - /bin/bash
                  - -c
                  - "pg_dump -U postgres mydb > /tmp/pre-backup.sql"
                onError: Fail
                timeout: 120s

---
# Git: backup-config/schedules/staging-weekly.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: staging-weekly
  namespace: velero
spec:
  schedule: "0 4 * * 0"  # Sunday at 4 AM
  template:
    ttl: "168h"  # Keep for 7 days
    includedNamespaces:
      - staging
    storageLocation: default

---
# Git: backup-config/schedules/cluster-config-hourly.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: cluster-config-hourly
  namespace: velero
spec:
  schedule: "0 * * * *"
  template:
    ttl: "48h"
    includedResources:
      - configmaps
      - secrets
      - serviceaccounts
      - clusterroles
      - clusterrolebindings
    excludedNamespaces:
      - kube-system
    storageLocation: default
```

Deploy these through ArgoCD:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backup-schedules
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "1"  # After Velero is installed
spec:
  project: infrastructure
  source:
    repoURL: https://github.com/my-org/platform-config.git
    targetRevision: main
    path: backup-config/schedules
  destination:
    server: https://kubernetes.default.svc
    namespace: velero
  syncPolicy:
    automated:
      prune: true
```

## Pre-Deployment Backups with ArgoCD Hooks

Create a backup before ArgoCD deploys changes using a PreSync hook:

```yaml
# Git: my-app/k8s/pre-sync-backup.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pre-deploy-backup
  namespace: velero
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      serviceAccountName: velero-hook
      containers:
        - name: velero-backup
          image: bitnami/kubectl:latest
          command: [sh, -c]
          args:
            - |
              # Create a backup before deployment
              BACKUP_NAME="pre-deploy-$(date +%Y%m%d-%H%M%S)"

              cat <<BACKUP_EOF | kubectl apply -f -
              apiVersion: velero.io/v1
              kind: Backup
              metadata:
                name: ${BACKUP_NAME}
                namespace: velero
                labels:
                  type: pre-deploy
                  app: my-app
              spec:
                includedNamespaces:
                  - my-app-namespace
                ttl: 168h
                storageLocation: default
              BACKUP_EOF

              # Wait for backup to complete
              echo "Waiting for backup ${BACKUP_NAME} to complete..."
              while true; do
                PHASE=$(kubectl get backup ${BACKUP_NAME} -n velero -o jsonpath='{.status.phase}')
                if [ "$PHASE" = "Completed" ]; then
                  echo "Backup completed successfully"
                  exit 0
                elif [ "$PHASE" = "Failed" ] || [ "$PHASE" = "PartiallyFailed" ]; then
                  echo "Backup failed with phase: ${PHASE}"
                  exit 1
                fi
                sleep 5
              done
      restartPolicy: Never
  backoffLimit: 1
```

## Custom Health Checks for Velero Resources

Tell ArgoCD how to assess the health of Velero resources:

```yaml
# argocd-cm ConfigMap
data:
  resource.customizations.health.velero.io_BackupStorageLocation: |
    hs = {}
    if obj.status ~= nil and obj.status.phase ~= nil then
      if obj.status.phase == "Available" then
        hs.status = "Healthy"
        hs.message = "Backup storage location is available"
      elseif obj.status.phase == "Unavailable" then
        hs.status = "Degraded"
        hs.message = "Backup storage location is unavailable"
      else
        hs.status = "Progressing"
        hs.message = obj.status.phase
      end
    else
      hs.status = "Progressing"
      hs.message = "Waiting for status"
    end
    return hs

  resource.customizations.health.velero.io_Schedule: |
    hs = {}
    if obj.status ~= nil and obj.status.phase ~= nil then
      if obj.status.phase == "Enabled" then
        hs.status = "Healthy"
        hs.message = "Schedule is enabled"
      elseif obj.status.phase == "FailedValidation" then
        hs.status = "Degraded"
        hs.message = "Schedule validation failed"
      else
        hs.status = "Progressing"
      end
    else
      hs.status = "Healthy"
      hs.message = "Schedule created"
    end
    return hs

  resource.customizations.ignoreDifferences.velero.io_Schedule: |
    jsonPointers:
      - /status

  resource.customizations.ignoreDifferences.velero.io_BackupStorageLocation: |
    jsonPointers:
      - /status
```

## Disaster Recovery with ArgoCD and Velero

In a disaster recovery scenario, you can restore a cluster and then let ArgoCD reconcile:

```bash
# Step 1: Install Velero on the new cluster
velero install --provider aws --bucket my-velero-backups --secret-file ./credentials

# Step 2: Restore the ArgoCD namespace first
velero restore create argocd-restore --from-backup daily-backup \
  --include-namespaces argocd

# Step 3: Wait for ArgoCD to come up
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=300s

# Step 4: ArgoCD will automatically sync all applications from Git
# Or manually trigger restoration of specific namespaces
velero restore create full-restore --from-backup daily-backup
```

The beauty of this approach is that ArgoCD provides the application-level recovery (from Git), while Velero provides the data-level recovery (PVCs, secrets, etc.).

## Monitoring Backup Health with ArgoCD

Set up ArgoCD notifications for backup failures:

```yaml
# In argocd-notifications-cm
trigger.on-velero-backup-failed: |
  - when: >
      app.metadata.name == 'velero' and
      app.status.health.status == 'Degraded'
    send: [velero-alert]

template.velero-alert: |
  message: "Velero backup infrastructure is degraded. Check backup storage locations and schedules."
  slack:
    attachments: |
      [{"color":"#E96D76","title":"Velero Health Alert"}]
```

## Best Practices

1. **Always back up before major deployments** using PreSync hooks.
2. **Test restores regularly** - backups are worthless if restores do not work.
3. **Separate backup storage from the cluster** - use a different cloud account or region.
4. **Use TTL policies** to prevent unlimited backup storage growth.
5. **Back up ArgoCD itself** so you can recover your GitOps control plane.
6. **Version backup schedules in Git** so changes go through PR review.
7. **Monitor backup storage location health** with ArgoCD health checks.

The combination of ArgoCD and Velero gives you a complete GitOps disaster recovery strategy. Git is your application source of truth, and Velero handles the stateful data that Git cannot store. For related infrastructure management, see [How to Install ArgoCD on Kubernetes](https://oneuptime.com/blog/post/2026-01-25-install-argocd-kubernetes/view).
