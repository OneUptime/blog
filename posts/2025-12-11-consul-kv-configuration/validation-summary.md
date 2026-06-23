# Validation Summary: How to Implement Consul KV for Configuration

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HashiCorp Consul KV
- Consul CLI
- Consul HTTP API
- Consul transaction API
- Consul blocking queries and watches
- python-consul
- HashiCorp Consul Go API client
- consul-template
- HashiCorp Vault

## Sources Consulted
- HashiCorp Consul KV Store HTTP API: https://developer.hashicorp.com/consul/api-docs/kv
- HashiCorp Consul Transactions HTTP API: https://developer.hashicorp.com/consul/api-docs/txn
- HashiCorp Consul KV CLI documentation: https://developer.hashicorp.com/consul/commands/kv/get
- HashiCorp Consul KV store guide: https://developer.hashicorp.com/consul/docs/automate/kv/store
- HashiCorp Consul watches overview: https://developer.hashicorp.com/consul/docs/automate/watch
- HashiCorp consul-template configuration options: https://developer.hashicorp.com/consul/docs/reference/consul-template/configuration
- HashiCorp consul-template Go template reference: https://developer.hashicorp.com/consul/docs/reference/consul-template/go
- HashiCorp Consul Go API package documentation: https://pkg.go.dev/github.com/hashicorp/consul/api
- python-consul KV documentation: https://python-consul.readthedocs.io/en/latest/

## Issues Found
1. The HTTP API example incorrectly implied that values must be base64-encoded when written to `/v1/kv`. Consul stores the PUT request body as the raw value, while JSON read responses encode `Value` as base64. Updated the comments to distinguish write payloads from read response encoding.
2. The blocking query example described the `index` parameter as the previous `ModifyIndex`. Consul blocking queries should use the `X-Consul-Index` response header, although this corresponds to `ModifyIndex` for a single-key KV response. Updated the comments accordingly.
3. The Python and Go watcher examples updated cached keys but did not remove deleted keys under the watched prefix, leaving stale configuration in memory. Added deletion detection and callback notification for keys that disappear from recursive watch results.
4. The opening consistency claim was too broad for distributed Consul clients. Reworded it to describe consistent storage through Consul servers instead of implying every node always has identical local state.
5. The consul-template example used the legacy bare `command` form and described only restarting services while the example reloads a service. Updated the text to "reloads or restarts" and changed the config to the documented `exec { command = [...] }` form.

## Review Notes
- Consul was not installed in the local environment, so CLI flags were verified against official HashiCorp documentation rather than local `--help` output.
- Consul KV values are limited to 512 KB, and the post's best practice warning is accurate.
- The post correctly recommends Vault over Consul KV for secrets; Consul ACLs can restrict access, but they do not make KV a dedicated secret-management system.
