# Validation Summary: How to View and Filter Secrets in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Kubernetes environment)
- Kubernetes Secrets
- kubectl CLI
- Kubernetes RBAC (Role, RoleBinding)
- Kubernetes audit policy (audit.k8s.io/v1)
- Helm (release secret type)
- jq, base64, Go templates

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Secret types: https://kubernetes.io/docs/concepts/configuration/secret/#secret-types
- kubectl reference (get, create role, create rolebinding): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- kubectl JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes field selectors (supports `type` for Secrets): https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes audit policy reference: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Helm storage backend (release.v1 secrets): https://helm.sh/docs/topics/advanced/#storage-backends
- Portainer Kubernetes ConfigMaps & Secrets docs: https://docs.portainer.io/user/kubernetes/configurations

## Issues Found
- **Invalid use of `kubectl jsonpath` with `jq`**: The original command `kubectl get secret app-secrets -o jsonpath='{.data}' | jq 'keys'` does not work because kubectl's JSONPath output for maps is formatted using Go's default formatter (`map[key:value ...]`), which is not valid JSON. Piping this to `jq` fails. Replaced with `kubectl get secret app-secrets --namespace=production -o json | jq '.data | keys'`, which produces valid JSON that jq can parse.

## Review Notes
- The Portainer menu item has varied across versions — "ConfigMaps & Secrets" is the current label in Portainer 2.x for Kubernetes environments, while older versions used "Configurations". Keeping both references is fine.
- `base64 -d` is the GNU coreutils flag and works on Linux; macOS users should use `base64 -D` (or `base64 --decode`). Not changed since this is a well-known caveat.
- The `base64decode` Go template function used by kubectl is valid.
- Field selector `type=Opaque` is supported for Secrets as of Kubernetes 1.10+ and remains valid in current releases.
- The audit policy example (`audit.k8s.io/v1`) is correct and supported.
- `kubectl create role` and `kubectl create rolebinding` flag syntax are correct and current.
