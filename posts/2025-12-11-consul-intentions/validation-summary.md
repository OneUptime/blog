# Validation Summary: How to Configure Consul Intentions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Consul service mesh intentions
- Consul CLI
- Consul Connect Intentions HTTP API
- Consul `service-intentions` configuration entries
- Consul Enterprise namespaces
- Python HTTP API usage with `requests`
- Go Consul API client
- Terraform Consul provider
- Envoy sidecar debugging
- Kubernetes log inspection

## Sources Consulted
- HashiCorp Consul service intentions configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions
- HashiCorp Consul service intentions overview: https://developer.hashicorp.com/consul/docs/secure-mesh/intention
- HashiCorp Consul create and manage intentions documentation: https://developer.hashicorp.com/consul/docs/secure-mesh/intention/create
- HashiCorp Consul intention CLI reference: https://developer.hashicorp.com/consul/commands/intention
- HashiCorp Consul intention create CLI reference: https://developer.hashicorp.com/consul/commands/intention/create
- HashiCorp Consul intention match CLI reference: https://developer.hashicorp.com/consul/commands/intention/match
- HashiCorp Consul Connect Intentions HTTP API reference: https://developer.hashicorp.com/consul/api-docs/connect/intentions
- HashiCorp Consul Go API package documentation: https://pkg.go.dev/github.com/hashicorp/consul/api
- Terraform Consul provider documentation and registry snippets for `consul_intention`, `consul_config_entry`, and `config_entry_service_intentions`: https://registry.terraform.io/providers/hashicorp/consul/latest/docs
- HashiCorp Terraform Consul provider repository compatibility notes: https://github.com/hashicorp/terraform-provider-consul

## Issues Found
- The post stated that Consul service mesh connections are denied by default. Consul's default intention behavior depends on the ACL default policy, so I changed the wording to specify zero-trust behavior when the ACL default policy is set to `deny`.
- The "How Intentions Work" description and diagram implied Consul is in the live data path for each connection. Consul documentation states that proxies or natively integrated services enforce cached intention data. I updated the wording and diagram to show intention configuration and certificates being supplied by Consul while the destination proxy enforces allow/deny decisions.
- The CLI examples were presented as current primary management commands. HashiCorp documents `consul intention create` as deprecated in Consul 1.9+ in favor of `service-intentions` config entries or the HTTP API, so I added that caveat.
- The L7 intentions section omitted the requirement that the destination service use an HTTP-based protocol through `service-defaults` or `proxy-defaults`. I added that requirement.
- The Python example used a `python-consul` interface (`connect.intentions`) that is not exposed by the published `python-consul` package. I replaced it with a direct HTTP API wrapper using `requests` and the current by-name `/v1/connect/intentions/exact`, `/check`, and `/match` endpoints.
- The Terraform section used the deprecated `consul_intention` resource. I replaced those examples with `consul_config_entry` resources using `service-intentions` config entries.
- The Terraform examples briefly defined two config entries for the same `service-intentions/api` identity during correction. I adjusted the L7 example to use `public-api` to avoid a duplicate config entry in one Terraform configuration.
- The best-practice wording for "default deny" was too broad. I updated it to mention setting the ACL default policy to `deny` or adding catch-all deny intentions.

## Review Notes
- Python syntax was checked locally with `ast.parse`.
- The local environment does not have `go`, `consul`, or `terraform` installed, so I could not compile the Go example or run CLI/Terraform validation locally. Go API method and type names were verified against the current official Go package documentation.
