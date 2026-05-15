# Validation Summary: How to Set Up Flux CD Behind a Corporate Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI bootstrap
- Kubernetes Deployments, Secrets, ConfigMaps, and controller logs
- Kustomize patches
- HTTP_PROXY, HTTPS_PROXY, and NO_PROXY environment variables
- TLS certificate authority handling for Flux source and notification APIs

## Sources Consulted
- Flux proxy settings: https://fluxcd.io/flux/installation/configuration/proxy-setting/
- Flux bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux CLI installation: https://fluxcd.io/flux/cmd/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Go HTTP proxy environment handling: https://pkg.go.dev/github.com/golang/net/http/httpproxy

## Issues Found
- The prerequisites mentioned a GitHub or GitLab token, but the tutorial only shows `flux bootstrap github` and GitHub-specific environment variables. Changed the prerequisite to explicitly scope the token requirement to the GitHub example.
- The TLS-intercepting proxy section only described mounting a CA certificate into controller Pods. Flux supports CA trust per source or notification object through `ca.crt` in the referenced Secret, commonly via `secretRef` for GitRepository and `certSecretRef` for HelmRepository, OCIRepository, Bucket, ImageRepository, and Provider resources. Added this supported approach and kept the controller-level CA mount as an optional fallback for bootstrap or global source-controller traffic.
- The guidance for image automation and notifications implied that a controller CA mount was the general solution. Updated it to prefer `certSecretRef` where available and use the mount only when that resource-level configuration is not suitable.

## Review Notes
The Flux proxy patch, `NO_PROXY` entries, `flux bootstrap github --token-auth` usage, Flux install command, and Kubernetes commands were consistent with current official documentation. The local environment did not have `flux` or `kubectl` installed, so CLI checks were performed against official documentation instead of local `--help` output.
