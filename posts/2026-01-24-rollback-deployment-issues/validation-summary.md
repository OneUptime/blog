# Validation Summary: How to Fix 'Rollback' Deployment Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes Deployments, rollout history, rollout undo, readiness probes, and rolling update settings
- Kubernetes ConfigMaps, Secrets, Pods, and finalizers
- Amazon ECR lifecycle policies and image tag immutability
- PostgreSQL `pg_restore`
- Alembic and SQLAlchemy migrations
- Argo Rollouts canary analysis with Prometheus
- GitHub Actions scheduled workflows and step outputs
- Bash scripting
- Flask health endpoints

## Sources Consulted
- Kubernetes kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- Kubernetes kubectl rollout history reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod disruptions and PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Amazon ECR lifecycle policy documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html
- Amazon ECR lifecycle policy properties: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Amazon ECR image tag mutability documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html
- PostgreSQL `pg_restore` documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- Alembic operation reference: https://alembic.sqlalchemy.org/en/latest/ops.html
- Argo Rollouts analysis documentation: https://argo-rollouts.readthedocs.io/en/stable/features/analysis/
- Argo Rollouts specification documentation: https://argo-rollouts.readthedocs.io/en/stable/features/specification/
- GitHub Actions workflow commands documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions

## Issues Found
- The AWS ECR lifecycle policy was marked as YAML and included JSON content. Changed the code fence to JSON and removed the invalid comment from inside the policy.
- The ECR `tagPrefixList` used both `v` and `release`, which AWS evaluates as matching all listed prefixes rather than either prefix. Changed it to a single `v` prefix so the policy keeps the latest 30 matching version-tagged images as described.
- The image tag guidance implied that a version tag is automatically immutable. Clarified that registry tag immutability must be enabled, and added digest pinning as the exact-image option.
- The Kubernetes Deployment ConfigMap example omitted required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added the selector and labels.
- The ConfigMap cleanup script used unquoted shell variables in `kubectl` and test expressions. Quoted them to avoid shell parsing issues.
- The database rollback script used `set -u` while reading `$1` and `$2` directly, which would fail before showing the usage message when arguments were missing. Changed the assignments to `${1:-}` and `${2:-}`.
- The post stated that PodDisruptionBudgets can prevent Deployment rollbacks from completing. Kubernetes documentation says workload resources such as Deployments are not limited by PDBs during rolling upgrades. Replaced that section with rolling update strategy checks and a targeted `kubectl patch deployment` example.
- The Flask readiness example called `check_dependencies()` without defining it, so it would fail at runtime. Added a placeholder function and corrected the compatibility note.
- The Argo Rollouts example was presented as a full Rollout resource but omitted required selector/template fields. Added a minimal selector and pod template.
- The GitHub Actions revision capture command used `tail -2 | head -1`, which can capture the wrong revision depending on output shape. Replaced it with an `awk` command that records the last numeric revision and writes it to `$GITHUB_OUTPUT`.
- The summary takeaway about PodDisruptionBudgets blocking rollbacks was updated to refer to rolling update settings instead.

## Review Notes
The remaining examples are intentionally illustrative and still assume environment-specific prerequisites such as cluster credentials, image names, namespaces, Prometheus metrics, and database backups. The force-delete and finalizer commands are technically valid but should remain last-resort operational actions.
