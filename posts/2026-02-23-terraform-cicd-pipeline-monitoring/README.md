# How to Implement Terraform CI/CD Pipeline Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Monitoring, Observability, DevOps, Infrastructure as Code

Description: Set up monitoring and observability for your Terraform CI/CD pipelines covering execution metrics, failure tracking, drift detection, and performance dashboards.

---

Your Terraform CI/CD pipeline is infrastructure too, and it needs monitoring just like your applications. When a pipeline fails at 2 AM, you want to know immediately. When plan times slowly creep from 2 minutes to 15 minutes, you want to catch that trend before it becomes a problem. Pipeline monitoring gives you visibility into the health and performance of your infrastructure deployment process.

## What to Monitor

The key metrics for Terraform CI/CD pipelines fall into a few categories:

- Execution metrics: plan/apply duration, success/failure rates
- Resource metrics: number of resources managed, changes per deploy
- Cost metrics: estimated cost per apply
- Drift metrics: how often and how much drift occurs
- Pipeline health: queue times, runner utilization

## Collecting Pipeline Metrics

### GitHub Actions with Custom Metrics

```yaml
# .github/workflows/terraform-monitored.yml
name: Monitored Terraform Pipeline
on:
  push:
    branches: [main]

jobs:
  apply:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: |
          START=$(date +%s)
          terraform init -no-color
          DURATION=$(($(date +%s) - START))
          echo "init_duration=$DURATION" >> "$GITHUB_ENV"

      - name: Terraform Plan
        run: |
          START=$(date +%s)
          terraform plan -out=tfplan -no-color 2>&1 | tee plan.txt
          DURATION=$(($(date +%s) - START))
          echo "plan_duration=$DURATION" >> "$GITHUB_ENV"

          # Extract resource counts from plan
          terraform show -json tfplan > plan.json
          ADDS=$(jq '[.resource_changes[] | select(.change.actions[] == "create")] | length' plan.json)
          CHANGES=$(jq '[.resource_changes[] | select(.change.actions[] == "update")] | length' plan.json)
          DESTROYS=$(jq '[.resource_changes[] | select(.change.actions[] == "delete")] | length' plan.json)
          TOTAL=$(jq '.resource_changes | length' plan.json)

          echo "adds=$ADDS" >> "$GITHUB_ENV"
          echo "changes=$CHANGES" >> "$GITHUB_ENV"
          echo "destroys=$DESTROYS" >> "$GITHUB_ENV"
          echo "total_resources=$TOTAL" >> "$GITHUB_ENV"

      - name: Terraform Apply
        id: apply
        run: |
          START=$(date +%s)
          terraform apply -auto-approve tfplan -no-color 2>&1 | tee apply.txt
          DURATION=$(($(date +%s) - START))
          echo "apply_duration=$DURATION" >> "$GITHUB_ENV"

      # Send metrics to your monitoring system
      - name: Report Metrics
        if: always()
        run: |
          STATUS="${{ job.status }}"

          # Send to Datadog
          curl -X POST "https://api.datadoghq.com/api/v1/series" \
            -H "DD-API-KEY: ${{ secrets.DATADOG_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"series\": [
                {
                  \"metric\": \"terraform.pipeline.init_duration\",
                  \"points\": [[$(date +%s), ${{ env.init_duration }}]],
                  \"type\": \"gauge\",
                  \"tags\": [\"env:production\", \"status:${STATUS}\"]
                },
                {
                  \"metric\": \"terraform.pipeline.plan_duration\",
                  \"points\": [[$(date +%s), ${{ env.plan_duration }}]],
                  \"type\": \"gauge\",
                  \"tags\": [\"env:production\", \"status:${STATUS}\"]
                },
                {
                  \"metric\": \"terraform.pipeline.apply_duration\",
                  \"points\": [[$(date +%s), ${{ env.apply_duration || 0 }}]],
                  \"type\": \"gauge\",
                  \"tags\": [\"env:production\", \"status:${STATUS}\"]
                },
                {
                  \"metric\": \"terraform.pipeline.resources_added\",
                  \"points\": [[$(date +%s), ${{ env.adds || 0 }}]],
                  \"type\": \"gauge\",
                  \"tags\": [\"env:production\"]
                },
                {
                  \"metric\": \"terraform.pipeline.resources_changed\",
                  \"points\": [[$(date +%s), ${{ env.changes || 0 }}]],
                  \"type\": \"gauge\",
                  \"tags\": [\"env:production\"]
                },
                {
                  \"metric\": \"terraform.pipeline.resources_destroyed\",
                  \"points\": [[$(date +%s), ${{ env.destroys || 0 }}]],
                  \"type\": \"gauge\",
                  \"tags\": [\"env:production\"]
                },
                {
                  \"metric\": \"terraform.pipeline.success\",
                  \"points\": [[$(date +%s), $([ \"${STATUS}\" = \"success\" ] && echo 1 || echo 0)]],
                  \"type\": \"count\",
                  \"tags\": [\"env:production\"]
                }
              ]
            }"
```

### Prometheus Metrics with Pushgateway

If you use Prometheus, push metrics to a Pushgateway:

```yaml
- name: Push Metrics to Prometheus
  if: always()
  run: |
    cat << EOF | curl --data-binary @- "${{ secrets.PROMETHEUS_PUSHGATEWAY_URL }}/metrics/job/terraform/environment/production"
    # HELP terraform_plan_duration_seconds Duration of terraform plan
    # TYPE terraform_plan_duration_seconds gauge
    terraform_plan_duration_seconds ${{ env.plan_duration }}
    # HELP terraform_apply_duration_seconds Duration of terraform apply
    # TYPE terraform_apply_duration_seconds gauge
    terraform_apply_duration_seconds ${{ env.apply_duration }}
    # HELP terraform_resources_total Total resources in plan
    # TYPE terraform_resources_total gauge
    terraform_resources_total ${{ env.total_resources }}
    # HELP terraform_pipeline_success Pipeline success status
    # TYPE terraform_pipeline_success gauge
    terraform_pipeline_success $([ "${{ job.status }}" = "success" ] && echo 1 || echo 0)
    EOF
```

