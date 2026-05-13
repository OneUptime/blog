# Validation Summary: How to Encrypt SSH Keys with SOPS for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Secrets and Secret volume mounts
- Flux Kustomization SOPS decryption
- SOPS with age encryption
- OpenSSH keys and known_hosts
- kubectl
- git-sync

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- SOPS official documentation: https://getsops.io/docs/
- kubernetes/git-sync v4 documentation: https://github.com/kubernetes/git-sync
- GitHub SSH host key fingerprints: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
- GitLab.com SSH known_hosts entries: https://docs.gitlab.com/user/gitlab_com/#ssh-known_hosts-entries
- Local OpenSSH ssh-keygen help output

## Issues Found
- The generated Secret command used `kubectl create secret generic` without specifying the SSH Secret type. Added `--type=kubernetes.io/ssh-auth` so the generated manifest matches the documented SSH Secret type and `ssh-privatekey` convention.
- The known_hosts Secret example used `type: Opaque` even though it stores SSH authentication material with the required `ssh-privatekey` key. Changed it to `type: kubernetes.io/ssh-auth` for consistency with Kubernetes' built-in SSH Secret type.
- The git-sync v4 Deployment example set `GITSYNC_SSH`, which is not a documented git-sync v4 environment variable, and omitted required `GITSYNC_ROOT`. Replaced it with `GITSYNC_ROOT` and `GITSYNC_SSH_KEY_FILE` pointing to the mounted `ssh-privatekey`.
- The SSH verification command did not specify the mounted identity file or known_hosts file, so it might not test the Secret mounted in the example. Updated it to pass `-i /etc/git-secret/ssh-privatekey` and `-o UserKnownHostsFile=/etc/git-secret/known_hosts`.

## Review Notes
The hard-coded GitHub and GitLab ED25519 host key entries match the current official documentation as of 2026-05-13. The `stringData` examples are valid for authored Secret manifests, but Kubernetes notes that `stringData` does not work well with server-side apply; using SOPS with GitOps manifests remains a common pattern when Flux decrypts before applying.
