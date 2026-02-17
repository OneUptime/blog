# How to Define Targets in Cloud Deploy for Dev Staging and Production Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, CI/CD, DevOps, Deployment Pipeline

Description: Learn how to define and configure targets in Google Cloud Deploy for development, staging, and production environments to build a structured delivery pipeline.

---

Google Cloud Deploy is a managed continuous delivery service that handles the progression of your applications through multiple environments. One of the foundational concepts in Cloud Deploy is the "target" - a representation of a deployment destination like a GKE cluster, Cloud Run service, or Anthos cluster. Getting your targets right is critical because they define where your code actually lands.

In this guide, I will walk you through defining targets for a typical three-environment setup: dev, staging, and production.

## Understanding Cloud Deploy Targets

A target in Cloud Deploy represents a specific environment where your application gets deployed. Each target points to a runtime environment and can have its own configuration, such as execution service accounts, artifact storage, and deployment parameters.

Targets are defined in YAML configuration files and registered with Cloud Deploy. They are referenced from your delivery pipeline definition, which controls the order in which releases progress through targets.

## Prerequisites

Before you start, make sure you have the following in place:

- A GCP project with Cloud Deploy API enabled
- Three GKE clusters (or Cloud Run services) representing dev, staging, and production
- The `gcloud` CLI installed and authenticated
- Appropriate IAM permissions for Cloud Deploy

Enable the Cloud Deploy API if you have not already done so.

```bash
# Enable the Cloud Deploy API in your project
gcloud services enable clouddeploy.googleapis.com
```

## Defining Your Target Configuration Files

Each target is defined in its own YAML file or you can combine them into a single file separated by `---`. I prefer separate files for clarity when working in teams.

Here is the dev target definition. This points to your development GKE cluster.

```yaml
# dev-target.yaml - Target definition for the development environment
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: dev
description: Development environment
gke:
  cluster: projects/my-project/locations/us-central1/clusters/dev-cluster
executionConfigs:
- usages:
  - RENDER
  - DEPLOY
  serviceAccount: deploy-sa@my-project.iam.gserviceaccount.com
```

Now define the staging target. This typically mirrors production but with fewer resources.

```yaml
# staging-target.yaml - Target definition for the staging environment
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: staging
description: Staging environment for pre-production validation
requireApproval: false
gke:
  cluster: projects/my-project/locations/us-central1/clusters/staging-cluster
executionConfigs:
- usages:
  - RENDER
  - DEPLOY
  serviceAccount: deploy-sa@my-project.iam.gserviceaccount.com
```

Finally, define the production target. Note the `requireApproval: true` field, which forces a manual approval step before any release can be deployed here.

```yaml
# prod-target.yaml - Target definition for the production environment
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod
description: Production environment
requireApproval: true
gke:
  cluster: projects/my-project/locations/us-central1/clusters/prod-cluster
executionConfigs:
- usages:
  - RENDER
  - DEPLOY
  serviceAccount: deploy-sa@my-project.iam.gserviceaccount.com
  artifactStorage: gs://my-project-deploy-artifacts/prod
```

## Registering Targets with Cloud Deploy

Once your YAML files are ready, register each target using the gcloud CLI.

```bash
# Register all three targets with Cloud Deploy
gcloud deploy apply --file=dev-target.yaml --region=us-central1
gcloud deploy apply --file=staging-target.yaml --region=us-central1
gcloud deploy apply --file=prod-target.yaml --region=us-central1
```

You can verify the targets were created successfully.

```bash
# List all registered targets in the specified region
gcloud deploy targets list --region=us-central1
```

## Creating a Delivery Pipeline That References Your Targets

With the targets in place, you need a delivery pipeline that defines the progression order.

```yaml
# pipeline.yaml - Delivery pipeline with three stages
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: my-app-pipeline
description: Delivery pipeline for my application
serialPipeline:
  stages:
  - targetId: dev
    profiles:
    - dev
  - targetId: staging
    profiles:
    - staging
  - targetId: prod
    profiles:
    - prod
```

Register the pipeline the same way.

```bash
# Register the delivery pipeline
gcloud deploy apply --file=pipeline.yaml --region=us-central1
```

## Using Profiles for Environment-Specific Configuration

The `profiles` field in the pipeline stages references Skaffold profiles. These let you customize how your application is rendered for each environment. For example, you might use different resource limits or replica counts.

In your `skaffold.yaml`, define profiles that match.

```yaml
# skaffold.yaml - Skaffold configuration with environment-specific profiles
apiVersion: skaffold/v4beta7
kind: Config
metadata:
  name: my-app
profiles:
- name: dev
  manifests:
    rawYaml:
    - k8s/dev/*.yaml
- name: staging
  manifests:
    rawYaml:
    - k8s/staging/*.yaml
- name: prod
  manifests:
    rawYaml:
    - k8s/prod/*.yaml
deploy:
  kubectl: {}
```

## Multi-Project Target Configuration

In many organizations, dev, staging, and production live in separate GCP projects for isolation. Cloud Deploy supports cross-project targets. You just need to specify the full resource path for the cluster and ensure the service account has permissions in the target project.

```yaml
# cross-project-prod-target.yaml - Target in a different GCP project
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod
description: Production in separate project
gke:
  cluster: projects/my-prod-project/locations/us-central1/clusters/prod-cluster
executionConfigs:
- usages:
  - RENDER
  - DEPLOY
  serviceAccount: deploy-sa@my-prod-project.iam.gserviceaccount.com
```

## Adding Deploy Parameters to Targets

You can pass deploy parameters to targets that get substituted into your manifests during rendering. This is useful for injecting environment-specific values.

```yaml
# target with deploy parameters
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: dev
description: Development environment
deployParameters:
  env-name: "development"
  log-level: "debug"
  replicas: "2"
gke:
  cluster: projects/my-project/locations/us-central1/clusters/dev-cluster
```

## Verifying Your Setup

After everything is configured, you can inspect the full pipeline and its targets from the console or CLI.

```bash
# Describe the pipeline to see the full configuration
gcloud deploy delivery-pipelines describe my-app-pipeline --region=us-central1

# Describe a specific target to check its configuration
gcloud deploy targets describe prod --region=us-central1
```

You can also view the pipeline visualization in the Cloud Deploy section of the Google Cloud Console, which shows a nice graphical representation of your stages and targets.

## Common Pitfalls to Avoid

One mistake I see often is forgetting to set `requireApproval: true` on the production target. Without it, releases can be promoted to production automatically if you have automation rules set up.

Another common issue is service account permissions. The execution service account needs both Cloud Deploy permissions and access to the target cluster. Make sure the service account has the `roles/clouddeploy.jobRunner` role and the `roles/container.developer` role on the target cluster.

Finally, keep your target names consistent and simple. Names like `dev`, `staging`, and `prod` work well. Avoid putting region or project names in the target name since the target definition already contains that information.

## Wrapping Up

Defining targets in Cloud Deploy is straightforward once you understand the structure. Each target maps to a deployment destination, and the delivery pipeline controls the progression order. By separating your targets into dev, staging, and production with appropriate approval gates and execution configurations, you create a safe and repeatable delivery process for your applications.

The combination of targets, pipelines, and Skaffold profiles gives you fine-grained control over how your application is deployed to each environment while keeping the overall process consistent and auditable.
