# Validation Summary: How to Pull OCI Artifacts from a Registry with Flux CLI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux CLI
- OCI artifacts
- Container registries
- Docker registry authentication
- GitHub Actions
- Kubernetes manifests and kubectl
- kubeconform

## Sources Consulted
- Flux CLI reference for `flux pull artifact`: https://fluxcd.io/flux/cmd/flux_pull_artifact/
- Flux CLI reference for `flux list artifacts`: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux CLI source for `pull_artifact.go`: https://github.com/fluxcd/flux2/blob/main/cmd/flux/pull_artifact.go
- Flux CLI source for `list_artifact.go`: https://github.com/fluxcd/flux2/blob/main/cmd/flux/list_artifact.go
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubeconform documentation: https://kubeconform.mandragor.org/docs/overview/

## Issues Found
- The example success output for `flux pull artifact` did not match the Flux CLI implementation. Updated it to show the digest and extraction message emitted by the command.
- The `latest` section described `latest` as the most recent version. Updated the wording to clarify that `latest` is just the artifact currently referenced by that mutable tag.
- The `latest` example omitted creation of the output directory. Added `mkdir -p ./latest-manifests` because `flux pull artifact` requires the output path to exist and be a directory.
- The "Pulling to Standard Output" section implied Flux can pipe artifact contents without writing to disk, but the example uses a temporary directory. Renamed and reworded the section to describe temporary processing accurately.
- The troubleshooting section said to check artifact size in `flux list artifacts` output, but the command outputs artifact, digest, source, and revision columns. Updated the advice to verify by pulling to a temporary directory and inspecting contents.

## Review Notes
The post is otherwise consistent with the current Flux CLI documentation: `flux pull artifact` supports OCI URLs, Docker credential configuration, `--output`, `--creds`, and provider-based authentication; `flux list artifacts` is valid for listing tags and metadata; and the GitHub Action setup example uses the officially documented Flux action.
