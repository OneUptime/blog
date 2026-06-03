# How to Build Terraform CI/CD Integration for Automated Kubernetes Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, CI/CD, Automation

Description: Integrate Terraform with CI/CD pipelines to automate Kubernetes deployments, implementing gitops workflows with automated testing, validation, and deployment strategies.

---

Automating Terraform deployments through CI/CD pipelines brings consistency, repeatability, and safety to Kubernetes infrastructure management. By integrating Terraform with version control and continuous delivery systems, you create automated workflows that test, validate, and deploy infrastructure changes with proper approvals and auditable plan artifacts.

## GitHub Actions Terraform Workflow

Implement a complete Terraform CI/CD pipeline with GitHub Actions:

````yaml
# .github/workflows/terraform.yml

name: Terraform Kubernetes Deployment

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  TF_VERSION: '1.15.5'
  AWS_REGION: 'us-east-1'

permissions:
  contents: read
  issues: write

jobs:
  validate:
    name: Validate Terraform
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Terraform Format Check
        run: terraform fmt -check -recursive

      - name: Terraform Init
        run: terraform init -backend=false -input=false

      - name: Terraform Validate
        run: terraform validate

      - name: Run tflint
        uses: terraform-linters/setup-tflint@v6
        with:
          tflint_version: latest

      - name: Lint Terraform
        run: |
          tflint --init
          tflint --format compact

  plan:
    name: Plan Terraform Changes
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Terraform Init
        run: terraform init -input=false

      - name: Terraform Plan
        id: plan
        run: |
          terraform plan -out=tfplan -no-color -input=false
          terraform show -no-color tfplan > plan-output.txt

      - name: Upload Plan
        uses: actions/upload-artifact@v7
        with:
          name: terraform-plan
          path: |
            tfplan
            plan-output.txt

      - name: Comment PR with Plan
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v9
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('plan-output.txt', 'utf8');
            const output = `#### Terraform Plan
            <details><summary>Show Plan</summary>

            ~~~
            ${plan}
            ~~~

            </details>`;

            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

  apply:
    name: Apply Terraform Changes
    runs-on: ubuntu-latest
    needs: plan
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: https://kubernetes.example.com
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Terraform Init
        run: terraform init -input=false

      - name: Download Plan
        uses: actions/download-artifact@v8
        with:
          name: terraform-plan

      - name: Terraform Apply
        run: terraform apply -input=false tfplan

      - name: Post-deployment Verification
        run: |
          kubectl get deployments -A
          kubectl get services -A
````
