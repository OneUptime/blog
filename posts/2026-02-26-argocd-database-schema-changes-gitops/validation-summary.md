# Validation Summary: How to Handle Database Schema Changes with GitOps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD sync hooks and sync waves
- Kubernetes Jobs, Deployments, and init containers
- Kustomize image transformations
- Django migrations and management commands
- Flyway migration locking
- PostgreSQL schema migration SQL
- kubectl and Argo CD CLI commands

## Sources Consulted
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Argo CD Cluster Bootstrapping / App of Apps documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Kubernetes Init Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes `kubectl logs` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Django `django-admin` and `manage.py` command reference: https://docs.djangoproject.com/en/6.0/ref/django-admin/
- Django migrations documentation: https://docs.djangoproject.com/en/6.0/topics/migrations/
- Flyway `lockRetryCount` documentation: https://documentation.red-gate.com/flyway/reference/configuration/flyway-namespace/flyway-lock-retry-count-setting
- PostgreSQL `ALTER TABLE` documentation: https://www.postgresql.org/docs/17/sql-altertable.html
- PostgreSQL `CREATE TABLE` documentation: https://www.postgresql.org/docs/17/sql-createtable.html

## Issues Found
- The original GitOps challenge section said there was no built-in concept of running work before deployment, which conflicted with Argo CD sync hooks. Changed the wording to explain that migrations must be modeled as Kubernetes resources or Argo CD hooks rather than as external deployment script steps.
- The Deployment init-container example was invalid for `apps/v1` because it omitted the required `.spec.selector` and matching `.spec.template.metadata.labels`. Added a selector and matching pod template labels.
- The Django concurrency guidance incorrectly implied that Django migrations automatically provide database-level locking suitable for multiple concurrent init containers. Changed it to state that Django records applied migrations but does not provide a cluster-wide lock around concurrent `migrate` processes, and recommended a single Job or an explicit database advisory lock.
- The Django command example was marked as a Python code block even though it was a shell command. Changed the fence to `bash`.
- The dedicated migration Application example implied sync waves alone order separate Applications. Added the App of Apps caveat so the Application resources are ordered within one Argo CD sync.
- The PostSync verification example used `python manage.py check --database default` to verify schema state. Replaced it with `python manage.py migrate --check`, which is the Django command option that exits non-zero when unapplied migrations are detected.

## Review Notes
The remaining examples are intentionally illustrative and use placeholder image names and repository URLs. The SQL examples are PostgreSQL-specific because they use `SERIAL` and `ADD COLUMN IF NOT EXISTS`; that is technically valid for PostgreSQL but should be called out if the post is later generalized to other databases.
