# Automate ArgoCD Backup with Kubernetes CronJob

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Backup, Automation

Description: Learn how to automate ArgoCD configuration backups using Kubernetes CronJobs, covering application definitions, projects, repositories, and disaster recovery strategies.

---

Losing your ArgoCD configuration is not something you want to discover the hard way. Applications, projects, repository credentials, RBAC policies, and notification settings represent a significant investment in configuration. While the beauty of GitOps is that your application manifests live in Git, the ArgoCD configuration itself - the glue that connects everything - also needs protection.

This guide shows you how to set up automated backups of your ArgoCD instance using Kubernetes CronJobs.

## What Needs to Be Backed Up

ArgoCD stores its configuration in several places:

- **Application resources** - the Application and ApplicationSet custom resources
- **AppProject resources** - project definitions with RBAC and resource restrictions
- **Repository credentials** - stored in Secrets in the argocd namespace
- **ConfigMaps** - argocd-cm, argocd-rbac-cm, argocd-cmd-params-cm
- **Secrets** - argocd-secret, argocd-notifications-secret
- **SSH known hosts** - argocd-ssh-known-hosts-cm
- **TLS certificates** - argocd-tls-certs-cm

## The Backup Script

First, create a ConfigMap containing the backup script:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-backup-script
  namespace: argocd
data:
  backup.sh: |
    #!/bin/bash
    set -euo pipefail

    BACKUP_DIR="/backups/argocd-$(date +%Y%m%d-%H%M%S)"
    NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"
    RETENTION_DAYS="${RETENTION_DAYS:-30}"

    echo "Starting ArgoCD backup to ${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}"

    # Backup Application resources
    echo "Backing up Applications..."
    kubectl get applications -n "${NAMESPACE}" -o yaml > "${BACKUP_DIR}/applications.yaml"

    # Backup ApplicationSet resources
    echo "Backing up ApplicationSets..."
    kubectl get applicationsets -n "${NAMESPACE}" -o yaml > "${BACKUP_DIR}/applicationsets.yaml" 2>/dev/null || echo "No ApplicationSets found"

    # Backup AppProject resources
    echo "Backing up AppProjects..."
    kubectl get appprojects -n "${NAMESPACE}" -o yaml > "${BACKUP_DIR}/appprojects.yaml"

    # Backup ConfigMaps
    echo "Backing up ConfigMaps..."
    for cm in argocd-cm argocd-rbac-cm argocd-cmd-params-cm argocd-ssh-known-hosts-cm argocd-tls-certs-cm argocd-notifications-cm; do
      kubectl get configmap "${cm}" -n "${NAMESPACE}" -o yaml > "${BACKUP_DIR}/${cm}.yaml" 2>/dev/null || echo "ConfigMap ${cm} not found, skipping"
    done

    # Backup Secrets (sensitive - handle carefully)
    echo "Backing up Secrets..."
    for secret in argocd-secret argocd-notifications-secret; do
      kubectl get secret "${secret}" -n "${NAMESPACE}" -o yaml > "${BACKUP_DIR}/${secret}.yaml" 2>/dev/null || echo "Secret ${secret} not found, skipping"
    done

    # Backup repository credentials
    echo "Backing up repository credentials..."
    kubectl get secrets -n "${NAMESPACE}" -l argocd.argoproj.io/secret-type=repository -o yaml > "${BACKUP_DIR}/repo-creds.yaml"

    # Backup cluster secrets
    echo "Backing up cluster secrets..."
    kubectl get secrets -n "${NAMESPACE}" -l argocd.argoproj.io/secret-type=cluster -o yaml > "${BACKUP_DIR}/cluster-secrets.yaml"

    # Backup repo credential templates
    echo "Backing up credential templates..."
    kubectl get secrets -n "${NAMESPACE}" -l argocd.argoproj.io/secret-type=repo-creds -o yaml > "${BACKUP_DIR}/repo-cred-templates.yaml"

    # Create a tarball
    echo "Creating archive..."
    cd /backups
    tar -czf "argocd-$(date +%Y%m%d-%H%M%S).tar.gz" "$(basename ${BACKUP_DIR})"
    rm -rf "${BACKUP_DIR}"

    # Clean up old backups
    echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find /backups -name "argocd-*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete

    echo "Backup complete"
    ls -lh /backups/argocd-*.tar.gz | tail -5
