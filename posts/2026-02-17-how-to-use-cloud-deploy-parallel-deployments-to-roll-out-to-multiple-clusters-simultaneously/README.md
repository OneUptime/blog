# How to Use Cloud Deploy Parallel Deployments to Roll Out to Multiple Clusters Simultaneously

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, Parallel Deployment, Multi-Cluster, DevOps

Description: Learn how to configure parallel deployments in Google Cloud Deploy to roll out releases to multiple GKE clusters or Cloud Run services at the same time.

---

When you run your application across multiple clusters or regions, deploying to each one sequentially is slow and impractical. If you have five production clusters, a serial pipeline would take five times as long. Google Cloud Deploy supports parallel deployments, which let you deploy to multiple targets simultaneously within a single pipeline stage. This dramatically reduces rollout time for multi-cluster architectures.

Let me show you how to set up parallel deployments in your delivery pipeline.

## When to Use Parallel Deployments

Parallel deployments make sense when you have multiple deployment targets at the same logical stage. Common scenarios include:

- Multiple regional GKE clusters serving traffic in different geographies
- A primary and disaster recovery cluster pair
- Multiple Cloud Run services that need to stay in sync
- Separate clusters for different tenants or workloads

In all these cases, the targets are at the same level of the pipeline, and you want them updated together.

## Understanding Multi-Targets

Cloud Deploy uses a concept called "multi-target" to group multiple deployment targets under a single logical target. A multi-target is a parent target that contains child targets. When you deploy to a multi-target, Cloud Deploy creates rollouts for all child targets simultaneously.

## Defining Child Targets

First, define the individual targets that will be part of the parallel deployment.

```yaml
# targets.yaml - Individual cluster targets for parallel deployment
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod-us-central1
description: Production cluster in US Central
gke:
  cluster: projects/my-project/locations/us-central1/clusters/prod-cluster
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod-us-east1
description: Production cluster in US East
gke:
  cluster: projects/my-project/locations/us-east1/clusters/prod-cluster
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod-europe-west1
description: Production cluster in Europe West
gke:
  cluster: projects/my-project/locations/europe-west1/clusters/prod-cluster
```

Register all child targets.

```bash
# Register the individual cluster targets
gcloud deploy apply --file=targets.yaml --region=us-central1
```

## Creating a Multi-Target

Now create the multi-target that groups these clusters together.

```yaml
# multi-target.yaml - Parent target grouping all production clusters
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod-all-regions
description: All production clusters across regions
multiTarget:
  targetIds:
  - prod-us-central1
  - prod-us-east1
  - prod-europe-west1
requireApproval: true
```

```bash
# Register the multi-target
gcloud deploy apply --file=multi-target.yaml --region=us-central1
```

## Configuring the Delivery Pipeline

Use the multi-target in your pipeline just like any other target.

```yaml
# pipeline.yaml - Pipeline with parallel production deployment
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: my-app-pipeline
serialPipeline:
  stages:
  - targetId: dev
    profiles:
    - dev
  - targetId: staging
    profiles:
    - staging
    strategy:
      standard:
        verify: true
  - targetId: prod-all-regions
    profiles:
    - prod
    strategy:
      standard:
        verify: true
```

When a release is promoted to `prod-all-regions`, Cloud Deploy creates child rollouts for each of the three cluster targets and deploys to all of them in parallel.

## Skaffold Configuration for Multi-Cluster

Your Skaffold configuration works the same way. The profile specified in the pipeline stage applies to all child targets.

```yaml
# skaffold.yaml - Configuration supporting multi-cluster deployment
apiVersion: skaffold/v4beta7
kind: Config
metadata:
  name: my-app
profiles:
- name: dev
  manifests:
    rawYaml:
    - k8s/base/*.yaml
    - k8s/overlays/dev/*.yaml
- name: staging
  manifests:
    rawYaml:
    - k8s/base/*.yaml
    - k8s/overlays/staging/*.yaml
- name: prod
  manifests:
    rawYaml:
    - k8s/base/*.yaml
    - k8s/overlays/prod/*.yaml
deploy:
  kubectl: {}
```

