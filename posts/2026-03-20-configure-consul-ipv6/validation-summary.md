# Validation Summary: How to Configure Consul with IPv6 Addresses

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- HashiCorp Consul agent configuration
- Consul HTTP API
- Consul DNS
- IPv6 and dual-stack networking
- `curl` and `dig`
- Python `python-consul`

## Sources Consulted
- Consul 1.22.x release notes: https://developer.hashicorp.com/consul/docs/release-notes/consul/v1_22_x
- General parameters for Consul agent configuration: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/general
- Advertise address parameters for Consul agent configuration files: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/address
- Join parameters for Consul agent configuration files: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/join
- Consul agent command reference: https://developer.hashicorp.com/consul/commands/agent
- Consul operator raft command reference: https://developer.hashicorp.com/consul/commands/operator/raft
- Consul DNS reference: https://developer.hashicorp.com/consul/docs/reference/dns
- Service definition reference: https://developer.hashicorp.com/consul/docs/reference/service
- Agent service HTTP API reference: https://developer.hashicorp.com/consul/api-docs/agent/service
- `python-consul` documentation: https://python-consul.readthedocs.io/en/latest/
- `python-consul` source repository: https://github.com/python-consul/python-consul
- `dig(1)` man page: https://manpages.ubuntu.com/manpages/bionic/man1/dig.1.html

## Issues Found
- The post implied general Consul IPv6 support. I added a version caveat because HashiCorp introduced IPv6 agent and service address support in Consul 1.22.0 for VMs and Kubernetes.
- The `retry_join` examples used bare IPv6 literals. I changed them to bracketed literals because Consul requires square brackets around literal IPv6 addresses in `retry_join`.
- The DNS verification example used `dig @[2001:db8::10]` and described the lookup as an SRV lookup. I changed it to `dig @2001:db8::10 -p 8600 web-service.service.consul AAAA` because the shown query type is `AAAA`, and `dig` expects the server argument as a colon-delimited IPv6 address rather than a bracketed URI-style literal.
- The Python example passed `host='2001:db8::10'` to `python-consul`. I changed it to `host='[2001:db8::10]'` because the client constructs an HTTP URL from `host` and `port`, and an unbracketed IPv6 literal produces an invalid URL.
- The summary overstated that `client_addr` itself must always be an IPv6 literal. I corrected it to reflect that IPv6 listeners can be configured through `client_addr` or the `addresses` block.

## Review Notes
- HashiCorp currently recommends using only one address type per Consul datacenter even though Consul 1.22.x supports IPv4 and IPv6 addresses on VMs and Kubernetes.
- `python-consul` is a community client and its upstream repository is archived. The corrected example is still technically valid, but a future revision may prefer a maintained client or direct Consul HTTP API examples.
- The `consul` CLI was not installed locally, so Consul commands and configuration were validated against HashiCorp documentation rather than executed. The `dig` syntax and Python URL parsing behavior were checked locally.
