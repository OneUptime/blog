# Validation Summary: How to Configure OCIRepository Digest Pinning in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller OCIRepository
- Kubernetes custom resources
- OCI registries and artifact digests
- Flux CLI
- kubectl
- GitHub Actions
- Cosign signature verification
- crane / ORAS registry tooling

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI `flux push artifact` documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `flux list artifacts` documentation: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux v2.6 OCIRepository documentation: https://v2-6.docs.fluxcd.io/flux/components/source/ocirepositories/
- GitHub Actions contexts reference: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs
- ORAS `oras manifest fetch` documentation: https://oras.land/docs/commands/oras_manifest_fetch/
- go-containerregistry crane package documentation: https://pkg.go.dev/github.com/google/go-containerregistry/pkg/crane

## Issues Found
- The prerequisites said Flux CD v0.35 or later, but the examples use `source.toolkit.fluxcd.io/v1` for OCIRepository. Updated the prerequisite to Flux v2.6 or later for that API version.
- The `flux push artifact` examples described parsing a human-readable `digest:` line. Updated examples to use the documented `--output json` option and parse `.digest` in CI.
- The verification step said `.status.artifact.revision` should match the digest exactly. Flux reports the revision as a reference string containing the digest, commonly in `<tag>@<digest>` form, so the text now says it should include the expected digest.
- The CI section said it updates the digest in the cluster, but the workflow edits and pushes the Git manifest. Updated the wording to say it updates the digest in Git.

## Review Notes
The OCIRepository `ref.digest`, `verify.provider: cosign`, `secretRef`, Kustomization `sourceRef`, `flux list artifacts`, `crane digest`, and registry manifest inspection examples are consistent with current official documentation. The Cosign public-key secret still needs keys with `.pub` filenames in a real deployment, as noted in Flux documentation, but the post only references the secret name.
