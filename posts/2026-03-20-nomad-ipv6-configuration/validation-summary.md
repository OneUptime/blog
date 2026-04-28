# Validation Summary: How to Configure Nomad with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- HashiCorp Nomad (server, client, job spec, templates)
- IPv6 networking (RFC 4291, RFC 3986 host:port format, RFC 3849 documentation prefix)
- HashiCorp Consul (service discovery, DNS)
- Docker driver (bridge and host network modes)
- CNI plugins
- HCL configuration syntax

## Sources Consulted
- Nomad agent configuration / advertise stanza: https://developer.hashicorp.com/nomad/docs/configuration#advertise
- Nomad client config / reserved parameters: https://developer.hashicorp.com/nomad/docs/configuration/client#reserved-parameters
- Nomad template stanza (node variable interpolation via `env`): https://developer.hashicorp.com/nomad/docs/job-specification/template
- Nomad runtime environment / network variables (`NOMAD_IP_<label>`, `NOMAD_PORT_<label>`): https://developer.hashicorp.com/nomad/docs/reference/runtime-environment-settings#network-related-variables
- Consul agent configuration (`bind_addr`, `advertise_addr`)
- RFC 3986 §3.2.2 (IP-literal / IPv6 in URI authority requires `[ ]`)
- RFC 3849 (`2001:db8::/32` reserved for documentation)

## Issues Found
1. **Invalid IPv6 literals in `advertise` stanza** — The original post used `"2001:db8::nomad-client:4646"` for `http`, `rpc`, and `serf`. `nomad-client` is not a valid IPv6 hex group, and IPv6 addresses combined with a port must be enclosed in brackets per RFC 3986 / Go's `net.SplitHostPort` (which Nomad uses). Replaced with `"[2001:db8::1]:4646"` (and `:4647` / `:4648`).
2. **Invalid IPv6 literal in Consul `advertise_addr`** — `"2001:db8::consul-node"` is not a valid IPv6 address. Replaced with `"2001:db8::2"`.
3. **Invalid IPv6 literal in `curl` example** — `http://[2001:db8::nomad-client]/` would not resolve because `nomad-client` is not hex. Replaced with `http://[2001:db8::1]/`.

## Review Notes
- The `client.reserved` block fields (`cpu`, `memory`, `disk`, `reserved_ports`) are valid per Nomad docs.
- The Nomad template syntax `{{ env "attr.unique.network.ip-address" }}` is correct — Nomad's template `env` function exposes node attributes via the `attr.*` and `node.*` namespaces.
- `NOMAD_IP_<label>` and `NOMAD_PORT_<label>` are real runtime environment variables Nomad sets for declared port labels.
- The comment "Assign both IPv4 and IPv6 CIDR ranges" is somewhat misleading — `network_interface = "eth0"` only selects the interface; whether IPv6 is assigned depends on the host's interface configuration. Left as-is since it is not technically wrong, just imprecise.
- In bridge networking with `static = 80/443`, port mapping `to` would be needed if the container listens on a different port; the example assumes nginx listens on the same ports, which is true for `nginx:alpine` defaults.
- For the host-mode Docker job, setting `network_mode = "host"` in the docker `config` is redundant when the group `network` stanza already specifies `mode = "host"`, but it is not incorrect.
- All version-specific information appears current as of Nomad 1.7+.
