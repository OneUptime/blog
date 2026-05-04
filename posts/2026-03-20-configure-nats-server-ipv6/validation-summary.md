# Validation Summary: How to Configure NATS Server with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- NATS Server (messaging system)
- NATS JetStream (persistence layer)
- IPv6 networking
- nats-server CLI
- NATS CLI tool (`nats` command)
- Go NATS client (`github.com/nats-io/nats.go`)
- Python NATS client (`nats-py`, asyncio-based)
- systemd (`systemctl`)
- Linux networking utilities (`ss`, `curl`)

## Sources Consulted
- NATS Server Configuration documentation: https://docs.nats.io/running-a-nats-service/configuration
- NATS Server CLI flags documentation: https://docs.nats.io/running-a-nats-service/introduction/flags
- NATS Cluster configuration documentation: https://docs.nats.io/running-a-nats-service/configuration/clustering/cluster_config
- NATS Go client (nats.go) package documentation: https://pkg.go.dev/github.com/nats-io/nats.go
- RFC 3986 (URI bracket notation for IPv6 literals)

## Issues Found
No technical issues found.

Verified correctness of:
- Config directives: `server_name`, `host`, `port`, `http`, `cluster { name, host, port, routes }`, `jetstream { store_dir, max_memory_store, max_file_store }` — all valid.
- CLI flags: `--addr`, `--port`, `--http_port`, `-c` — all valid and current.
- IPv6 formatting:
  - Bare IPv6 in `host:` field (no brackets) — correct.
  - Bracketed IPv6 in `host:port` form (e.g., `http: "[2001:db8::10]:8222"`) — correct per RFC 3986.
  - Bracketed IPv6 in route URLs (`nats://[2001:db8::11]:6222`) — correct.
  - `host: "::"` to bind all IPv6 interfaces — correct.
- Routes array without commas — valid in NATS HOCON-style config (newline-separated arrays are supported).
- Go client: `nats.Connect` with `nats.Timeout` and `nats.RetryOnFailedConnect` options, `Subscribe(subj, MsgHandler)`, `Publish(subj, []byte)`, `Flush()`, `Close()` — all correct API usage.
- Python client: `await nats.connect(url)`, `await nc.subscribe(subject, cb=handler)`, `await nc.publish(subject, bytes)`, `await sub.unsubscribe()`, `await nc.close()` — all correct for the async `nats-py` library.
- Verification commands: `ss -6 -tlnp`, `curl -6`, `nats server info`, `nats sub`, `nats pub` — all valid.

## Review Notes
- The Python example sleeps 1 second after publishing to allow the message handler to fire; this is acceptable for a demo but not robust for production code (where `await nc.flush()` and explicit synchronization would be preferred).
- The Go example similarly relies on a 100ms sleep to receive the published message; sufficient for illustration.
- Binding to `::` may also accept IPv4-mapped connections depending on the host's `IPV6_V6ONLY` sysctl; the post correctly frames this as "all IPv6 interfaces" without overclaiming dual-stack semantics.
- Example IPv6 addresses use the `2001:db8::/32` documentation prefix (RFC 3849) — appropriate for examples.
