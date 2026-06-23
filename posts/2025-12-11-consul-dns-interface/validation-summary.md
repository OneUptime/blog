# Validation Summary: How to Configure Consul DNS Interface

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Consul DNS
- DNS service discovery
- systemd-resolved
- dnsmasq
- Unbound
- iptables
- Python with dnspython
- Go net resolver APIs

## Sources Consulted
- HashiCorp Consul DNS configuration reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/dns
- HashiCorp Consul DNS behavior guide: https://developer.hashicorp.com/consul/docs/discover/dns/configure
- HashiCorp Consul DNS syntax reference: https://developer.hashicorp.com/consul/docs/reference/dns
- HashiCorp Consul static DNS queries guide: https://developer.hashicorp.com/consul/docs/discover/service/static
- HashiCorp Consul prepared query DNS guide: https://developer.hashicorp.com/consul/docs/discover/service/dynamic
- HashiCorp Consul DNS forwarding guide: https://developer.hashicorp.com/consul/docs/manage/dns/forwarding/enable
- HashiCorp Consul DNS scaling and TTL guide: https://developer.hashicorp.com/consul/docs/discover/dns/scale
- dnspython Resolver documentation: https://dnspython.readthedocs.io/en/latest/resolver-class.html
- Go net.Resolver documentation: https://pkg.go.dev/net

## Issues Found
- The Consul configuration placed `recursors` inside `dns_config` and included `enable_recursion`, which is not a current Consul DNS configuration key. Moved `recursors` to the top-level agent configuration and removed `enable_recursion`; Consul enables non-Consul recursive forwarding by configuring `recursors`.
- The configuration used deprecated `udp_answer_limit`. Replaced it with `a_record_limit`, which is the current Consul setting for limiting A, AAAA, and ANY DNS answers.
- The comments for `enable_truncate` and `enable_additional_node_meta_txt` described the wrong behavior. Updated them to match Consul's documented truncation and node metadata TXT behavior.
- The systemd-resolved forwarding example omitted `DNSSEC=false`, which HashiCorp includes in its Consul forwarding configuration. Added it to avoid DNSSEC validation problems for the `.consul` split DNS domain.
- The Python example called an undefined `get_service_addresses_from_fqdn()` method. Added that helper and routed tagged-service lookups through it.
- The Python example resolved SRV target hosts through the system resolver, which may not be configured to query Consul on port 8600. Changed it to resolve targets through the configured dnspython resolver.
- The health-aware DNS section used `dig +all` as if it could include unhealthy services. `+all` is a dig output option, not a Consul health filter. Replaced the example with a note that DNS inclusion behavior is controlled by `only_passing` in Consul configuration, and kept the HTTP health API example for explicit health filtering.

## Review Notes
The embedded Python snippet was syntax-checked with `python3 -m py_compile`. The Go snippet was reviewed against the official `net.Resolver` documentation, but the local environment does not have `go` or `gofmt` installed, so it could not be compiled locally.
