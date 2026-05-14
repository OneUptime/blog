# Validation Summary: How to Set Up GitRepository with Self-Hosted Git Servers in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Source Controller GitRepository
- Kubernetes Secrets
- kubectl
- SSH authentication
- HTTPS basic authentication
- Self-signed TLS certificates
- Gitea
- Self-hosted GitLab

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- OpenBSD ssh-keyscan manual: https://man.openbsd.org/ssh-keyscan.1

## Issues Found
- The HTTPS CA example used `caFile`. Flux currently supports both `ca.crt` and `caFile`, but the official GitRepository documentation documents `ca.crt` as the primary key and gives it precedence over `caFile`. Updated the example and troubleshooting note to use `ca.crt`.
- The troubleshooting connectivity command used `git ls-remote` from a temporary pod without mounting the SSH private key or known_hosts from the Flux Secret. That can fail because of authentication or host key verification rather than network reachability. Replaced it with an SSH port reachability test using `nc`.
- The SSH host key scan example did not show how to scan a non-standard SSH port, while the post later uses a non-standard Gitea port. Added an `ssh-keyscan -p 3022` example.

## Review Notes
The GitRepository manifests use the current `source.toolkit.fluxcd.io/v1` API, and the documented `secretRef`, `ref.branch`, `interval`, and `timeout` fields are consistent with Flux Source Controller documentation. The SSH secret keys `identity` and `known_hosts`, and HTTPS basic auth keys `username` and `password`, are also consistent with official Flux documentation.