```

## PersistentVolumeClaim for Backups

Create a PVC to store the backups:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: argocd-backups
  namespace: argocd
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
```

## ServiceAccount and RBAC

The CronJob needs permissions to read ArgoCD resources:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-backup
  namespace: argocd
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: argocd-backup
  namespace: argocd
rules:
  # Read Applications and ApplicationSets
  - apiGroups: ["argoproj.io"]
    resources: ["applications", "applicationsets", "appprojects"]
    verbs: ["get", "list"]
  # Read ConfigMaps and Secrets
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: argocd-backup
  namespace: argocd
subjects:
  - kind: ServiceAccount
    name: argocd-backup
    namespace: argocd
roleRef:
  kind: Role
  name: argocd-backup
  apiGroup: rbac.authorization.k8s.io
```

## The CronJob

Now bring it all together with a CronJob that runs daily at 2 AM:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-backup
  namespace: argocd
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 600
      template:
        metadata:
          labels:
            app: argocd-backup
        spec:
          serviceAccountName: argocd-backup
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: bitnami/kubectl:1.28
              command: ["/bin/bash", "/scripts/backup.sh"]
              env:
                - name: ARGOCD_NAMESPACE
                  value: "argocd"
                - name: RETENTION_DAYS
                  value: "30"
              volumeMounts:
                - name: backup-script
                  mountPath: /scripts
                - name: backup-storage
                  mountPath: /backups
              resources:
                requests:
                  memory: "128Mi"
                  cpu: "100m"
                limits:
                  memory: "256Mi"
                  cpu: "200m"
          volumes:
            - name: backup-script
              configMap:
                name: argocd-backup-script
                defaultMode: 0755
            - name: backup-storage
              persistentVolumeClaim:
                claimName: argocd-backups
```

## Uploading Backups to S3

For off-cluster storage, extend the script to push backups to S3:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-backup-s3-script
  namespace: argocd
data:
  backup-s3.sh: |
    #!/bin/bash
    set -euo pipefail

    BACKUP_FILE="argocd-$(date +%Y%m%d-%H%M%S).tar.gz"
    TEMP_DIR=$(mktemp -d)
    NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"
    S3_BUCKET="${S3_BUCKET:?S3_BUCKET is required}"
    S3_PREFIX="${S3_PREFIX:-argocd-backups}"

    echo "Starting ArgoCD backup..."

    # Export all resources
    kubectl get applications -n "${NAMESPACE}" -o yaml > "${TEMP_DIR}/applications.yaml"
    kubectl get applicationsets -n "${NAMESPACE}" -o yaml > "${TEMP_DIR}/applicationsets.yaml" 2>/dev/null || true
    kubectl get appprojects -n "${NAMESPACE}" -o yaml > "${TEMP_DIR}/appprojects.yaml"

    for cm in argocd-cm argocd-rbac-cm argocd-cmd-params-cm argocd-ssh-known-hosts-cm argocd-tls-certs-cm argocd-notifications-cm; do
      kubectl get configmap "${cm}" -n "${NAMESPACE}" -o yaml > "${TEMP_DIR}/${cm}.yaml" 2>/dev/null || true
    done

    for secret in argocd-secret argocd-notifications-secret; do
      kubectl get secret "${secret}" -n "${NAMESPACE}" -o yaml > "${TEMP_DIR}/${secret}.yaml" 2>/dev/null || true
    done

    kubectl get secrets -n "${NAMESPACE}" -l argocd.argoproj.io/secret-type=repository -o yaml > "${TEMP_DIR}/repo-creds.yaml"
    kubectl get secrets -n "${NAMESPACE}" -l argocd.argoproj.io/secret-type=cluster -o yaml > "${TEMP_DIR}/cluster-secrets.yaml"

    # Create archive and upload
    cd "${TEMP_DIR}"
    tar -czf "/tmp/${BACKUP_FILE}" .
    aws s3 cp "/tmp/${BACKUP_FILE}" "s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}"

    # Clean up old backups in S3 (keep 30 days)
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | while read -r line; do
      file_date=$(echo "${line}" | awk '{print $1}')
      file_name=$(echo "${line}" | awk '{print $4}')
      if [[ $(date -d "${file_date}" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "${file_date}" +%s) -lt $(date -d "-30 days" +%s 2>/dev/null || date -v-30d +%s) ]]; then
        aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${file_name}"
      fi
    done

    echo "Backup uploaded to s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}"
    rm -rf "${TEMP_DIR}" "/tmp/${BACKUP_FILE}"
