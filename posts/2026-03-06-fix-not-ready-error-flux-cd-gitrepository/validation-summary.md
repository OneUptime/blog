# Validation Summary: How to Fix 'not ready' Error in Flux CD GitRepository

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux GitRepository custom resources
- Kubernetes kubectl
- Kubernetes Secrets
- SSH and HTTPS Git authentication

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI reference for `flux create secret git`: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux CLI reference for `flux resume source git`: https://fluxcd.io/flux/cmd/flux_resume_source_git/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The post listed a missing `.git` suffix as a common URL mistake. Flux examples and Git providers commonly accept repository URLs without `.git`, so this was changed to checking the organization, repository name, or path.
- The SSH secret example referenced `./known_hosts` without showing how it is created. Added an `ssh-keyscan github.com > known_hosts` step so the `kubectl create secret` command has the required file.
- The self-signed certificate example used `spec.certSecretRef`, which is not a `GitRepository` field in Flux source API v1. Updated the example to store `ca.crt` in a Secret and reference it through `spec.secretRef`, matching the Flux GitRepository documentation.

## Review Notes
The local environment did not have `flux` or `kubectl` installed, so CLI syntax was verified against official Flux and Kubernetes command reference documentation rather than local `--help` output.