If you need different configurations for each cluster (like different replica counts based on region traffic), you can use deploy parameters on the child targets.

## Using Deploy Parameters for Regional Differences

Each child target can have its own deploy parameters that customize the deployment.

```yaml
# Regional targets with different configurations
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod-us-central1
gke:
  cluster: projects/my-project/locations/us-central1/clusters/prod-cluster
deployParameters:
  replicas: "5"
  region-label: "us-central1"
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod-us-east1
gke:
  cluster: projects/my-project/locations/us-east1/clusters/prod-cluster
deployParameters:
  replicas: "3"
  region-label: "us-east1"
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod-europe-west1
gke:
  cluster: projects/my-project/locations/europe-west1/clusters/prod-cluster
deployParameters:
  replicas: "4"
  region-label: "europe-west1"
```

Reference these parameters in your Kubernetes manifests using the deploy-parameters substitution syntax.

```yaml
# k8s/overlays/prod/deployment-patch.yaml - Uses deploy parameters
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: $REPLICAS
```

## Creating and Promoting a Release

The workflow is identical to a standard pipeline. Create a release and it flows through the stages.

```bash
# Create a release
gcloud deploy releases create rel-v2.0 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --source=. \
  --images=my-app=us-central1-docker.pkg.dev/my-project/my-repo/my-app:v2.0

# Promote to the multi-target (after staging succeeds)
gcloud deploy releases promote \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2.0 \
  --region=us-central1
```

## Monitoring Parallel Rollouts

When deploying to a multi-target, you can see both the parent rollout and the child rollouts.

```bash
# List rollouts for the release - shows parent and child rollouts
gcloud deploy rollouts list \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2.0 \
  --region=us-central1

# Describe the parent rollout for a summary of all child rollouts
gcloud deploy rollouts describe rel-v2.0-to-prod-all-regions-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2.0 \
  --region=us-central1
```

The Google Cloud Console shows a visual tree of the parent and child rollouts with their individual statuses. This makes it easy to see if one region is lagging behind or has failed.

## Handling Partial Failures

One important thing about parallel deployments: if one child target fails, the others continue. Cloud Deploy does not automatically roll back successful child rollouts when a sibling fails.

This is actually a reasonable behavior. If US Central and Europe succeed but US East fails, you probably want to keep the successful deployments and investigate the failure rather than rolling everything back.

To check which child rollouts succeeded and which failed:

```bash
# Filter rollouts by target to see individual results
gcloud deploy rollouts list \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-v2.0 \
  --region=us-central1 \
  --filter="targetId:prod-us-east1"
```

## Parallel Deployments with Canary

You can combine parallel deployments with canary strategies. Each child target gets its own canary rollout.

```yaml
# Pipeline with parallel canary deployment
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: my-app-pipeline
serialPipeline:
  stages:
  - targetId: prod-all-regions
    profiles:
    - prod
    strategy:
      canary:
        runtimeConfig:
          kubernetes:
            serviceNetworking:
              service: my-app-service
              deployment: my-app
        canaryDeployment:
          percentages:
          - 10
          - 50
          verify: true
```

Each cluster gets its own 10% canary phase. You advance them independently or set up automation to advance them together.

## Best Practices for Parallel Deployments

Keep these points in mind:

- Start with two targets to test the setup before scaling to many. Debugging is easier with fewer moving parts.
- Use verification on parallel stages. It catches region-specific issues that might not surface in staging.
- Monitor all child rollouts. A failure in one region might indicate an infrastructure problem specific to that region.
- Consider your approval workflow. Approving the parent multi-target approves deployment to all child targets simultaneously.
- Use deploy parameters for regional differences rather than maintaining separate Skaffold profiles for each cluster.

## Summary

Parallel deployments in Cloud Deploy let you roll out to multiple clusters at the same time using multi-targets. Define your individual cluster targets, group them under a multi-target, and reference the multi-target in your pipeline. Cloud Deploy handles creating and managing the child rollouts in parallel. Combined with verification and canary strategies, this gives you a scalable deployment model for multi-cluster and multi-region architectures.
