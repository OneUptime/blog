# Validation Summary: How to Build Kubernetes Init Container Patterns

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes Deployments, Pods, init containers, volumes, ConfigMaps, and kubectl
- Istio sidecar injection and startup coordination
- PostgreSQL advisory locks and psql
- HashiCorp Vault Kubernetes auth and KV CLI
- GNU envsubst
- Elasticsearch cluster health API
- AWS CLI and S3 object downloads

## Sources Consulted
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes volumes documentation for emptyDir: https://kubernetes.io/docs/concepts/storage/volumes/
- Istio sidecar injection problems / holdApplicationUntilProxyStarts: https://istio.io/latest/docs/ops/common-problems/injection/
- PostgreSQL psql documentation: https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL explicit locking and advisory locks: https://www.postgresql.org/docs/current/explicit-locking.html
- HashiCorp Vault Kubernetes auth method: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault kv get command: https://developer.hashicorp.com/vault/docs/commands/kv/get
- GNU gettext envsubst documentation: https://www.gnu.org/software/gettext/manual/html_node/envsubst-Invocation.html
- Elasticsearch cluster health API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-health

## Issues Found
- Corrected the init container failure explanation. Kubernetes restarts the failed init container until it succeeds, except when `restartPolicy: Never` causes the pod to fail; it does not generally "restart the pod according to the restart policy."
- Replaced the Istio init-container wait loop. A regular init container cannot wait for an injected sidecar on `localhost:15021` because init containers complete before app and sidecar containers start. The example now uses Istio's `proxy.istio.io/config` annotation with `holdApplicationUntilProxyStarts`.
- Added `-v ON_ERROR_STOP=1` to the PostgreSQL migration example so SQL errors cause `psql` to exit non-zero instead of potentially allowing a failed migration script to continue.
- Removed the dependency on `jq` from the Vault example because the stock Vault image does not reliably include it. The example now writes Vault CLI JSON output directly to the shared volume.
- Changed the configuration templating init container from `busybox:1.36` to `nginx:1.25-alpine` because BusyBox does not provide GNU `envsubst`.
- Updated the dependency health check to accept Elasticsearch `_cluster/health` statuses of `green` and `yellow`, matching the Elasticsearch API.
- Updated the debugging log command to reference an init container name that still exists in the post after the Istio fix.

## Review Notes
- The YAML snippets were parsed successfully with PyYAML after edits.
- `git diff --check` reported no whitespace errors.
- The data preload checksum value remains illustrative; a real deployment must replace it with the full expected SHA-256 digest for the downloaded model.
