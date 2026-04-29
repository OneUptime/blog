# How to Migrate from Kubernetes Dashboard to Rancher - Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes Dashboard, Migration, Cluster Management, DevOps

Description: Learn how to transition from the standalone Kubernetes Dashboard to Rancher as your primary cluster management UI, gaining enhanced visibility and multi-cluster support.

## Introduction

The Kubernetes Dashboard provides a basic web UI for single-cluster management, but it is deprecated and unmaintained. Rancher extends this significantly with multi-cluster support, RBAC management, application catalogs, monitoring integration, and a far richer user experience. Migrating to Rancher as your primary management plane requires minimal disruption to running workloads.

## Why Migrate from Kubernetes Dashboard to Rancher

| Feature | Kubernetes Dashboard | Rancher |
|---|---|---|
| Multi-cluster management | No | Yes |
| RBAC management UI | Basic | Advanced |
| App catalog / Helm | No | Yes |
| Monitoring integration | Basic metrics view | Prometheus + Grafana |
| GitOps (Fleet) | No | Yes |
| Cost visibility | No | Via add-ons |
| Alerting | No | Yes |

## Step 1: Install Rancher

Deploy Rancher using Helm on an existing cluster. If you use Rancher-generated or Let's Encrypt certificates, install cert-manager first:

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo add jetstack https://charts.jetstack.io
helm repo update

kubectl create namespace cattle-system

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.example.com \
  --set bootstrapPassword=admin
```

## Step 2: Import Your Existing Cluster

If Rancher is installed on a separate cluster, import your target cluster:

1. In Rancher, navigate to **Cluster Management** > **Import Existing**.
2. Select **Generic** and provide a name.
3. Copy the kubectl command shown and run it against your cluster using a kubeconfig context with cluster-admin privileges:

```bash
kubectl apply -f https://rancher.example.com/v3/import/xxxxx.yaml
```

The cluster will appear in Rancher within a few minutes.

## Step 3: Explore the Rancher Dashboard Equivalent Features

### Workload View

In Rancher, navigate to your cluster > **Workloads** to view:
- Deployments, StatefulSets, DaemonSets, Jobs, CronJobs
- Pod status, restarts, and logs
- Resource utilization

This replaces the Kubernetes Dashboard workloads view with added filtering and bulk operations.

### Pod Logs and Shell

Click any pod in Rancher > **Pods**, then:
- Click the **Logs** icon to stream logs.
- Click the **Shell** icon to open an exec shell.

These replace the equivalent features in Kubernetes Dashboard.

Resource Editing

Rancher provides an inline YAML editor for all resources:
1. Select any resource.
2. Click **Edit YAML** to modify it.
3. Click **Save** to apply changes.

## Step 4: Recreate Dashboard RBAC in Rancher

If you used Kubernetes Dashboard with bearer-token access, migrate users to Rancher's RBAC:

```yaml
# In Rancher: Cluster > Cluster Members > Add

# Or use the Rancher API:
apiVersion: management.cattle.io/v3
kind: ClusterRoleTemplateBinding
metadata:
  name: developer-view
  namespace: c-m-xxxxx
clusterName: c-m-xxxxx
roleTemplateName: cluster-member
userPrincipalName: "local://u-xxxxx"
```

Rancher provides predefined cluster roles such as Owner and Member, plus custom roles.

## Step 5: Disable the Kubernetes Dashboard

Once Rancher is your primary UI, remove the Kubernetes Dashboard to reduce attack surface:

```bash
helm uninstall kubernetes-dashboard -n kubernetes-dashboard
```

If you need to remove the namespace afterward:

```bash
kubectl delete namespace kubernetes-dashboard
```

## Step 6: Set Up Monitoring (Optional but Recommended)

Enable Rancher Monitoring to replace any dashboard metrics:

1. In Rancher, navigate to your cluster > **Apps** > **Charts**.
2. Search for **Monitoring** and click **Install**.
3. Accept the defaults or configure alert receivers.

This deploys Prometheus + Grafana with pre-built Kubernetes dashboards.

## Best Practices

- Introduce Rancher alongside the Dashboard initially, giving teams time to migrate workflows.
- Set up SSO (Active Directory, GitHub, or OIDC) in Rancher for centralized user management.
- Use Rancher projects to replicate namespace groupings from your Dashboard workflows.
- Configure Rancher's audit logging to capture all management actions.

## Conclusion

Migrating from the Kubernetes Dashboard to Rancher upgrades your cluster management experience from a basic single-cluster UI to a comprehensive multi-cluster management platform. The transition is non-disruptive to running workloads and provides immediate benefits in visibility, security, and operational capability.
