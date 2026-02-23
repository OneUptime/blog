# How to Set Up Terraform in Google Cloud Build

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Google Cloud, Cloud Build, CI/CD, Infrastructure as Code, GCP

Description: Step-by-step guide to configuring Google Cloud Build for Terraform deployments, covering triggers, custom build steps, IAM setup, and state management with GCS.

---

Google Cloud Build is a serverless CI/CD platform that integrates tightly with the GCP ecosystem. If you are managing infrastructure on Google Cloud with Terraform, Cloud Build gives you a clean way to automate plan and apply workflows without maintaining any build servers. This guide covers everything from initial setup to production-ready pipelines.

## Why Cloud Build for Terraform

Cloud Build runs containers as build steps, which means you have full control over the Terraform version and tooling in each step. It has native integration with Cloud Source Repositories, GitHub, and GitLab. Most importantly, it uses Google service accounts for authentication, so you never need to manage static credentials.

The serverless model also means you only pay for build minutes. There are no idle runners sitting around waiting for work.

## Prerequisites

Before starting, make sure you have:

- A GCP project with billing enabled
- Cloud Build API enabled
- A GCS bucket for Terraform state
- The `gcloud` CLI installed locally

```bash
# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable iam.googleapis.com
```

## Setting Up the GCS State Backend

```hcl
# backend.tf - GCS backend for Terraform state
terraform {
  backend "gcs" {
    bucket = "myproject-terraform-state"
    prefix = "infrastructure"
  }
}
```

Create the bucket with versioning enabled:

```bash
# Create state bucket with versioning
gsutil mb -l us-central1 gs://myproject-terraform-state
gsutil versioning set on gs://myproject-terraform-state
```

## IAM Permissions for Cloud Build

The Cloud Build service account needs permissions to manage your GCP resources and access the state bucket:

```bash
# Get the Cloud Build service account email
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant editor role for managing resources
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/editor"

# Grant storage access for Terraform state
gsutil iam ch "serviceAccount:${CB_SA}:roles/storage.objectAdmin" \
  gs://myproject-terraform-state
```

For production, create a custom role instead of using the broad editor role:

```bash
# Create a custom role scoped to what Terraform actually needs
gcloud iam roles create terraformRunner \
  --project=$PROJECT_ID \
  --title="Terraform Runner" \
  --description="Permissions for Terraform CI/CD" \
  --permissions="compute.instances.create,compute.instances.delete,compute.instances.get,compute.networks.create,compute.networks.delete,compute.networks.get"
```

## Cloud Build Configuration

Cloud Build uses a `cloudbuild.yaml` file to define build steps. Each step runs in a container:

```yaml
# cloudbuild.yaml - Full Terraform CI/CD pipeline
timeout: "1800s"  # 30 minute timeout

substitutions:
  _TF_VERSION: "1.7.0"
  _ENVIRONMENT: "production"

steps:
  # Step 1: Install Terraform
  - id: "install-terraform"
    name: "hashicorp/terraform:${_TF_VERSION}"
    entrypoint: "terraform"
    args: ["version"]

  # Step 2: Initialize Terraform
  - id: "tf-init"
    name: "hashicorp/terraform:${_TF_VERSION}"
    entrypoint: "terraform"
    args:
      - "init"
      - "-no-color"
      - "-backend-config=bucket=myproject-terraform-state"
      - "-backend-config=prefix=infrastructure/${_ENVIRONMENT}"

  # Step 3: Validate configuration
  - id: "tf-validate"
    name: "hashicorp/terraform:${_TF_VERSION}"
    entrypoint: "terraform"
    args:
      - "validate"
      - "-no-color"
    waitFor: ["tf-init"]

  # Step 4: Check formatting
  - id: "tf-fmt"
    name: "hashicorp/terraform:${_TF_VERSION}"
    entrypoint: "terraform"
    args:
      - "fmt"
      - "-check"
      - "-recursive"
      - "-no-color"
    waitFor: ["tf-init"]

  # Step 5: Generate plan
  - id: "tf-plan"
    name: "hashicorp/terraform:${_TF_VERSION}"
    entrypoint: "terraform"
    args:
      - "plan"
      - "-no-color"
      - "-var-file=envs/${_ENVIRONMENT}.tfvars"
      - "-out=tfplan"
    waitFor: ["tf-validate", "tf-fmt"]

  # Step 6: Apply (only on main branch)
  - id: "tf-apply"
    name: "hashicorp/terraform:${_TF_VERSION}"
    entrypoint: "terraform"
    args:
      - "apply"
      - "-no-color"
      - "-auto-approve"
      - "tfplan"
    waitFor: ["tf-plan"]
```

## Setting Up Build Triggers

Create triggers for different Git events:

```bash
# Trigger plan on pull requests
gcloud builds triggers create github \
  --name="terraform-plan-pr" \
  --repo-name="infrastructure" \
  --repo-owner="myorg" \
  --pull-request-pattern="^main$" \
  --build-config="cloudbuild-plan.yaml" \
  --description="Run terraform plan on pull requests"

# Trigger apply on merge to main
gcloud builds triggers create github \
  --name="terraform-apply-main" \
  --repo-name="infrastructure" \
  --repo-owner="myorg" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild-apply.yaml" \
  --description="Run terraform apply when merged to main"
```

