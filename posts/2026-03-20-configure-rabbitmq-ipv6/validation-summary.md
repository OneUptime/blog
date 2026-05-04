# Validation Summary: How to Configure RabbitMQ to Listen on IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ (rabbitmq.conf, advanced.config, management plugin, clustering, distribution listener)
- Erlang (advanced.config syntax)
- AMQP / IPv6 networking
- Python Pika client library
- Linux tooling: systemd (`systemctl`), `ss`, `nc`, `curl`, `ip6tables`, `firewalld`

## Sources Consulted
- RabbitMQ Configuration: https://www.rabbitmq.com/docs/configure
- RabbitMQ Networking (listeners, IPv6, distribution): https://www.rabbitmq.com/docs/networking
- RabbitMQ Cluster Formation: https://www.rabbitmq.com/docs/cluster-formation
- RabbitMQ Management Plugin: https://www.rabbitmq.com/docs/management
- Pika documentation: https://pika.readthedocs.io/

## Issues Found

1. **Wrong comment syntax in `rabbitmq.conf` blocks.** The post used Erlang-style `%%` comments inside `/etc/rabbitmq/rabbitmq.conf` snippets, but the modern (sysctl/INI-style) `rabbitmq.conf` parser uses `#` for comments. `%%` would cause a parse error. Changed all `%%` comments to `#` and updated the code-fence language tag from `erlang` to `ini` for the two `rabbitmq.conf` snippets. The `advanced.config` block was left as `erlang`/`%%`, which is correct since that file is real Erlang.

2. **Invalid `nodename` setting in `rabbitmq.conf`.** The cluster section had `nodename = rabbit@node1.example.com` in `rabbitmq.conf`. RabbitMQ does not accept `nodename` as a config key in `rabbitmq.conf`; the node name must be set via the `RABBITMQ_NODENAME` environment variable or in `/etc/rabbitmq/rabbitmq-env.conf` as `NODENAME=...`. Replaced the invalid line with a short note and a separate `rabbitmq-env.conf` snippet showing the correct location.

## Review Notes

- The unbracketed IPv6 syntax (`listeners.tcp.1 = 2001:db8::10:5672`, `listeners.tcp.2 = ::1:5672`, `listeners.tcp.1 = :::5672`) is correct as written — RabbitMQ's docs show this exact form for IPv6 listeners and the cuttlefish parser splits on the final colon. (Bracketed `[2001:db8::10]:5672` is a common assumption but is not what the docs use.)
- The Erlang `advanced.config` syntax with `{tcp_listeners, [{"2001:db8::10", 5672}, ...]}` and the management plugin `{listener, [{ip, "..."}, {port, ...}]}` proplist are correct for the classic config format. Note that the official docs recommend the modern `rabbitmq.conf` format over `advanced.config` for everything that has an equivalent key.
- `distribution.listener.interface`, `distribution.listener.port_range.min/max`, `cluster_formation.peer_discovery_backend = rabbit_peer_discovery_classic_config`, `cluster_formation.classic_config.nodes.N`, and `management.tcp.ip` / `management.tcp.port` are all valid keys.
- The Pika example is current; `pika.ConnectionParameters` accepts a literal IPv6 address string in `host`, since Python's socket layer resolves it directly.
- The shell verification commands (`ss -6`, `nc -6`, `curl -6`, `ip6tables`, `firewall-cmd`) are valid and current.
- Minor stylistic note (not changed): the post uses `guest:guest` against a non-loopback IPv6 address — by default the `guest` user can only authenticate from localhost in modern RabbitMQ. This is acceptable for an introductory test command but readers should be aware they may need to create a non-`guest` user or relax `loopback_users`.
