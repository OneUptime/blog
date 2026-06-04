# Validation Summary: How to Configure containerd Registry Mirrors and Credentials

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- containerd
- Kubernetes
- Container registries
- Harbor
- `crictl`
- `kubectl`
- TLS certificates

## Sources Consulted
- containerd CRI registry configuration documentation: https://github.com/containerd/containerd/blob/main/docs/cri/registry.md
- containerd registry hosts configuration documentation: https://github.com/containerd/containerd/blob/main/docs/hosts.md
- containerd CRI configuration documentation: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- Harbor 2.10 proxy cache documentation: https://goharbor.io/docs/2.10.0/administration/configure-proxy-cache/
- Harbor 2.10 installer documentation: https://goharbor.io/docs/2.10.0/install-config/run-installer-script/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/

## Issues Found
- The original mirror configuration used deprecated `registry.mirrors` tables in `/etc/containerd/config.toml`. Updated the guide to use `config_path = "/etc/containerd/certs.d"` with per-registry `hosts.toml` files.
- The original examples gave public mirrors `resolve` capability. Updated mirror hosts to `["pull"]` and left `resolve` on trusted upstream registries.
- The Harbor proxy cache example incorrectly configured `proxy.remote_url` in `harbor.yml`. Replaced it with the documented flow: install Harbor, create a registry endpoint, then create a proxy cache project.
- The Harbor install command used `--with-chartmuseum`, which is not part of the Harbor 2.10 installer options documented for the selected version. Changed it to `--with-trivy`.
- The authentication section claimed containerd supports credential helpers in `hosts.toml` and used an unsupported `[host...auth].credHelper` table. Removed that example and replaced it with ImagePullSecret guidance plus a clearly marked legacy static auth example.
- The static credentials guidance did not explain that deprecated `registry.configs.*.auth` should not be mixed with `config_path`. Added that caveat.
- The rate limiting section used unsupported per-registry `max_concurrent_downloads` and `max_concurrent_uploads` fields. Replaced it with the supported containerd 1.x CRI `max_concurrent_downloads` setting and clarified that retry/rate-limit behavior is not configured through those per-registry fields.
- The introduction described containerd as replacing Docker as "the default Kubernetes runtime". Adjusted the wording to reflect that many distributions moved to containerd after dockershim removal rather than Kubernetes itself shipping a single default runtime.

## Review Notes
The post now uses the current containerd directory-based registry host configuration. The legacy `registry.configs.*.auth` example remains only as a caveat for older setups; Kubernetes ImagePullSecrets are the better default for workload image pulls.
