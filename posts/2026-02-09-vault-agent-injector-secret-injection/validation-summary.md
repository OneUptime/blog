# Validation Summary: How to use Vault Agent Injector for automatic secret injection into pods

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HashiCorp Vault
- Vault Agent Injector
- Vault Agent templates
- Vault Helm chart
- Kubernetes Pods, Deployments, service accounts, init containers, sidecars, and mutating admission webhooks
- Helm and kubectl

## Sources Consulted
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault Agent Injector installation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/installation
- HashiCorp Vault Agent Injector examples: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/examples
- HashiCorp Vault Agent templates: https://developer.hashicorp.com/vault/tutorials/vault-agent/agent-templates
- HashiCorp Vault Helm chart configuration: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/configuration
- HashiCorp Vault Helm external Vault example: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/examples/external
- Kubernetes admission webhooks documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- Added the HashiCorp Helm repository setup and `--create-namespace` to the install command so the chart can be installed into the `vault` namespace on a fresh cluster.
- Changed the environment-variable section to describe rendering and sourcing a file, because Vault Agent Injector writes secrets to files rather than injecting environment variables directly into an already-created container environment.
- Replaced the invalid `vault.hashicorp.com/agent-inject-address` annotation with the documented `vault.hashicorp.com/service` annotation for overriding the Vault address used by injected agents.
- Updated `vault.hashicorp.com/agent-inject-perms` examples to use secret-specific annotations such as `vault.hashicorp.com/agent-inject-perms-database` and `vault.hashicorp.com/agent-inject-perms-config`, matching the injector annotation mapping rules.
- Reworked the PKI certificate example to use the documented `pkiCert` and `writeToFile` functions in a single template, avoiding separate certificate and key issuance that could create mismatched files.
- Updated Helm injector webhook settings from deprecated top-level values to `injector.webhook.failurePolicy` and `injector.webhook.namespaceSelector`.
- Updated the external Vault Helm setting from deprecated `injector.externalVaultAddr` to `global.externalVaultAddr`.
- Replaced the floating `latest` injector image tag with a pinned `hashicorp/vault-k8s` tag shown in the current chart documentation.

## Review Notes
The examples assume that Vault Kubernetes auth, Vault policies, the `app` role, service accounts, and referenced secret engines have already been configured. The post is technically valid as an injector-focused guide, but a future expansion could add the prerequisite Vault policy and Kubernetes auth setup.