## Failure Alerting

Set up alerts for pipeline failures that need immediate attention:

```yaml
# .github/workflows/terraform-alerts.yml
- name: Alert on Failure
  if: failure()
  run: |
    # Get error details from apply output
    ERROR=$(grep -A 5 "Error:" apply.txt | head -20)

    # Page the on-call engineer via PagerDuty
    curl -X POST "https://events.pagerduty.com/v2/enqueue" \
      -H "Content-Type: application/json" \
      -d "{
        \"routing_key\": \"${{ secrets.PAGERDUTY_ROUTING_KEY }}\",
        \"event_action\": \"trigger\",
        \"payload\": {
          \"summary\": \"Terraform apply failed in production\",
          \"severity\": \"critical\",
          \"source\": \"github-actions\",
          \"custom_details\": {
            \"error\": \"$(echo "$ERROR" | head -5)\",
            \"commit\": \"${{ github.sha }}\",
            \"actor\": \"${{ github.actor }}\",
            \"run_url\": \"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}\"
          }
        }
      }"
```

## Drift Monitoring

Schedule periodic drift checks and track trends:

```yaml
# .github/workflows/drift-monitor.yml
name: Drift Monitoring
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  check-drift:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [staging, production]
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Check Drift
        id: drift
        working-directory: infrastructure/${{ matrix.environment }}
        run: |
          terraform init
          terraform plan -detailed-exitcode -no-color 2>&1 | tee drift.txt
          EXIT_CODE=${PIPESTATUS[0]}

          if [ $EXIT_CODE -eq 2 ]; then
            DRIFTED_RESOURCES=$(grep -c "will be" drift.txt || echo 0)
            echo "drift_detected=true" >> "$GITHUB_OUTPUT"
            echo "drifted_count=$DRIFTED_RESOURCES" >> "$GITHUB_OUTPUT"
          else
            echo "drift_detected=false" >> "$GITHUB_OUTPUT"
            echo "drifted_count=0" >> "$GITHUB_OUTPUT"
          fi

      - name: Record Drift Metrics
        run: |
          # Track drift over time
          curl -X POST "${{ secrets.METRICS_ENDPOINT }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"metric\": \"terraform.drift.detected\",
              \"value\": ${{ steps.drift.outputs.drift_detected == 'true' && 1 || 0 }},
              \"tags\": {
                \"environment\": \"${{ matrix.environment }}\",
                \"drifted_resources\": ${{ steps.drift.outputs.drifted_count }}
              }
            }"
```

## Pipeline Performance Dashboard

Create a dashboard that shows pipeline health at a glance. Here is a Grafana dashboard definition:

```json
{
  "dashboard": {
    "title": "Terraform Pipeline Health",
    "panels": [
      {
        "title": "Plan Duration (seconds)",
        "type": "timeseries",
        "targets": [{
          "expr": "terraform_plan_duration_seconds{environment='production'}"
        }]
      },
      {
        "title": "Apply Success Rate (24h)",
        "type": "stat",
        "targets": [{
          "expr": "sum(rate(terraform_pipeline_success[24h])) / sum(rate(terraform_pipeline_total[24h])) * 100"
        }]
      },
      {
        "title": "Resources Managed",
        "type": "timeseries",
        "targets": [{
          "expr": "terraform_resources_total{environment='production'}"
        }]
      },
      {
        "title": "Drift Frequency",
        "type": "timeseries",
        "targets": [{
          "expr": "sum(terraform_drift_detected) by (environment)"
        }]
      }
    ]
  }
}
```

## Audit Trail

Maintain a record of every Terraform operation for compliance:

```yaml
- name: Record Audit Entry
  if: always()
  run: |
    # Write audit log entry
    AUDIT_ENTRY=$(jq -n \
      --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --arg actor "${{ github.actor }}" \
      --arg commit "${{ github.sha }}" \
      --arg environment "production" \
      --arg action "apply" \
      --arg status "${{ job.status }}" \
      --arg run_id "${{ github.run_id }}" \
      --arg resources_added "${{ env.adds }}" \
      --arg resources_changed "${{ env.changes }}" \
      --arg resources_destroyed "${{ env.destroys }}" \
      '{
        timestamp: $timestamp,
        actor: $actor,
        commit: $commit,
        environment: $environment,
        action: $action,
        status: $status,
        run_id: $run_id,
        changes: {
          added: ($resources_added | tonumber),
          changed: ($resources_changed | tonumber),
          destroyed: ($resources_destroyed | tonumber)
        }
      }')

    # Send to your audit log storage
    echo "$AUDIT_ENTRY" | aws s3 cp - \
      "s3://terraform-audit-logs/$(date +%Y/%m/%d)/${{ github.run_id }}.json"
```

## Summary

Monitoring your Terraform CI/CD pipeline requires tracking:

1. Execution metrics - plan and apply duration, success rates
2. Resource metrics - adds, changes, and destroys per deployment
3. Failure alerting - immediate notification when applies fail
4. Drift monitoring - scheduled checks for configuration drift
5. Performance trends - dashboards showing pipeline health over time
6. Audit trail - complete record of who applied what and when

Start with failure alerting (the most critical) and execution duration tracking. Layer in drift monitoring and dashboards as your pipeline matures. For setting up the notification channels, see [Terraform CI/CD notifications for Slack and Teams](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-notifications-slack-teams/view).
