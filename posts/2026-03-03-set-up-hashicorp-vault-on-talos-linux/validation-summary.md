# Validation Summary: How to Set Up HashiCorp Vault on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- HashiCorp Vault
- HashiCorp Vault Helm chart
- Kubernetes
- Helm
- Vault Integrated Storage / Raft
- Vault Kubernetes auth method
- Vault Agent Injector
- Vault KV v2 secrets engine
- AWS KMS auto-unseal

## Sources Consulted
- HashiCorp Vault Helm chart HA Raft example: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/examples/ha-with-raft
- HashiCorp Vault on Kubernetes deployment guide: https://developer.hashicorp.com/vault/tutorials/kubernetes/kubernetes-raft-deployment-guide
- HashiCorp Vault Helm chart configuration reference: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/configuration
- HashiCorp vault-helm v0.32.0 values.yaml: https://github.com/hashicorp/vault-helm/blob/v0.32.0/values.yaml
- HashiCorp Vault Integrated Storage / Raft configuration: https://developer.hashicorp.com/vault/docs/configuration/storage/raft
- HashiCorp Vault Kubernetes auth method API docs: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault AWS KMS seal configuration: https://developer.hashicorp.com/vault/docs/configuration/seal/awskms
- Talos Linux FAQ: https://www.talos.dev/v1.11/learn-more/faqs/

## Issues Found
- The post described the sample as "production use" while the Vault listener had `tls_disable = 1`. HashiCorp's production Kubernetes deployment guidance uses TLS, so the wording was changed to "high-availability baseline" and a note was added that TLS must be enabled before production use.
- The Helm values omitted `server.ha.raft.setNodeId`. The official chart exposes this value to set each Raft node ID to the pod name, and the Kubernetes deployment guide uses it for Raft deployments. Added `setNodeId: true`.
- The initialization section said Vault generates "master keys." Updated this to "unseal key shares and root token," matching current Vault terminology and the behavior of `vault operator init` with Shamir unseal keys.
- The AWS KMS auto-unseal snippet was marked as YAML even though it is Vault HCL configuration. Changed the code fence language to `hcl`.
- The AWS KMS auto-unseal section did not mention that Vault also needs AWS credentials or an IAM role with KMS permissions. Added a concise sentence to avoid an incomplete configuration.
- The Talos-specific wording said operators "cannot manually intervene." Since Vault can still be operated through Kubernetes APIs, the inaccurate wording was narrowed to "cannot SSH into nodes" / "SSH-based intervention."

## Review Notes
- Helm and kubectl were not installed in the local environment, so their local `--help` output could not be checked. Commands and flags were verified against HashiCorp and Kubernetes-facing official documentation instead.
- The post still uses a TLS-disabled Vault listener for readability. That is acceptable for a walkthrough baseline only; a future production-focused revision should show the full TLS configuration, certificate mounting, and AWS credential delivery mechanism.
