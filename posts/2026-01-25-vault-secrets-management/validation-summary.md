# Validation Summary: How to Configure Vault for Secrets Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault
- Vault CLI
- Vault Helm chart
- Kubernetes
- Vault KV v2 secrets engine
- Vault database secrets engine for PostgreSQL
- Vault PKI secrets engine
- Vault AppRole, Kubernetes, and OIDC auth methods
- Vault Agent Injector
- Secrets Store CSI Driver with Vault provider
- Vault audit logging and policies

## Sources Consulted
- HashiCorp Vault Helm chart HA with Raft documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/examples/ha-with-raft
- HashiCorp Vault Kubernetes auth documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault KV CLI documentation: https://developer.hashicorp.com/vault/docs/commands/kv
- HashiCorp Vault KV undelete documentation: https://developer.hashicorp.com/vault/docs/commands/kv/undelete
- HashiCorp Vault PostgreSQL database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases/postgresql
- HashiCorp Vault PKI setup documentation: https://developer.hashicorp.com/vault/docs/secrets/pki/setup
- HashiCorp Vault JWT/OIDC auth documentation: https://developer.hashicorp.com/vault/docs/auth/jwt
- HashiCorp Vault Agent Injector annotations documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault Agent Injector examples: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/examples
- HashiCorp Vault Secrets Store CSI provider documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi
- Secrets Store CSI Driver concepts documentation: https://secrets-store-csi-driver.sigs.k8s.io/concepts.html
- HashiCorp Vault policy documentation: https://developer.hashicorp.com/vault/docs/concepts/policies
- HashiCorp Vault audit logging documentation: https://developer.hashicorp.com/vault/docs/audit
- HashiCorp Vault audit enable CLI documentation: https://developer.hashicorp.com/vault/docs/commands/audit/enable
- HashiCorp Vault Docker image documentation: https://hub.docker.com/r/hashicorp/vault

## Issues Found
- The post stated that all secrets have TTLs. KV static secrets do not behave like dynamic leased credentials, so this was changed to say that dynamic secrets and tokens have TTLs and can be revoked.
- The Kubernetes Raft initialization example joined the secondary pods but did not unseal them. Updated the sequence to unseal `vault-1` and `vault-2` after they join, matching the official Helm Raft workflow.
- The Vault Agent Injector Deployment manifest was missing the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added a selector and labels.
- The Vault Agent Injector container command used `source` while invoking `sh`; `source` is not POSIX shell syntax. Changed it to `. /vault/secrets/config`.
- The OIDC role example used `policies`; current examples use `token_policies` for token policy assignment. Updated the role command accordingly.
- The audit logging comment claimed every request and response is logged. Vault documents a small set of exceptions, so the comment was adjusted to include that caveat.

## Review Notes
- The Helm production example remains intentionally minimal. A future production hardening pass should cover TLS, auto-unseal, persistent storage settings, resource sizing, backup/snapshot operations, and audit log shipping.
- The Kubernetes auth example is valid for Vault running in Kubernetes, but production setups should decide explicitly between local service account reviewer tokens, client JWT reviewer mode, or long-lived reviewer tokens based on their Kubernetes and Vault versions.
