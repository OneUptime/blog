# Validation Summary: How to Handle Infrastructure Dependencies with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD sync waves and sync hooks
- Argo CD Application and ApplicationSet resources
- Kubernetes Deployments, Services, Secrets, Jobs, Ingresses, init containers, and CRDs
- Argo CD Lua custom health checks

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD ApplicationSet Progressive Syncs documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Cluster Bootstrapping and App of Apps documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/
- Argo CD CLI command reference for `argocd app sync`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD CLI command reference for `argocd app get`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Docker Official Image documentation for PostgreSQL: https://hub.docker.com/_/postgres

## Issues Found
- The post said Argo CD applies all resources simultaneously without explicit ordering. Argo CD still orders resources by phase, wave, kind, and name, with unannotated resources defaulting to wave 0. Changed the wording to say most resources land in the same sync wave without explicit dependency ordering.
- The Postgres Secret used a `password` key with `envFrom`, which would not set the `POSTGRES_PASSWORD` environment variable required by the official Postgres container image. Changed the Secret to use `stringData.POSTGRES_PASSWORD` and added a `url` key used by the migration Job.
- The ingress example referenced an `api-service` Service that was not defined. Added the missing Service in wave 2.
- The PreSync migration Job referenced `db-credentials` but did not specify the namespace used by the Secret in the earlier example. Added `namespace: my-app`.
- The sync phases section described only three phases as if they were exhaustive. Updated the wording to call PreSync, Sync, and PostSync the common hook phases for dependency ordering.
- The App-of-Apps example claimed sync waves ensure child Application health without noting that Argo CD 1.8 and later removed built-in health assessment for `argoproj.io/Application`. Added the official custom health check pattern required for wave ordering to wait on child Application health.
- The ApplicationSet progressive sync section omitted the current feature caveat. Added that Progressive Syncs are beta in current Argo CD releases and must be explicitly enabled.
- The init-container Deployment example lacked the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added those fields.

## Review Notes
All YAML snippets were syntax-checked after edits. Some example manifests still use placeholder image names, repository URLs, and domains, which is appropriate for a guide but would need replacement before use in a real cluster.
