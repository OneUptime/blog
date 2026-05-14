# Validation Summary: How to Set Up GitRepository Proxy Configuration in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux GitRepository resources
- Kubernetes Secrets
- kubectl
- HTTP/S and SOCKS5 proxy configuration

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI `flux get sources git` reference: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI `flux create secret proxy` reference: https://fluxcd.io/flux/cmd/flux_create_secret_proxy/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post described proxy authentication as credentials embedded in the proxy URL. Flux documents proxy Secret authentication with separate `username` and `password` keys alongside the required `address` key, so the authenticated proxy Secret example and related troubleshooting note were updated.
- The proxy support description only mentioned HTTP and HTTPS proxies for HTTPS GitRepository URLs. Flux documents HTTP/S and SOCKS5 proxy support for GitRepository resources, so the description was updated.
- The verification command used `flux get source git my-app`. The documented Flux CLI command is `flux get sources git`, so the command was corrected.
- The custom CA example used `caFile`. Flux supports `ca.crt` and `caFile`, with `ca.crt` taking precedence, so the example and troubleshooting note were updated to use `ca.crt`.
- The troubleshooting section suggested running `curl` inside the source-controller deployment. The source-controller image should not be assumed to include curl, so the command was changed to run a temporary `curlimages/curl` pod in the same namespace.

## Review Notes
The remaining GitRepository manifests use the current `source.toolkit.fluxcd.io/v1` API and valid `spec.secretRef` / `spec.proxySecretRef` fields. Environment-level proxy configuration is technically valid, and Flux documents that object-level `spec.proxySecretRef` takes precedence over controller environment variables.