## Splitting Plan and Apply Configs

For better control, split the pipeline into separate files:

```yaml
# cloudbuild-plan.yaml - Runs on pull requests
timeout: "600s"

steps:
  - id: "tf-init"
    name: "hashicorp/terraform:1.7.0"
    entrypoint: "terraform"
    args: ["init", "-no-color"]

  - id: "tf-plan"
    name: "hashicorp/terraform:1.7.0"
    entrypoint: "sh"
    args:
      - "-c"
      - |
        # Run plan and capture output for PR comment
        terraform plan -no-color -var-file=envs/production.tfvars 2>&1 | tee plan-output.txt

        # Post plan output as a PR comment using GitHub API
        # (requires GitHub token stored in Secret Manager)
    waitFor: ["tf-init"]
```

```yaml
# cloudbuild-apply.yaml - Runs on merge to main
timeout: "1800s"

steps:
  - id: "tf-init"
    name: "hashicorp/terraform:1.7.0"
    entrypoint: "terraform"
    args: ["init", "-no-color"]

  - id: "tf-apply"
    name: "hashicorp/terraform:1.7.0"
    entrypoint: "terraform"
    args:
      - "apply"
      - "-no-color"
      - "-auto-approve"
      - "-var-file=envs/production.tfvars"
    waitFor: ["tf-init"]
```

## Using Secret Manager for Sensitive Variables

Store sensitive Terraform variables in Secret Manager and access them during builds:

```yaml
# cloudbuild.yaml with secrets
availableSecrets:
  secretManager:
    - versionName: "projects/myproject/secrets/db-password/versions/latest"
      env: "TF_VAR_db_password"
    - versionName: "projects/myproject/secrets/api-key/versions/latest"
      env: "TF_VAR_api_key"

steps:
  - id: "tf-apply"
    name: "hashicorp/terraform:1.7.0"
    entrypoint: "terraform"
    args: ["apply", "-no-color", "-auto-approve"]
    secretEnv:
      - "TF_VAR_db_password"
      - "TF_VAR_api_key"
```

## Adding Manual Approval

Cloud Build does not have a native approval step like AWS CodePipeline. You can work around this by splitting into two pipelines and using Pub/Sub with a Cloud Function:

```yaml
# cloudbuild-plan.yaml - Ends by publishing to Pub/Sub
steps:
  # ... init and plan steps ...

  - id: "request-approval"
    name: "gcr.io/cloud-builders/gcloud"
    entrypoint: "bash"
    args:
      - "-c"
      - |
        # Publish a message requesting approval
        gcloud pubsub topics publish terraform-approvals \
          --message="Plan ready for review" \
          --attribute="build_id=$BUILD_ID,trigger_id=$TRIGGER_NAME"
```

## Parallel Build Steps

Cloud Build supports parallel execution using `waitFor`:

```yaml
steps:
  - id: "tf-init"
    name: "hashicorp/terraform:1.7.0"
    entrypoint: "terraform"
    args: ["init"]

  # These two run in parallel after init
  - id: "tf-validate"
    name: "hashicorp/terraform:1.7.0"
    entrypoint: "terraform"
    args: ["validate"]
    waitFor: ["tf-init"]

  - id: "tf-fmt"
    name: "hashicorp/terraform:1.7.0"
    entrypoint: "terraform"
    args: ["fmt", "-check"]
    waitFor: ["tf-init"]

  # This waits for both parallel steps
  - id: "tf-plan"
    name: "hashicorp/terraform:1.7.0"
    entrypoint: "terraform"
    args: ["plan", "-out=tfplan"]
    waitFor: ["tf-validate", "tf-fmt"]
```

## Logging and Monitoring

Cloud Build logs go to Cloud Logging by default. Set up alerts for failed builds:

```bash
# Create an alert policy for failed Terraform builds
gcloud alpha monitoring policies create \
  --display-name="Terraform Build Failures" \
  --condition-display-name="Build failed" \
  --condition-filter='resource.type="build" AND jsonPayload.status="FAILURE"' \
  --notification-channels="projects/myproject/notificationChannels/123456"
```

You can also stream build logs in real time:

```bash
# Watch a build in progress
gcloud builds log --stream $BUILD_ID
```

## Summary

Google Cloud Build provides a clean, serverless way to run Terraform pipelines without managing any infrastructure. The container-based build steps give you full control over tooling, and the native GCP IAM integration eliminates credential management headaches. The main thing to watch out for is the lack of a built-in approval mechanism, which requires a workaround with Pub/Sub or a manual trigger.

For more on Terraform CI/CD patterns, see our guide on [implementing plan and apply stages](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-plan-and-apply-stages-in-cicd-for-terraform/view) and [using OIDC for cloud authentication](https://oneuptime.com/blog/post/2026-02-23-how-to-use-oidc-for-cloud-authentication-in-terraform-cicd/view).
