# How to Use Artifact Registry with Helm Chart Repositories on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, Helm, Kubernetes, Chart Repository, DevOps

Description: Store and manage Helm charts in Google Artifact Registry using OCI-based registries, including pushing, pulling, and versioning your Kubernetes packages.

---

Helm charts are the standard way to package and deploy Kubernetes applications. If your team creates internal Helm charts, you need somewhere to store them. Artifact Registry supports Helm charts through its Docker repositories using the OCI (Open Container Initiative) format, which is the modern approach to Helm chart storage.

No more running ChartMuseum or maintaining a separate Helm repository server. Let me show you how to set this up.

## How Helm Charts Work with Artifact Registry

Since Helm 3, charts can be stored as OCI artifacts in any OCI-compliant registry. Artifact Registry's Docker repositories support OCI artifacts, so you can store Helm charts right alongside your container images (or in a separate repository - your choice).

## Prerequisites

Make sure you have:

- Helm 3.8 or later (OCI support was experimental before this)
- gcloud CLI installed and configured
- Docker configured for Artifact Registry authentication

```bash
# Check your Helm version
helm version

# Ensure Artifact Registry API is enabled
gcloud services enable artifactregistry.googleapis.com --project=my-project
```

## Creating a Repository for Helm Charts

You can use an existing Docker repository or create a dedicated one:

```bash
# Create a repository specifically for Helm charts
gcloud artifacts repositories create helm-charts \
  --repository-format=docker \
  --location=us-central1 \
  --description="Helm chart repository" \
  --project=my-project
```

Yes, the format is `docker` even though you are storing Helm charts. This is because Helm charts are stored as OCI artifacts, which use the same protocol as Docker images.

## Authenticating Helm with Artifact Registry

Configure Helm to authenticate with Artifact Registry using gcloud:

```bash
# Authenticate Helm via gcloud
gcloud auth print-access-token | helm registry login \
  -u oauth2accesstoken \
  --password-stdin \
  us-central1-docker.pkg.dev
```

The username is literally `oauth2accesstoken` and the password is the access token from gcloud.

For long-running sessions or CI/CD, you might want to re-authenticate periodically since tokens expire after about an hour.

## Pushing a Helm Chart

### Creating a Sample Chart

If you do not have a chart yet, create one:

```bash
# Create a new Helm chart
helm create my-app-chart

# The chart structure looks like this:
# my-app-chart/
#   Chart.yaml
#   values.yaml
#   templates/
#     deployment.yaml
#     service.yaml
#     ...
```

### Packaging the Chart

```bash
# Package the chart into a .tgz file
helm package my-app-chart

# This creates my-app-chart-0.1.0.tgz (version comes from Chart.yaml)
```

### Pushing to Artifact Registry

```bash
# Push the chart to Artifact Registry
helm push my-app-chart-0.1.0.tgz \
  oci://us-central1-docker.pkg.dev/my-project/helm-charts
```

The chart is now stored in Artifact Registry at `oci://us-central1-docker.pkg.dev/my-project/helm-charts/my-app-chart`.

## Pulling and Installing Charts

### Pulling a Chart

```bash
# Pull the chart to your local machine
helm pull oci://us-central1-docker.pkg.dev/my-project/helm-charts/my-app-chart \
  --version 0.1.0
```

### Installing Directly from Artifact Registry

```bash
# Install the chart directly from the registry
helm install my-release \
  oci://us-central1-docker.pkg.dev/my-project/helm-charts/my-app-chart \
  --version 0.1.0 \
  --namespace my-namespace \
  --create-namespace
```

### Installing with Custom Values

```bash
# Install with custom values
helm install my-release \
  oci://us-central1-docker.pkg.dev/my-project/helm-charts/my-app-chart \
  --version 0.1.0 \
  --set replicaCount=3 \
  --set image.tag=v1.2.3 \
  -f custom-values.yaml
```

## Versioning Helm Charts

Helm chart versions come from the `Chart.yaml` file:

```yaml
# Chart.yaml - Define chart metadata and version
apiVersion: v2
name: my-app-chart
description: A Helm chart for deploying my application
type: application
version: 1.0.0        # Chart version (this is what helm push uses)
appVersion: "2.5.0"   # Application version (informational)
```

Each push creates a new version in the registry. You can store multiple versions side by side:

