# How to Manage Helm Releases in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Helm, DevOps, Management

Description: Learn how to view, upgrade, rollback, and delete Helm releases in Portainer to manage the full lifecycle of Helm-deployed applications on Kubernetes.

## Introduction

Once you deploy applications via Helm in Portainer, managing their lifecycle - upgrades, rollbacks, and uninstalls - is equally important. Portainer lets you manage Helm-deployed applications from the **Applications** view, giving you a centralized overview and the tools to manage them without leaving the UI.

## Prerequisites

- Portainer CE or BE with a Kubernetes environment
- At least one Helm release deployed
- Admin or Namespace Operator access

## Step 1: View All Helm Releases

1. Log into Portainer.
2. Select your **Kubernetes** environment.
3. Click **Applications** in the sidebar.

From the applications list, you can filter by namespace and select the Helm application you want to manage.

## Step 2: Inspect a Helm Release

Click a Helm application name to see:
- **Deployment details**: Name, namespace, revision, chart source, app version, chart version, and last deployment date
- **Values**: The raw values currently set on the deployment
- **Resources** and **Events**: Kubernetes resources created by the release and their related events
- **Manifest** and **Notes**: The deployed manifest and any chart notes, with diff options between revisions

From the Portainer API:

```bash
TOKEN=$(curl -s -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r '.jwt')

# List all Helm releases in a namespace

curl -s -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/1/kubernetes/helm?namespace=production" | jq .

# Get details of a specific release
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/1/kubernetes/helm/my-nginx?namespace=production&showResources=true" | jq .
```

## Step 3: Upgrade a Helm Release

### Via Portainer UI

1. In **Applications**, click the Helm release you want to upgrade.
2. Click **Edit/Upgrade**.
3. If the application was deployed from a Helm repository, select a new chart version from the **Chart version** dropdown.
4. Modify values as needed in the YAML editor.
5. Click **Edit/Upgrade** to apply.

### Via kubectl shell

```bash
# Upgrade with new values
helm upgrade my-nginx bitnami/nginx \
  --namespace production \
  --set replicaCount=3 \
  --reuse-values  # Preserve all other values

# Upgrade to a specific chart version
helm upgrade my-nginx bitnami/nginx \
  --namespace production \
  --version <chart-version> \
  --reuse-values

# Upgrade with a values file
helm upgrade my-nginx bitnami/nginx \
  --namespace production \
  -f new-values.yaml

# Dry run to preview changes
helm upgrade my-nginx bitnami/nginx \
  --namespace production \
  --dry-run \
  --reuse-values
```

## Step 4: Rollback a Helm Release

If an upgrade causes issues, roll back to a previous revision:

### Via Portainer UI

1. Click the release name.
2. In the **Revisions** panel, select a previous revision.
3. Click **Rollback**.

### Via kubectl shell

```bash
# View release history
helm history my-nginx -n production

# Output:
# REVISION  UPDATED                   STATUS      CHART                           DESCRIPTION
# 1         2026-03-18 10:00:00 UTC   superseded  nginx-<previous-chart-version>  Install complete
# 2         2026-03-20 14:30:00 UTC   deployed    nginx-<current-chart-version>   Upgrade complete

# Rollback to revision 1
helm rollback my-nginx 1 -n production

# Rollback to the immediately previous revision
helm rollback my-nginx -n production
```

## Step 5: Uninstall a Helm Release

### Via Portainer UI

1. In **Applications**, check the checkbox next to the release.
2. Click **Remove**.
3. Confirm deletion.

### Via kubectl shell

```bash
# Uninstall (removes all Kubernetes resources created by the release)
helm uninstall my-nginx -n production

# Uninstall and wait for resource deletion
helm uninstall my-nginx -n production --wait

# Uninstall but keep history
helm uninstall my-nginx -n production --keep-history
```

## Step 6: Monitor Release Health

```bash
# Check if all pods are running after a deployment
kubectl get pods -n production -l app.kubernetes.io/instance=my-nginx

# Watch rollout status
kubectl rollout status deployment/my-nginx -n production

# Get release notes
helm get notes my-nginx -n production

# Get all rendered YAML for the release
helm get manifest my-nginx -n production

# Check for failed hooks
helm get hooks my-nginx -n production
```

## Step 7: Managing Releases Across Namespaces

```bash
# List releases in all namespaces
helm list --all-namespaces

# List only failed releases
helm list --failed --all-namespaces

# Filter by chart name
helm list --filter 'nginx' --all-namespaces
```

## Conclusion

Managing Helm releases in Portainer gives you a visual interface for the full chart lifecycle, from initial deployment through upgrades and rollbacks to clean uninstallation. Use the Portainer UI for quick inspection and management, and the kubectl shell for advanced operations like rollbacks and history review. Always test upgrades in staging before applying to production, and keep release history intact to enable rapid rollbacks when issues arise.
