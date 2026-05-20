# Validation Summary: How to Configure Git SOCKS5 Proxy in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Git
- OpenSSH
- SOCKS5 proxies
- Kubernetes Deployments, ConfigMaps, and Secrets
- curl proxy URL schemes

## Sources Consulted
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Git Configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/git_configuration/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Git `git-config` documentation from local `git help config`
- OpenSSH `ssh_config(5)` manual: https://man7.org/linux/man-pages/man5/ssh_config.5.html
- curl manual from local `curl --manual`
- OpenBSD netcat help from local `nc -h`
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post mounted Git proxy configuration at `/home/argocd/.gitconfig`, but Argo CD documentation states repo-server runs Git with `HOME=/dev/null`, so global Git configuration is not supported. Changed the example to mount the file at `/etc/gitconfig` as system Git configuration.
- The SSH proxy section relied on mounting `/home/argocd/.ssh/config` and using `ProxyCommand`. Argo CD officially supports repository-level `proxy` and `noProxy` settings, and its CLI documents SOCKS5 proxy support for SSH repositories. Replaced the SSH example with an Argo CD repository Secret and matching `argocd repo add --proxy` command.
- The authenticated SSH proxy example used an `ncat` `ProxyCommand`. Replaced it with Argo CD's repository `proxy` URL containing SOCKS5 credentials, matching the documented Argo CD configuration path.
- The SSH verification command used raw `git ls-remote` inside the repo-server pod, which would not exercise Argo CD's repository-level SSH proxy configuration. Changed it to an `argocd repo add ... --proxy ... --upsert` connectivity check.
- The sidecar tunnel example used `alpine/ssh`, which is not the official Alpine image and is not a reliable documented image reference. Changed it to `alpine:3.20` and installed `openssh-client` before running the tunnel command.
- The comparison text overstated HTTP proxy behavior by saying HTTP proxies only support HTTPS through CONNECT. Reworded it to say HTTP proxies are typically used for Git HTTP(S) remotes and CONNECT tunnels.

## Review Notes
The post is now technically valid for current Argo CD behavior. A future improvement would be to prefer per-repository `proxy` and `noProxy` settings throughout the article where possible, because Argo CD documents them as the native configuration surface and they avoid relying on container-level Git environment behavior.
