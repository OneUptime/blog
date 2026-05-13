# Validation Summary: How to Configure Flux Proxy Secret with No-Proxy List

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Source Controller
- GitRepository
- HelmRepository
- OCIRepository
- Kustomize
- kubectl
- Go HTTP proxy environment variables

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI documentation: https://fluxcd.io/flux/cmd/flux_get/
- Kubernetes kubectl set env documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/
- Kubernetes namespaces and DNS documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Go net/http ProxyFromEnvironment documentation: https://pkg.go.dev/net/http#ProxyFromEnvironment
- Go httpproxy Config documentation: https://pkg.go.dev/golang.org/x/net/http/httpproxy#Config
- Flux issue for per-object NO_PROXY support: https://github.com/fluxcd/flux2/issues/5062

## Issues Found
- The introduction incorrectly stated that Flux supports no-proxy configuration within the proxy secret. Updated it to say Flux supports no-proxy configuration through controller-level environment variables, matching current Flux documentation and the rest of the post.
- The no-proxy format section referred to the value as `no_proxy`, while the configuration examples use `NO_PROXY`. Updated the wording to `NO_PROXY` for consistency with the controller environment variable approach.
- The troubleshooting section incorrectly stated that `example.com` without a leading dot matches only the exact host. Go's proxy handling matches both the domain and subdomains, while `.example.com` matches subdomains only. Updated the explanation accordingly.

## Review Notes
The post is technically valid after the targeted corrections. Per-object `proxySecretRef` currently supports `address`, `username`, and `password`; it takes precedence over proxy environment variables and does not support a `no_proxy` key as of this review. The example Kustomize patch, `kubectl set env` command, Flux source manifests, and verification commands are syntactically consistent with current official documentation.
