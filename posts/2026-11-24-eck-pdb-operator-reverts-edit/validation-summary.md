# Validation summary

Reviewed on 24 November 2026.

## Source and runtime evidence

The guide follows ECK3.2.0 source and CRD, distinguishing desired custom-resource policy from generated PDBs, default behavior from disabling, and ECK reconciliation from a higher-level configuration owner. The source list is recorded in validation.json.

Eight upstream reconciliation/template subtests passed using Go1.25.0 and fake Kubernetes clients. A separate disposable Kubernetes1.34.0 API loaded the official ECK3.2.0 Elasticsearch CRD. All three article shell blocks executed against explicit Elasticsearch, PDB and Pod fixtures. The exact JSON Patch preview retained annotations and unrelated Elasticsearch settings while replacing maxUnavailable with minAvailable2. Both stale identity/version guards failed as intended. The stored custom resource remained unchanged.

Additional API previews confirmed that merge-empty preserves an existing nested template, whole-field JSON Patch replacement creates an empty template, and merge-null removes the field. These tests support the article's distinction between resetting and disabling; they did not run a live ECK reconciliation loop.

Three shell blocks passed bash syntax. Mermaid structure was checked for seven nodes and seven edges. The generated1280x720 image was opened for visual review; its title and branding are fully visible.

## Limits

No Elasticsearch process, data traffic, ECK operator deployment/webhook, kubelet, scheduler or Kubernetes disruption controller ran. Elasticsearch9.1.0 was only an API fixture value. Local CRD validation does not replace admission checks, operator reconciliation or a safe maintenance rehearsal. The API server was stopped and its temporary kubeconfig removed. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
