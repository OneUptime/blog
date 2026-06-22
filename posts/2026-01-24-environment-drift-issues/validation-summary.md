# Validation Summary: How to Fix 'Environment Drift' Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI and HCP Terraform/Terraform Cloud
- GitHub Actions
- AWS credentials action for GitHub Actions
- Kubernetes and kubectl
- Argo CD
- Kustomize
- Kubernetes RBAC
- Python
- DeepDiff
- PostgreSQL pg_dump
- Django migrations
- Prometheus alerting rules

## Sources Consulted
- HashiCorp Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp `setup-terraform` GitHub Action documentation: https://github.com/hashicorp/setup-terraform
- AWS `configure-aws-credentials` GitHub Action documentation: https://github.com/aws-actions/configure-aws-credentials
- Kubernetes `kubectl diff` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/metrics/
- HCP Terraform health assessments documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/health
- PostgreSQL `pg_dump` documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- Django migrations documentation: https://docs.djangoproject.com/en/6.0/topics/migrations/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- DeepDiff serialization documentation: https://zepworks.com/deepdiff/current/serialization.html
- yq usage documentation: https://mikefarah.gitbook.io/yq

## Issues Found
- The Terraform drift detection workflow used `hashicorp/setup-terraform` without disabling the Terraform wrapper. The wrapper is enabled by default, while this workflow relies on raw `terraform plan -detailed-exitcode` exit codes. Added `terraform_wrapper: false`.
- The AWS credentials step used OIDC-style role assumption but the workflow lacked the required `id-token: write` permission. Added explicit `contents: read` and `id-token: write` permissions.
- The Terraform drift detection script treated any non-2 exit code as "No drift detected", which would hide real Terraform errors. Added explicit handling for exit code 0, exit code 2, and error exit codes.
- The Kubernetes drift detection script treated any `kubectl diff` output as drift. Official `kubectl diff` exit codes distinguish no difference, difference, and command errors. Updated the script to use the exit code and fail on errors.
- The Kubernetes drift detection script defined `NAMESPACE` but did not use it, and did not quote manifest paths. Added `-n "$NAMESPACE"` and quoted file arguments.
- The Terraform import example said `terraform plan` should show no changes if import succeeded. Import success alone does not guarantee no planned changes; the Terraform configuration must match the imported resource. Updated the wording.
- The Terraform Cloud health assessment notes implied a workspace-level assessment interval setting. HCP Terraform documentation describes health assessment scheduling but not a per-workspace interval setting for Terraform Cloud users. Changed this to reviewing the health assessment schedule.
- The Kustomize base Deployment omitted the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added `spec.selector.matchLabels` and `spec.template.metadata.labels`.
- The Python DeepDiff example used `json.dumps(dict(diff), indent=2)`, which can fail for DeepDiff result types. Updated it to use DeepDiff's `to_json(indent=2)` serialization method.

## Review Notes
- The Prometheus Terraform drift alert uses an example Terraform drift metric. HCP Terraform health assessments expose drift in Terraform's UI/API, but Prometheus metric names depend on the exporter or integration in use.
- The Django migration check assumes the project's Django settings read `DATABASE_URL`; that is common in deployed Django projects but not a Django core behavior by itself.
