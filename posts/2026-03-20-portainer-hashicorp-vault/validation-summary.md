# Validation Summary: How to Integrate HashiCorp Vault with Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- HashiCorp Vault
- Vault Agent
- Vault Agent Injector
- AppRole authentication
- KV v2 secrets engine
- Docker Compose
- Kubernetes
- Helm

## Sources Consulted
- HashiCorp Vault docs, KV v2 setup: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2/setup
- HashiCorp Vault docs, AppRole auto-auth for Vault Agent: https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth/methods/approle
- HashiCorp Vault docs, Vault Agent templates: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template
- HashiCorp Vault docs, Kubernetes auth method: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault docs, Vault Agent Injector overview: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector
- HashiCorp Vault docs, Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault docs, Install Vault Agent Injector: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/installation
- HashiCorp Vault docs, Run Vault on Kubernetes: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/run
- HashiCorp Vault docs, Helm chart reference: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm
- Portainer docs, Add a new stack: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer docs, Relative path support: https://docs.portainer.io/advanced/relative-paths

## Issues Found
- The Docker stack mounted Vault configuration from a named volume that would start empty, so `config.hcl` would not exist at container startup. I changed this to a read-only host bind mount and updated the note accordingly.
- The Vault server example set `VAULT_ADDR` to `http://0.0.0.0:8200`, which is not a valid client destination address. I corrected it to `http://127.0.0.1:8200`.
- The Vault Agent stack passed `ROLE_ID` and `SECRET_ID` as environment variables even though the agent configuration read those values from files. I changed the example to mount `agent.hcl`, `role_id`, and `secret_id` from a host directory.
- Vault Agent templates referenced `.tpl` files that were never provided, and KV v2 template access requires `.Data.data.<key>`. I replaced the missing file references with inline templates that read the correct KV v2 fields.
- Vault Agent AppRole auto-auth removes the `secret_id` file after reading it by default. Because the corrected example uses a read-only bind mount, I set `remove_secret_id_file_after_reading = false`.
- The Vault Agent configuration pointed at `http://vault:8200`, which would only resolve if the agent ran on the same Docker network as the Vault service. I changed it to the routable `vault-host` placeholder already used elsewhere in the post.
- The Kubernetes section installed the Helm chart without explicitly enabling the injector, omitted initialization and unseal steps for the in-cluster Vault instance, did not create the Kubernetes auth role for the workload service account, and suggested annotating a live Pod. I corrected this to an injector-enabled install, explicit init/unseal commands, valid Kubernetes auth setup, role creation, and a Deployment manifest with annotations on the pod template.
- The injector example used `portainer/myapp` for a KV v2 secret path. I updated it to use the KV v2 API path and template access pattern required by Vault Agent and the injector.
- The description, introduction, and conclusion overstated the example as dynamic/automatically rotated secrets. I rewrote those lines so they match the static KV v2 plus Vault Agent flow the post actually demonstrates.

## Review Notes
- The examples still pin `hashicorp/vault:1.15`. The commands and configuration remain valid, but this tag is older than the current Vault documentation set reviewed on April 24, 2026. A future refresh should move to a newer supported image tag.
- The Docker and Helm examples both use single-node, file-backed Vault deployments. These are workable for demos and small environments but are not production HA designs.
- `depends_on` only controls container startup order. Some applications may still need retry or file-wait logic before consuming the rendered secret files.
- No end-to-end runtime execution was performed during this review; validation was done against current official documentation and configuration semantics.
