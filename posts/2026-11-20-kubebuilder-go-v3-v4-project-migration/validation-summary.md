# Validation summary

Actual Kubebuilder 3.14.0 go/v3 fixture was created with API, controller and defaulting/validation webhook metadata. The official binary SHA-256 matched checksums.txt. Its controller-gen 0.11.3 failed under Go 1.25.0, then generation/manifests/build passed with official checksum-verified Go 1.20.14. The target used verified Kubebuilder 4.9.0 and Go 1.25.0. Separate-directory alpha generate passed generation, fmt, vet and lint after putting the pinned CLI on PATH. Input file hashes remained unchanged.

Ported API field/marker, custom reconcile delay, webhook default and create/update rejection, and staging overlay. Target make generate/manifests, build and focused TestMigrated tests passed. Kustomize 5.7.1 rendered 21 objects; inspected required target/minLength, original deployment name/namespace, custom annotation and both webhook service namespaces. No full test suite, production upgrade, live admission/certificate issuance or old Kustomize3 render was performed. Source-backed migration and rendering guidance reviewed. Six-node six-edge Mermaid structurally checked, not rendered.

Generated 1280x720 social image visually inspected; full title and branding are legible and unclipped.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
