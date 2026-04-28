# How to Back Up NeuVector Configuration - Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Backup, Disaster Recovery, Configuration Management, Kubernetes

Description: Implement a complete backup strategy for NeuVector configuration including policies, users, RBAC settings, and system configuration.

## Introduction

Backing up NeuVector configuration is critical for disaster recovery and ensuring policy continuity. NeuVector's configuration includes security policies, user accounts, RBAC settings, scanner configurations, and system settings. This guide covers complete backup and restore procedures for production NeuVector deployments.

## What to Back Up

A complete NeuVector backup should include:

- Security policies (network rules, process profiles, file access rules)
- Groups and their policy modes
- User accounts and RBAC assignments
- Admission control rules
- Response rules
- WAF and DLP sensors
- System configuration (syslog, webhooks, password policy)
- Scanner/registry configurations
- Kubernetes CRDs

## Prerequisites

- NeuVector installed with persistent storage
- Admin access to NeuVector
- `kubectl` access to the cluster
- Storage destination for backups (S3, NFS, etc.)

## Step 1: Enable Persistent Storage

Ensure NeuVector's controller uses persistent storage:

```yaml
# Verify PVC is attached to controller

apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: neuvector-data
  namespace: neuvector
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 5Gi
```

```bash
# Verify PVC is bound
kubectl get pvc -n neuvector
```

## Step 2: Export All Policies via API

```bash
#!/bin/bash
# neuvector-backup.sh

NV_URL="https://neuvector-manager:8443"
BACKUP_DIR="/backups/neuvector/$(date +%Y-%m-%d)"
mkdir -p "${BACKUP_DIR}"

# Authenticate
TOKEN=$(curl -sk -X POST \
  "${NV_URL}/v1/auth" \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"yourpassword"}}' \
  | jq -r '.token.token')

echo "Starting NeuVector backup to ${BACKUP_DIR}..."

# System configuration
curl -sk "${NV_URL}/v1/system/config" \
  -H "X-Auth-Token: ${TOKEN}" > "${BACKUP_DIR}/system-config.json"
echo "✓ System config backed up"

# Users
curl -sk "${NV_URL}/v1/user" \
  -H "X-Auth-Token: ${TOKEN}" > "${BACKUP_DIR}/users.json"
echo "✓ Users backed up"

# Groups
curl -sk "${NV_URL}/v1/group?start=0&limit=500" \
  -H "X-Auth-Token: ${TOKEN}" > "${BACKUP_DIR}/groups.json"
echo "✓ Groups backed up"

# Network policy rules
curl -sk "${NV_URL}/v1/policy/rule?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" > "${BACKUP_DIR}/policy-rules.json"
echo "✓ Network policy rules backed up"

# Process profiles
curl -sk "${NV_URL}/v1/process_profile" \
  -H "X-Auth-Token: ${TOKEN}" > "${BACKUP_DIR}/process-profiles.json"
echo "✓ Process profiles backed up"

# Admission control rules
curl -sk "${NV_URL}/v1/admission/rule?start=0&limit=500" \
  -H "X-Auth-Token: ${TOKEN}" > "${BACKUP_DIR}/admission-rules.json"
echo "✓ Admission rules backed up"

# Response rules
curl -sk "${NV_URL}/v1/response/rule?start=0&limit=200" \
  -H "X-Auth-Token: ${TOKEN}" > "${BACKUP_DIR}/response-rules.json"
echo "✓ Response rules backed up"

# WAF sensors
curl -sk "${NV_URL}/v1/waf/sensor" \
  -H "X-Auth-Token: ${TOKEN}" > "${BACKUP_DIR}/waf-sensors.json"
echo "✓ WAF sensors backed up"

# DLP sensors
curl -sk "${NV_URL}/v1/dlp/sensor" \
  -H "X-Auth-Token: ${TOKEN}" > "${BACKUP_DIR}/dlp-sensors.json"
echo "✓ DLP sensors backed up"

# Registry configurations (exclude passwords)
curl -sk "${NV_URL}/v1/scan/registry" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq 'del(.registries[].config.password) | del(.registries[].config.secret_access_key)' \
  > "${BACKUP_DIR}/registries.json"
echo "✓ Registry configs backed up (passwords excluded)"

# Webhooks (extracted from the system config response)
jq '.config.webhooks' "${BACKUP_DIR}/system-config.json" > "${BACKUP_DIR}/webhooks.json"
echo "✓ Webhooks backed up"

# Compliance custom checks
curl -sk "${NV_URL}/v1/custom_check" \
  -H "X-Auth-Token: ${TOKEN}" > "${BACKUP_DIR}/custom-checks.json"
echo "✓ Custom checks backed up"

echo ""
echo "Backup complete: ${BACKUP_DIR}"
ls -la "${BACKUP_DIR}"
```

