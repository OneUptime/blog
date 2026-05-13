# Validation Summary: How to Configure Flux Git Secret with SSH Private Key and Known Hosts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Flux source-controller GitRepository resources
- Kubernetes Secrets
- SSH private keys and known_hosts
- kubectl
- OpenSSH ssh-keygen and ssh-keyscan
- GitHub, GitLab, and Bitbucket SSH access

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux source API reference: https://v2-6.docs.fluxcd.io/flux/components/source/api/v1/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux reconcile CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- GitHub SSH key fingerprints: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
- GitLab SSH key documentation: https://docs.gitlab.com/user/ssh/
- Bitbucket Cloud SSH host fingerprint documentation: https://support.atlassian.com/bitbucket-cloud/kb/the-authenticity-of-host-bitbucketorg-1041921431-cant-be-established/
- OpenSSH ssh-keyscan manual: https://man.archlinux.org/man/core/openssh/ssh-keyscan.1.en
- OpenSSH ssh-keygen manual: https://man7.org/linux/man-pages/man1/ssh-keygen.1.html

## Issues Found
- The prerequisites stated "A Kubernetes cluster (v1.20 or later)." Current Flux installation documentation lists newer supported Kubernetes versions and notes that older versions may be unsupported or EOL. Changed this to "A Kubernetes cluster supported by your Flux version" to keep the guidance technically accurate across Flux v2 releases.

## Review Notes
- The Flux Secret examples use the documented `identity` and `known_hosts` fields for SSH authentication. The `identity.pub` field included in the kubectl example is not required by Flux, but it is harmless as an additional Secret key.
- The `GitRepository` API version `source.toolkit.fluxcd.io/v1`, `spec.secretRef.name`, SSH URL format, and Flux reconciliation commands match current Flux documentation.
- The `ssh-keyscan`, `ssh-keygen`, and `kubectl create secret generic` commands use valid flags and syntax.
