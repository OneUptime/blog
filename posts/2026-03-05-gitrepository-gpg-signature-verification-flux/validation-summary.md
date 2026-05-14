# Validation Summary: How to Verify GitRepository Commits with GPG Signatures in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD source-controller
- Flux GitRepository and OCIRepository APIs
- Kubernetes Secrets
- GPG commit signing
- Git commit verification
- Sigstore Cosign
- kubectl and Flux CLI

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux source-controller GitRepository CRD: https://github.com/fluxcd/source-controller/blob/main/config/crd/bases/source.toolkit.fluxcd.io_gitrepositories.yaml
- Flux source-controller GitRepository API spec: https://github.com/fluxcd/source-controller/blob/main/docs/spec/v1/gitrepositories.md
- Flux source-controller OCIRepository API spec: https://github.com/fluxcd/source-controller/blob/main/docs/spec/v1/ocirepositories.md
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Git commit signing documentation: https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work
- GnuPG manual: https://www.gnupg.org/documentation/manuals/gnupg/

## Issues Found
- The post said `mode: HEAD` is currently the only supported GitRepository verification mode. Current Flux documentation and the GitRepository CRD list `HEAD`, `head`, `Tag`, and `TagAndHEAD`. Updated the text to explain `HEAD` and mention signed tag verification modes.
- The post showed a `GitRepository` with `verify.provider: cosign`. Current GitRepository `spec.verify` supports `mode` and `secretRef`, but not `provider`. Updated the Cosign section to make clear that Cosign keyless verification applies to `OCIRepository`, and replaced the invalid GitRepository example with a valid OCIRepository keyless verification example using `matchOIDCIdentity`.

## Review Notes
The GPG public key Secret examples, `spec.verify.secretRef`, `kubectl create secret generic --from-file`, `flux get source git`, `flux reconcile source git`, and Git signing commands are technically sound. The example status messages are illustrative; exact controller messages may vary by Flux version.
