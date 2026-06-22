# Validation Summary: How to Fix 'Node Down' Errors in RabbitMQ Cluster

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- RabbitMQ clustering
- Erlang distribution and EPMD
- RabbitMQ CLI tools (`rabbitmqctl`, `rabbitmq-diagnostics`)
- RabbitMQ network partition handling
- RabbitMQ Prometheus metrics
- NGINX TCP load balancing
- Linux shell commands

## Sources Consulted
- RabbitMQ Clustering Guide: https://www.rabbitmq.com/docs/clustering
- RabbitMQ Networking Guide: https://www.rabbitmq.com/docs/networking
- RabbitMQ Cluster Formation and Peer Discovery: https://www.rabbitmq.com/docs/cluster-formation
- RabbitMQ Network Partitions, current 4.3 docs: https://www.rabbitmq.com/docs/partitions
- RabbitMQ Network Partitions, 3.13 docs: https://www.rabbitmq.com/docs/3.13/partitions
- RabbitMQ `rabbitmqctl` manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ `rabbitmq-diagnostics` manual: https://www.rabbitmq.com/docs/man/rabbitmq-diagnostics.8
- RabbitMQ Prometheus and Grafana Guide: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ Cluster Operator Prometheus rule for Erlang distribution links: https://github.com/rabbitmq/cluster-operator/blob/main/observability/prometheus/rules/rabbitmq/insufficient-established-erlang-distribution-links.yml
- NGINX TCP and UDP Load Balancing documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/tcp-udp-load-balancer/
- NGINX TCP Health Checks documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/tcp-health-check/

## Issues Found
- The partition handling section presented `cluster_partition_handling` as current RabbitMQ guidance. Updated it to specify that these modes apply to RabbitMQ 3.13 through 4.2 and that RabbitMQ 4.3 removed Mnesia-era partition handling strategies.
- The partition detection command grepped for the old "Network Partitions" section. Replaced it with `rabbitmq-diagnostics cluster_status`, which is the current documented diagnostic command for reachable peers.
- The health-check script parsed human-readable `cluster_status` output and would incorrectly match a "Network Partitions" header even when no partition existed. Replaced it with documented `rabbitmq-diagnostics` health checks: `ping`, `check_running`, `check_alarms`, and `cluster_status`.
- The Prometheus alert rules used non-native or outdated metric names (`rabbitmq_running`, `rabbitmq_partitions`, `rabbitmq_clustered`). Replaced them with `up{job="rabbitmq"}` for scrape/node availability and the RabbitMQ Cluster Operator's official Erlang distribution link expression for missing inter-node links.
- The NGINX example used TCP proxy directives outside a `stream` block and included an active `health_check` directive without noting it requires NGINX Plus. Wrapped the configuration in `stream {}` and commented the active health-check directive with the NGINX Plus requirement.
- The `force_boot` comment said it ignores cluster membership. Updated the wording to match RabbitMQ documentation: it allows the node to start next time even when it was not the last node to shut down.
- The summary recommendation to configure partition handling was made version-aware.

## Review Notes
- The post remains generally correct for Linux-based RabbitMQ operations, but several examples are intentionally environment-specific: service names, log paths, node names, and DNS names may differ by package, OS, container image, or Kubernetes deployment.
- RAM nodes are still documented by RabbitMQ but their use is discouraged unless the operator has a specific reason.
- The management API partition example is most relevant to older RabbitMQ versions where partition reporting is exposed through management data.
