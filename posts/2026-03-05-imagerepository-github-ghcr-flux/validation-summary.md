# Validation Summary: How to Configure ImageRepository for GitHub Container Registry in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux ImageRepository API
- Flux CLI
- Kubernetes Secrets
- GitHub Container Registry (GHCR)
- GitHub Packages authentication

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux Image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux CLI `create image repository` reference: https://fluxcd.io/flux/cmd/flux_create_image_repository/
- Flux CLI `get images repository` reference: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- GitHub Container registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Packages REST API documentation: https://docs.github.com/en/rest/packages/packages

## Issues Found
- The prerequisites said Flux image automation controllers were required. An ImageRepository is reconciled by the image-reflector-controller, so this was tightened to require Flux and the image-reflector-controller.
- The post referred generally to PATs and suggested fine-grained tokens. GitHub Container registry authentication documentation specifies personal access tokens (classic) for GitHub Packages registry authentication outside GitHub Actions, so the post now consistently says PAT (classic) and removes the fine-grained token suggestion.
- The post presented GitHub App installation tokens as a GHCR registry authentication alternative. GitHub App installation tokens are supported for some REST API package operations, but GitHub's Container registry authentication documentation does not present them as the registry authentication mechanism for this Flux use case. The section was corrected to describe the limitation and point back to the PAT (classic) Secret.
- The custom `exclusionList` example omitted Flux's default Cosign signature exclusion. Because setting `exclusionList` replaces the default list, the example now includes `^.*\\.sig$`.
- The troubleshooting section mentioned expiring GitHub App tokens. Since the GitHub App registry-auth example was removed, this was changed to advise rotating the PAT (classic) and updating the Kubernetes Secret.

## Review Notes
The remaining Flux manifests and commands use current `image.toolkit.fluxcd.io/v1` fields, valid `secretRef` and `exclusionList` syntax, and current Flux CLI flags. The local environment did not have `kubectl` or `flux` installed, so CLI verification was performed against official command references rather than local `--help` output.
