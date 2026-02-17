# How to Configure dbt Cloud with BigQuery Service Account Authentication and CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, dbt Cloud, CI/CD, Service Account, DevOps

Description: A complete guide to setting up dbt Cloud with BigQuery using service account authentication, configuring environments, and building CI/CD pipelines for automated testing and deployment.

---

dbt Cloud takes the operational overhead out of running dbt. Instead of managing your own scheduler, CI server, and dbt Core installation, you get a hosted platform that handles job scheduling, pull request testing, documentation hosting, and environment management. When paired with BigQuery, the setup involves connecting a service account, configuring deployment environments, and setting up CI/CD workflows.

This guide walks through the full setup from creating the service account to running automated tests on every pull request.

## Creating the BigQuery Service Account

The service account needs specific BigQuery permissions to create datasets, run queries, and manage tables. Here is the minimum set of roles:

```bash
# Create a dedicated service account for dbt Cloud
gcloud iam service-accounts create dbt-cloud \
  --display-name="dbt Cloud Service Account" \
  --description="Used by dbt Cloud for data transformation"

# Assign the required BigQuery roles
# BigQuery Data Editor: create/modify/delete tables and views
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:dbt-cloud@my-project.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

# BigQuery Job User: run BigQuery jobs (queries)
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:dbt-cloud@my-project.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

# BigQuery User: list datasets and get metadata
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:dbt-cloud@my-project.iam.gserviceaccount.com" \
  --role="roles/bigquery.user"

# Generate the service account key file
gcloud iam service-accounts keys create dbt-cloud-key.json \
  --iam-account=dbt-cloud@my-project.iam.gserviceaccount.com
```

If your dbt project creates new datasets (not just tables within existing datasets), you also need:

```bash
# Optional: allow dbt Cloud to create new BigQuery datasets
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:dbt-cloud@my-project.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataOwner"
```

## Connecting dbt Cloud to BigQuery

In the dbt Cloud interface, create a new project and select BigQuery as the connection type. You will need to upload the service account JSON key file.

The connection settings in dbt Cloud map to the same fields in your local `profiles.yml`:

```yaml
# These are the settings you will configure in dbt Cloud's UI
# You do not create this file - it is shown for reference
connection:
  type: bigquery
  method: service-account-json    # Upload the JSON key in the UI
  project: my-gcp-project         # GCP project ID
  dataset: dbt_production         # Default BigQuery dataset
  threads: 8                      # Parallel execution threads
  timeout_seconds: 300            # Query timeout
  location: US                    # BigQuery data location
  priority: interactive           # Query priority
  retries: 3                      # Retry count on failure
```

After entering these settings, click "Test Connection" to verify that dbt Cloud can reach BigQuery with the service account credentials.

## Connecting Your Git Repository

dbt Cloud needs access to your dbt project's Git repository. It supports GitHub, GitLab, Azure DevOps, and Bitbucket.

For GitHub, the process is straightforward:

1. In dbt Cloud, go to Account Settings and connect your GitHub account
2. Authorize the dbt Cloud GitHub App for your organization
3. Select the repository that contains your dbt project

dbt Cloud will clone the repo and detect the dbt project structure automatically.

## Configuring Environments

dbt Cloud uses environments to manage different deployment targets. A typical setup has three environments: development, CI/staging, and production.

### Development Environment

The development environment is what your team uses in the dbt Cloud IDE for interactive development:

```yaml
# Development environment settings (configured in dbt Cloud UI)
name: Development
type: development
dbt_version: 1.7.0              # Pin to a specific dbt version
target_name: dev
dataset: dbt_dev_<developer>    # Each developer gets their own dataset
# The dataset uses a per-developer suffix to avoid conflicts
```

### Production Environment

The production environment runs your scheduled jobs:

```yaml
# Production environment settings
name: Production
type: deployment
dbt_version: 1.7.0
target_name: prod
dataset: analytics              # The production BigQuery dataset
deploy_branch: main             # Which git branch to deploy from
```

### CI/Staging Environment

The CI environment is used for pull request testing:

```yaml
# CI environment settings
name: CI
type: deployment
dbt_version: 1.7.0
target_name: ci
dataset: dbt_ci                 # Temporary dataset for CI builds
# dbt Cloud appends a PR-specific suffix to avoid conflicts
```

## Setting Up the Production Job

Create a job that runs your dbt pipeline on a schedule:

```yaml
# Production job configuration (set up in dbt Cloud UI)
name: Daily Production Run
environment: Production
commands:
  - dbt snapshot                 # Run snapshots first
  - dbt run                     # Build all models
  - dbt test                    # Run all tests
schedule:
  cron: "0 6 * * *"            # Every day at 6:00 AM UTC
settings:
  threads: 8
  generate_docs: true           # Auto-generate documentation
  defer_to_prod: false          # Run everything, not just changes
```

