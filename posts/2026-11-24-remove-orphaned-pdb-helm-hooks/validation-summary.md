# Technical validation

The article reproduces Helm hook retention and tests deletion of a single disposable PDB with explicit identity/version preconditions. The final dry-run request uses a DeleteOptions body containing dryRun.

## Checks performed

- Executed actual Helm3.17.3 install/get-hooks/get-manifest/uninstall against disposable Kubernetes1.34.0 API/etcd; hook-created PDB retained identical UID after uninstall
- Executed exact article kubectl1.34.0 capture/proxy, jq1.6 request construction and curl8.7.1 DELETE calls; dryRun in request body preserved PDB resourceVersion
- Confirmed API handler decodes DeleteOptions body instead of query parameters when body is present; final preview places dryRun:[All] in the body
- Actual deletion with stale resourceVersion returned409 and retained object; fresh captured preconditions allowed deletion; old UID refused deletion of a recreated same-name PDB
- Nine jq identity guard fixtures passed; five shell blocks passed syntax; eight-node/eight-edge Mermaid structurally checked
- Generated1280x720 social image and visually inspected two-line title and branding without clipping

## Sources checked

- https://helm.sh/docs/v3/topics/charts_hooks/
- https://github.com/helm/helm/blob/v3.17.3/pkg/action/hooks.go
- https://github.com/helm/helm/blob/v3.17.3/pkg/kube/client.go
- https://helm.sh/docs/v3/helm/helm_get_hooks/
- https://helm.sh/docs/v3/helm/helm_get_manifest/
- https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- https://github.com/kubernetes/apimachinery/blob/v0.34.0/pkg/apis/meta/v1/types.go
- https://jqlang.org/manual/v1.6/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_proxy/
- https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.34/#delete-poddisruptionbudget-v1-policy
- https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run
- https://github.com/kubernetes/apiserver/blob/v0.34.0/pkg/endpoints/handlers/delete.go
- https://curl.se/docs/manpage.html
- https://github.com/helm/helm/issues/9206

## Limitations

- No running application, workload controller, node drain, production deletion or live ownership migration was tested
- The API fixture uses an authorized test client; target-cluster permissions, admission policies, finalizers and operational handover must be checked separately
- Mermaid structurally checked, not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
