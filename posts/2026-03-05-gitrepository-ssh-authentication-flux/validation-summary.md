# Validation Summary: How to Configure GitRepository with SSH Authentication in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Source Controller
- Flux `GitRepository` API
- Flux CLI
- Kubernetes Secrets
- SSH authentication and host key verification
- GitHub and GitLab deploy keys

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI `flux create secret git` documentation: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- GitHub SSH key fingerprints documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
- GitLab SSH key documentation: https://docs.gitlab.com/user/ssh/
- OpenSSH `ssh-keyscan` manual page: https://manpages.ubuntu.com/manpages/stonking/man1/ssh-keyscan.1.html

## Issues Found
- The post used `ssh-keyscan` to populate `known_hosts` but did not mention verifying the scanned host key. Added a sentence instructing readers to verify the host key fingerprint against the provider's published fingerprints or another trusted source, because `ssh-keyscan` gathers keys but does not authenticate them by itself.
- The custom SSH port example showed a Flux URL with port `2222` but did not explain that the `known_hosts` entry must be generated for the same port. Added a sentence showing `ssh-keyscan -p 2222 gitlab.example.com`.

## Review Notes
The Flux `GitRepository` manifests use the current `source.toolkit.fluxcd.io/v1` API, `spec.secretRef` is valid, and Flux SSH Secrets are correctly described as containing `identity` and `known_hosts`. The `flux create secret git` example matches the official CLI documentation and automatically populates host key data.
