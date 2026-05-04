# Validation Summary: How to Configure RabbitMQ Cluster with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- RabbitMQ (broker, listeners, management plugin, clustering)
- Erlang VM (distribution protocol, kernel app, inetrc)
- AMQP / AMQPS
- IPv6 networking
- Python (pika client)
- ip6tables / iptables-persistent
- systemd (rabbitmq-server unit)

## Sources Consulted
- RabbitMQ Networking guide — https://www.rabbitmq.com/docs/networking
- RabbitMQ Cluster Formation guide — https://www.rabbitmq.com/docs/cluster-formation
- RabbitMQ Management plugin docs — https://www.rabbitmq.com/docs/management
- RabbitMQ Configuration reference — https://www.rabbitmq.com/docs/configure
- Erlang `kernel` application reference — https://www.erlang.org/doc/apps/kernel/kernel_app.html
- Debian `iptables-persistent` man page — https://manpages.debian.org/bookworm/iptables-persistent/iptables-persistent.8.en.html
- rabbitmq-server issue tracker — https://github.com/rabbitmq/rabbitmq-server/issues/1182 (literal IPv6 in node names)

## Issues Found
1. **`{inet6, true}` placed inside the `kernel` app env in `advanced.config`.** `inet6` is not a valid Erlang `kernel` application env var — it is an `erl_inetrc` directive. Setting it under `kernel` is a no-op. Replaced it with the documented kernel options `{inet_dist_listen_options, [inet6]}` and `{inet_dist_connect_options, [inet6]}` and added a separate `/etc/rabbitmq/erl_inetrc` example containing `{inet6, true}.` and `{distribution, inet6_tcp}.` so name resolution and distribution actually use IPv6.
2. **`ERL_FLAGS="-kernel inet6 true"` in `rabbitmq-env.conf`.** Not a real Erlang VM flag. Replaced with the documented RabbitMQ env vars `RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS` and `RABBITMQ_CTL_ERL_ARGS`, both set to `"-proto_dist inet6_tcp -kernel inetrc '\"/etc/rabbitmq/erl_inetrc\"'"`. This is the form documented by RabbitMQ for IPv6 distribution.
3. **Literal IPv6 addresses used in Erlang/RabbitMQ node names** (`rabbit@[2001:db8::1]`, `rabbit@2001:db8::1`). Erlang node names follow `name@hostname` and do not support literal IPv6 addresses (with or without brackets) — see rabbitmq-server#1182. Replaced the literal-IPv6 node names in `cluster_formation.classic_config.nodes.*`, `rabbitmqctl -n …`, and the `join_cluster` examples with hostnames (`rabbit-node1`/`2`/`3`) and added a comment instructing the reader to map those hostnames to their IPv6 addresses via DNS or `/etc/hosts`.
4. **Wrong path for `ip6tables-save` output.** `iptables-persistent` reads `/etc/iptables/rules.v6` (same directory as `rules.v4`); `/etc/ip6tables/rules.v6` does not exist. Corrected the path.
5. **Code fence language for `advanced.config`.** Was tagged `bash`; the contents are Erlang term syntax. Changed the fence language to `erlang` so the snippet renders correctly.

## Review Notes
- `listeners.tcp.default = :::5672`, `listeners.ssl.default = :::5671`, `management.tcp.ip = ::`, and `management.tcp.port = 15672` are all valid per the RabbitMQ networking and management docs.
- `cluster_formation.peer_discovery_backend = rabbit_peer_discovery_classic_config` is still accepted; the short alias `classic_config` is also valid in current versions.
- The pika example is correct — pika accepts a bare IPv6 address string (no brackets) in `ConnectionParameters(host=…)`.
- The TLS section (`ssl_options.cacertfile/certfile/keyfile/verify/fail_if_no_peer_cert`) uses the documented option names.
- Note: literal IPv6 in `listeners.tcp.N = 2001:db8::1:5672` works because RabbitMQ's parser splits on the last `:` for the port, but it can be confusing — readers may prefer `listeners.tcp.1 = [2001:db8::1]:5672` style if they hit ambiguity.
- The Erlang distribution port (25672) and EPMD (4369) firewall rules are correct.