```

## Restore Procedure

Having backups is only useful if you can restore from them. Here is a restore script:

```bash
#!/bin/bash
# restore-argocd.sh - Restore ArgoCD from backup
set -euo pipefail

BACKUP_FILE="${1:?Usage: $0 <backup-file.tar.gz>}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"
RESTORE_DIR=$(mktemp -d)

echo "Extracting backup..."
tar -xzf "${BACKUP_FILE}" -C "${RESTORE_DIR}"

echo "Restoring ConfigMaps..."
for f in "${RESTORE_DIR}"/argocd-*-cm.yaml "${RESTORE_DIR}"/argocd-cm.yaml; do
  [[ -f "$f" ]] && kubectl apply -f "$f" -n "${NAMESPACE}"
done

echo "Restoring Secrets..."
for f in "${RESTORE_DIR}"/*secret*.yaml "${RESTORE_DIR}"/repo-creds.yaml "${RESTORE_DIR}"/cluster-secrets.yaml; do
  [[ -f "$f" ]] && kubectl apply -f "$f" -n "${NAMESPACE}"
done

echo "Restoring AppProjects..."
kubectl apply -f "${RESTORE_DIR}/appprojects.yaml" -n "${NAMESPACE}"

echo "Restoring Applications..."
kubectl apply -f "${RESTORE_DIR}/applications.yaml" -n "${NAMESPACE}"

echo "Restoring ApplicationSets..."
[[ -f "${RESTORE_DIR}/applicationsets.yaml" ]] && kubectl apply -f "${RESTORE_DIR}/applicationsets.yaml" -n "${NAMESPACE}"

echo "Restore complete. Restart ArgoCD to pick up config changes:"
echo "  kubectl rollout restart deployment -n ${NAMESPACE}"

rm -rf "${RESTORE_DIR}"
```

## Monitoring Backup Jobs

Set up alerts for failed backup jobs to ensure you know when backups stop working:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-backup-alerts
  namespace: argocd
spec:
  groups:
    - name: argocd-backup
      rules:
        - alert: ArgoCDBackupFailed
          expr: |
            kube_job_status_failed{namespace="argocd", job_name=~"argocd-backup.*"} > 0
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD backup job failed"
            description: "The ArgoCD backup CronJob has failed. Check the job logs."
```

You can also monitor backup health with [OneUptime](https://oneuptime.com) to get notified immediately when backup jobs fail.

## Summary

Automated backups are a critical part of running ArgoCD in production. By using Kubernetes CronJobs, you get a native, reliable scheduling mechanism that runs directly in your cluster. The combination of local PVC storage for quick restores and S3 uploads for disaster recovery gives you a robust backup strategy. Test your restore procedure regularly - a backup you have never restored from is a backup you cannot trust.
