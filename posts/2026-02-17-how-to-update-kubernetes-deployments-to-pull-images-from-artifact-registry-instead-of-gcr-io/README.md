# How to Update Kubernetes Deployments to Pull Images from Artifact Registry Instead of gcr.io

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Kubernetes, GKE, Artifact Registry, Container Registry, Docker

Description: Step-by-step instructions for updating your Kubernetes deployments, Helm charts, and Kustomize overlays to pull images from Artifact Registry instead of gcr.io.

---

When you migrate from Google Container Registry to Artifact Registry, your running Kubernetes deployments need to be updated to reference the new image paths. If you skip this step, your deployments will keep pulling from the old gcr.io paths, which will eventually stop working when Container Registry is fully shut down. Even if you have gcr.io redirection enabled as a stopgap, you should update your manifests to use the native Artifact Registry paths.

This guide covers updating raw manifests, Helm charts, Kustomize overlays, and handling the rollout without downtime.

## The Path Change

Every container image reference needs to change from the GCR format to the Artifact Registry format.

```
# Old GCR path
gcr.io/my-project-id/my-app:v1.0.0

# New Artifact Registry path
us-central1-docker.pkg.dev/my-project-id/docker-images/my-app:v1.0.0
```

The differences are:
- The hostname changes from `gcr.io` to `REGION-docker.pkg.dev`
- A repository name is added between the project ID and image name
- Everything else (image name, tag, digest) stays the same

## Step 1: Ensure GKE Can Pull from Artifact Registry

Before updating any manifests, make sure your GKE nodes can actually pull images from Artifact Registry.

For clusters using the default compute service account:

```bash
# Grant the default compute SA read access to Artifact Registry
gcloud artifacts repositories add-iam-policy-binding docker-images \
  --location=us-central1 \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.reader" \
  --project=my-project-id
```

For clusters using Workload Identity with custom service accounts:

```bash
# Grant the GKE node service account read access
gcloud artifacts repositories add-iam-policy-binding docker-images \
  --location=us-central1 \
  --member="serviceAccount:gke-nodes@my-project-id.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader" \
  --project=my-project-id
```

Test that pulling works before updating any deployments.

```bash
# Quick test - try to run a pod with the new image path
kubectl run pull-test \
  --image=us-central1-docker.pkg.dev/my-project-id/docker-images/my-app:v1.0.0 \
  --restart=Never

# Check if it pulled successfully
kubectl describe pod pull-test | grep -A5 "Events:"

# Clean up
kubectl delete pod pull-test
```

## Step 2: Update Raw Kubernetes Manifests

For plain YAML manifests, update the image fields.

Before:

```yaml
# deployment-old.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    spec:
      containers:
        - name: app
          image: gcr.io/my-project-id/my-app:v1.0.0
        - name: sidecar
          image: gcr.io/my-project-id/my-sidecar:v2.1.0
```

After:

```yaml
# deployment.yaml
# Updated to use Artifact Registry image paths
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    spec:
      containers:
        - name: app
          image: us-central1-docker.pkg.dev/my-project-id/docker-images/my-app:v1.0.0
        - name: sidecar
          image: us-central1-docker.pkg.dev/my-project-id/docker-images/my-sidecar:v2.1.0
```

## Step 3: Update Helm Charts

Helm charts typically have image references in values.yaml. This is where the change needs to happen.

Before:

```yaml
# values-old.yaml
image:
  repository: gcr.io/my-project-id/my-app
  tag: v1.0.0
```

After:

```yaml
# values.yaml
# Updated image repository to Artifact Registry
image:
  repository: us-central1-docker.pkg.dev/my-project-id/docker-images/my-app
  tag: v1.0.0
```

If you use environment-specific values files, update all of them.

```yaml
# values-production.yaml
image:
  repository: us-central1-docker.pkg.dev/prod-project/docker-images/my-app
  tag: v1.0.0

# values-staging.yaml
image:
  repository: us-central1-docker.pkg.dev/staging-project/docker-images/my-app
  tag: v1.0.0-rc1
```

For charts that define the registry separately from the image name, update the registry field.

```yaml
# values.yaml with separate registry field
global:
  imageRegistry: us-central1-docker.pkg.dev/my-project-id/docker-images

app:
  image:
    name: my-app
    tag: v1.0.0

worker:
  image:
    name: my-worker
    tag: v1.0.0
```

Upgrade the Helm release.