You can also set up notifications for job failures:

```yaml
# Notification settings for the production job
notifications:
  email:
    - data-team@company.com
  slack:
    channel: "#data-pipeline-alerts"
    on_failure: true
    on_success: false            # Only notify on failures to reduce noise
```

## Setting Up CI on Pull Requests

This is where dbt Cloud really shines. You can configure it to automatically run your dbt pipeline against every pull request, so you catch issues before they hit production.

Create a CI job:

```yaml
# CI job configuration
name: PR Validation
environment: CI
trigger: pull_request            # Runs automatically on every PR
commands:
  - dbt build --select state:modified+  # Only build changed models and dependents
settings:
  threads: 4
  defer_to_production: true      # Compare against production to find changes
```

The `state:modified+` selector is key. It compares the PR branch to the production manifest and only runs models that have changed (plus their downstream dependents). This keeps CI fast and cheap.

The `defer_to_production` setting tells dbt Cloud to use production tables for any upstream models that have not changed. So if you modify a mart model but its staging model is unchanged, the CI job reads the staging data from the production dataset rather than rebuilding it.

## Slim CI for Cost Efficiency

For large projects, even running modified models can be expensive. Slim CI takes it further by only building what is strictly necessary:

```yaml
# Slim CI: even more selective about what to build
name: Slim CI
environment: CI
trigger: pull_request
commands:
  # Only run models modified in this PR, plus their direct dependents
  - dbt build --select state:modified+1
  # Run tests only on the modified models
  - dbt test --select state:modified
settings:
  defer_to_production: true
```

The `+1` suffix means "only one level of downstream dependents" instead of all downstream models. This significantly reduces the blast radius of CI runs.

## Project Configuration for Multi-Environment Support

Your `dbt_project.yml` should support multiple environments cleanly:

```yaml
# dbt_project.yml
name: 'my_analytics'
version: '1.0.0'

# Use target-specific dataset naming
models:
  my_analytics:
    staging:
      +materialized: view
      +schema: staging              # Creates a 'staging' suffix on the dataset

    marts:
      +materialized: table
      +schema: marts

# Different test behavior per environment
tests:
  my_analytics:
    +severity: "{{ 'error' if target.name == 'prod' else 'warn' }}"
    +store_failures: "{{ true if target.name == 'prod' else false }}"
```

## Managing Secrets and Variables

dbt Cloud supports environment variables for managing configuration that differs between environments:

```yaml
# Environment variables (configured in dbt Cloud UI, not in code)
# These are available in your dbt models via env_var()

# Production environment
DBT_BIGQUERY_DATASET: analytics
DBT_ENV: prod

# CI environment
DBT_BIGQUERY_DATASET: dbt_ci
DBT_ENV: ci
```

Use them in your models:

```sql
-- Reference environment variables in your SQL
-- This lets the same model code work across environments
SELECT *
FROM {{ source('raw', 'events') }}
{% if env_var('DBT_ENV', 'dev') == 'prod' %}
WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
{% else %}
WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
{% endif %}
```

## Monitoring and Alerting

dbt Cloud provides built-in monitoring for job runs. Set up alerts to catch failures early:

```bash
# Use the dbt Cloud API to check job status programmatically
# Useful for integrating with external monitoring tools like OneUptime

curl -H "Authorization: Token your-api-token" \
  "https://cloud.getdbt.com/api/v2/accounts/{account_id}/runs/?job_definition_id={job_id}&order_by=-id&limit=1"
```

You can also use dbt Cloud's webhook feature to send job completion events to external systems:

```json
{
  "name": "Pipeline Status Webhook",
  "event_types": ["job.run.completed", "job.run.errored"],
  "client_url": "https://your-monitoring-service.com/webhooks/dbt",
  "active": true
}
```

## Best Practices

Keep your production dataset and CI dataset in the same BigQuery location to avoid cross-region query costs. Pin your dbt version across all environments to prevent unexpected behavior from version differences. Use the `defer_to_production` setting in CI to minimize costs. Set up email and Slack notifications for production job failures. Run `dbt source freshness` as the first step in your production job to catch upstream data issues early.

## Wrapping Up

dbt Cloud with BigQuery gives you a complete managed platform for data transformation. The service account setup is a one-time configuration, environment management keeps dev, CI, and production cleanly separated, and the CI/CD integration catches issues before they reach production. The state-based selection in CI builds means you only pay for testing what changed, keeping costs proportional to the scope of changes rather than the size of your entire project.
