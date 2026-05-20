# Validation Summary: How to Install ArgoCD in a Private Network Without Internet Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- containerd
- Docker
- CoreDNS
- HTTP/HTTPS proxies
- Private container registries
- Private Git repositories

## Sources Consulted
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD v2.13.3 install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/manifests/install.yaml
- Kubernetes `kubectl patch` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes `kubectl set env` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/
- Kubernetes CoreDNS customization documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- containerd registry configuration documentation: https://containerd.org/docs/1.7/cri/registry/
- containerd hosts.toml documentation: https://github.com/containerd/containerd/blob/main/docs/hosts.md

## Issues Found
- The Argo CD `v2.13.3` install manifest uses `ghcr.io/dexidp/dex:v2.41.1`, but the post mirrored `v2.38.0`. Updated the Dex pull, tag, and push commands to `v2.41.1`.
- The node proxy section implied that `kubectl apply -f https://...` only depends on node image-pull access. Clarified that the machine running `kubectl` must also be able to fetch the remote manifest.
- The containerd mirror example used the deprecated `registry.mirrors` configuration. Replaced it with the current `config_path` plus per-registry `hosts.toml` configuration, including the containerd 1.x and 2.x plugin paths.
- The internal Git repository example executed `argocd repo add` inside the `argocd-server` pod without showing Argo CD CLI authentication, and the placeholder token could be interpreted by the shell as redirection. Replaced it with Argo CD's documented repository Secret format.
- The TLS certificate ConfigMap omitted the `app.kubernetes.io/part-of: argocd` label that Argo CD documents for its configuration ConfigMaps. Added the label.
- The DNS example used a provider-specific `coredns-custom` ConfigMap pattern while saying to add entries to the CoreDNS ConfigMap. Replaced it with a standard `kube-system/coredns` Corefile example based on Kubernetes documentation.
- The troubleshooting section said Kubernetes network plugins may not forward proxy environment variables. Reworded it to the accurate behavior: pods do not inherit node-level proxy environment variables automatically.

## Review Notes
The local environment did not have `kubectl` installed, so command help for `kubectl patch` and `kubectl set env` could not be checked locally. Those commands and flags were verified against Kubernetes command reference documentation instead.