```bash
# Upgrade the release with new image references
helm upgrade my-app ./my-chart -f values.yaml --namespace production
```

## Step 4: Update Kustomize Overlays

Kustomize makes image updates straightforward with the images transformer.

```yaml
# kustomization.yaml
# Use the images transformer to update image references across all resources
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - cronjob.yaml

images:
  # Replace all occurrences of the old GCR path with the new AR path
  - name: gcr.io/my-project-id/my-app
    newName: us-central1-docker.pkg.dev/my-project-id/docker-images/my-app
  - name: gcr.io/my-project-id/my-sidecar
    newName: us-central1-docker.pkg.dev/my-project-id/docker-images/my-sidecar
  - name: gcr.io/my-project-id/my-worker
    newName: us-central1-docker.pkg.dev/my-project-id/docker-images/my-worker
```

This approach is nice because you do not need to modify the base manifests. The overlay handles the replacement.

```bash
# Preview the changes
kubectl kustomize ./overlays/production

# Apply the changes
kubectl apply -k ./overlays/production
```

## Step 5: Rolling Update Strategy

When you update the image path, Kubernetes treats it as a new image and triggers a rolling update. Make sure your deployment strategy handles this smoothly.

```yaml
# deployment.yaml
# Rolling update strategy to ensure zero downtime during the image path change
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    spec:
      containers:
        - name: app
          image: us-central1-docker.pkg.dev/my-project-id/docker-images/my-app:v1.0.0
          # Readiness probe ensures traffic shifts only to healthy pods
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
```

With `maxUnavailable: 0`, Kubernetes will not terminate old pods until new ones are ready. This ensures zero downtime during the rollout.

## Step 6: Update CronJobs and Jobs

Do not forget about CronJobs and one-off Jobs. They also reference container images.

```yaml
# cronjob.yaml
# Updated CronJob with Artifact Registry image path
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-cleanup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cleanup
              image: us-central1-docker.pkg.dev/my-project-id/docker-images/cleanup-job:v1.0.0
          restartPolicy: OnFailure
```

## Step 7: Update Init Containers and Sidecars

Init containers and sidecar containers often get overlooked.

```yaml
# Check for init containers and sidecars that reference gcr.io
spec:
  initContainers:
    - name: init-db
      # Do not forget to update this
      image: us-central1-docker.pkg.dev/my-project-id/docker-images/db-init:v1.0.0
  containers:
    - name: app
      image: us-central1-docker.pkg.dev/my-project-id/docker-images/my-app:v1.0.0
    - name: cloud-sql-proxy
      # Third-party images hosted on GCR should also be checked
      image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.0
```

Note that some Google-provided images like the Cloud SQL proxy are still hosted on gcr.io. Check the official documentation for updated paths.

## Bulk Find and Replace

For large clusters with many manifests, use a script to find and update all references.

```bash
# Find all files with gcr.io references in your manifests directory
find ./k8s-manifests -type f \( -name "*.yaml" -o -name "*.yml" \) \
  -exec grep -l "gcr.io/my-project-id" {} \;

# Preview the changes with sed
find ./k8s-manifests -type f \( -name "*.yaml" -o -name "*.yml" \) \
  -exec grep -n "gcr.io/my-project-id" {} \;

# Apply the replacement
find ./k8s-manifests -type f \( -name "*.yaml" -o -name "*.yml" \) \
  -exec sed -i 's|gcr.io/my-project-id|us-central1-docker.pkg.dev/my-project-id/docker-images|g' {} \;
```

## Monitoring the Rollout

After applying updates, monitor the rollout status.

```bash
# Watch deployment rollout status
kubectl rollout status deployment/my-app -n production

# Check that new pods are running with the correct image
kubectl get pods -n production -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}'

# Verify no pods are still using gcr.io images
kubectl get pods --all-namespaces \
  -o jsonpath='{range .items[*]}{range .spec.containers[*]}{.image}{"\n"}{end}{end}' \
  | grep gcr.io | sort -u
```

## Summary

Updating Kubernetes deployments for Artifact Registry involves changing image paths in your manifests, Helm values, and Kustomize overlays. The key to a smooth migration is to set up IAM first, test pulling before updating deployments, use rolling updates for zero downtime, and search thoroughly for all gcr.io references including init containers, sidecars, CronJobs, and Jobs. After updating, monitor the rollout and verify that no pods are still using the old paths.
