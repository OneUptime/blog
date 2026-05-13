# Validation Summary: How to Configure OCI Artifact Build and Push in CI for Flux CD

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Flux CD (OCIRepository, Kustomization controllers)
- OCI artifacts / container registries (GHCR)
- GitHub Actions (CI workflow)
- Cosign (sigstore artifact signing)
- Kubernetes (kubectl, secrets, manifests)
- Kustomize

## Sources Consulted
- Flux `flux push artifact` command reference: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux `flux tag artifact` command reference: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux `flux get` command reference: https://fluxcd.io/flux/cmd/flux_get/
- Flux `flux get artifacts` command reference: https://fluxcd.io/flux/cmd/flux_get_artifacts/
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux OCIRepository source documentation: https://fluxcd.io/flux/components/source/ocirepositories/

## Issues Found
1. **Invalid `flux get artifact` command (Step 6).** The post used `flux get artifact oci://ghcr.io/your-org/manifests/myapp:latest` to "view artifact metadata." This command does not exist in the Flux CLI. `flux get artifacts` (plural) does exist, but it operates on Kubernetes Artifact resources rather than accepting OCI URLs as arguments. Replaced with `flux pull artifact oci://... --output=/tmp/myapp-manifests`, which is the documented way to retrieve an OCI artifact and inspect its contents.

2. **`--revision` flag format (Step 2).** The post passed `--revision="$(git rev-parse --short HEAD)"`, a bare short SHA. Flux's official `flux push artifact` documentation and the OCI artifacts cheatsheet recommend the format `<branch|tag>@sha1:<commit-sha>` (e.g., `"$(git branch --show-current)@sha1:$(git rev-parse HEAD)"`). Updated to use GitHub Actions context variables `${{ github.ref_name }}@sha1:${{ github.sha }}` — equivalent semantics that works reliably across both branch and tag push events in GitHub Actions (where `git branch --show-current` can be empty in detached-HEAD checkouts).

## Review Notes
- `apiVersion: source.toolkit.fluxcd.io/v1` for OCIRepository is correct — v1 is the current stable API as of post date.
- `apiVersion: kustomize.toolkit.fluxcd.io/v1` for Kustomization is correct.
- `spec.verify.provider: cosign` and `spec.verify.secretRef.name` are valid for cosign public-key signature verification.
- `flux push artifact` flags `--path`, `--source`, `--revision`, `--annotations` are all valid.
- `flux tag artifact` with `--tag` flag is valid.
- `flux events --for OCIRepository/<name>` is a valid `flux events` subcommand syntax.
- The `kubectl apply --dry-run=client -k ... --server-side=false` invocation is functional; `--server-side=false` is the default and therefore redundant, but it does not cause failure.
- The "flux CLI version 0.41+" prerequisite is somewhat dated phrasing — modern Flux is on v2.x, but OCI artifact push support was indeed added in early v0.x releases, so the claim is not technically wrong. Left as-is.
- The `kubectl` binary is assumed pre-installed on `ubuntu-latest` runners, which is currently true but worth noting if runner images change.
