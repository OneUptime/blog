# How to Update CI/CD Pipelines from Terraform to OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, CI/CD, GitHub Action, GitLab CI, Migration

Description: Learn how to update your CI/CD pipeline configurations to use OpenTofu instead of Terraform, covering GitHub Actions, GitLab CI, and generic pipeline patterns.

## Introduction

Migrating CI/CD pipelines from Terraform to OpenTofu is straightforward since the CLI interface is nearly identical. The main changes involve installing OpenTofu instead of Terraform and replacing `terraform` commands with `tofu`.

## GitHub Actions Migration

**Before (Terraform):**

```yaml
- uses: hashicorp/setup-terraform@v3
  with:
    terraform_version: 1.7.0

- name: Terraform Init
  run: terraform init

- name: Terraform Plan
  run: terraform plan -out=plan.tfplan

- name: Terraform Apply
  run: terraform apply plan.tfplan
```

**After (OpenTofu):**

```yaml
- uses: opentofu/setup-opentofu@v1
  with:
    tofu_version: 1.8.0

- name: OpenTofu Init
  run: tofu init

- name: OpenTofu Plan
  run: tofu plan -out=plan.tfplan

- name: OpenTofu Apply
  run: tofu apply plan.tfplan
```

## Full GitHub Actions Workflow

```yaml
name: Infrastructure Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - uses: opentofu/setup-opentofu@v1
      with:
        tofu_version: 1.8.0

    - name: Configure AWS Credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1

    - name: Tofu Init
      run: tofu init

    - name: Tofu Validate
      run: tofu validate

    - name: Tofu Plan
      run: tofu plan -no-color -out=plan.tfplan
      if: github.event_name == 'pull_request'

    - name: Tofu Apply
      run: tofu apply -auto-approve plan.tfplan
      if: github.ref == 'refs/heads/main'
```

## GitLab CI Migration

```yaml
# .gitlab-ci.yml

variables:
  TOFU_VERSION: "1.8.0"

stages:
  - plan
  - apply

before_script:
  - wget -O /tmp/opentofu.tar.gz
      "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.tar.gz"
  - tar -xzf /tmp/opentofu.tar.gz -C /usr/local/bin tofu

plan:
  stage: plan
  script:
    - tofu init
    - tofu plan -out=plan.tfplan

apply:
  stage: apply
  script:
    - tofu init
    - tofu apply plan.tfplan
  when: manual
  only:
    - main
```

## Installing OpenTofu in Custom Pipelines

```bash
# Generic install script
TOFU_VERSION="1.8.0"
curl -Lo tofu.tar.gz \
  "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.tar.gz"
tar -xzf tofu.tar.gz
sudo mv tofu /usr/local/bin/
tofu version
```

## Conclusion

Updating CI/CD pipelines from Terraform to OpenTofu requires minimal changes - install OpenTofu using the official action or script, and replace `terraform` commands with `tofu`. The semantic equivalence of commands means existing pipeline logic works without modification.
