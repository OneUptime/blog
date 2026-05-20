# Validation Summary: Automate ArgoCD Repository Credential Rotation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD repository credentials and credential templates
- Kubernetes Secrets and CronJobs
- Bash scripting
- kubectl
- Argo CD CLI
- jq
- GitHub Deploy Keys API
- HashiCorp Vault Kubernetes auth and KV secrets

## Sources Consulted
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- GitHub REST API deploy keys documentation: https://docs.github.com/en/rest/deploy-keys/deploy-keys
- HashiCorp Vault Kubernetes auth documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault SSH signed certificates documentation: https://developer.hashicorp.com/vault/docs/secrets/ssh/signed-ssh-certificates

## Issues Found
- The GitHub Deploy Keys API example used older headers. Updated it to use `Authorization: Bearer`, the current recommended `Accept` header, and an explicit GitHub API version header.
- Several `kubectl patch` examples embedded secrets directly into JSON strings. This could fail for tokens or private keys containing quotes, backslashes, or newlines. Changed those examples to build patch payloads with `jq -n --arg`.
- The CronJob used `bitnami/kubectl:1.28`, but the script also requires `vault`, `jq`, and `bash`. Changed the example to a purpose-built image placeholder and noted the required tools.
- The Vault SSH example attempted to patch Argo CD's `sshPrivateKey` field with a Vault SSH signed public certificate. Vault's SSH signing flow returns a signed public key and still requires the matching private key, while Argo CD's repository secret field expects the SSH private key. Replaced the example with retrieval of a rotated private key from Vault KV.
- The credential template verification loop incremented `FAILED` inside a pipeline subshell, so the final failure check would not see the updated count in Bash. Changed it to use process substitution so failures are counted correctly.

## Review Notes
- The Argo CD repository and credential-template labels, credential fields, and URL-prefix behavior match the official Argo CD documentation.
- The CronJob schema fields used in the post are valid for `batch/v1`.
- The Bash examples pass `bash -n` syntax validation after the corrections.
