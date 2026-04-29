# Validation Summary: How to Manage Secrets with OpenTofu on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Kubernetes provider
- Kubernetes Secrets
- HCL

## Sources Consulted
- OpenTofu resource syntax: https://opentofu.org/docs/language/resources/syntax/
- OpenTofu input variables: https://opentofu.org/docs/language/values/variables/
- HashiCorp Kubernetes provider overview: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/index.md
- HashiCorp Kubernetes provider `kubernetes_secret_v1` resource docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/secret_v1.md
- Kubernetes Secret concepts: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Secret good practices: https://kubernetes.io/docs/concepts/security/secrets-good-practices/

## Issues Found
- The original resource example created a Deployment instead of a Secret. I replaced it with a valid `kubernetes_secret_v1` example and updated the variables to match a `kubernetes.io/basic-auth` Secret, because the post title and description are specifically about managing Kubernetes secrets.
- The original provider example set `config_context = var.kube_context` with a default value of `"default"`. The official provider docs say the provider uses the kubeconfig's current/default context when `config_context` is omitted, so a literal `"default"` context name is not generally safe. I simplified the provider example to `config_path` only.
- The original conclusion omitted the provider's documented warning that Secret data is stored in raw state as plain text. I updated the conclusion to reflect that behavior and the need to protect the state backend and use least-privilege access.

## Review Notes
- The corrected example is valid for the current Kubernetes provider documentation and uses `kubernetes_secret_v1`, which maps to the core/v1 Secret API.
- The post now aligns with Kubernetes guidance that `kubernetes.io/basic-auth` Secrets use `username` and `password` keys.
- Marking an input variable as `sensitive` reduces accidental display in CLI output, but it does not prevent the secret value from being stored in OpenTofu state.