## Step 3: Export Kubernetes CRDs

```bash
#!/bin/bash
# backup-crds.sh

BACKUP_DIR="/backups/neuvector/$(date +%Y-%m-%d)/crds"
mkdir -p "${BACKUP_DIR}"

# Export all NeuVector CRDs
RESOURCES=(
  "nvsecurityrules"
  "nvclustersecurityrules"
  "nvadmissioncontrolsecurityrules"
  "nvdlpsecurityrules"
  "nvwafsecurityrules"
)

for RESOURCE in "${RESOURCES[@]}"; do
  echo "Backing up ${RESOURCE}..."
  kubectl get "${RESOURCE}" -A -o yaml 2>/dev/null \
    > "${BACKUP_DIR}/${RESOURCE}.yaml" || echo "  Skipped: no resources found"
done

echo "CRD backup complete"
```

## Step 4: Create a Scheduled Backup CronJob

```yaml
# neuvector-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: neuvector-config-backup
  namespace: neuvector
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: neuvector-backup
          containers:
            - name: backup
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  DATE=$(date +%Y-%m-%d)
                  BACKUP_PATH="/backups/neuvector/${DATE}"
                  mkdir -p "${BACKUP_PATH}"

                  # Export CRDs
                  kubectl get nvsecurityrules -A -o yaml > "${BACKUP_PATH}/security-rules.yaml"
                  kubectl get nvclustersecurityrules -o yaml > "${BACKUP_PATH}/cluster-rules.yaml"
                  kubectl get nvadmissioncontrolsecurityrules -o yaml > "${BACKUP_PATH}/admission-rules.yaml"

                  # Compress backup
                  tar -czf "/backups/neuvector-backup-${DATE}.tar.gz" \
                    -C /backups/neuvector "${DATE}"

                  # Clean up old backups (keep 30 days)
                  find /backups -name "neuvector-backup-*.tar.gz" -mtime +30 -delete

                  echo "Backup completed: neuvector-backup-${DATE}.tar.gz"
              volumeMounts:
                - name: backup-storage
                  mountPath: /backups
          restartPolicy: OnFailure
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: neuvector-backup-pvc
```

## Step 5: Restore Configuration

```bash
#!/bin/bash
# neuvector-restore.sh

BACKUP_DIR="/backups/neuvector/2026-03-20"

NV_URL="https://neuvector-manager:8443"
TOKEN=$(curl -sk -X POST "${NV_URL}/v1/auth" \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"newpassword"}}' \
  | jq -r '.token.token')

echo "Starting restore from ${BACKUP_DIR}..."

# Restore system configuration
SYSTEM_CONFIG=$(cat "${BACKUP_DIR}/system-config.json" | jq '.config')
curl -sk -X PATCH "${NV_URL}/v1/system/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d "{\"config\": ${SYSTEM_CONFIG}}"

echo "✓ System config restored"

# Restore via CRDs (preferred method)
kubectl apply -f "${BACKUP_DIR}/crds/"
echo "✓ CRD-based policies restored"
```

## Step 6: Verify Backup Integrity

```bash
# Verify backup files are complete and valid JSON
for FILE in "${BACKUP_DIR}"/*.json; do
  if jq empty "$FILE" 2>/dev/null; then
    echo "✓ Valid: $FILE"
  else
    echo "✗ Invalid: $FILE"
  fi
done
```

## Conclusion

A comprehensive NeuVector backup strategy protects your security configuration investment and enables rapid recovery from cluster failures. By combining CRD exports (for GitOps-compatible policy storage) with API-based configuration exports, and scheduling daily automated backups, you ensure that your NeuVector security posture can be fully restored in any disaster recovery scenario.
