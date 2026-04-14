# Validation Summary: How to Configure Dapr with HashiCorp Consul State Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime and CLI)
- HashiCorp Consul (KV store, ACL system)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr HTTP State Management API
- Docker
- Kubernetes

## Sources Consulted
- Dapr Consul state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-consul/
- Dapr components-contrib Consul implementation: https://github.com/dapr/components-contrib/blob/master/state/hashicorp/consul/consul.go
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr JavaScript SDK docs: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Consul ACL Token Create command reference: https://developer.hashicorp.com/consul/commands/acl/token/create
- Consul KV Get command reference: https://developer.hashicorp.com/consul/commands/kv/get
- Consul consistency modes: https://developer.hashicorp.com/consul/api-docs/features/consistency
- Consul Docker image on Docker Hub: https://hub.docker.com/r/hashicorp/consul
- Consul ports reference: https://developer.hashicorp.com/consul/docs/reference/architecture/ports

## Issues Found
1. **Incorrect Consul CLI flag syntax in ACL token creation command.** The blog used double-hyphen flags (`--description`, `--policy-name`) but the Consul CLI uses single-hyphen flags (`-description`, `-policy-name`). Changed the command from `consul acl token create --description "Dapr state store token" --policy-name global-management` to `consul acl token create -description "Dapr state store token" -policy-name global-management`.

## Review Notes
- The Docker image `hashicorp/consul:1.17` is valid but outdated. Consul 1.22+ is the current latest series. This is acceptable for a tutorial but readers should be aware newer versions are available.
- The `state.consul` component type, all metadata fields (datacenter, httpAddr, aclToken, scheme, keyPrefixPath), and the component YAML format are all verified correct against official Dapr documentation.
- The Dapr HTTP API examples (v1.0 state endpoints) and JavaScript SDK examples (`DaprClient`, `state.save()`, `state.get()`) are all correct and match current API signatures.
- The claim that Consul KV provides "strongly consistent" storage is essentially correct -- Consul uses Raft consensus and provides strong consistency by default, though there is a small window for potential staleness during leader elections.
- The `global-management` ACL policy referenced is a real built-in Consul policy that grants unrestricted access. In production, a more scoped policy would be recommended, but the tutorial approach is valid for getting started.
