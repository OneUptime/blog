# How to Add Custom Helm Chart Repositories in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Helm, App Catalog

Description: Learn how to add custom Helm chart repositories in Rancher to access your organization's private charts and third-party chart collections.

Rancher ships with several default Helm chart repositories, but most organizations need to add custom repositories for private charts, partner solutions, or popular open-source chart collections. This guide shows you how to add, configure, and manage custom Helm chart repositories in Rancher.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster registered in Rancher
- Permissions to manage repositories in the target cluster
- The URL of the Helm chart repository you want to add

## Understanding Repository Types

Rancher supports three types of Helm repositories:

1. **HTTP/HTTPS repositories**: Traditional Helm repositories served over HTTP, containing an `index.yaml` file that lists all available charts. Examples include Bitnami, Jetstack, and Grafana repositories.

2. **Git repositories**: Charts stored in a Git repository. Rancher clones the repo and indexes the Helm charts it finds in the repository.

3. **OCI repositories**: Helm charts stored as OCI artifacts in a container registry. OCI-based chart repositories are supported in Rancher v2.9.0 and later.

## Step 1: Add a Repository via the Rancher UI

### Navigate to Repositories

In the Rancher dashboard, select your cluster and go to **Apps > Repositories** from the left sidebar.

### Add a New Repository

Click the **Create** button and fill in the details:

- **Name**: A unique identifier for the repository (e.g., `bitnami`)
- **Target**: Select **HTTP(S)**, **Git**, or **OCI Repository** (`OCI Repository` is available in Rancher v2.9.0 and later)

### For HTTP/HTTPS Repositories

- **Index URL**: Enter the repository URL (e.g., `https://charts.bitnami.com/bitnami`)

Common repository URLs:

| Repository | URL |
|-----------|-----|
| Bitnami | `https://charts.bitnami.com/bitnami` |
| Jetstack (cert-manager) | `https://charts.jetstack.io` |
| Grafana | `https://grafana.github.io/helm-charts` |
| Prometheus Community | `https://prometheus-community.github.io/helm-charts` |
| Ingress NGINX | `https://kubernetes.github.io/ingress-nginx` |
| HashiCorp | `https://helm.releases.hashicorp.com` |

### For OCI Repositories

- **OCI Repository Host URL**: Enter the OCI URL (e.g., `oci://registry.example.com/charts`)
- The endpoint should contain only OCI Helm chart artifacts

### For Git Repositories

- **Git Repo URL**: Enter the Git repository URL (e.g., `https://github.com/my-org/helm-charts.git`)
- **Git Branch**: Specify a branch, or leave it blank to use the repository's default branch

### Authentication for Private Repositories

If the repository requires authentication, configure credentials:

**For HTTP/HTTPS repositories**:

1. Check **Authentication** and select **Basic Auth**
2. Enter **Username** and **Password**, or create a Secret reference

**For Git repositories**:

1. Check **Authentication**
2. Choose between:
   - **Basic Auth**: Username and password/token
   - **SSH Key**: For SSH-based Git URLs

**For OCI repositories**:

1. Check **Authentication**
2. Provide registry credentials with a username and password/token

Click **Create** to add the repository.

## Step 2: Add a Repository via YAML

You can also create a ClusterRepo resource directly:

```yaml
apiVersion: catalog.cattle.io/v1
kind: ClusterRepo
metadata:
  name: bitnami
spec:
  url: https://charts.bitnami.com/bitnami
```

For a repository with basic auth:

```yaml
apiVersion: catalog.cattle.io/v1
kind: ClusterRepo
metadata:
  name: private-charts
spec:
  url: https://charts.example.com/private
  clientSecret:
    name: private-charts-credentials
    namespace: cattle-system
---
apiVersion: v1
kind: Secret
metadata:
  name: private-charts-credentials
  namespace: cattle-system
type: kubernetes.io/basic-auth
stringData:
  username: chart-reader
  password: mytoken123
```

For a Git-based repository:

```yaml
apiVersion: catalog.cattle.io/v1
kind: ClusterRepo
metadata:
  name: my-org-charts
spec:
  gitRepo: https://github.com/my-org/helm-charts.git
  gitBranch: main
```

## Step 3: Verify the Repository

After adding the repository:

1. Go to **Apps > Repositories** to see the new repository listed
2. Check the **State** column - it should show **Active** once Rancher has downloaded the repository
3. Navigate to **Apps > Charts** and use the filter to select your new repository
4. You should see charts from the new repository

If the status shows an error:

- Check the repository URL is correct and accessible
- Verify authentication credentials if the repository is private
- Check network connectivity from the Rancher server to the repository host

## Step 4: Configure Repository Refresh Interval

Rancher refreshes the repository index periodically. In Rancher v2.10.0 and later, you can configure the refresh interval in seconds via YAML:

```yaml
apiVersion: catalog.cattle.io/v1
kind: ClusterRepo
metadata:
  name: bitnami
spec:
  url: https://charts.bitnami.com/bitnami
  refreshInterval: 3600
```

To manually force a refresh:

1. Go to **Apps > Repositories**
2. Click the three-dot menu next to the repository
3. Select **Refresh**

## Managing Repositories

### Edit a Repository

1. Go to **Apps > Repositories**
2. Click the three-dot menu next to the repository
3. Select **Edit Config**
4. Update the URL, credentials, or other settings
5. Click **Save**

### Delete a Repository

1. Go to **Apps > Repositories**
2. Click the three-dot menu next to the repository
3. Select **Delete**
4. Confirm the deletion

Deleting a repository does not uninstall charts that were deployed from it. Existing releases continue to run, but you will not be able to upgrade them from that repository until it is re-added.

### Disable a Repository

In Rancher v2.10.0 and later, you can temporarily disable a repository:

1. Edit the repository
2. Set the **Enabled** field to `false`

## Repository Scope

Rancher uses the cluster-scoped `ClusterRepo` resource for custom repositories. Repositories you add in **Apps > Repositories** are available in that cluster; Rancher does not use a namespace-scoped `Repo` resource for this feature.

## Hosting Your Own Helm Repository

If you need to host a private Helm repository, you have several options:

### Using ChartMuseum

```bash
helm repo add chartmuseum https://chartmuseum.github.io/charts
helm install chartmuseum chartmuseum/chartmuseum \
  --set env.open.STORAGE=local \
  --set persistence.enabled=true
```

### Using a Static File Server

Generate a chart index and serve it with nginx or a cloud storage bucket:

```bash
helm package my-chart/
helm repo index . --url https://charts.example.com
# Upload index.yaml and .tgz files to your web server

```

## Summary

Adding custom Helm chart repositories in Rancher expands your application deployment options beyond the default charts. Rancher supports HTTP/HTTPS, Git-based, and OCI-based repositories, with authentication for private repositories. Whether you are integrating popular open-source chart collections or your organization's private charts, the process is straightforward through the Rancher UI or YAML-based `ClusterRepo` resources.
