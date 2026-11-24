# Technical validation

The article reproduces merged Helm values with an official pinned chart and separates rendered key presence from non-null API fields. Local parser checks and isolated API validation cover zero and null boundaries.

## Checks performed

- Pulled official cert-manager OCI chart v1.18.2 at sha256:6b3b94c6af27a03390f0ee55a63d2524027d2517bf2f23d46de08211800d1a80 and rendered exact base/overlay, curated-values and null-overlay cases with Helm3.17.3
- Confirmed conflicting render contains two active integer limits; curated render has one; null overlay leaves a YAML null minAvailable with active maxUnavailable
- Executed eight Python/PyYAML6.0.3 parser cases including both render forms, null, integer0, both0, no limits and both null
- Sent eight dry-run JSON create requests to disposable Kubernetes1.34.0 API: conflict and both0 rejected422; intended single limits, explicit null and percentage accepted; negative maximum rejected; no PDB persisted
- Four values snippets and Python checker exactly match tested files; five shell blocks passed syntax; seven-node/six-edge Mermaid structurally checked
- Generated1280x720 social image and visually reviewed two-line title and branding without clipping

## Sources checked

- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/apis/policy/validation/validation.go
- https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- https://cert-manager.io/docs/installation/helm/
- https://helm.sh/docs/v3/chart_template_guide/values_files/
- https://github.com/cert-manager/cert-manager/blob/v1.18.2/deploy/charts/cert-manager/values.yaml
- https://github.com/cert-manager/cert-manager/blob/v1.18.2/deploy/charts/cert-manager/templates/poddisruptionbudget.yaml
- https://github.com/helm/helm/blob/v3.17.3/pkg/chartutil/coalesce.go
- https://helm.sh/docs/v3/helm/helm_get_values/
- https://helm.sh/docs/v3/helm/helm_upgrade/
- https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run
- https://helm.sh/docs/v3/helm/helm_template/
- https://helm.sh/docs/v3/chart_template_guide/function_list/
- https://github.com/cert-manager/cert-manager/issues/6118

## Limitations

- No cert-manager installation, real release upgrade, controller, certificate issuance or workload disruption was tested
- API tests used raw JSON create dry-runs; displayed kubectl apply dry-run and saved-values inspection were source-reviewed/syntax-checked rather than executed against an existing release
- OCI digest recorded; no chart signature verification was performed; Mermaid structurally checked but not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
