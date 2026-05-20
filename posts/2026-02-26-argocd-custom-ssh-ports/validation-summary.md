# Validation Summary: How to Connect to Git Repos Over Custom SSH Ports in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Git SSH repository URLs
- OpenSSH known_hosts and ssh-keyscan
- Kubernetes Secrets, ConfigMaps, Applications, and NetworkPolicy
- Bitbucket Server / Bitbucket Data Center
- Gitea and Gogs

## Sources Consulted
- Argo CD declarative setup documentation for repository Secrets, credential templates, and SSH known hosts: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/commands/argocd_repo_add/
- Argo CD `argocd repocreds add` command reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/commands/argocd_repocreds_add/
- Argo CD `argocd cert add-ssh` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cert_add-ssh/
- Git `git clone` documentation for URL formats and SSH port syntax: https://git-scm.com/docs/git-clone
- Atlassian Bitbucket Data Center documentation for SSH URL and port examples: https://confluence.atlassian.com/bitbucketserver/enable-ssh-access-to-git-repositories-776640358.html
- Gitea configuration cheat sheet for SSH port settings: https://docs.gitea.com/administration/config-cheat-sheet
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes `kubectl exec` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Local OpenSSH `ssh-keyscan` help output for `-p` and `-t` options.

## Issues Found
No technical issues found.

## Review Notes
The post is technically accurate for current Argo CD and Git behavior. The NetworkPolicy example is valid, but readers should remember that NetworkPolicy enforcement depends on a CNI plugin that supports it, and the exact Argo CD repo-server pod labels can vary in customized or Helm-based installations.
