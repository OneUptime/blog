# Validation Summary: How to Configure Git Proxy Settings in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD repo-server and server deployments
- Git proxy configuration
- Kubernetes Deployments, ConfigMaps, and Secrets
- kubectl patch
- HTTP, HTTPS, SOCKS proxy, and NO_PROXY environment variables
- OpenSSH ProxyCommand
- TLS CA certificate configuration

## Sources Consulted
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Git Configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/git_configuration/
- Git config documentation: https://git-scm.com/docs/git-config
- Kubernetes kubectl patch reference: https://v1-35.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Local OpenSSH `ssh_config` manual and `nc -h` output

## Issues Found
- The SSH SOCKS proxy example set `IdentityFile /app/config/ssh/ssh_known_hosts`. `IdentityFile` must point to a private key, while `ssh_known_hosts` contains server host keys. Removed the incorrect `IdentityFile` line.
- The Git-specific proxy example mounted `.gitconfig` at `/home/argocd/.gitconfig`. Current Argo CD documentation says repo-server runs Git with `HOME=/dev/null`, so global Git config is not supported. Changed the example to mount a system Git config at `/etc/gitconfig`.
- The Git-specific proxy example used a separate `[https]` section for proxy configuration. Git documents `http.proxy` and URL-scoped `http` subsections for HTTP(S) transport proxy settings. Removed the ineffective `[https]` section.
- The TLS ConfigMap comment said the proxy CA was for all external HTTPS connections. Argo CD's `argocd-tls-certs-cm` is keyed by repository server hostname. Updated the comment to say the proxy CA should be added for each HTTPS repository host.

## Review Notes
Argo CD also supports per-repository `proxy` and `noProxy` fields in repository Secrets; the environment-variable approach remains valid as the repo-server fallback when repository-specific proxy config is absent. Argo CD notes that not every tool it executes supports the same `noProxy` syntax, so users may need full hostnames instead of wildcard or CIDR entries in some environments.
