# Validation Summary: How to Use FinOps for Observability: Enforce Cost Budgets Per Service

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry
- FinOps
- Prometheus and PromQL
- GitHub Actions
- Kubernetes and kubectl
- Python
- YAML

## Sources Consulted
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.9/querying/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/3.0/querying/operators/
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub webhook payload documentation for push events: https://docs.github.com/en/webhooks/webhook-events-and-payloads#push
- GitHub REST API documentation for repository custom properties: https://docs.github.com/en/rest/repos/custom-properties
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The Python `get_current_spend()` example only queried span spend even though the post tracks both spans and logs. Updated the PromQL query to include `logs_per_team_total` using the configured log cost rate, and added `resp.raise_for_status()` so HTTP errors do not get treated as successful empty spend.
- The Python example imported `json` and `subprocess` but did not use them. Removed those imports to keep the example clean and directly runnable.
- The GitHub Actions workflow used `${{ github.event.repository.custom_properties.team }}`. The `github.event` context is the triggering webhook payload, and the documented push payload does not expose repository custom properties there. Changed the example to use `${{ vars.TEAM }}`, which is a documented GitHub Actions configuration variable context.
- The deploy job used `kubectl apply -f k8s/` without checking out the repository in that job. Added `actions/checkout@v4` to the deploy job so the `k8s/` manifests are present.
- The Prometheus alert expression added span and log increases before aggregation, which requires matching label sets between the two metrics and can drop data if the metrics have different labels. Changed the expression to aggregate each metric by `team_name` before adding the cost components, then divide by the budget metric.

## Review Notes
The examples assume the telemetry counters `spans_per_team_total`, `logs_per_team_total`, and `observability_budget_usd` already exist with compatible `team_name` labels. The Kubernetes deployment step also assumes `kubectl` has already been authenticated to the target cluster.
