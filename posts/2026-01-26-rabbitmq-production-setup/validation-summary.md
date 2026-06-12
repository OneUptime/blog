# Validation Summary: How to Set Up RabbitMQ for Production

## Status
validated

## Post Type
Tutorial / production operations guide

## Technologies Covered
- RabbitMQ
- Erlang/OTP
- Ubuntu 22.04 apt packaging
- TLS configuration
- RabbitMQ clustering
- RabbitMQ quorum queues
- Prometheus and Grafana monitoring
- HAProxy TCP load balancing
- Linux systemd and sysctl tuning
- Bash
- Python pika client

## Sources Consulted
- RabbitMQ Installing on Debian and Ubuntu: https://www.rabbitmq.com/docs/install-debian
- RabbitMQ Erlang Version Requirements: https://www.rabbitmq.com/docs/which-erlang
- RabbitMQ Configuration Guide: https://www.rabbitmq.com/docs/configure
- RabbitMQ TLS Support: https://www.rabbitmq.com/docs/ssl
- RabbitMQ Clustering Guide: https://www.rabbitmq.com/docs/clustering
- RabbitMQ Quorum Queues: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Policies: https://www.rabbitmq.com/docs/policies
- RabbitMQ Virtual Hosts and Default Queue Type: https://www.rabbitmq.com/docs/vhosts
- RabbitMQ Management Plugin: https://www.rabbitmq.com/docs/management
- RabbitMQ Monitoring with Prometheus and Grafana: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ Schema Definition Export and Import: https://www.rabbitmq.com/docs/definitions
- RabbitMQ rabbitmqctl manual page: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ Prometheus metrics reference: https://github.com/rabbitmq/rabbitmq-server/blob/main/deps/rabbitmq_prometheus/metrics.md
- HAProxy Configuration Manual: https://docs.haproxy.org/
- Pika documentation: https://pika.readthedocs.io/

## Issues Found
- The Ubuntu 22.04 installation snippet used old per-repository Cloudsmith/novemberain key and repository URLs. Updated it to the current Team RabbitMQ apt repository format using the RabbitMQ team signing key and `deb1.rabbitmq.com` / `deb2.rabbitmq.com` Jammy repositories.
- The Erlang verification note said Erlang 25.x or higher was sufficient. Updated it to state that RabbitMQ 4.x requires Erlang/OTP 26.2 or later, matching the current compatibility matrix.
- The quorum queue policy example used `ha-mode` and `queue-mode=lazy`, which configures deprecated/removed classic mirrored and lazy queue behavior rather than quorum queues. Replaced it with supported virtual host default queue type commands using `--default-queue-type quorum`.
- The text said classic mirrored queues are deprecated. Updated it to clarify that classic queue mirroring was removed in RabbitMQ 4.x.
- The troubleshooting command used `rabbitmqctl list_queues ... --sort memory`, but `list_queues` does not document a `--sort` flag. Replaced it with `rabbitmqctl list_queues name messages memory | sort -k3 -nr`.

## Review Notes
- The Prometheus alert examples use valid RabbitMQ metric names, but real production installations may prefer RabbitMQ's official Grafana dashboards and more workload-specific alert thresholds.
- The TLS configuration is structurally valid, but deployments that set `ssl_options.verify = verify_peer` with `fail_if_no_peer_cert = false` should confirm the intended client certificate policy.
