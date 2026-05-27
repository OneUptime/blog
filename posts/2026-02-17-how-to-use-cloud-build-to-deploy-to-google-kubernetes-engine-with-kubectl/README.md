# How to Use Cloud Build to Deploy to Google Kubernetes Engine with kubectl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, GKE, Kubernetes, CI/CD, kubectl, DevOps

Description: Learn how to configure Google Cloud Build to deploy containerized applications to Google Kubernetes Engine using kubectl commands in your build pipeline.

---

Deploying to Google Kubernetes Engine (GKE) from Cloud Build is one of the most common CI/CD patterns on GCP. Instead of manually running kubectl commands from your laptop, you can automate the entire process - build a container image, push it to a registry, and roll it out to your cluster - all from a single cloudbuild.yaml file.

I have been using this pattern for a while now and it has saved me from plenty of "works on my machine" deployment disasters. Let me walk you through the setup step by step.

## Prerequisites

Before you start, make sure you have:

- A GCP project with billing enabled
- A GKE cluster up and running
- Cloud Build API enabled
- An Artifact Registry Docker repository set up
- gcloud CLI installed locally

## Granting Cloud Build Access to GKE

The first thing you need to do is give the service account that runs your Cloud Build job permission to deploy to your GKE cluster. Depending on your project and organization settings, Cloud Build might use the legacy Cloud Build service account, the Compute Engine default service account, or a user-specified service account.

Here is how to grant the necessary role:

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Use the service account configured for your build or trigger.
# For the legacy Cloud Build service account, use:
CLOUD_BUILD_SERVICE_ACCOUNT="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# For the Compute Engine default service account, use:
# CLOUD_BUILD_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant the Kubernetes Engine Developer role to the build service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SERVICE_ACCOUNT}" \
  --role="roles/container.developer"
```

The `container.developer` role gives Cloud Build the ability to create, update, and delete Kubernetes resources in your cluster. If you need more fine-grained access, you can create a custom IAM role instead.

If you use a user-specified service account, or if your Artifact Registry repository is in a different project, also grant that service account permission to push images to the repository.

## Writing the Kubernetes Deployment Manifest

You will need a Kubernetes deployment manifest for your application. Here is a basic example:

```yaml
# k8s/deployment.yaml - Kubernetes deployment configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        # The image tag will be replaced during the build
        image: LOCATION-docker.pkg.dev/PROJECT_ID/REPOSITORY/my-app:SHORT_SHA
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

## Creating the Cloud Build Configuration

Now for the main piece - the cloudbuild.yaml file. This file defines the build steps that Cloud Build will execute.

```yaml
# cloudbuild.yaml - Build, push, and deploy to GKE
substitutions:
  _LOCATION: 'us-central1'
  _REPOSITORY: 'my-repo'

steps:
  # Step 1: Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${_LOCATION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/my-app:$SHORT_SHA', '.']

  # Step 2: Push the image to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_LOCATION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/my-app:$SHORT_SHA']

  # Step 3: Update the image in the running deployment
  - name: 'gcr.io/cloud-builders/kubectl'
    args:
      - 'set'
      - 'image'
      - 'deployment/my-app'
      - 'my-app=${_LOCATION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/my-app:$SHORT_SHA'
    env:
      - 'CLOUDSDK_COMPUTE_ZONE=us-central1-a'
      - 'CLOUDSDK_CONTAINER_CLUSTER=my-cluster'

# Declare the images that Cloud Build should store
images:
  - '${_LOCATION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/my-app:$SHORT_SHA'
```

Let me break down what is happening here. The first step builds the Docker image and tags it with the short commit SHA. The second step pushes that image to Artifact Registry. The third step uses the Cloud Build `kubectl` builder to connect to the cluster from the environment variables and updates the running deployment to use the new image.

## Using kubectl Apply Instead of Set Image

If you prefer applying full manifests instead of just updating the image tag, you can use sed to replace placeholders in your manifest before applying:

