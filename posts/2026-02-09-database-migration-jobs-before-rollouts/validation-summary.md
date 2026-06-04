# Validation Summary: How to Run Database Migration Jobs Before Deployment Rollouts

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes Jobs
- Kubernetes init containers
- kubectl
- Helm hooks
- PostgreSQL advisory locks and schema changes
- Flyway
- Django management commands

## Sources Consulted
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Jobs documentation and API reference: https://kubernetes.io/docs/concepts/workloads/controllers/job/ and https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/job-v1/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes volumes documentation for emptyDir behavior: https://kubernetes.io/docs/concepts/storage/volumes/
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- PostgreSQL advisory lock functions: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL ALTER TABLE documentation: https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL CREATE INDEX documentation: https://www.postgresql.org/docs/current/sql-createindex.html
- Redgate Flyway migrate command documentation: https://documentation.red-gate.com/flyway/reference/commands/migrate
- Redgate Flyway locations setting documentation: https://documentation.red-gate.com/flyway/reference/configuration/flyway-namespace/flyway-locations-setting

## Issues Found
- The first Kubernetes Job example placed `backoffLimit` under the pod template spec. `backoffLimit` is a Job spec field, so it was moved to `spec.backoffLimit`.
- The pre-migration Deployment example uses `kubectl wait` from an init container, but the post did not mention that the pod's service account needs permission to read Job status. Added a concise RBAC caveat.
- The Helm hook explanation said the hook weight ensures the migration job runs before other resources. Helm hook weights order hooks relative to other hooks; pre-install and pre-upgrade hook phases are what place the job before normal install or upgrade work. Updated the explanation.
- The rolling deployment example used a busybox init container polling an `emptyDir` file. `emptyDir` is local to one pod and starts empty for that pod, so it cannot observe completion from a separate migration Job. Replaced it with a `kubectl wait` init container against the migration Job.
- The rolling deployment example omitted the required `.spec.selector` for an `apps/v1` Deployment. Added a selector matching the pod template labels.

## Review Notes
The corrected examples are syntactically valid YAML, excluding the Helm template snippet that intentionally contains Go template expressions. The `kubectl wait` examples are technically valid but depend on in-cluster RBAC when run from an init container. For production use, migration jobs should also use immutable image tags and explicit service accounts.
