# Validation Summary: How to Push OCI Artifacts to a Registry with Flux CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- OCI artifacts
- Container registries
- Kubernetes manifests
- GitHub Actions
- Docker registry authentication
- AWS ECR authentication

## Sources Consulted
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux CLI `push artifact` reference: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `tag artifact` reference: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux CLI `list artifacts` reference: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- GitHub Actions contexts reference: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs

## Issues Found
- The `--revision` examples used `<branch>/<sha>`, but Flux documents the flag format as `<branch|tag>@sha1:<commit-sha>`. Updated all examples and the flag description to use the documented format.
- The post claimed multiple tags could be pushed in one command by repeating the tag in the URL. Flux documents adding extra tags with `flux tag artifact`; updated the wording accordingly.
- The artifact annotation names in the diagram used `source.toolkit.fluxcd.io/source` and `source.toolkit.fluxcd.io/revision`, but Flux stores the source and revision as OpenContainers annotations. Updated them to `org.opencontainers.image.source` and `org.opencontainers.image.revision`.
- The media type section listed `application/vnd.oci.image.layer.v1.tar+gzip` as the default content media type. Flux documents custom media types for the artifact manifest, config, and content layer. Updated the section with the documented Flux media types.
- The troubleshooting authentication test used `docker pull` against a Flux OCI artifact. Replaced it with `flux list artifacts`, which is the Flux CLI command documented for listing remote OCI artifact tags and metadata.

## Review Notes
The Flux CLI was not installed in the local environment, so command behavior was verified against official Flux CLI documentation rather than local `--help` output.
