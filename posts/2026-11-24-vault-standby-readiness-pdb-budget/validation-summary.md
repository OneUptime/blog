# Technical validation

The pinned Helm chart was rendered and checked against a local Kubernetes API. Vault health semantics were reviewed in official documentation and tagged source.

## Checks performed

- Reviewed official chart0.32.0 and Vault1.21.2 health source, including standby/performance-standby flags, uninitialized/sealed handling and OnDelete defaults
- Executed article Helm3.17.3 pull and template commands; exact rendered StatefulSet/PDB match the tested correction
- Four render cases passed: original OpenShift path, corrected standby path, optional performance-standby path, and reversed values order demonstrating lost correction
- Verified rendered three replicas, HTTPS port8200, unchanged probe timings, OnDelete and PDBmaxUnavailable1; full object comparison found only the intended readiness path changed
- Four rendered PDBs passed Kubernetes1.34.0 OpenAPI schema checks; eight objects passed strict server dry-run against a disposable Kubernetes1.34.0 API and zero objects were persisted
- Four shell blocks passed bash syntax; eight-node/eight-edge Mermaid structurally checked
- Generated1280x720 image and visually reviewed two-line title and branding without clipping

## Sources checked

- https://github.com/hashicorp/vault-helm/blob/v0.32.0/Chart.yaml
- https://developer.hashicorp.com/vault/api-docs/system/health
- https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/controller/disruption/disruption.go
- https://github.com/hashicorp/vault-helm/blob/v0.32.0/values.openshift.yaml
- https://github.com/hashicorp/vault-helm/issues/1173
- https://github.com/hashicorp/vault-helm/blob/v0.32.0/templates/server-statefulset.yaml
- https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/
- https://curl.se/docs/manpage.html
- https://github.com/hashicorp/vault/blob/v1.21.2/http/sys_health.go
- https://developer.hashicorp.com/vault/api-docs/system/health#parameters
- https://helm.sh/docs/helm/helm_pull/
- https://helm.sh/docs/helm/helm_template/
- https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#http-probes
- https://github.com/hashicorp/vault-helm/blob/v0.32.0/values.yaml
- https://github.com/hashicorp/vault-helm/blob/v0.32.0/templates/server-disruptionbudget.yaml
- https://github.com/hashicorp/vault-helm/blob/v0.32.0/templates/_helpers.tpl
- https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#update-strategies

## Limitations

- No Vault server, OpenShift cluster, probe execution, HA election, seal/unseal flow, live TLS port-forward, node drain or controlled restart ran
- Health response changes were verified from official source; curl and operational kubectl examples were source/syntax reviewed, not executed against Vault
- The rendering fixture intentionally omits installation prerequisites such as mounted TLS certificates, listener configuration, storage and seal setup; standard API acceptance does not establish OpenShift security admission
- Standalone StatefulSet OpenAPI validation rejected an optional null annotations field emitted by the official chart; the unmodified manifests were instead validated directly with the real Kubernetes API, which accepted them
- Mermaid was structurally checked but not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
