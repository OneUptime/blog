# Validation Summary: How to Build Helm Hooks Advanced

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Helm hooks and chart tests
- Kubernetes Jobs
- Kubernetes kubectl commands
- PostgreSQL backup commands
- AWS CLI
- HashiCorp Vault
- Prometheus query API usage from shell scripts

## Sources Consulted
- Helm Chart Hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- Helm Chart Tests documentation: https://helm.sh/docs/topics/chart_tests/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes TTL-after-finished documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- AWS CLI official container image documentation: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-docker.html
- curl official container image repository: https://github.com/curl/curl-container
- Local Docker image inspection for `postgres:15-alpine`, `curlimages/curl:8.4.0`, and `hashicorp/vault:1.15`

## Issues Found
- The hook lifecycle table said `pre-install` runs before any release resources are installed and `post-install` runs after all resources are installed. Updated the wording to match Helm's lifecycle: `pre-install` runs after rendering and before Kubernetes resource creation, and `post-install` runs after resources are loaded, with readiness waiting only when `--wait` is used.
- The hook ordering explanation omitted Helm's tie-breakers. Added that hooks with the same weight are sorted by resource kind and name.
- The backup hook used `postgres:15-alpine` while running `aws s3 cp`. Local inspection confirmed the stock Postgres image has `pg_dump` and `gzip` but not `aws`. Changed the example to use a custom image that includes the required tools.
- The backup hook used `pg_dump -Fc` while naming the output `*.sql.gz`. Changed the command to plain `pg_dump | gzip` so the filename and dump format agree.
- The canary section implied Helm hooks perform canary traffic splitting and rollback by themselves. Updated the section to describe canary analysis with traffic managed by a Deployment strategy, service mesh, or progressive delivery controller, and changed the failure path to fail the release.
- The canary analysis hook used `curlimages/curl:8.4.0` while running `jq`. Local inspection confirmed that image has `curl` and `bc` but not `jq`. Changed the example to use an image that includes `curl`, `jq`, and `bc`.
- The secret rotation hook used `hashicorp/vault:1.15` while running `kubectl` and `jq`. Local inspection confirmed the image has `vault` but not `kubectl` or `jq`. Changed the example to use an image that includes all required tools.
- The kubectl helper images were pinned to Kubernetes 1.28. Updated them to 1.36 to align with the current Kubernetes documentation version consulted during review.
- The delete policy examples claimed `before-hook-creation` keeps all history and that an empty hook-delete-policy means "never auto-delete." Updated this to Helm's documented default behavior: hook resources are kept until the next hook run when `before-hook-creation` applies.
- The debugging command used `kubectl delete job --force --grace-period=0`. Replaced it with a normal job delete using `--timeout=30s`; Kubernetes documents force deletion caveats and `--grace-period=0` is only valid with `--force`.

## Review Notes
The remaining snippets are advanced templates and assume the referenced custom images, service accounts, RBAC permissions, secrets, and application-specific commands exist. The post is technically valid as a pattern guide after the fixes, but future revisions could add RBAC examples for hooks that call `kubectl`.
