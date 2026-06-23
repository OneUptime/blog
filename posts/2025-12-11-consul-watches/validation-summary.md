# Validation Summary: How to Configure Consul Watches

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- HashiCorp Consul watches
- Consul CLI
- Consul HCL agent configuration
- Consul HTTP handlers
- Consul blocking queries
- Bash and jq
- Python Flask
- python-consul client
- Go HashiCorp Consul API client
- Nginx upstream configuration

## Sources Consulted
- HashiCorp Consul Watches overview: https://developer.hashicorp.com/consul/docs/automate/watch
- HashiCorp Consul watch command: https://developer.hashicorp.com/consul/commands/watch
- HashiCorp Consul event command: https://developer.hashicorp.com/consul/commands/event
- HashiCorp Consul blocking queries: https://developer.hashicorp.com/consul/api-docs/features/blocking
- HashiCorp Consul Health API: https://developer.hashicorp.com/consul/api-docs/health
- Go package documentation for github.com/hashicorp/consul/api: https://pkg.go.dev/github.com/hashicorp/consul/api
- python-consul documentation: https://python-consul.readthedocs.io/en/latest/

## Issues Found
- The HTTP handler HCL used a `header { ... }` block. HashiCorp's watch documentation shows `header` as a map attribute under `http_handler_config`, so this was changed to `header = { ... }`.
- The service watch handler, Flask webhook example, Python callback example, and Go callback example used `Service.Address` directly. Consul service health responses may contain an empty service address, with the reachable node address in `Node.Address`. The examples now fall back to `Node.Address` when `Service.Address` is empty.
- The Python blocking-query examples invoked callbacks on every blocking-query return, including timeouts with an unchanged Consul index. The examples now compare the returned index with the previous index before calling the callback.
- The Go example imported `encoding/json` but did not use it, which would make the snippet fail to compile. The unused import was removed.
- The event example used `consul event -payload=...`, but the Consul CLI accepts the event payload as an optional positional argument. The command was corrected to `consul event -name=deploy '{"version": "1.2.0", "env": "production"}'`.

## Review Notes
The Consul CLI was not installed in the local workspace, so command verification was performed against the current HashiCorp Developer CLI documentation. The event payload should be kept small because Consul user events are distributed over gossip and are not persisted or guaranteed to be delivered in order.
