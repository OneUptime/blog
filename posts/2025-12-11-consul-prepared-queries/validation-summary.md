# Validation Summary: How to Configure Consul Prepared Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Consul prepared queries
- Consul HTTP API
- Consul DNS interface
- Consul Terraform provider
- Python HTTP client code
- Go Consul API client

## Sources Consulted
- HashiCorp Consul Prepared Query HTTP API: https://developer.hashicorp.com/consul/api-docs/query
- HashiCorp Consul dynamic service lookups with prepared queries: https://developer.hashicorp.com/consul/docs/discover/service/dynamic
- HashiCorp Consul geo-failover with prepared queries: https://developer.hashicorp.com/consul/docs/manage-traffic/failover/prepared-query
- HashiCorp Consul Go API source for prepared queries: https://raw.githubusercontent.com/hashicorp/consul/main/api/prepared_query.go
- HashiCorp Consul Terraform provider prepared query resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-consul/main/docs/resources/prepared_query.md
- python-consul prepared query API documentation: https://python-consul.readthedocs.io/en/latest/

## Issues Found
- The post said prepared queries could be created using the "HTTP API or CLI" and then showed a `query { ... }` HCL block. Consul's prepared query CRUD operations are exposed by the `/v1/query` HTTP API, and the HCL-style declarative option is Terraform's `consul_prepared_query` resource, not a Consul agent configuration block. Updated the wording and snippet to use the HashiCorp Consul Terraform provider resource.
- The Python example used `python-consul` as though `query.create()` accepted a raw prepared-query JSON body and as though `query.execute()` returned `(index, result)`. The documented `python-consul` prepared-query API takes explicit arguments for `create()`, does not expose all fields used by the example such as `Near`, and `execute()` returns JSON data. Replaced the wrapper with direct `requests` calls to Consul's official HTTP API so the code matches the preceding API examples and supports all shown fields.
- The Go example used `api.QueryDatacenterOptions`, which is a deprecated alias in the current HashiCorp Consul Go API. Updated it to `api.QueryFailoverOptions`.

## Review Notes
- The remaining HTTP API examples match the current Consul prepared query API fields for `Service`, `OnlyPassing`, `Near`, `Tags`, `NodeMeta`, `ServiceMeta`, `Failover`, template interpolation, DNS TTLs, and execute query parameters.
- The environment did not have the Go toolchain installed, so the Go example was verified against HashiCorp's current Go API source rather than compiled locally.
