# Validation Summary: How to Set Up RabbitMQ on Talos Linux

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Talos Linux
- Kubernetes
- RabbitMQ
- RabbitMQ Cluster Kubernetes Operator
- RabbitMQ quorum queues
- RabbitMQ management HTTP API
- Prometheus Operator ServiceMonitor
- TLS for RabbitMQ

## Sources Consulted
- RabbitMQ Cluster Operator installation documentation: https://www.rabbitmq.com/kubernetes/operator/install-operator
- RabbitMQ Cluster Operator usage and API documentation: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ Cluster Operator monitoring documentation: https://www.rabbitmq.com/kubernetes/operator/operator-monitoring
- RabbitMQ release information: https://www.rabbitmq.com/release-information
- RabbitMQ clustering guide: https://www.rabbitmq.com/docs/3.13/clustering
- RabbitMQ quorum queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ virtual host and default queue type documentation: https://www.rabbitmq.com/docs/4.2/vhosts
- RabbitMQ HTTP API reference: https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ Prometheus metrics list: https://github.com/rabbitmq/rabbitmq-server/blob/main/deps/rabbitmq_prometheus/metrics.md

## Issues Found
- The post pinned `rabbitmq:3.13-management`, but RabbitMQ 3.13 is no longer a current community-supported release series. Updated the example to `rabbitmq:4.2-management`, which matches the current stable release series in the official release information.
- The RabbitMQ configuration set `default_user` and `default_pass` while the Cluster Operator manages default admin credentials through the `rabbitmq-prod-default-user` Kubernetes Secret. Removed those settings to keep the deployment consistent with the operator-managed credential flow used later in the post.
- The configuration used the deprecated `queue_master_locator = min-masters` setting and later referred to the `min-masters` queue master locator. Updated the configuration and wording to use the current `queue_leader_locator = balanced` setting.
- The verification command was described as checking queue mirroring status, but the post recommends quorum queues and classic queue mirroring is no longer the production path. Updated the wording to "Check queue status."
- The `rabbitmqadmin` examples used older v1 syntax and did not provide the operator-generated credentials. Replaced them with RabbitMQ management HTTP API `curl` examples using the `rabbitmq-prod-default-user` Secret credentials.
- The quorum queue policy example attempted to set `queue-type` using a policy. RabbitMQ queue type is immutable and must be supplied at declaration time or through the default queue type for new declarations. Replaced the example with `rabbitmqctl update_vhost_metadata / --default-queue-type quorum`.
- The TLS example configured peer verification without providing a CA Secret for mTLS. Removed the extra RabbitMQ TLS settings and kept the operator-supported `spec.tls.secretName` and `spec.tls.disableNonTLSListeners` fields.
- The Prometheus metric `rabbitmq_node_mem_used` was not in the current RabbitMQ Prometheus metric list. Replaced it with `rabbitmq_process_resident_memory_bytes`.

## Review Notes
The ServiceMonitor example is intentionally namespace-scoped and cluster-specific. The official RabbitMQ manifest uses a broader selector and namespace selector for scraping all RabbitMQ clusters, which may be preferable in shared monitoring setups.
