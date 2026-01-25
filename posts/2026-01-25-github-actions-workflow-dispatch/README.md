# How to Implement Workflow Dispatch in GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Workflow Dispatch, Manual Triggers, CI/CD, Automation, DevOps

Description: Learn how to trigger GitHub Actions workflows manually with custom inputs. This guide covers workflow_dispatch configuration, input types, validation, and practical use cases for on-demand automation.

---

Not every workflow should run automatically. Deployments, database migrations, and maintenance tasks often need human judgment before execution. GitHub Actions workflow_dispatch lets you trigger workflows manually from the UI, CLI, or API with custom parameters. This guide shows you how to build flexible manual workflows.

## Basic Workflow Dispatch

Add `workflow_dispatch` to your workflow triggers:

```yaml
# .github/workflows/manual.yml
name: Manual Workflow

on:
  # Enable manual triggering
  workflow_dispatch:

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run manual task
        run: |
          echo "Workflow triggered manually by ${{ github.actor }}"
          echo "Running on branch: ${{ github.ref_name }}"
```

Trigger this workflow from:
- GitHub UI: Actions tab > Select workflow > Run workflow
- GitHub CLI: `gh workflow run manual.yml`
- API: POST to `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches`

## Adding Input Parameters

Define inputs to customize workflow behavior:

```yaml
name: Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment target environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

      version:
        description: 'Version to deploy (e.g., v1.2.3)'
        required: true
        type: string

      dry_run:
        description: 'Perform a dry run without actual deployment'
        required: false
        default: false
        type: boolean

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.version }}

      - name: Display inputs
        run: |
          echo "Environment: ${{ github.event.inputs.environment }}"
          echo "Version: ${{ github.event.inputs.version }}"
          echo "Dry run: ${{ github.event.inputs.dry_run }}"

      - name: Deploy
        if: ${{ github.event.inputs.dry_run == 'false' }}
        run: ./deploy.sh ${{ github.event.inputs.environment }}
```

## Input Types

GitHub Actions supports several input types:

```yaml
on:
  workflow_dispatch:
    inputs:
      # String input - freeform text
      message:
        description: 'Deployment message'
        type: string
        required: false
        default: 'Manual deployment'

      # Choice input - dropdown selection
      region:
        description: 'AWS region'
        type: choice
        required: true
        options:
          - us-east-1
          - us-west-2
          - eu-west-1

      # Boolean input - checkbox
      notify:
        description: 'Send Slack notification'
        type: boolean
        default: true

      # Environment input - environment selector
      target:
        description: 'Target environment'
        type: environment
        required: true
```

The `environment` type shows a dropdown of configured environments, respecting access controls.

## Triggering from the Command Line

Use GitHub CLI for scripted or quick manual triggers:

```bash
# Basic trigger
gh workflow run deploy.yml

# With inputs
gh workflow run deploy.yml \
  -f environment=production \
  -f version=v1.2.3 \
  -f dry_run=false

# Trigger on specific branch
gh workflow run deploy.yml --ref release/v1.2

# Check workflow status
gh run list --workflow=deploy.yml --limit=5
```

## Triggering via API

Automate triggers from external systems:

```bash
# Using curl with personal access token
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/your-org/your-repo/actions/workflows/deploy.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "environment": "production",
      "version": "v1.2.3"
    }
  }'
```

```javascript
// Using Octokit in Node.js
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

await octokit.actions.createWorkflowDispatch({
  owner: 'your-org',
  repo: 'your-repo',
  workflow_id: 'deploy.yml',
  ref: 'main',
  inputs: {
    environment: 'production',
    version: 'v1.2.3'
  }
});
```

## Input Validation

Validate inputs before running critical operations:

```yaml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      migration_name:
        description: 'Migration to run'
        required: true
        type: string

      confirm:
        description: 'Type "MIGRATE" to confirm'
        required: true
        type: string

jobs:
  migrate:
    runs-on: ubuntu-latest

    steps:
      - name: Validate confirmation
        if: ${{ github.event.inputs.confirm != 'MIGRATE' }}
        run: |
          echo "Error: You must type MIGRATE to confirm"
          exit 1

      - name: Validate migration name
        run: |
          MIGRATION="${{ github.event.inputs.migration_name }}"
          # Check migration name format
          if [[ ! "$MIGRATION" =~ ^[0-9]{14}_[a-z_]+$ ]]; then
            echo "Error: Invalid migration name format"
            echo "Expected: YYYYMMDDHHMMSS_migration_name"
            exit 1
          fi

      - uses: actions/checkout@v4

      - name: Run migration
        run: ./run-migration.sh "${{ github.event.inputs.migration_name }}"
```

## Combining with Other Triggers

Workflow dispatch works alongside automatic triggers:

