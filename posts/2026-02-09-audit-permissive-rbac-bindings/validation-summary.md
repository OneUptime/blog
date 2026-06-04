# Validation Summary: How to Audit and Detect Overly Permissive RBAC Bindings Using RBAC-Lookup Tools

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- Kubernetes RBAC
- kubectl
- rbac-lookup
- rbac-tool
- jq
- Krew
- Polaris
- Fairwinds Insights

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RBAC good practices: https://kubernetes.io/docs/concepts/security/rbac-good-practices/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Fairwinds rbac-lookup usage documentation: https://rbac-lookup.docs.fairwinds.com/usage/
- FairwindsOps rbac-lookup GitHub releases/API and command source: https://github.com/FairwindsOps/rbac-lookup
- alcideio rbac-tool README and command reference: https://github.com/alcideio/rbac-tool
- Fairwinds Polaris dashboard documentation: https://polaris.docs.fairwinds.com/dashboard/
- Fairwinds Insights RBAC reporting documentation: https://insights.docs.fairwinds.com/technical-details/reports/rbac-reporter/

## Issues Found
- `rbac-lookup` was used as though it could query by role, resource, and verb. The documented tool looks up subjects and supports `--kind` and `--output` only, so cluster-admin role searches were replaced with `kubectl get clusterrolebindings -o json | jq ...`, and verb/resource checks were replaced with documented `rbac-tool who-can` commands.
- The direct `rbac-lookup` download URL used a stale asset name. It was updated to derive the current release tag from the GitHub API and download the matching Linux x86_64 asset.
- `kubectl rbac-lookup --version` was not supported by the upstream command source. It was changed to `kubectl rbac-lookup --help`.
- The Secret `resourceNames` example combined named resources with `list`, which cannot constrain list requests to omitted object names. The example now uses `get` only.
- The pod debug Role granted both `create` and `get` to both `pods/exec` and `pods/log`. It now grants `create` for `pods/exec` and `get` for `pods/log` in separate rules.
- `rbac-tool viz --outformat json` was not documented as a valid JSON export path. The example now uses `rbac-tool policy-rules -o json` and parses the documented policy-rules JSON shape.
- The privilege escalation section listed roles with `bind`/`escalate` rather than showing subjects who can perform those actions. It now uses `rbac-tool who-can bind ...` and `rbac-tool who-can escalate ...`.
- The `rbac-tool` install command was changed from an undocumented `go install` command to the documented Krew install command.
- The Polaris install URL returned a missing release asset, and Polaris was described as detecting RBAC misconfigurations. The install command now follows the documented Helm installation, and the text distinguishes Polaris workload policy checks from Fairwinds Insights RBAC reporting.
- The CI example used invalid `rbac-lookup --output json`. It now uses `kubectl get clusterrolebindings -o json` with `jq`.

## Review Notes
The post is now technically accurate for the documented command interfaces checked during review. Several examples require `jq`, Krew-installed plugins, and live cluster credentials with enough read permissions to inspect RBAC resources.
