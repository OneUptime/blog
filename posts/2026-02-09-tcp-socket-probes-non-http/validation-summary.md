# Validation Summary: How to Implement TCP Socket Probes for Non-HTTP Service Health Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes liveness, readiness, and startup probes
- Kubernetes TCP socket probes
- Kubernetes NetworkPolicy
- Prometheus / PromQL
- Redis, PostgreSQL, MySQL, RabbitMQ, Kafka, and MongoDB health checks
- kubectl debugging commands

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes task guide: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes API reference: Pod v1 Probe fields - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes metrics reference: kubelet probe metrics - https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- RabbitMQ documentation: Management plugin - https://www.rabbitmq.com/docs/management
- RabbitMQ HTTP API reference: health check endpoints - https://www.rabbitmq.com/docs/4.1/http-api-reference
- RabbitMQ documentation: Monitoring and health checks - https://www.rabbitmq.com/docs/4.1/monitoring

## Issues Found
- The RabbitMQ example recommended an unauthenticated Kubernetes HTTP readiness probe against the management API. RabbitMQ management API endpoints require management access, and Kubernetes HTTP probes cannot source credentials from Secrets directly. I changed the example to use `rabbitmq-diagnostics -q check_running && rabbitmq-diagnostics -q check_local_alarms` as an application-aware exec readiness check.
- The multi-port example said it was checking the admin port separately but configured readiness against `main`. I changed the readiness probe to use the named `admin` port.
- The sidecar health checker example created a marker file but did not configure a probe that consumed it. I added a readiness exec probe to the sidecar that checks `/health/ready`.
- The Prometheus latency query did not aggregate histogram buckets by `le`, and the failing-probe query counted all historical failures. I fixed the latency query to use `sum by (le, namespace, pod)` and changed the failure query to use `increase(...[5m])`.
- The debug command tried to connect from a temporary pod to `my-pod`, which is not generally resolvable as a DNS name. I changed the example to use `my-service`.
- The NetworkPolicy example allowed traffic from the `kube-system` namespace, but kubelet probes originate from the node, not from a pod in that namespace. I changed the example to use an `ipBlock` placeholder for node IP ranges and clarified the caveat.
- The wrong-port section implied the probe port must match a declared `containerPort`. Kubernetes probes need to target the listening port; declaring `containerPort` is not what makes the probe work. I corrected the wording.
- The interface binding section claimed probes work when a service listens only on `127.0.0.1`. TCP probes connect to the Pod IP from the node, so a loopback-only listener will not normally pass. I corrected the guidance to use an exec probe or listen on the Pod IP / `0.0.0.0`.

## Review Notes
- The PostgreSQL and RabbitMQ manifests are illustrative health-check examples, not production clustering examples. Future revisions could note that multiple replicas of the stock images require proper replication or clustering configuration.
