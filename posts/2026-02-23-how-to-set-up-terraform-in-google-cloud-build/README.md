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
gcloud services enable secretmanager.googleapis.com
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

Create a dedicated service account for Terraform builds. Google recommends using a user-specified service account instead of relying on whichever default Cloud Build service account your project uses:

```bash
PROJECT_ID=$(gcloud config get-value project)
CB_SA="terraform-cloud-build@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create terraform-cloud-build \
  --display-name="Terraform Cloud Build"

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

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="projects/${PROJECT_ID}/roles/terraformRunner"
```

## Cloud Build Configuration

Cloud Build uses a `cloudbuild.yaml` file to define build steps. Each step runs in a container:

```yaml
# cloudbuild.yaml - Full Terraform CI/CD pipeline
timeout: "1800s"  # 30 minute timeout
serviceAccount: "projects/myproject/serviceAccounts/terraform-cloud-build@myproject.iam.gserviceaccount.com"
options:
  logging: CLOUD_LOGGING_ONLY

substitutions:
  _TF_VERSION: "1.7.0"
  _ENVIRONMENT: "production"

steps:
  # Step 1: Verify Terraform
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

  # Step 6: Apply the saved plan
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
  --service-account="projects/$PROJECT_ID/serviceAccounts/$CB_SA" \
  --description="Run terraform plan on pull requests"

# Trigger apply on merge to main
gcloud builds triggers create github \
  --name="terraform-apply-main" \
  --repo-name="infrastructure" \
  --repo-owner="myorg" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild-apply.yaml" \
  --service-account="projects/$PROJECT_ID/serviceAccounts/$CB_SA" \
  --description="Run terraform apply when merged to main"
```

## Splitting Plan and Apply Configs

For better control, split the pipeline into separate files:

```yaml
# cloudbuild-plan.yaml - Runs on pull requests
timeout: "600s"
options:
  logging: CLOUD_LOGGING_ONLY

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
options:
  logging: CLOUD_LOGGING_ONLY

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

Cloud Build supports native approvals for triggers. Add `--require-approval` when you create the apply trigger, or update an existing trigger:

```bash
gcloud builds triggers update github terraform-apply-main \
  --region="global" \
  --require-approval
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

Cloud Build logs can be stored in Cloud Storage or Cloud Logging depending on your logging configuration. For failed build alerts, subscribe to Cloud Build status notifications on the `cloud-builds` Pub/Sub topic or configure a Cloud Build notifier:

```bash
# Create the default topic for Cloud Build status notifications
gcloud pubsub topics create cloud-builds

# Create a pull subscription that can process messages where attributes.status="FAILURE"
gcloud pubsub subscriptions create terraform-build-failures \
  --topic=cloud-builds
```

You can also stream build logs in real time:

```bash
# Watch a build in progress
gcloud builds log --stream $BUILD_ID
```

## Summary

Google Cloud Build provides a clean, serverless way to run Terraform pipelines without managing any infrastructure. The container-based build steps give you full control over tooling, and the native GCP IAM integration eliminates credential management headaches. The main thing to watch out for is making sure apply workflows are gated with trigger approvals or a separate manual trigger.

For more on Terraform CI/CD patterns, see our guide on [implementing plan and apply stages](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-plan-and-apply-stages-in-cicd-for-terraform/view) and [using OIDC for cloud authentication](https://oneuptime.com/blog/post/2026-02-23-how-to-use-oidc-for-cloud-authentication-in-terraform-cicd/view).
