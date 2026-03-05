# How to Export and Import ArgoCD Application State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Backup, State Management

Description: Learn how to export and import ArgoCD application definitions, projects, repository configs, and cluster registrations for backup, migration, and disaster recovery scenarios.

---

Being able to export and import ArgoCD application state is essential for backups, disaster recovery, environment cloning, and migrations. ArgoCD stores its state as Kubernetes Custom Resources and Secrets, making it straightforward to export with standard tools. But there are nuances around credential handling, status fields, and import ordering that you need to get right.

This post provides practical scripts and patterns for exporting and importing ArgoCD state reliably.

## What to Export

ArgoCD's state is distributed across several resource types. Here is the complete inventory.

| Resource Type | Description | Contains Secrets? |
|---|---|---|
| Application | Application definitions | No |
| ApplicationSet | Dynamic app generators | No |
| AppProject | Project configurations | No |
| Secret (repository) | Git/Helm repo credentials | Yes |
| Secret (repo-creds) | Credential templates | Yes |
| Secret (cluster) | Cluster registrations + tokens | Yes |
| ConfigMap (argocd-cm) | Core configuration | Possibly (OIDC secrets) |
| ConfigMap (argocd-rbac-cm) | RBAC policies | No |
| ConfigMap (argocd-cmd-params-cm) | Runtime parameters | No |
| ConfigMap (argocd-notifications-cm) | Notification config | No |
| Secret (argocd-notifications-secret) | Notification credentials | Yes |

## Export Script

Here is a comprehensive export script that handles all resource types and sanitizes cluster-specific metadata.

```bash
#!/bin/bash
# export-argocd.sh
# Exports all ArgoCD state to a directory
set -euo pipefail

EXPORT_DIR="${1:-argocd-export-$(date +%Y%m%d-%H%M%S)}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

mkdir -p "$EXPORT_DIR"/{applications,applicationsets,projects,repos,clusters,config}

echo "Exporting ArgoCD state from namespace: $NAMESPACE"
echo "Export directory: $EXPORT_DIR"

# Function to clean metadata from exported resources
clean_metadata() {
  yq eval 'del(
    .metadata.resourceVersion,
    .metadata.uid,
    .metadata.generation,
    .metadata.creationTimestamp,
    .metadata.managedFields,
    .metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]
  )' -
}

# Export Applications (one file per app)
echo "Exporting Applications..."
APP_COUNT=0
for app in $(kubectl get applications -n "$NAMESPACE" -o name 2>/dev/null); do
  name=$(echo "$app" | cut -d/ -f2)
  kubectl get "$app" -n "$NAMESPACE" -o yaml | \
    yq eval 'del(.status)' - | \
    clean_metadata > "$EXPORT_DIR/applications/${name}.yaml"
  APP_COUNT=$((APP_COUNT + 1))
done
echo "  Exported $APP_COUNT applications"

# Export ApplicationSets
echo "Exporting ApplicationSets..."
APPSET_COUNT=0
for appset in $(kubectl get applicationsets -n "$NAMESPACE" -o name 2>/dev/null); do
  name=$(echo "$appset" | cut -d/ -f2)
  kubectl get "$appset" -n "$NAMESPACE" -o yaml | \
    yq eval 'del(.status)' - | \
    clean_metadata > "$EXPORT_DIR/applicationsets/${name}.yaml"
  APPSET_COUNT=$((APPSET_COUNT + 1))
done
echo "  Exported $APPSET_COUNT applicationsets"

# Export AppProjects
echo "Exporting AppProjects..."
PROJ_COUNT=0
for proj in $(kubectl get appprojects -n "$NAMESPACE" -o name 2>/dev/null); do
  name=$(echo "$proj" | cut -d/ -f2)
  # Skip the default project unless it has been customized
  if [ "$name" = "default" ]; then
    spec=$(kubectl get "$proj" -n "$NAMESPACE" -o jsonpath='{.spec}')
    if [ "$spec" = '{"clusterResourceWhitelist":[{"group":"*","kind":"*"}],"destinations":[{"namespace":"*","server":"*"}],"sourceRepos":["*"]}' ]; then
      continue
    fi
  fi
  kubectl get "$proj" -n "$NAMESPACE" -o yaml | \
    yq eval 'del(.status)' - | \
    clean_metadata > "$EXPORT_DIR/projects/${name}.yaml"
  PROJ_COUNT=$((PROJ_COUNT + 1))
done
echo "  Exported $PROJ_COUNT projects"

# Export Repository Secrets
echo "Exporting Repository credentials..."
REPO_COUNT=0
for secret in $(kubectl get secrets -n "$NAMESPACE" -l argocd.argoproj.io/secret-type=repository -o name 2>/dev/null); do
  name=$(echo "$secret" | cut -d/ -f2)
  kubectl get "$secret" -n "$NAMESPACE" -o yaml | \
    clean_metadata > "$EXPORT_DIR/repos/${name}.yaml"
  REPO_COUNT=$((REPO_COUNT + 1))
done
echo "  Exported $REPO_COUNT repository secrets"

# Export Credential Templates
for secret in $(kubectl get secrets -n "$NAMESPACE" -l argocd.argoproj.io/secret-type=repo-creds -o name 2>/dev/null); do
  name=$(echo "$secret" | cut -d/ -f2)
  kubectl get "$secret" -n "$NAMESPACE" -o yaml | \
    clean_metadata > "$EXPORT_DIR/repos/creds-${name}.yaml"
done

# Export Cluster Secrets
echo "Exporting Cluster registrations..."
CLUSTER_COUNT=0
for secret in $(kubectl get secrets -n "$NAMESPACE" -l argocd.argoproj.io/secret-type=cluster -o name 2>/dev/null); do
  name=$(echo "$secret" | cut -d/ -f2)
  kubectl get "$secret" -n "$NAMESPACE" -o yaml | \
    clean_metadata > "$EXPORT_DIR/clusters/${name}.yaml"
  CLUSTER_COUNT=$((CLUSTER_COUNT + 1))
done
echo "  Exported $CLUSTER_COUNT cluster secrets"

# Export ConfigMaps
echo "Exporting ConfigMaps..."
for cm in argocd-cm argocd-rbac-cm argocd-cmd-params-cm argocd-notifications-cm \
          argocd-ssh-known-hosts-cm argocd-tls-certs-cm argocd-gpg-keys-cm; do
  if kubectl get configmap "$cm" -n "$NAMESPACE" &>/dev/null; then
    kubectl get configmap "$cm" -n "$NAMESPACE" -o yaml | \
      clean_metadata > "$EXPORT_DIR/config/${cm}.yaml"
  fi
done

# Export Notification Secrets
if kubectl get secret argocd-notifications-secret -n "$NAMESPACE" &>/dev/null; then
  kubectl get secret argocd-notifications-secret -n "$NAMESPACE" -o yaml | \
    clean_metadata > "$EXPORT_DIR/config/argocd-notifications-secret.yaml"
fi

echo ""
echo "Export complete!"
echo "  Applications:    $APP_COUNT"
echo "  ApplicationSets: $APPSET_COUNT"
echo "  Projects:        $PROJ_COUNT"
echo "  Repositories:    $REPO_COUNT"
echo "  Clusters:        $CLUSTER_COUNT"
echo ""
echo "WARNING: Export contains secrets (repo credentials, cluster tokens)."
echo "         Store securely and encrypt before transmitting."
```

