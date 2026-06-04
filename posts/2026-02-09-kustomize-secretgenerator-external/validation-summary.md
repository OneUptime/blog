# Validation Summary: How to configure Kustomize secretGenerator with external sources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Secrets
- Kustomize secretGenerator
- kubectl
- SOPS with age
- AWS Secrets Manager
- HashiCorp Vault
- Bitnami Sealed Secrets
- External Secrets Operator
- cert-manager
- envsubst

## Sources Consulted
- Kubernetes documentation: Managing Secrets using Kustomize - https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-kustomize/
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes documentation: Secrets - https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl reference: create secret docker-registry - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kustomize API types reference - https://pkg.go.dev/sigs.k8s.io/kustomize/api/types
- HashiCorp Vault documentation: Kubernetes auth method - https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault documentation: Authentication concepts - https://developer.hashicorp.com/vault/docs/concepts/auth
- SOPS documentation - https://github.com/getsops/sops
- External Secrets Operator documentation: ExternalSecret API - https://external-secrets.io/latest/api/externalsecret/

## Issues Found
- The SOPS example created a YAML file and then decrypted it to `secrets.env`, which would not match Kustomize's `envs` format. Changed the example to encrypt and decrypt an env-format file.
- The "exec plugin" Kustomize example used inline `generators` content that was not an exec plugin and was unnecessary for the shown flow. Replaced it with the supported top-level `secretGenerator` configuration using the decrypted env file.
- The Vault Kubernetes authentication command used `vault login -method=kubernetes role=myapp`, which does not match the official Kubernetes auth login endpoint usage. Changed it to read the pod service account JWT, call `auth/kubernetes/login`, and export the returned token for later `vault kv get` commands.
- The SSH key example used `~/.ssh/...` paths in `secretGenerator.files`; Kustomize file paths are read as file sources rather than shell-expanded paths. Changed the example to use a local `id_rsa` file and the standard `kubernetes.io/ssh-auth` key name `ssh-privatekey`.
- The secret rotation statement implied that hash changes always restart pods. Clarified that rollouts happen when workloads reference the generated Secret in the same kustomization and Kustomize updates the pod template reference.
- The variable substitution example piped generated Secret YAML through `envsubst`, but Kustomize base64-encodes generated Secret data, so the placeholder would not be substituted. Changed the flow to run `envsubst` before Kustomize generates the Secret.

## Review Notes
The remaining examples are technically valid as patterns, but several depend on environment-specific setup, such as existing Vault auth configuration, AWS credentials, installed CRDs/controllers, or locally available secret files. The post now avoids claiming those integrations work without those prerequisites.
