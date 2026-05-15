# Validation Summary: How to Deploy Vault Agent Sidecar for Kubernetes on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Kubernetes
- HashiCorp Vault
- Vault Agent Injector
- Vault Kubernetes authentication
- Vault KV v2 secrets engine
- Helm
- kubectl

## Sources Consulted
- HashiCorp Vault Helm chart documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm
- HashiCorp Vault on Kubernetes Helm run documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/run
- HashiCorp Vault HA with integrated storage documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/examples/ha-with-raft
- HashiCorp Vault Agent Injector installation documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/installation
- HashiCorp Vault Agent Injector annotations documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Agent template documentation: https://developer.hashicorp.com/vault/docs/agent/template
- HashiCorp Vault Kubernetes sidecar tutorial: https://developer.hashicorp.com/vault/tutorials/kubernetes/kubernetes-sidecar
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The prerequisites said "Helm 3 installed", but the current HashiCorp Vault Helm chart documentation specifies Helm 3.6 or later. Updated the prerequisite accordingly.
- The production Helm example enabled HA replicas but did not configure an HA storage backend. Updated the example to enable integrated Raft storage with `server.ha.raft.enabled=true`.
- The Kubernetes auth configuration used the older service-link variable `KUBERNETES_PORT_443_TCP_ADDR`. Updated it to use `KUBERNETES_SERVICE_HOST` and `KUBERNETES_SERVICE_PORT`, matching current HashiCorp guidance for Vault running inside Kubernetes.
- The KV secrets engine command could fail in dev mode if `secret/` is already mounted. Clarified that the command is only needed if the KV v2 engine is not already enabled.
- The post claimed Vault writes injected secrets as JSON by default. Current Vault Agent Injector annotation documentation says the default template type is `map`, with `json` available as an option. Updated the description.
- The secret rotation section claimed to control the refresh interval but showed `agent-cache-enable` and `agent-run-as-same-user`, which do not set the template refresh interval. Replaced them with `template-static-secret-render-interval` for KV v2/static secrets.
- The verification command claimed to show both init and sidecar containers but only listed regular containers. Updated the JSONPath expression to include `spec.initContainers` and `spec.containers`.

## Review Notes
- The post remains a development-oriented walkthrough. A production Vault deployment also needs additional operational hardening such as initialization and unseal procedures, TLS, auto-unseal, storage backup planning, RBAC review, and careful chart values management.