```yaml
name: Build and Deploy

on:
  # Automatic trigger on push
  push:
    branches: [main]

  # Manual trigger with options
  workflow_dispatch:
    inputs:
      skip_tests:
        description: 'Skip test suite'
        type: boolean
        default: false

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Build
        run: npm run build

      # Skip tests only on manual trigger with skip_tests=true
      - name: Run tests
        if: ${{ github.event_name != 'workflow_dispatch' || github.event.inputs.skip_tests != 'true' }}
        run: npm test
```

## Environment-Aware Deployments

Use environment input for controlled deployments:

```yaml
name: Deploy to Environment

on:
  workflow_dispatch:
    inputs:
      target_env:
        description: 'Target environment'
        type: environment
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    # Dynamic environment from input
    environment: ${{ github.event.inputs.target_env }}

    steps:
      - uses: actions/checkout@v4

      - name: Deploy
        env:
          # Secrets resolve to the selected environment
          API_KEY: ${{ secrets.API_KEY }}
          DB_URL: ${{ secrets.DATABASE_URL }}
        run: |
          echo "Deploying to ${{ github.event.inputs.target_env }}"
          ./deploy.sh
```

## Rollback Workflows

Build manual rollback capabilities:

```yaml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to rollback'
        type: choice
        required: true
        options:
          - staging
          - production

      target_version:
        description: 'Version to rollback to'
        type: string
        required: true

      reason:
        description: 'Reason for rollback'
        type: string
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}

    steps:
      - uses: actions/checkout@v4

      - name: Log rollback
        run: |
          echo "Rollback initiated by: ${{ github.actor }}"
          echo "Environment: ${{ github.event.inputs.environment }}"
          echo "Target version: ${{ github.event.inputs.target_version }}"
          echo "Reason: ${{ github.event.inputs.reason }}"

      - name: Perform rollback
        run: |
          ./rollback.sh \
            --env ${{ github.event.inputs.environment }} \
            --version ${{ github.event.inputs.target_version }}

      - name: Notify team
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: 'deployments'
          slack-message: |
            :warning: Rollback performed
            Environment: ${{ github.event.inputs.environment }}
            Version: ${{ github.event.inputs.target_version }}
            By: ${{ github.actor }}
            Reason: ${{ github.event.inputs.reason }}
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

## Maintenance Mode Workflow

Toggle maintenance mode manually:

```yaml
name: Maintenance Mode

on:
  workflow_dispatch:
    inputs:
      action:
        description: 'Enable or disable maintenance mode'
        type: choice
        required: true
        options:
          - enable
          - disable

      message:
        description: 'Maintenance message for users'
        type: string
        default: 'We are performing scheduled maintenance. Please check back soon.'

jobs:
  maintenance:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-region: us-east-1
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}

      - name: Toggle maintenance mode
        run: |
          if [ "${{ github.event.inputs.action }}" == "enable" ]; then
            # Enable maintenance page
            aws s3 cp maintenance.html s3://my-bucket/index.html
            echo "Maintenance mode enabled"
          else
            # Restore normal operation
            aws s3 rm s3://my-bucket/index.html
            echo "Maintenance mode disabled"
          fi

      - name: Update status page
        run: |
          curl -X POST https://api.statuspage.io/v1/pages/$PAGE_ID/incidents \
            -H "Authorization: OAuth ${{ secrets.STATUSPAGE_TOKEN }}" \
            -d '{
              "incident": {
                "name": "Scheduled Maintenance",
                "status": "${{ github.event.inputs.action == 'enable' && 'investigating' || 'resolved' }}",
                "body": "${{ github.event.inputs.message }}"
              }
            }'
```

## Scheduled Tasks with Manual Override

Combine schedules with manual triggers:

```yaml
name: Database Backup

on:
  # Run daily at 2 AM
  schedule:
    - cron: '0 2 * * *'

  # Allow manual trigger for ad-hoc backups
  workflow_dispatch:
    inputs:
      backup_type:
        description: 'Backup type'
        type: choice
        default: 'incremental'
        options:
          - incremental
          - full

jobs:
  backup:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Determine backup type
        id: backup-type
        run: |
          # Manual trigger uses input, scheduled uses incremental
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            echo "type=${{ github.event.inputs.backup_type }}" >> $GITHUB_OUTPUT
          else
            echo "type=incremental" >> $GITHUB_OUTPUT
          fi

      - name: Run backup
        run: ./backup.sh --type ${{ steps.backup-type.outputs.type }}
```

---

Workflow dispatch gives you control over when and how workflows run. Use it for deployments that need approval, maintenance tasks that require timing, and any operation where human judgment matters. Combined with input validation and environment protection rules, manual workflows become a safe way to perform sensitive operations while maintaining an audit trail.
