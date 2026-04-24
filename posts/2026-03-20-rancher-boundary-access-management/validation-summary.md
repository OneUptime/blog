# Validation Summary: How to Set Up Rancher with Boundary for Access Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- HashiCorp Boundary
- HashiCorp Vault
- Terraform
- Kubernetes
- OpenID Connect (OIDC)
- PostgreSQL

## Sources Consulted
- Boundary self-managed deployment docs: https://developer.hashicorp.com/boundary/docs/deploy/self-managed
- Boundary controller configuration reference: https://developer.hashicorp.com/boundary/docs/configuration/controller
- Boundary Vault transit KMS reference: https://developer.hashicorp.com/boundary/docs/configuration/kms/transit
- Boundary worker overview: https://developer.hashicorp.com/boundary/docs/workers
- Boundary worker registration docs: https://developer.hashicorp.com/boundary/docs/workers/registration
- Boundary `server` command docs: https://developer.hashicorp.com/boundary/docs/commands/server
- Boundary `connect kube` command docs: https://developer.hashicorp.com/boundary/docs/commands/connect/kube
- Boundary connect helpers docs: https://developer.hashicorp.com/boundary/docs/targets/connections/connect-helpers
- Boundary Kubernetes tutorials: https://developer.hashicorp.com/boundary/tutorials/kubernetes-connect/kubernetes-getting-started-config and https://developer.hashicorp.com/boundary/tutorials/kubernetes-connect/kubernetes-getting-started-connect
- Boundary Terraform patterns for targets: https://developer.hashicorp.com/boundary/docs/deploy/terraform-patterns/terraform-targets
- Boundary Terraform patterns for credentials and credential stores: https://developer.hashicorp.com/boundary/docs/deploy/terraform-patterns/terraform-credentials-and-credential-stores
- Boundary sessions list docs and session service API docs: https://developer.hashicorp.com/boundary/docs/commands/sessions/list and https://developer.hashicorp.com/boundary/api-docs/session-service
- Vault Kubernetes secrets engine docs: https://developer.hashicorp.com/vault/docs/secrets/kubernetes
- Official HashiCorp Helm repo index: https://helm.releases.hashicorp.com/index.yaml
- Official Boundary Terraform provider source: https://github.com/hashicorp/terraform-provider-boundary
- Official Vault Terraform provider source: https://github.com/hashicorp/terraform-provider-vault

## Issues Found
- The post used `helm install boundary hashicorp/boundary`, but HashiCorp's official Helm repository does not publish a Boundary chart. I replaced that with the supported self-managed controller initialization and startup flow using `boundary database init` and `boundary server`.
- The controller HCL used Terraform-style `${...}` interpolation, which Boundary configuration files do not support. I changed the database URL to `env://BOUNDARY_PG_URL` and removed the inline Vault token usage.
- The controller configuration only defined a `root` transit KMS stanza, which is incomplete for a controller that manages workers. I added `worker-auth` and `recovery` transit KMS stanzas and `key_id` values.
- The worker Kubernetes manifest was not a valid `Deployment` because it lacked a selector and matching pod labels. I added the required `selector.matchLabels` and pod labels.
- The worker deployment used `hashicorp/boundary:latest`, which is not a stable, reviewable version pin. I replaced it with `hashicorp/boundary:0.20.1`.
- The worker deployment and HCL used unsupported or misleading fields for current worker registration: `BOUNDARY_CLUSTER_ID`, `address` inside the `worker` block, and `name`/`description` in a non-KMS registration flow. I rewrote the example to use a proxy listener, `auth_storage_path`, `controller_generated_activation_token`, and `public_addr`, which matches current controller-led registration docs.
- The Terraform example referenced `boundary_scope.global.id`, which was never defined. I corrected the org scope parent to the literal global scope ID, `global`.
- The Vault Terraform snippet used an undefined Kubernetes secret data source, called the engine an auth backend, and used unsupported TTL fields (`token_ttl`). I changed the example to use variables, corrected the terminology to the Kubernetes secrets engine, and replaced the TTL settings with `token_default_ttl` and `token_max_ttl` in seconds.
- The Vault role example bound to a ClusterRole without specifying `kubernetes_role_type`. I added `kubernetes_role_type = "ClusterRole"`.
- The Boundary credential library example used an unsupported `credential_type = "kubernetes"` and `GET` for a request that needs namespace input. I added the missing Vault credential store, changed the library to `credential_type = "json"`, and switched it to `POST` with a JSON request body against `kubernetes/creds/k8s-developer`.
- The CLI example used a nonexistent `boundary connect kubernetes` command and unsupported `-k8s-connect-port` flag, and incorrectly claimed that Boundary sets `KUBECONFIG` automatically. I replaced the flow with the documented `boundary connect kube ... -- get nodes` helper.
- The audit example queried `.terminated_time`, which is not a top-level Boundary session field. I updated the export to derive the session end timestamp from the terminated session state and include the current session status.
- The prerequisites omitted dependencies required by the corrected instructions. I added PostgreSQL for self-hosted controllers and `kubectl`, and raised the Boundary/Vault version guidance to match the features used by the post.

## Review Notes
- HCP Boundary users do not deploy controllers themselves. The post now notes that Step 1 is self-hosted only, and the worker config includes a note that HCP deployments use `hcp_boundary_cluster_id` instead of `initial_upstreams`.
- The `-include-terminated` flag on `boundary sessions list` is currently valid but marked deprecated in the official CLI docs. It remains useful today when exporting session history.
- The worker example assumes the client can reach the worker at `boundary-worker.example.com:9202` and that `auth_storage_path` is backed by persistent storage.
