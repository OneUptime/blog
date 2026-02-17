# How to Configure Azure Bicep CI/CD Pipelines in GitHub Actions with What-If Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Bicep, GitHub Actions, CI/CD, What-If, IaC, DevOps

Description: Build GitHub Actions workflows for Azure Bicep deployments with automated validation, what-if previews on pull requests, and gated production deployments.

---

Deploying Azure infrastructure through Bicep templates needs the same CI/CD rigor as application code. You want linting on every push, validation on every pull request, what-if previews so reviewers can see exactly what will change, and gated deployments to production. GitHub Actions provides all the building blocks for this workflow.

This post walks through setting up a complete Bicep CI/CD pipeline in GitHub Actions - from basic validation to multi-environment deployments with what-if gates.

## Repository Structure

Before diving into the workflow, here is how the Bicep project is organized.

```
infrastructure/
  modules/
    networking/
      main.bicep
    compute/
      main.bicep
    database/
      main.bicep
  main.bicep
  parameters/
    dev.bicepparam
    staging.bicepparam
    prod.bicepparam
.github/
  workflows/
    bicep-ci.yml
    bicep-deploy.yml
```

## Authentication Setup

GitHub Actions authenticates to Azure using OpenID Connect (OIDC), which is more secure than storing service principal secrets. Set up the federated credentials in Azure AD.

```bash
# Create a service principal for GitHub Actions
az ad sp create-for-rbac --name "github-actions-bicep" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID

# Add federated credential for the main branch
az ad app federated-credential create \
  --id YOUR_APP_ID \
  --parameters '{
    "name": "github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:yourorg/yourrepo:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Add federated credential for pull requests
az ad app federated-credential create \
  --id YOUR_APP_ID \
  --parameters '{
    "name": "github-pr",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:yourorg/yourrepo:pull_request",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

Add these as GitHub repository secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.

## The CI Workflow: Validate and Lint

This workflow runs on every push and pull request to catch issues early.

```yaml
# .github/workflows/bicep-ci.yml
name: Bicep CI

on:
  push:
    paths:
      - 'infrastructure/**'
  pull_request:
    paths:
      - 'infrastructure/**'

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  lint:
    name: Lint Bicep Files
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Install the Bicep CLI
      - name: Install Bicep
        run: |
          az bicep install
          az bicep version

      # Lint all Bicep files
      - name: Lint Bicep
        run: |
          echo "Linting Bicep files..."
          find infrastructure -name "*.bicep" -not -name "*.bicepparam" | while read file; do
            echo "  Linting: $file"
            az bicep lint --file "$file" 2>&1 || exit 1
          done
          echo "All files passed linting"

      # Build all Bicep files to check for compilation errors
      - name: Build Bicep
        run: |
          echo "Building Bicep files..."
          find infrastructure -name "*.bicep" -not -name "*.bicepparam" | while read file; do
            echo "  Building: $file"
            az bicep build --file "$file" --stdout > /dev/null || exit 1
          done
          echo "All files compiled successfully"

  validate:
    name: Validate Against Azure
    runs-on: ubuntu-latest
    needs: lint
    strategy:
      matrix:
        environment: [dev, staging, prod]
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      # Validate the template against Azure APIs
      - name: Validate - ${{ matrix.environment }}
        run: |
          az deployment group validate \
            --resource-group rg-app-${{ matrix.environment }} \
            --parameters infrastructure/parameters/${{ matrix.environment }}.bicepparam

  what-if:
    name: What-If Preview
    runs-on: ubuntu-latest
    needs: validate
    if: github.event_name == 'pull_request'
    strategy:
      matrix:
        environment: [dev, staging, prod]
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      # Run what-if and capture the output
      - name: What-If - ${{ matrix.environment }}
        id: whatif
        run: |
          result=$(az deployment group what-if \
            --resource-group rg-app-${{ matrix.environment }} \
            --parameters infrastructure/parameters/${{ matrix.environment }}.bicepparam \
            --no-pretty-print 2>&1)

          # Save to a file for the comment step
          echo "$result" > whatif-${{ matrix.environment }}.txt

          # Also output for the step summary
          echo "### What-If Results: ${{ matrix.environment }}" >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
          echo "$result" >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY

      # Upload the what-if results as an artifact
      - name: Upload What-If Results
        uses: actions/upload-artifact@v4
        with:
          name: whatif-${{ matrix.environment }}
          path: whatif-${{ matrix.environment }}.txt

  # Post a combined comment on the PR
  comment:
    name: Post PR Comment
    runs-on: ubuntu-latest
    needs: what-if
    if: github.event_name == 'pull_request'
    steps:
      - name: Download All What-If Results
        uses: actions/download-artifact@v4
        with:
          pattern: whatif-*
          merge-multiple: true

      - name: Post Comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const envs = ['dev', 'staging', 'prod'];
            let body = '## Bicep What-If Results\n\n';

            for (const env of envs) {
              const file = `whatif-${env}.txt`;
              if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                body += `### ${env}\n\`\`\`\n${content.substring(0, 10000)}\n\`\`\`\n\n`;
              }
            }

            body += '\n---\n*Generated by Bicep CI pipeline*';

            // Find existing comment to update
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const botComment = comments.find(c =>
              c.body.includes('Bicep What-If Results')
            );

            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: body,
              });
            }
