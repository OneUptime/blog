# How to Use GitHub Actions with Terraform Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Terraform, Terraform Cloud, CI/CD, Infrastructure as Code

Description: Learn how to integrate GitHub Actions with Terraform Cloud for secure, automated infrastructure changes and remote state management.

---

Terraform Cloud provides remote state, policy enforcement, and secure runs. GitHub Actions can trigger those runs for automated infrastructure delivery. This guide shows a clean integration pattern.

## Step 1: Create a Terraform Cloud Workspace

- Create a workspace in Terraform Cloud
- Set the VCS provider or use API-driven runs
- Configure variables and secrets

## Step 2: Create a Terraform Cloud API Token

In Terraform Cloud:

1. Go to **User Settings → Tokens**
2. Create a token
3. Store it as a GitHub Actions secret, for example `TFC_TOKEN`

## Step 3: Use the Terraform Cloud CLI

The official CLI can trigger runs. Example GitHub Actions workflow:

```yaml
name: Terraform Cloud

on:
  push:
    branches: ["main"]

jobs:
  apply:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.6
          cli_config_credentials_token: ${{ secrets.TFC_TOKEN }}

      - name: Init
        run: terraform init

      - name: Plan
        run: terraform plan -out=tfplan

      - name: Apply
        run: terraform apply -auto-approve tfplan
```

If the workspace is configured for remote execution, Terraform Cloud handles the run.

## Step 4: Use Run Triggers (Optional)

Terraform Cloud can trigger downstream workspaces after a successful run. This is useful for layered infrastructure like networking → compute → apps.

## Step 5: Add Policy Checks

Use Sentinel or OPA policies in Terraform Cloud to block unsafe changes. This adds governance without slowing developers.

## Best Practices

- Use remote state in Terraform Cloud for all teams.
- Require PR reviews for `main` branch changes.
- Use workspaces per environment.
- Keep secrets in Terraform Cloud, not in Git.

## Conclusion

GitHub Actions plus Terraform Cloud gives you secure automation without storing state locally. With proper secrets handling and policy checks, you get safe, auditable infrastructure changes at scale.
