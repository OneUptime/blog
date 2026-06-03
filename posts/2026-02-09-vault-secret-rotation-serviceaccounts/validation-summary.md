# Validation Summary: How to Implement Vault Secret Rotation for Kubernetes ServiceAccounts

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HashiCorp Vault Kubernetes auth method
- HashiCorp Vault Agent auto-auth and templates
- HashiCorp Vault database secrets engine
- Kubernetes ServiceAccounts and projected tokens
- Kubernetes Deployments and CronJobs
- Go Vault API client
- fsnotify
- Prometheus alerting

## Sources Consulted
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Kubernetes auth API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault Agent Kubernetes auto-auth documentation: https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth/methods/kubernetes
- HashiCorp Vault Agent template documentation: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template
- HashiCorp Vault token renewal API documentation: https://developer.hashicorp.com/vault/api-docs/auth/token
- HashiCorp Vault database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault telemetry metrics documentation: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/all
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes ServiceAccount token projection documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes shared process namespace documentation: https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace

## Issues Found
- The post described Kubernetes ServiceAccount tokens as generally static and implied Vault rotates Kubernetes ServiceAccount credentials. Updated the explanation to distinguish modern projected ServiceAccount tokens, which Kubernetes rotates, from legacy ServiceAccount token Secrets, and clarified that Vault Kubernetes auth issues Vault tokens after validating the ServiceAccount JWT.
- The Vault Kubernetes auth role used deprecated `policies` and legacy `ttl`/`max_ttl` fields. Updated the role example to use `token_policies`, `token_ttl`, and `token_max_ttl` from the current Kubernetes auth API.
- The Vault Agent sidecar attempted to signal the application process from another container. Added `shareProcessNamespace: true` so the Vault Agent container can see and signal the application process in the same pod.
- The CronJob used `vault:1.15` while also running `kubectl` and `jq`, which are not guaranteed to be present in the Vault image. Updated the image to a custom rotator image placeholder and added a note that it must include the Vault CLI, kubectl, and jq.
- The Prometheus examples referenced non-existent Vault metrics (`vault_database_creds_generation_failures` and `vault_token_creation_time`). Replaced them with metrics aligned with Vault telemetry documentation for database user creation errors and secret lease creation.
- The conclusion still framed the result as ServiceAccount rotation. Updated it to describe secret rotation for Kubernetes workloads, which better matches the implementation.

## Review Notes
The examples are representative and still require environment-specific Vault policies, database role configuration, RBAC for the rotator ServiceAccount, and a real rotator image before production use. The Go examples are illustrative; production code should add nil checks for Vault auth responses, concurrency protection around token/client state, and backoff around renewal failures.
