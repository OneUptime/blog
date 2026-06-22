# Validation Summary: How to Fix 'Network Partition' in RabbitMQ Cluster

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- RabbitMQ clustering and network partitions
- RabbitMQ CLI tools
- RabbitMQ Management HTTP API
- RabbitMQ quorum queues
- RabbitMQ Prometheus plugin
- HAProxy
- Python requests
- Pika
- Linux sysctl TCP keepalive settings

## Sources Consulted
- RabbitMQ 4.3 Clustering and Network Partitions: https://www.rabbitmq.com/docs/partitions
- RabbitMQ 3.13 Clustering and Network Partitions: https://www.rabbitmq.com/docs/3.13/partitions
- RabbitMQ rabbitmqctl manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ configuration guide: https://www.rabbitmq.com/docs/configure
- RabbitMQ networking guide: https://www.rabbitmq.com/docs/networking
- RabbitMQ quorum queues guide: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Prometheus and Grafana guide: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ Prometheus metrics list: https://github.com/rabbitmq/rabbitmq-server/blob/main/deps/rabbitmq_prometheus/metrics.md
- Pika channel API documentation: https://pika.readthedocs.io/en/stable/modules/channel.html
- HAProxy health checks documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/

## Issues Found
- `cluster_partition_handling` was presented as current RabbitMQ behavior. RabbitMQ 4.3 documentation says these keys are deprecated and accepted with no effect, so the post now scopes those modes to versions that support them and adds a current-version caveat.
- The post described `autoheal` as best for two-node clusters. RabbitMQ documentation frames it as a tradeoff favoring service continuity over data consistency, so the recommendation was corrected.
- The manual recovery steps treated reset/rejoin as the normal path. RabbitMQ documentation recommends choosing a trusted partition and restarting the other partition first, so the reset/rejoin step is now explicitly a fallback that loses local data.
- The recovery script used `rabbitmqctl force_reset`, which is deprecated and unsupported with Khepri. It now uses `rabbitmqctl reset`.
- `distribution_buffer_size` was shown as a `rabbitmq.conf` key, but current RabbitMQ uses the `RABBITMQ_DISTRIBUTION_BUFFER_SIZE` environment variable. The snippet was corrected to `rabbitmq-env.conf`.
- The Prometheus alert used `rabbitmq_partitions`, which is not emitted by RabbitMQ's built-in Prometheus plugin. The alert now labels the partition metric as a custom metric from the health check script or a management API exporter.
- The HAProxy management health check called an authenticated RabbitMQ HTTP API endpoint without credentials. The snippet now sends an Authorization header placeholder.
- `rabbitmqctl sync_queue` was listed as a common command, but it is not in the current `rabbitmqctl` manual and applies to older mirrored classic queue workflows. It was replaced with `rabbitmqctl list_queues name type state`.
- The quick reference used an internal Erlang evaluation for partition checking. It was replaced with the official `rabbitmq-diagnostics cluster_status`.

## Review Notes
The post is now technically accurate for current RabbitMQ with explicit notes where older partition-handling behavior applies. Future improvements could add a separate version matrix for RabbitMQ 3.13, 4.0-4.2, and 4.3+ instead of handling version differences inline.
