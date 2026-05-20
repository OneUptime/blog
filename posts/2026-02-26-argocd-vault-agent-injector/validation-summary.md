# Validation Summary: How to Use Vault Agent Injector with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault
- Vault Agent Injector
- Vault Helm chart
- Vault Kubernetes authentication
- Argo CD
- Kubernetes Deployments, Pods, ServiceAccounts, readiness probes
- Consul Template syntax used by Vault Agent templates

## Sources Consulted
- HashiCorp Vault Agent Injector overview: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault Agent Injector installation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/installation
- HashiCorp Vault Helm chart configuration: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/configuration
- HashiCorp Vault Kubernetes auth method: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Helm integrated storage example: https://developer.hashicorp.com/vault/tutorials/kubernetes-introduction/kubernetes-minikube-raft
- Argo CD diff customization: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD sync waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/

## Issues Found
- The description claimed Vault Agent Injector injects environment variables at runtime. Vault Agent renders secrets to files; applications can load those files into their environment at startup. Updated the description accordingly.
- The Vault Helm chart example used `targetRevision: 0.28.0`, while the current HashiCorp install documentation shows chart `0.32.0`. Updated the example to `0.32.0`.
- The in-cluster HA Vault Helm values enabled HA replicas without configuring an HA storage mode. Added `server.ha.raft.enabled: true`, matching HashiCorp's integrated storage examples.
- The Kubernetes auth configuration was too incomplete for the external Vault scenario shown earlier in the post. Added `token_reviewer_jwt` and `kubernetes_ca_cert` placeholders and clarified they are needed when Vault runs outside the cluster.
- The post said Vault writes the raw JSON response by default. Official docs describe a generic key/value default template, with JSON available through `agent-inject-default-template`. Updated the wording.
- The environment-variable section described an init-container pattern, but the YAML used an application entrypoint sourcing a rendered file. Updated the explanation.
- The shell examples used `source` with `/bin/sh`; `source` is not POSIX `sh`. Replaced it with `.`.
- The complete example sourced `KEY=value` lines before `exec`, but those variables would not necessarily be exported to the child process. Updated the command to use `set -a` while sourcing the file.
- The Argo CD diff section implied the injector mutates Deployment templates. Official Vault docs describe Pod mutation. Updated the text and example ignore rules to target Pod fields with `jqPathExpressions`.

## Review Notes
The remaining examples are illustrative and still assume supporting setup exists, such as Vault policies, secret engines, database roles, PKI roles, network reachability, and a valid reviewer service account token. Production deployments should also configure TLS, unseal strategy, resource requests, and Vault storage settings beyond the minimal snippets shown here.