```

## The Deployment Workflow

This workflow handles the actual deployment after merging to main.

```yaml
# .github/workflows/bicep-deploy.yml
name: Bicep Deploy

on:
  push:
    branches:
      - main
    paths:
      - 'infrastructure/**'

permissions:
  id-token: write
  contents: read

jobs:
  deploy-dev:
    name: Deploy to Dev
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy to Dev
        run: |
          az deployment group create \
            --resource-group rg-app-dev \
            --parameters infrastructure/parameters/dev.bicepparam \
            --name "deploy-$(date +%Y%m%d-%H%M%S)"

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: deploy-dev
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      # Run what-if one more time before staging deployment
      - name: What-If Staging
        run: |
          az deployment group what-if \
            --resource-group rg-app-staging \
            --parameters infrastructure/parameters/staging.bicepparam

      - name: Deploy to Staging
        run: |
          az deployment group create \
            --resource-group rg-app-staging \
            --parameters infrastructure/parameters/staging.bicepparam \
            --name "deploy-$(date +%Y%m%d-%H%M%S)"

  deploy-prod:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      # Final what-if before production
      - name: What-If Production
        run: |
          az deployment group what-if \
            --resource-group rg-app-prod \
            --parameters infrastructure/parameters/prod.bicepparam

      - name: Deploy to Production
        run: |
          az deployment group create \
            --resource-group rg-app-prod \
            --parameters infrastructure/parameters/prod.bicepparam \
            --name "deploy-$(date +%Y%m%d-%H%M%S)"

      # Verify deployment succeeded
      - name: Verify Deployment
        run: |
          deployment=$(az deployment group show \
            --resource-group rg-app-prod \
            --name "$(az deployment group list --resource-group rg-app-prod --query '[0].name' -o tsv)" \
            --query 'properties.provisioningState' -o tsv)
          echo "Deployment state: $deployment"
          if [ "$deployment" != "Succeeded" ]; then
            echo "Deployment failed!"
            exit 1
          fi
```

## Setting Up Environment Protection Rules

The deployment workflow references GitHub environments (`dev`, `staging`, `production`). Configure these in your repository settings.

For the `production` environment:
1. Go to Settings > Environments > production
2. Add required reviewers - these are the people who must approve before deployment proceeds
3. Set a wait timer if you want a delay between approval and deployment
4. Restrict which branches can deploy (only `main`)

For `staging`:
1. Add a reviewer if you want human approval for staging too
2. Restrict to the `main` branch

For `dev`:
1. No reviewers needed - deploy automatically after CI passes

## Handling Deployment Failures

Add a notification step that alerts your team on deployment failures.

```yaml
      - name: Notify on Failure
        if: failure()
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            -d '{
              "text": "Bicep deployment to production FAILED. Check the workflow run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            }'
```

## Best Practices

Name your deployments. The `--name` flag on `az deployment group create` gives each deployment a unique name, making it easy to find in the Azure portal and roll back if needed.

Use OIDC for authentication. It is more secure than storing long-lived secrets and automatically rotates credentials.

Run what-if at multiple stages. Run it in the PR for review, and again right before deployment to catch any changes that happened between PR approval and deployment.

Keep your workflow DRY with reusable workflows. If you have multiple repositories deploying Bicep templates, create a shared workflow in a central repository and call it from each project.

Pin your action versions. Use specific SHA commits or version tags for third-party actions to prevent supply chain attacks.

## Conclusion

A well-designed GitHub Actions pipeline for Bicep gives you confidence at every stage - linting catches syntax issues, validation confirms Azure compatibility, what-if shows reviewers exactly what will change, and gated environments with manual approvals protect production. The pipeline we built covers the full lifecycle from pull request to production deployment, with notifications and verification at each step. This is the foundation for treating your Azure infrastructure with the same rigor as your application code.