```yaml
# cloudbuild.yaml - Alternative approach using kubectl apply
substitutions:
  _LOCATION: 'us-central1'
  _REPOSITORY: 'my-repo'

steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${_LOCATION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/my-app:$SHORT_SHA', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_LOCATION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/my-app:$SHORT_SHA']

  # Replace the image placeholders in the manifest
  - name: 'ubuntu'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        sed -i "s/PROJECT_ID/$PROJECT_ID/g" k8s/deployment.yaml
        sed -i "s/SHORT_SHA/$SHORT_SHA/g" k8s/deployment.yaml
        sed -i "s/LOCATION/${_LOCATION}/g" k8s/deployment.yaml
        sed -i "s/REPOSITORY/${_REPOSITORY}/g" k8s/deployment.yaml

  # Apply the updated manifest to the cluster
  - name: 'gcr.io/cloud-builders/kubectl'
    args: ['apply', '-f', 'k8s/deployment.yaml']
    env:
      - 'CLOUDSDK_COMPUTE_ZONE=us-central1-a'
      - 'CLOUDSDK_CONTAINER_CLUSTER=my-cluster'

images:
  - '${_LOCATION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/my-app:$SHORT_SHA'
```

## Setting Up the Build Trigger

You probably want this pipeline to run automatically when you push to your repository. Here is how to create a trigger:

```bash
# Create a Cloud Build trigger that fires on pushes to the main branch
gcloud builds triggers create github \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --description="Deploy my-app to GKE on push to main"
```

## Adding a Rollback Step

Things go wrong sometimes. You can add a verification step to your pipeline that checks if the deployment rolled out successfully and triggers a rollback if it did not:

```yaml
# cloudbuild.yaml - With rollback on failure
substitutions:
  _LOCATION: 'us-central1'
  _REPOSITORY: 'my-repo'

steps:
  # ... previous build and push steps ...

  # Deploy and verify the rollout
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        gcloud container clusters get-credentials my-cluster \
          --zone us-central1-a \
          --project $PROJECT_ID

        # Apply the deployment
        kubectl set image deployment/my-app \
          my-app=${_LOCATION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/my-app:$SHORT_SHA

        # Wait for the rollout to complete (timeout after 120 seconds)
        if ! kubectl rollout status deployment/my-app --timeout=120s; then
          echo "Deployment failed, rolling back..."
          kubectl rollout undo deployment/my-app
          exit 1
        fi

        echo "Deployment successful!"
    env:
      - 'CLOUDSDK_COMPUTE_ZONE=us-central1-a'
      - 'CLOUDSDK_CONTAINER_CLUSTER=my-cluster'
```

## Deploying to Multiple Environments

A common pattern is to deploy to staging first, run some checks, and then deploy to production. You can do this with separate build configs or by using substitution variables:

```yaml
# cloudbuild.yaml - Multi-environment deployment
substitutions:
  _CLUSTER_NAME: 'staging-cluster'
  _CLUSTER_ZONE: 'us-central1-a'

steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA']

  - name: 'gcr.io/cloud-builders/kubectl'
    args: ['set', 'image', 'deployment/my-app', 'my-app=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA']
    env:
      - 'CLOUDSDK_COMPUTE_ZONE=${_CLUSTER_ZONE}'
      - 'CLOUDSDK_CONTAINER_CLUSTER=${_CLUSTER_NAME}'
```

Then you create two triggers - one for staging that fires on pull requests and one for production that fires on merges to main, each overriding the substitution variables accordingly.

## Troubleshooting Common Issues

A few things that trip people up:

1. **Permission denied errors**: Make sure the Cloud Build service account has the `container.developer` role. Double check with `gcloud projects get-iam-policy`.

2. **Cluster not found**: Verify the cluster name and zone match exactly. A typo here will waste your time.

3. **Image pull errors**: If your GKE cluster is in a different project than your Artifact Registry repository, you need to grant the GKE node service account read access to the repository.

4. **Timeout errors**: For large images, you might need to increase the build timeout. The default is 10 minutes, which is usually enough, but some builds need more.

## Wrapping Up

Using Cloud Build with kubectl to deploy to GKE gives you a solid, automated deployment pipeline without needing to manage any CI/CD infrastructure yourself. The key steps are granting the right IAM permissions, structuring your cloudbuild.yaml with the correct build steps, and setting up triggers to automate the process.

Once you have this foundation in place, you can build on it - add testing steps, integrate with Cloud Deploy for progressive rollouts, or implement canary deployments. The possibilities open up once the basic pipeline is running smoothly.