## Import Script

The import script applies resources in the correct order: config first, then credentials, then projects, then applications.

```bash
#!/bin/bash
# import-argocd.sh
# Imports ArgoCD state from an export directory
set -euo pipefail

IMPORT_DIR="${1:?Usage: $0 <export-directory>}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

if [ ! -d "$IMPORT_DIR" ]; then
  echo "Error: Directory $IMPORT_DIR does not exist"
  exit 1
fi

echo "Importing ArgoCD state from: $IMPORT_DIR"
echo "Target namespace: $NAMESPACE"

# Step 1: Import ConfigMaps
echo ""
echo "--- Step 1: Importing ConfigMaps ---"
for cm in "$IMPORT_DIR"/config/argocd-*.yaml; do
  if [ -f "$cm" ]; then
    name=$(basename "$cm" .yaml)
    echo "  Applying $name"
    kubectl apply -f "$cm" -n "$NAMESPACE"
  fi
done

# Restart ArgoCD to pick up configuration changes
echo "  Restarting ArgoCD components..."
kubectl rollout restart deployment -n "$NAMESPACE" \
  argocd-server argocd-application-controller argocd-repo-server 2>/dev/null || true
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/part-of=argocd \
  -n "$NAMESPACE" --timeout=300s

# Step 2: Import Repository Credentials
echo ""
echo "--- Step 2: Importing Repository Credentials ---"
for repo in "$IMPORT_DIR"/repos/*.yaml; do
  if [ -f "$repo" ]; then
    name=$(basename "$repo" .yaml)
    echo "  Applying $name"
    kubectl apply -f "$repo" -n "$NAMESPACE"
  fi
done

# Step 3: Import Cluster Registrations
echo ""
echo "--- Step 3: Importing Cluster Registrations ---"
for cluster in "$IMPORT_DIR"/clusters/*.yaml; do
  if [ -f "$cluster" ]; then
    name=$(basename "$cluster" .yaml)
    echo "  Applying $name"
    kubectl apply -f "$cluster" -n "$NAMESPACE"
  fi
done

# Wait a moment for cluster connectivity to establish
sleep 10

# Step 4: Import AppProjects
echo ""
echo "--- Step 4: Importing AppProjects ---"
for proj in "$IMPORT_DIR"/projects/*.yaml; do
  if [ -f "$proj" ]; then
    name=$(basename "$proj" .yaml)
    echo "  Applying $name"
    kubectl apply -f "$proj" -n "$NAMESPACE"
  fi
done

# Step 5: Import ApplicationSets (before individual apps)
echo ""
echo "--- Step 5: Importing ApplicationSets ---"
for appset in "$IMPORT_DIR"/applicationsets/*.yaml; do
  if [ -f "$appset" ]; then
    name=$(basename "$appset" .yaml)
    echo "  Applying $name"
    kubectl apply -f "$appset" -n "$NAMESPACE"
  fi
done

# Step 6: Import Applications
echo ""
echo "--- Step 6: Importing Applications ---"
APP_COUNT=0
FAIL_COUNT=0
for app in "$IMPORT_DIR"/applications/*.yaml; do
  if [ -f "$app" ]; then
    name=$(basename "$app" .yaml)
    if kubectl apply -f "$app" -n "$NAMESPACE" 2>/dev/null; then
      APP_COUNT=$((APP_COUNT + 1))
    else
      echo "  FAILED: $name"
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
  fi
done
echo "  Imported $APP_COUNT applications ($FAIL_COUNT failures)"

# Step 7: Verify
echo ""
echo "--- Step 7: Verification ---"
echo "Applications: $(kubectl get applications -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)"
echo "Projects: $(kubectl get appprojects -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)"
echo "Clusters: $(argocd cluster list 2>/dev/null | tail -n +2 | wc -l || echo 'N/A')"
echo ""
echo "Import complete. Run 'argocd app list' to verify application status."
```

