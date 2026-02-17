# How to Create a Release in Cloud Deploy and Promote It Through Pipeline Stages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, CI/CD, Release Management, DevOps

Description: Step-by-step guide on creating releases in Google Cloud Deploy and promoting them through pipeline stages from dev to staging to production.

---

When you use Google Cloud Deploy, the core workflow revolves around creating releases and promoting them through your pipeline stages. A release represents a specific version of your application that you want to deploy, and promotion is the act of moving that release from one environment to the next. This process gives you a controlled, auditable path from development to production.

Let me walk you through the full workflow of creating a release and pushing it through your delivery pipeline.

## What Is a Release in Cloud Deploy?

A release is a versioned snapshot of your application configuration. It packages your Skaffold configuration and Kubernetes manifests (or Cloud Run service definitions) into an immutable artifact. Once created, a release does not change - you promote the same release across all your pipeline stages.

This immutability is one of the key advantages. The exact same artifacts that were tested in staging are what get deployed to production. No surprises.

## Prerequisites

Before creating releases, you need:

- A delivery pipeline with at least two targets (for example, dev and prod)
- A Skaffold configuration file
- Container images already built and pushed to a registry
- The gcloud CLI with Cloud Deploy components

## Setting Up the Skaffold Configuration

Your Skaffold file tells Cloud Deploy how to render and deploy your manifests.

```yaml
# skaffold.yaml - Tells Cloud Deploy where your manifests are and how to deploy them
apiVersion: skaffold/v4beta7
kind: Config
metadata:
  name: my-web-app
manifests:
  rawYaml:
  - k8s/*.yaml
deploy:
  kubectl: {}
```

And a simple Kubernetes deployment manifest that references your container image.

```yaml
# k8s/deployment.yaml - Application deployment manifest
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-web-app
  template:
    metadata:
      labels:
        app: my-web-app
    spec:
      containers:
      - name: my-web-app
        image: us-central1-docker.pkg.dev/my-project/my-repo/my-web-app
```

## Creating a Release

To create a release, use the `gcloud deploy releases create` command. This takes your Skaffold configuration and manifests, renders them, and creates an immutable release object.

```bash
# Create a release named rel-001 for the my-app-pipeline delivery pipeline
gcloud deploy releases create rel-001 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --source=. \
  --images=my-web-app=us-central1-docker.pkg.dev/my-project/my-repo/my-web-app:v1.0.0
```

Let me break down the flags:

- `rel-001` is the release name. I usually tie this to a build number or git SHA.
- `--delivery-pipeline` specifies which pipeline this release belongs to.
- `--source` points to the directory containing your skaffold.yaml.
- `--images` maps the image name in your manifest to a specific tagged image.

When Cloud Deploy creates the release, it automatically starts a rollout to the first target in the pipeline. So if your first stage is `dev`, the release will immediately begin deploying to dev.

## Checking Release Status

After creation, you can monitor the release and its rollouts.

```bash
# Check the status of a specific release
gcloud deploy releases describe rel-001 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1

# List all rollouts for this release to see deployment status
gcloud deploy rollouts list \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-001 \
  --region=us-central1
```

The rollout will go through several phases: rendering your manifests, deploying to the target, and then marking the rollout as succeeded or failed.

## Promoting a Release to the Next Stage

Once the release has been successfully deployed to dev, you can promote it to the next stage in the pipeline. Promotion creates a new rollout for the next target.

```bash
# Promote rel-001 to the next stage in the pipeline (staging)
gcloud deploy releases promote \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-001 \
  --region=us-central1
```

Cloud Deploy knows the pipeline order, so it automatically determines the next target. If your release is currently in dev, promotion moves it to staging.

You can also specify a target explicitly if needed.

```bash
# Promote directly to a specific target
gcloud deploy releases promote \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-001 \
  --region=us-central1 \
  --to-target=prod
```

## Handling Approval Gates

If you configured `requireApproval: true` on a target (which you should for production), the promotion will create a rollout in a "pending approval" state. Someone with the appropriate IAM role needs to approve it before deployment starts.

```bash
# Approve a pending rollout for production
gcloud deploy rollouts approve rel-001-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-001 \
  --region=us-central1
```

You can also reject the rollout if something is wrong.

```bash
# Reject a pending rollout
gcloud deploy rollouts reject rel-001-to-prod-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-001 \
  --region=us-central1
```

## Using Labels and Annotations

Labels help you organize and filter releases. Annotations are useful for attaching metadata like commit hashes or ticket numbers.

```bash
# Create a release with labels and annotations for traceability
gcloud deploy releases create rel-002 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --source=. \
  --images=my-web-app=us-central1-docker.pkg.dev/my-project/my-repo/my-web-app:v1.1.0 \
  --labels=team=backend,component=api \
  --annotations=commit-sha=abc123def,ticket=JIRA-456
```

## Automating Release Creation from CI

In practice, you rarely create releases by hand. Your CI system does it. Here is a snippet from a Cloud Build configuration that creates a release after building the container image.

```yaml
# cloudbuild.yaml - Build the image and create a Cloud Deploy release
steps:
# Build and push the container image
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-web-app:$SHORT_SHA', '.']
- name: 'gcr.io/cloud-builders/docker'
  args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-web-app:$SHORT_SHA']

# Create a Cloud Deploy release using the built image
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  entrypoint: gcloud
  args:
  - deploy
  - releases
  - create
  - 'rel-$SHORT_SHA'
  - '--delivery-pipeline=my-app-pipeline'
  - '--region=us-central1'
  - '--source=.'
  - '--images=my-web-app=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-web-app:$SHORT_SHA'

images:
- 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-web-app:$SHORT_SHA'
```

## Viewing the Promotion History

Cloud Deploy keeps a full history of every promotion and rollout. You can view this in the console or through the CLI.

```bash
# List all releases in a pipeline, ordered by creation time
gcloud deploy releases list \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1
```

The Google Cloud Console provides an excellent visual representation of your pipeline, showing which release is currently deployed to each target and the history of rollouts.

## Rolling Back with a New Release

Cloud Deploy does not have a traditional "rollback" button. Instead, the recommended approach is to create a new release pointing to the previous known-good image and promote it through the pipeline. This maintains the audit trail and immutability principles.

```bash
# Roll back by creating a new release with the previous good image
gcloud deploy releases create rel-rollback-001 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --source=. \
  --images=my-web-app=us-central1-docker.pkg.dev/my-project/my-repo/my-web-app:v0.9.0
```

## Key Takeaways

The release and promote workflow in Cloud Deploy gives you a clean, predictable path from code to production. Releases are immutable, promotions are auditable, and approval gates protect sensitive environments. By integrating release creation into your CI pipeline, you can achieve a fully automated delivery process where the only manual step is approving the production deployment.

Getting comfortable with this workflow is fundamental to using Cloud Deploy effectively. Everything else - canary deployments, verification, automation rules - builds on top of this basic create-and-promote pattern.
