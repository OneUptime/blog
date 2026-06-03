# Validation Summary: How to Implement RabbitMQ High Availability with Mirrored Queues on Kubernetes

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- RabbitMQ 3.13 classic mirrored queues
- RabbitMQ clustering and Kubernetes peer discovery
- Kubernetes StatefulSet, Service, ServiceAccount, Role, and RoleBinding
- RabbitMQ policies and management HTTP API
- Pika Python AMQP client
- RabbitMQ Go AMQP 0-9-1 client (`amqp091-go`)
- Prometheus Operator `PrometheusRule`
- `rabbitmqctl` and `kubectl`

## Sources Consulted
- RabbitMQ 3.13 Classic Queue Mirroring: https://www.rabbitmq.com/docs/3.13/ha
- RabbitMQ deprecated features list: https://www.rabbitmq.com/release-information/deprecated-features-list
- RabbitMQ 4.0 release notes for classic queue mirroring removal: https://blog.rabbitmq.com/docs/4.0/whats-new
- RabbitMQ 3.13 cluster formation and Kubernetes peer discovery: https://www.rabbitmq.com/docs/3.13/cluster-formation
- RabbitMQ 3.13 clustering and queue leader locator configuration: https://www.rabbitmq.com/docs/3.13/clustering
- RabbitMQ 3.13 network partition handling: https://www.rabbitmq.com/docs/3.13/partitions
- RabbitMQ 3.13 Prometheus plugin documentation: https://www.rabbitmq.com/docs/3.13/prometheus
- RabbitMQ Prometheus metrics reference: https://github.com/rabbitmq/rabbitmq-server/blob/main/deps/rabbitmq_prometheus/metrics.md
- RabbitMQ Go tutorial using `amqp091-go`: https://www.rabbitmq.com/tutorials/tutorial-one-go
- `amqp091-go` package documentation: https://pkg.go.dev/github.com/rabbitmq/amqp091-go
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post did not clearly state that classic queue mirroring is deprecated and removed in RabbitMQ 4.0. Added version scope for RabbitMQ 3.13 and earlier and clarified that quorum queues or streams should be used for new deployments.
- The post used "master" terminology for mirrored queues. Updated wording to RabbitMQ's current "leader" terminology while leaving legacy CLI field context where relevant.
- The StatefulSet referenced `serviceAccountName: rabbitmq` but did not define the ServiceAccount or RBAC needed by Kubernetes peer discovery. Added a ServiceAccount, Role, and RoleBinding for endpoint discovery.
- The RabbitMQ image used `rabbitmq:3.12-management`. Updated it to `rabbitmq:3.13-management`, the latest RabbitMQ series where classic queue mirroring is still documented as available.
- The Prometheus plugin port was configured but not exposed in the Service or container ports. Added port `15692`.
- The configuration used deprecated `queue_master_locator = min-masters`. Replaced it with `queue_leader_locator = balanced`.
- The HA policy forced unsynchronised mirror promotion with `ha-promote-on-shutdown` and `ha-promote-on-failure`, which conflicts with the durability claims. Removed those settings.
- The policy-application Job used `jq` with `curlimages/curl`, which does not provide `jq`. Replaced the loop with direct HTTP API `PUT` requests that work with the selected image.
- The Python example imported `json` but did not use it. Removed the unused import.
- The Go producer used the old `github.com/streadway/amqp` import and enabled confirms without waiting for acknowledgements. Updated it to `github.com/rabbitmq/amqp091-go`, used `PublishWithContext`, handled initial connection errors, and waited for publisher confirmations.
- The Prometheus alerts referenced non-existent built-in RabbitMQ metrics for mirror count, mirror sync backlog, and partitions. Replaced them with valid RabbitMQ built-in queue and build metrics, and added a note that mirror-specific state should be checked through the management API or `rabbitmqctl`.
- The failover commands used `slave_pids`. Updated them to `mirror_pids` and `synchronised_mirror_pids`, which are documented for RabbitMQ 3.13.
- The best-practices section recommended `autoheal` too broadly. Clarified that partition handling is a consistency/availability tradeoff and that `autoheal` prioritizes continuity over consistency.

## Review Notes
YAML and Python snippets were parsed successfully with local tooling. Go compilation could not be run because the local environment does not have `go` or `gofmt` installed. The post remains a legacy RabbitMQ 3.13-and-earlier guide; future content should prefer quorum queues for replicated RabbitMQ queues.
