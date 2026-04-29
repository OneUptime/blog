# How to Migrate from Lens to Rancher Dashboard - Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Lens, Kubernetes, Cluster Management, DevOps

Description: Learn how to transition from Lens IDE to the Rancher Dashboard for Kubernetes cluster management, leveraging Rancher's multi-cluster and team-oriented features.

## Introduction

Lens is a popular desktop application for Kubernetes cluster management. Rancher offers a web-based alternative with added team collaboration features, multi-cluster management, and built-in GitOps capabilities. This guide covers migrating your workflows from Lens to the Rancher Dashboard.

## Lens vs. Rancher Dashboard Comparison

| Feature | Lens | Rancher |
|---|---|---|
| Interface | Desktop app | Web UI |
| Multi-cluster | Yes | Yes |
| Team access | Per-user desktop | Centralized web UI |
| Helm charts | Extension required | Built-in catalog |
| Monitoring | Basic (requires setup) | Prometheus + Grafana |
| GitOps | No | Fleet |
| RBAC management | View only | Full management |
| Audit logging | No | Yes |

## Step 1: Identify Clusters Managed in Lens

In Lens, go to the **Catalog** to list all connected clusters. Export kubeconfigs for each:

```bash
# List all contexts

kubectl config get-contexts

# Export kubeconfig for a specific context
kubectl config view --minify --flatten \
  --context=my-cluster > my-cluster-kubeconfig.yaml
```

## Step 2: Install Rancher

If Rancher is not already installed, deploy it:

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher.yourdomain.com \
  --set bootstrapPassword=ChangeMeNow!
```

## Step 3: Add Clusters to Rancher

For each cluster managed in Lens, import it into Rancher:

1. Navigate to **Cluster Management** > **Import Existing**.
2. Select **Generic** and name the cluster.
3. Run the provided command against the cluster:

```bash
kubectl apply -f https://rancher.yourdomain.com/v3/import/token.yaml
```

## Step 4: Replicate Lens Workflows in Rancher

### Viewing Workloads

In Lens: Left sidebar > Workloads > Pods/Deployments
In Rancher: Cluster > **Workloads** > Deployments/Pods

Both display pod status, restarts, and resource usage.

### Accessing Pod Logs

In Lens: Click pod > Logs tab
In Rancher: Workloads > Pods > Click pod name > **View Logs**

### Opening Pod Shell

In Lens: Click pod > Terminal tab
In Rancher: Workloads > Pods > Click pod name > **Execute Shell**

### Port Forwarding

Lens has built-in port forwarding. In Rancher, use the Rancher CLI:

```bash
# Install Rancher CLI (replace version as needed)
RANCHER_CLI_VERSION=v2.14.0
curl -LO https://github.com/rancher/cli/releases/download/${RANCHER_CLI_VERSION}/rancher-linux-amd64-${RANCHER_CLI_VERSION}.tar.gz
tar -xzf rancher-linux-amd64-${RANCHER_CLI_VERSION}.tar.gz
sudo mv rancher-${RANCHER_CLI_VERSION}/rancher /usr/local/bin/rancher

# Login
rancher login https://rancher.yourdomain.com --token your-api-token

# Port forward (via kubectl via Rancher)
kubectl port-forward pod/mypod 8080:8080 -n production
```

### Helm Releases

In Lens: Apps > Helm Releases
In Rancher: Cluster > **Apps** > **Installed Apps**

Rancher also provides the App Catalog (Charts) to deploy new Helm charts directly from the UI.

## Step 5: Migrate Namespace Views

Lens shows namespaces in the sidebar. In Rancher:
- Create **Projects** to group namespaces logically.
- Assign team members to Projects for scoped access.

```bash
# Create project via Rancher API or UI
# In UI: Cluster > Projects/Namespaces > Create Project
```

## Step 6: Set Up Team Access

Rancher's web-based access means team members don't need local kubeconfig files:

1. **Cluster Management** > **Users & Authentication** > **Users** > Add users.
2. Configure identity provider (GitHub, LDAP, OIDC) for SSO.
3. Assign cluster roles under **Cluster** > **Members**.

## Best Practices

- Run Rancher and Lens in parallel during the transition period.
- Use Rancher Projects to replicate the namespace groupings your team used in Lens.
- Enable Rancher Monitoring for built-in dashboards that Lens required extensions for.
- Train your team on Rancher's Fleet for GitOps workflows as a Lens replacement for resource editing.

## Conclusion

Migrating from Lens to Rancher Dashboard shifts cluster management from individual desktop tools to a centralized, team-friendly web platform. The core workflows - viewing workloads, accessing logs, running exec shells - all have direct equivalents, with Rancher adding significant value in multi-cluster management and team collaboration.
