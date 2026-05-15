# Validation Summary: How to Bootstrap Flux CD with a Generic Git Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Generic Git servers over SSH and HTTPS
- Kubernetes Secrets
- Kustomize

## Sources Consulted
- Flux generic Git server bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/generic-git-server/
- Flux CLI reference for `flux bootstrap git`: https://fluxcd.io/flux/cmd/flux_bootstrap_git/
- Flux CLI reference for `flux bootstrap`: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux GitRepository authentication documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation and API reference: https://fluxcd.io/flux/components/kustomize/kustomizations/ and https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux installation prerequisites and supported Kubernetes versions: https://fluxcd.io/flux/installation/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes API reference for Deployment and Service resources: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/

## Issues Found
- The prerequisite "Kubernetes cluster (v1.26 or later)" was too broad for current Flux releases. Flux v2.0 required Kubernetes v1.26+, but current Flux releases support the latest three Kubernetes minor versions. Updated the wording to tell readers to use a Kubernetes version supported by their Flux release.
- The HTTPS examples used `--token-auth` and described it as the flag that makes Flux use HTTPS credentials instead of SSH keys. For generic `flux bootstrap git`, HTTPS basic authentication works with `--username` and `--password`; bearer-token authentication uses `--with-bearer-token` when needed. Removed `--token-auth` from the generic HTTPS examples and clarified that Flux stores the HTTPS credentials in the Git authentication secret.

## Review Notes
The Flux Kustomization examples use the current `kustomize.toolkit.fluxcd.io/v1` API and valid fields. The Kubernetes Deployment, Service, and Kustomize snippets are syntactically valid. The SSH examples use the supported `ssh://` URL form rather than unsupported scp-like syntax.
