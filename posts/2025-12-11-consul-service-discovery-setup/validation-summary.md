# Validation Summary: How to Set Up Consul for Service Discovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Consul
- Consul agents, servers, clients, ACLs, health checks, DNS, and HTTP API
- systemd
- systemd-resolved and dnsmasq
- Python with python-consul
- Go with github.com/hashicorp/consul/api

## Sources Consulted
- HashiCorp Consul installation documentation: https://developer.hashicorp.com/consul/docs/fundamentals/install
- HashiCorp Consul agent configuration reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file
- HashiCorp Consul ACL configuration reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/acl
- HashiCorp Consul service definition reference: https://developer.hashicorp.com/consul/docs/reference/service
- HashiCorp Consul Agent Service HTTP API: https://developer.hashicorp.com/consul/api-docs/agent/service
- HashiCorp Consul Health HTTP API: https://developer.hashicorp.com/consul/api-docs/health
- HashiCorp Consul DNS forwarding documentation: https://developer.hashicorp.com/consul/docs/manage/dns/forwarding/enable
- HashiCorp Consul Go API package documentation: https://pkg.go.dev/github.com/hashicorp/consul/api
- python-consul documentation and PyPI release notes: https://python-consul.readthedocs.io/en/latest/ and https://pypi.org/project/python-consul/

## Issues Found
- The install command pinned Consul 1.17.0, while current HashiCorp install documentation lists newer Consul 2.0.x releases. Updated the binary download URL to Consul 2.0.1.
- The install snippet used `chmod` on `/usr/local/bin/consul` without `sudo` after moving the binary with `sudo`. Added `sudo chmod` so the command works for non-root shell users.
- The systemd unit linked to `https://www.consul.io/docs`, which now redirects to HashiCorp developer documentation. Updated it to `https://developer.hashicorp.com/consul/docs`.
- The Consul server and client examples used `your-gossip-encryption-key` as a literal `encrypt` value, but Consul requires a valid base64 gossip key. Replaced the placeholder with the generated example key shown in the post.
- The tutorial enabled ACLs with `default_policy = "deny"` but later registered and queried services without tokens. Added ACL bootstrap guidance, an exported `CONSUL_HTTP_TOKEN`, token headers for HTTP API calls, and a service definition token placeholder.
- The Python example described the selection strategy as round-robin even though it uses `random.choice`. Changed the comment to random load balancing.
- The systemd-resolved DNS forwarding snippet omitted the systemd version caveat and `DNSSEC=false` shown in current Consul DNS forwarding documentation. Added the caveat and DNSSEC setting.
- The monitoring section labeled `consul catalog services` as a service health check. Replaced it with `consul health checks api`, which actually queries service check health.

## Review Notes
The Python example uses the `python-consul` package, whose upstream GitHub repository is archived, although the API shown remains consistent with its documented/PyPI interface. A future update could switch the example to direct HTTP requests or a maintained Python client.
