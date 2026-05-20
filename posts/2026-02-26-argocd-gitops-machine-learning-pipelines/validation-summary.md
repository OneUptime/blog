# Validation Summary: How to Implement GitOps for Machine Learning Pipelines with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- KServe
- Argo Workflows
- MLflow
- Feast
- GitHub Actions
- Prometheus Operator

## Sources Consulted
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo Workflows CronWorkflow documentation: https://argo-workflows.readthedocs.io/en/latest/cron-workflows/
- KServe CRD API reference: https://kserve.github.io/website/docs/reference/crd-api
- KServe canary rollout example: https://kserve.github.io/website/docs/model-serving/predictive-inference/rollout-strategies/canary-example
- MLflow backend store documentation: https://mlflow.org/docs/latest/self-hosting/architecture/backend-store/
- MLflow CLI reference: https://mlflow.org/docs/latest/api_reference/cli.html
- MLflow Docker image documentation: https://mlflow.org/docs/latest/ml/docker
- Feast Python feature server documentation: https://docs.feast.dev/reference/feature-servers/python-feature-server
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- GitHub Actions checkout action documentation: https://github.com/actions/checkout
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The KServe production overlay described "higher resources" but only changed `minReplicas`. Updated the wording to "higher replica floor" and added a `storageUri` patch so `canaryTrafficPercent` applies to a changed candidate model, matching the KServe canary rollout pattern.
- The GitHub Actions promotion job attempted to push without explicitly granting `contents: write` permission or configuring a git author. Added job-level permissions and `git config` commands based on the official checkout action push example.
- The Argo Workflows CronWorkflow snippet used `spec.schedule`; current Argo Workflows documentation shows `spec.schedules` as a list. Updated the snippet accordingly.
- The Feast Deployment had a selector but no matching pod template labels, which Kubernetes rejects for `apps/v1` Deployments. Added `spec.template.metadata.labels.app: feast-server`.

## Review Notes
- The post is technically relevant and implementation-focused.
- The examples remain illustrative and still assume supporting resources exist, such as secrets, PostgreSQL, object storage credentials, KServe storage access, model buckets, and Prometheus/KServe metric names.
- `actions/checkout@v4` is still valid, though the official action has newer major versions available.
