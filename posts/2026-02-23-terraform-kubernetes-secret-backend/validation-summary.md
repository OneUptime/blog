# Validation Summary: How to Configure Kubernetes Secret Backend for Terraform State

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Kubernetes backend
- Kubernetes Secrets
- Kubernetes RBAC
- Kubernetes Lease objects
- Kubernetes encryption at rest
- kubectl

## Sources Consulted
- HashiCorp Terraform Kubernetes backend documentation: https://developer.hashicorp.com/terraform/language/backend/kubernetes
- HashiCorp Terraform backend configuration documentation: https://developer.hashicorp.com/terraform/language/settings/backends/configuration
- HashiCorp Terraform Kubernetes backend source: https://github.com/hashicorp/terraform/tree/main/internal/backend/remote-state/kubernetes
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes encryption at rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes Lease documentation: https://kubernetes.io/docs/concepts/architecture/leases/
- kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/

## Issues Found
- The introduction implied that Kubernetes Secrets automatically benefit from etcd encryption. Kubernetes Secrets are stored unencrypted by default unless encryption at rest is configured, so the wording was changed to clarify that etcd encryption applies only when configured for the cluster.
- The basic and local kubeconfig examples omitted an explicit `config_path`, while the official Terraform backend documentation recommends setting `config_path`, `config_paths`, or `in_cluster_config` for most use cases. The examples now set `config_path = "~/.kube/config"`.
- The RBAC Role did not include `list` on Secrets. Terraform lists state Secrets by label, so the Role now includes the `list` verb for Secrets.
- The state locking examples used the wrong Lease name format (`tflock-default-myproject`). Terraform's Kubernetes backend uses a `lock-` prefix on the state Secret name, so the examples now use `lock-tfstate-default-myproject`.
- The inspection command decoded the Secret value directly as JSON. Current Terraform compresses state before storing it, so the command now base64-decodes and gzip-decompresses before piping to `jq`.
- The size limitation section said the effective raw state limit is about 750KB and suggested the `etcd` backend for larger limits. Current Terraform compresses state and can split larger payloads across multiple Secrets, and Terraform does not document an `etcd` backend as a current built-in backend. The section was revised to describe the per-Secret 1MiB limit and the practical concerns of large state files.

## Review Notes
The post is technically relevant and remains useful. The main future improvement would be to add a short warning that backend credentials hardcoded in backend configuration can be persisted under `.terraform` and in plan files; HashiCorp recommends environment variables or partial backend configuration for sensitive values.