## Selective Export

Sometimes you only need to export specific applications or projects.

```bash
# Export applications matching a label
kubectl get applications -n argocd -l team=backend -o yaml | \
  yq eval 'del(.items[].status, .items[].metadata.resourceVersion, .items[].metadata.uid)' - \
  > backend-apps-export.yaml

# Export applications in a specific project
argocd app list -p production -o json | \
  jq '[.[] | {apiVersion: "argoproj.io/v1alpha1", kind: "Application", metadata: {name: .metadata.name, namespace: "argocd"}, spec: .spec}]' \
  > production-apps-export.json

# Export a single application
kubectl get application my-web-app -n argocd -o yaml | \
  yq eval 'del(.status, .metadata.resourceVersion, .metadata.uid, .metadata.creationTimestamp, .metadata.managedFields, .metadata.generation)' - \
  > my-web-app-export.yaml
```

## Automated Backups with CronJob

Set up automated exports as a Kubernetes CronJob.

```yaml
# argocd-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-state-backup
  namespace: argocd
spec:
  schedule: "0 */4 * * *"  # Every 4 hours
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-backup
          containers:
            - name: backup
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  BACKUP_DIR="/backups/$(date +%Y%m%d-%H%M%S)"
                  mkdir -p "$BACKUP_DIR"

                  # Export all ArgoCD resources
                  kubectl get applications -n argocd -o yaml > "$BACKUP_DIR/applications.yaml"
                  kubectl get applicationsets -n argocd -o yaml > "$BACKUP_DIR/applicationsets.yaml" || true
                  kubectl get appprojects -n argocd -o yaml > "$BACKUP_DIR/projects.yaml"
                  kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type -o yaml > "$BACKUP_DIR/secrets.yaml"
                  kubectl get configmap argocd-cm argocd-rbac-cm argocd-cmd-params-cm -n argocd -o yaml > "$BACKUP_DIR/configmaps.yaml"

                  # Clean up old backups (keep last 7 days)
                  find /backups -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;

                  echo "Backup complete: $BACKUP_DIR"
                  ls -la "$BACKUP_DIR"
              volumeMounts:
                - name: backup-storage
                  mountPath: /backups
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: argocd-backups
          restartPolicy: OnFailure
---
# RBAC for the backup job
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
  - apiGroups: ["argoproj.io"]
    resources: ["applications", "applicationsets", "appprojects"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["secrets", "configmaps"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: argocd-backup
  namespace: argocd
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: argocd-backup
subjects:
  - kind: ServiceAccount
    name: argocd-backup
    namespace: argocd
```

## Handling Credentials Securely

Exported state contains sensitive credentials. Encrypt the export before storing or transmitting.

```bash
# Encrypt the export directory using age (or GPG)
tar czf argocd-export.tar.gz argocd-export/
age -r age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p \
  argocd-export.tar.gz > argocd-export.tar.gz.age

# Decrypt for import
age -d -i key.txt argocd-export.tar.gz.age > argocd-export.tar.gz
tar xzf argocd-export.tar.gz
```

For storing in cloud storage, use server-side encryption.

```bash
# Upload to S3 with server-side encryption
aws s3 cp argocd-export.tar.gz.age \
  s3://company-backups/argocd/ \
  --sse aws:kms \
  --sse-kms-key-id alias/backup-key
```

## Wrapping Up

Exporting and importing ArgoCD state is a fundamental operational capability. The export script captures all resource types in the correct format, the import script applies them in dependency order, and the CronJob ensures regular backups. Key principles to remember: always strip status fields and cluster-specific metadata during export, import in the right order (config, credentials, projects, then applications), encrypt exports that contain credentials, and test your import process regularly before you need it in an emergency. For related disaster recovery topics, see [how to rebuild ArgoCD state from scratch](https://oneuptime.com/blog/post/2026-02-26-how-to-rebuild-argocd-state-from-scratch/view).
