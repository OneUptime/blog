# Validation Summary: How to Install and Configure Consul on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Ubuntu
- HashiCorp Consul
- Consul agent configuration in HCL
- Consul ACLs
- Consul TLS and gossip encryption
- Consul service registration, health checks, DNS, and KV
- systemd and systemd-resolved

## Sources Consulted
- HashiCorp Consul install documentation: https://developer.hashicorp.com/consul/install
- Consul agent configuration file reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/general
- Consul TLS configuration reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/tls
- Consul ports reference: https://developer.hashicorp.com/consul/docs/reference/architecture/ports
- Consul ACL bootstrap command reference: https://developer.hashicorp.com/consul/commands/acl/bootstrap
- Consul agent token documentation: https://developer.hashicorp.com/consul/docs/secure/acl/token/agent
- Consul ACL set-agent-token command reference: https://developer.hashicorp.com/consul/commands/acl/set-agent-token
- Consul ACL token HTTP API reference: https://developer.hashicorp.com/consul/api-docs/acl/tokens
- Consul KV command reference: https://developer.hashicorp.com/consul/commands/kv/put
- Consul DNS forwarding documentation: https://developer.hashicorp.com/consul/docs/manage/dns/forwarding/enable
- Consul catalog services command reference: https://developer.hashicorp.com/consul/commands/catalog/services
- Consul health check documentation: https://developer.hashicorp.com/consul/docs/register/health-check/vm

## Issues Found
- Updated supported Ubuntu prerequisites from Ubuntu 20.04/22.04 to Ubuntu 22.04/24.04 because Ubuntu 20.04 is no longer a current standard-support LTS release.
- Updated the HashiCorp APT repository codename lookup to use `/etc/os-release` with `lsb_release` as a fallback, matching the current official installation guidance more closely.
- Corrected the TLS certificate section to include client-agent and CLI certificates. The post enables `verify_incoming`, so client agents and CLI/API calls need client certificates when using the secured interfaces.
- Changed HCL snippets that were fenced as JSON to `hcl` and replaced JSON-style comments with HCL comments.
- Changed the configured gRPC port from plaintext `grpc = 8502` to `grpc_tls = 8503`, matching current Consul guidance to prefer the TLS gRPC listener.
- Added client certificate and key settings to the client agent TLS configuration so clients can communicate with servers when server-side incoming verification is enabled.
- Added `CONSUL_CLIENT_CERT` and `CONSUL_CLIENT_KEY` exports for CLI commands against an HTTPS listener that requires client certificate authentication.
- Added client certificate and key flags to HTTPS `curl` examples so they work with the TLS configuration shown in the guide.
- Corrected the `consul catalog services` comment because that command lists catalog services; it does not by itself discover healthy service instances.
- Updated the systemd-resolved forwarding snippet to use `DNSSEC=false` and `Domains=~consul`, matching HashiCorp's documented example.
- Split the gossip connectivity check into TCP and UDP `nc` commands because `nc -zv` only tests TCP.
- Updated the firewall port check from `8502` to `8503` after switching to the gRPC TLS port.
- Replaced the obsolete `/v1/acl/info` troubleshooting request with the current `/v1/acl/token/self` endpoint.

## Review Notes
The guide remains a concise VM-based Consul setup. Future improvements could add a short note about copying generated certificates securely to each node, creating node-specific certificates, and disabling the HTTP listener entirely in production by setting `http = -1`.
