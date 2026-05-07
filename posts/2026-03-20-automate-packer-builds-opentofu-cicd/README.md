# How to Automate Packer Builds and OpenTofu Deploys in CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Packer, CI/CD, GitHub Action, Automation, Immutable Infrastructure

Description: Learn how to build a CI/CD pipeline that automatically builds Packer images when application code changes and deploys them with OpenTofu, implementing a complete immutable infrastructure workflow.

## Introduction

A complete immutable infrastructure CI/CD pipeline has two phases: Packer builds a new image when application code changes, and OpenTofu deploys instances using that new image. The pipeline connects these phases by storing the image ID and triggering the deployment automatically.

## Pipeline Architecture

```hcl
Code Push → Detect Changes → Packer Build → Store AMI ID → OpenTofu Apply → Rolling Deploy
```

## GitHub Actions: Full Pipeline

```yaml
# .github/workflows/deploy.yml

name: Build and Deploy

on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

env:
  AWS_REGION: us-east-1

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      app-changed: ${{ steps.changes.outputs.app }}
      infra-changed: ${{ steps.changes.outputs.infra }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Check changes
        id: changes
        env:
          BEFORE_SHA: ${{ github.event.before }}
        run: |
          if [ "$BEFORE_SHA" = "0000000000000000000000000000000000000000" ]; then
            CHANGED_FILES=$(git ls-files)
          else
            CHANGED_FILES=$(git diff --name-only "$BEFORE_SHA" "$GITHUB_SHA")
          fi

          echo "$CHANGED_FILES" | grep -q '^app/' && APP_CHANGED=true || APP_CHANGED=false
          echo "$CHANGED_FILES" | grep -q '^infrastructure/' && INFRA_CHANGED=true || INFRA_CHANGED=false

          echo "app=$APP_CHANGED" >> "$GITHUB_OUTPUT"
          echo "infra=$INFRA_CHANGED" >> "$GITHUB_OUTPUT"

  build-image:
    needs: detect-changes
    if: needs.detect-changes.outputs.app-changed == 'true'
    runs-on: ubuntu-latest
    outputs:
      ami-id: ${{ steps.build.outputs.ami-id }}
      app-version: ${{ steps.version.outputs.version }}
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_PACKER_ROLE }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Get app version
        id: version
        run: echo "version=$(cat app/VERSION)" >> $GITHUB_OUTPUT

      - name: Install Packer
        run: |
          curl -fsSL https://releases.hashicorp.com/packer/1.10.0/packer_1.10.0_linux_amd64.zip -o packer.zip
          unzip packer.zip && sudo mv packer /usr/local/bin/

      - name: Build AMI
        id: build
        run: |
          cd packer
          packer init .
          packer build \
            -var "app_version=${{ steps.version.outputs.version }}" \
            -var "aws_region=${{ env.AWS_REGION }}" \
            web-server.pkr.hcl

          # Extract AMI ID from manifest
          AMI_ID=$(cat packer-manifest.json | jq -r '.builds[-1].artifact_id | split(":") | .[1]')
          echo "ami-id=${AMI_ID}" >> $GITHUB_OUTPUT

      - name: Register AMI in SSM
        run: |
          aws ssm put-parameter \
            --name "/images/app-server/latest" \
            --value "${{ steps.build.outputs.ami-id }}" \
            --type String \
            --overwrite

          aws ssm put-parameter \
            --name "/images/app-server/${{ steps.version.outputs.version }}" \
            --value "${{ steps.build.outputs.ami-id }}" \
            --type String \
            --overwrite

  deploy:
    needs: [detect-changes, build-image]
    if: |
      always() &&
      (needs.build-image.result == 'success' ||
       needs.detect-changes.outputs.infra-changed == 'true')
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.9.0"

      - name: OpenTofu Init
        run: tofu -chdir=infrastructure init

      - name: OpenTofu Plan
        run: |
          tofu -chdir=infrastructure plan \
            -var="environment=staging" \
            -var="app_version=latest" \
            -out=tfplan

      - name: OpenTofu Apply
        run: tofu -chdir=infrastructure apply tfplan
```

## Packer Manifest Post-Processor

```hcl
# packer/web-server.pkr.hcl
variable "git_sha" {
  type    = string
  default = env("GITHUB_SHA")
}

build {
  sources = ["source.amazon-ebs.web_server"]

  # ... provisioners ...

  # Generate a manifest file with build metadata
  post-processor "manifest" {
    output     = "packer-manifest.json"
    strip_path = true
    custom_data = {
      version = var.app_version
      git_sha = var.git_sha
    }
  }
}
```

## OpenTofu Reading from SSM

```hcl
# infrastructure/main.tf
data "aws_ssm_parameter" "app_ami" {
  name = var.app_version == "latest" ? "/images/app-server/latest" : "/images/app-server/${var.app_version}"
}

resource "aws_launch_template" "app" {
  image_id      = data.aws_ssm_parameter.app_ami.value
  instance_type = var.instance_type
  # ...
}
```

## Environment Promotion

```bash
# Promote a specific version from staging to production
APP_VERSION="1.2.3"

# Get the staging-tested AMI ID
STAGING_AMI=$(aws ssm get-parameter --name "/images/app-server/${APP_VERSION}" --query 'Parameter.Value' --output text)

# Deploy to production with this specific version
tofu -chdir=infrastructure apply -var="environment=prod" -var="app_version=${APP_VERSION}" -auto-approve
```

## Conclusion

The automated Packer + OpenTofu CI/CD pipeline creates a clear promotion path: code changes trigger Packer builds, AMI IDs are stored in SSM Parameter Store as a version registry, and OpenTofu reads from SSM to deploy the appropriate version. This design enables environment-specific promotion (staging gets `latest`, production deploys a specific tested version) and provides a full audit trail of what image is running in each environment.
