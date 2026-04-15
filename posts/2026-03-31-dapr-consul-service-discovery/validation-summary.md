# Validation Summary: How to Use Dapr with Consul-Based Service Discovery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (name resolution, service invocation, Configuration resource)
- HashiCorp Consul (service discovery, health checks, ACLs)
- Kubernetes (Helm chart deployment)
- Python Dapr SDK
- HCL (Consul ACL policy language)

## Sources Consulted
- Dapr Consul name resolution component docs: https://docs.dapr.io/reference/components-reference/supported-name-resolution/setup-nr-consul/
- Dapr components-contrib source (nameresolution/hashicorp/consul): https://github.com/dapr/components-contrib/tree/main/nameresolution/hashicorp/consul
- Dapr Python SDK source (invoke_method): https://github.com/dapr/python-sdk
- Consul Helm chart docs: https://developer.hashicorp.com/consul/docs/k8s/helm
- Consul CLI commands reference: https://developer.hashicorp.com/consul/commands
- Consul ACL rules reference: https://developer.hashicorp.com/consul/docs/security/acl/acl-rules

## Issues Found

### 1. Incorrect health check field name in Dapr Configuration YAML
- **What was wrong:** The health check used `id: "dapr-health"` as the field name.
- **What was changed:** Renamed to `checkID: "dapr-health"`.
- **Why:** The Dapr Consul component's `AgentServiceCheck` struct uses `CheckID` (YAML: `checkID`), not `id`. The official Dapr docs use `checkID` in their examples.

### 2. Invalid Consul CLI command for health checks
- **What was wrong:** The post used `consul health checks service order-service`, but there is no `consul health` CLI command. Health check queries are only available via the Consul HTTP API.
- **What was changed:** Replaced with `curl http://127.0.0.1:8500/v1/health/checks/order-service | jq`, which uses the correct HTTP API endpoint.
- **Why:** The Consul CLI does not expose a `health` subcommand. The HTTP API at `/v1/health/checks/:service` is the correct way to query service health checks from the command line.

## Review Notes
- The Helm chart values (`global.datacenter`, `server.replicas`, `client.enabled`, `connectInject.enabled`) are all valid for the `hashicorp/consul` chart.
- The `consul catalog nodes -service=order-service` command is valid and correctly filters nodes providing a specific service.
- The `consul watch -type=service -service=order-service cat` command is valid syntax for watching service changes.
- The ACL policy HCL syntax using `service_prefix` and `node_prefix` is correct.
- The Python SDK `invoke_method` call with `app_id`, `method_name`, and `http_verb` parameters is correct.
- The Dapr Configuration YAML structure (`spec.nameResolution` with `component`, `version`, `configuration`) is correct per official docs.
- The `selfRegister`, `client.address`, `tags`, and `meta` fields are all valid Consul name resolution configuration options.
