# Validation summary

The published Go helper compiled and passed tests using Go1.25.0. An actual k8s.io/api v0.28.4 Pod round trip lost the newer spec.resources field as described. Tests applied the helper patches using evanphx/json-patch/v5 v5.9.11 and verified preservation and idempotence for existing, absent, null, empty, explicit and synthetic-future-field cases. Seven malformed inputs were rejected. The Pod fixture passed Kubernetesv1.35.0 OpenAPI validation.

Official Go decoding documentation, historical Pod types, controller-runtime patch helper source, admission response requirements, resource documentation and JSON Pointer rules were reviewed. Sources are listed in validation.json.

The Mermaid graph passed structural checks (five nodes, five edges). The generated social image was visually reviewed and has a readable, unclipped title.

No webhook server or Kubernetes API request ran. AdmissionReview wiring was reviewed but not executed. The synthetic field is deliberately a local fixture, not a claim of API acceptance. No live Pod-level-resource feature behavior was tested.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