```bash
# Push version 1.0.0
helm push my-app-chart-1.0.0.tgz oci://us-central1-docker.pkg.dev/my-project/helm-charts

# Push version 1.1.0
helm push my-app-chart-1.1.0.tgz oci://us-central1-docker.pkg.dev/my-project/helm-charts

# Push version 2.0.0
helm push my-app-chart-2.0.0.tgz oci://us-central1-docker.pkg.dev/my-project/helm-charts
```

## Listing Charts and Versions

Use gcloud to browse your charts:

```bash
# List all charts (packages) in the repository
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/my-project/helm-charts \
  --project=my-project

# List versions of a specific chart
gcloud artifacts docker tags list \
  us-central1-docker.pkg.dev/my-project/helm-charts/my-app-chart \
  --project=my-project
```

Or use Helm to show chart information:

```bash
# Show chart details
helm show chart oci://us-central1-docker.pkg.dev/my-project/helm-charts/my-app-chart \
  --version 1.0.0

# Show default values
helm show values oci://us-central1-docker.pkg.dev/my-project/helm-charts/my-app-chart \
  --version 1.0.0
```

## Publishing Charts from Cloud Build

Automate chart publishing as part of your CI/CD pipeline:

```yaml
# cloudbuild.yaml - Package and push Helm chart
steps:
  # Install Helm
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Install Helm
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

        # Authenticate with Artifact Registry
        gcloud auth print-access-token | helm registry login \
          -u oauth2accesstoken \
          --password-stdin \
          us-central1-docker.pkg.dev

        # Lint the chart
        helm lint charts/my-app-chart/

        # Package the chart
        helm package charts/my-app-chart/

        # Push to Artifact Registry
        helm push my-app-chart-*.tgz \
          oci://us-central1-docker.pkg.dev/$PROJECT_ID/helm-charts

        echo "Chart published successfully"
```

## Using Charts as Dependencies

If one chart depends on another chart stored in Artifact Registry, reference it in Chart.yaml:

```yaml
# Chart.yaml - Chart with dependencies from Artifact Registry
apiVersion: v2
name: my-platform
description: Platform deployment chart
version: 1.0.0

dependencies:
  - name: my-app-chart
    version: "1.0.0"
    repository: "oci://us-central1-docker.pkg.dev/my-project/helm-charts"
  - name: monitoring-chart
    version: "2.3.0"
    repository: "oci://us-central1-docker.pkg.dev/my-project/helm-charts"
```

Update dependencies:

```bash
# Download chart dependencies
helm dependency update my-platform/
```

## Upgrading Deployments

Upgrade a running release to a new chart version:

```bash
# Upgrade to a new chart version
helm upgrade my-release \
  oci://us-central1-docker.pkg.dev/my-project/helm-charts/my-app-chart \
  --version 1.1.0 \
  -f custom-values.yaml

# Upgrade with rollback on failure
helm upgrade my-release \
  oci://us-central1-docker.pkg.dev/my-project/helm-charts/my-app-chart \
  --version 1.1.0 \
  --atomic \
  --timeout 300s
```

## IAM Permissions for Helm Charts

Since Helm charts live in Docker repositories, the same IAM roles apply:

```bash
# Read access (pull/install charts)
gcloud artifacts repositories add-iam-policy-binding helm-charts \
  --location=us-central1 \
  --member="group:developers@example.com" \
  --role="roles/artifactregistry.reader" \
  --project=my-project

# Write access (push charts)
gcloud artifacts repositories add-iam-policy-binding helm-charts \
  --location=us-central1 \
  --member="serviceAccount:ci-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=my-project
```

## Chart Signing and Verification

For additional security, sign your charts with Helm provenance:

```bash
# Package and sign the chart
helm package --sign --key 'my-key' --keyring ~/.gnupg/pubring.gpg my-app-chart/

# Push both the chart and the provenance file
helm push my-app-chart-1.0.0.tgz oci://us-central1-docker.pkg.dev/my-project/helm-charts
```

## Wrapping Up

Storing Helm charts in Artifact Registry using OCI format is clean and straightforward. You use Docker repositories with standard Helm push and pull commands. No separate chart museum server needed. The same IAM, vulnerability scanning, and cleanup policies that work for Docker images work for your Helm charts too. It all lives in one place, managed by one set of tools.
