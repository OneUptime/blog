# Validation Summary: Understanding ArgoCD argocd-ssh-known-hosts-cm Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps and Secrets
- OpenSSH known_hosts and ssh-keyscan
- kubectl
- Argo CD CLI
- Git SSH repository access

## Sources Consulted
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD argocd-ssh-known-hosts-cm example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-ssh-known-hosts-cm-yaml/
- Argo CD cert add-ssh command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cert_add-ssh/
- Argo CD repo add command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD repositories declarative example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repositories-yaml/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl exec reference: https://v1-34.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Local OpenSSH ssh-keyscan help output.

## Issues Found
- The default `argocd-ssh-known-hosts-cm` example had incomplete and outdated host key data, including a truncated GitLab RSA key, an outdated Bitbucket RSA key, a truncated Azure DevOps key, and missing default entries such as `[ssh.github.com]:443` and `vs-ssh.visualstudio.com`. Updated the block to match the current official Argo CD stable manifest.
- The Argo CD CLI removal command used `argocd cert rm-ssh`, which is not the documented command. Changed it to `argocd cert rm git.internal.example.com --cert-type ssh`.
- The repo-server SSH test said GitHub should always return a successful authentication message. That depends on an available matching private key, so the note now correctly says the test only proves host key verification has passed and authentication can still fail.
- The repo-server shell example used `bash`; changed it to `sh` to use a more broadly available shell in container images while preserving the troubleshooting workflow.

## Review Notes
- The `insecure: "true"` repository Secret field is valid for declarative repository configuration, but it should remain limited to non-production scenarios because it disables host key checking.
- The monitoring script is illustrative and checks only `ed25519` keys when rescanning. That is acceptable for the post's example, but production monitoring should compare all configured key types for each host.
