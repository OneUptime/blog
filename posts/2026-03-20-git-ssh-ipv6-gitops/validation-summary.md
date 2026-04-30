# Validation Summary: How to Configure Git SSH over IPv6 for GitOps

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Git
- OpenSSH / SSH
- Argo CD
- Flux CD
- Kubernetes
- YAML
- Bash

## Sources Consulted
- Git `git-clone` documentation: https://git-scm.com/docs/git-clone
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/OpenBSD-6.6/ssh.1
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/OpenBSD-6.2/ssh_config
- OpenSSH `ssh-keyscan(1)` manual: https://man.openbsd.org/ssh-keyscan.1
- OpenSSH `sshd(8)` known_hosts format: https://man.openbsd.org/OpenBSD-5.2/sshd.8
- OpenSSH `ssh-keygen(1)` known_hosts host/port handling: https://man.openbsd.org/ssh-keygen
- Argo CD declarative setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD private repositories and SSH known hosts: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post used `2001:db8::git` as an IPv6 literal, but `git` is not valid hexadecimal in an IPv6 address. I replaced all literal examples with the valid documentation-prefix address `2001:db8::10`.
- The post claimed Git’s scp-like SSH syntax does not support IPv6 literals. I corrected this to show that current Git/OpenSSH clients accept a bracketed IPv6 literal in scp-like form, while `ssh://` is still the right form when encoding a port and is required for Flux `GitRepository` URLs.
- The `ssh -6 -v "ssh://..."` test command was replaced with `ssh -6 -v -p 22 ...` because URI-style destinations are not portable across SSH clients, while the `-p` form is documented and broadly supported.
- The `known_hosts` section incorrectly stated that IPv6 entries always require brackets. I updated it to match OpenSSH format rules: use bare host/address for normal entries, and `[host]:port` only when a port must be encoded.
- The ArgoCD example incorrectly placed host keys in a repository Secret field named `knownHosts`. I rewrote it to match current Argo CD docs: repository Secret with `type: git` and `sshPrivateKey`, plus host keys in `argocd-ssh-known-hosts-cm`.
- The host-key collection script rewrote `ssh-keyscan` output into a custom format. I simplified it to preserve `ssh-keyscan`’s native known_hosts-compatible output.
- The pod-debugging example used an undocumented private key path in `argocd-repo-server`. I replaced it with reachability checks based on `ssh-keyscan` and added caveats about tool availability in controller images.

## Review Notes
- Flux documentation explicitly requires `ssh://` URLs for `GitRepository.spec.url`, even though Git itself can use scp-like syntax.
- Argo CD documents SSH host keys separately from repository credentials; the two should not be merged into one Secret.
- `ssh-keyscan` output should still be verified out-of-band before being trusted in production, because key collection alone does not authenticate the remote host.
- Git’s scp-like IPv6-literal behavior was additionally validated against current client behavior during review because the Git docs describe URL forms but do not explicitly spell out IPv6-literal support in that syntax.
