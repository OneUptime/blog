# Validation Summary: Control Argo Events Storms with Filters, Rate Limits, and Backpressure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo Events EventSources and source-side filtering
- Argo Events Sensors, dependency filters, trigger conditions, transformations, retries, rate limits, and delivery semantics
- Argo Events JetStream and Kafka EventBus implementations
- Argo Workflows controller parallelism and synchronization
- Kubernetes ResourceQuota and workload resource management
- Prometheus monitoring for Argo Events and broker backlogs

## Sources Consulted
- Argo Events official EventSource filtering documentation: https://argoproj.github.io/argo-events/eventsources/filtering/
- Argo Events official Sensor filter introduction: https://argoproj.github.io/argo-events/sensors/filters/intro/
- Argo Events official data-filter documentation: https://argoproj.github.io/argo-events/sensors/filters/data/
- Argo Events official transformation documentation: https://argoproj.github.io/argo-events/sensors/transform/
- Argo Events official trigger-conditions documentation: https://argoproj.github.io/argo-events/sensors/trigger-conditions/
- Argo Events official trigger retry, rate-limit, and dead-letter documentation: https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/
- Argo Events official Sensor high-availability documentation: https://argoproj.github.io/argo-events/sensors/ha/
- Argo Events official Kafka EventBus documentation: https://argoproj.github.io/argo-events/eventbus/kafka/
- Argo Events official API reference: https://argoproj.github.io/argo-events/APIs/
- Argo Events official Prometheus metrics documentation: https://argoproj.github.io/argo-events/metrics/
- Argo Events official Sensor implementation, including per-process rate limiters and blocking versus asynchronous trigger execution: https://github.com/argoproj/argo-events/blob/master/pkg/sensors/listener.go
- Argo Events official Kafka Sensor trigger handling: https://github.com/argoproj/argo-events/blob/master/pkg/eventbus/kafka/sensor/trigger_handler.go
- Argo Events official JetStream Sensor acknowledgment handling: https://github.com/argoproj/argo-events/blob/master/pkg/eventbus/jetstream/sensor/trigger_conn.go
- Argo Workflows official controller parallelism documentation: https://argo-workflows.readthedocs.io/en/latest/parallelism/
- Argo Workflows official synchronization documentation: https://argo-workflows.readthedocs.io/en/latest/synchronization/
- NATS official JetStream stream retention and discard-policy documentation: https://docs.nats.io/nats-concepts/jetstream/streams
- NATS official JetStream consumer and monitoring documentation: https://docs.nats.io/nats-concepts/jetstream/consumers and https://docs.nats.io/running-a-nats-service/nats_admin/monitoring/monitoring_jetstream
- Apache Kafka official broker configuration reference: https://kafka.apache.org/documentation/#brokerconfigs
- Kubernetes official ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/

## Issues Found
- The Sensor data-filter example used unanchored string values even though Argo evaluates string values as regular expressions. Changed `critical` and `production` to `^critical$` and `^production$` so the filters perform the exact matches described instead of also matching values such as `noncritical` or `preproduction`.
- The stated filter-category evaluation order omitted script filters. Updated it to the current implementation order: expression, data, context, time, then script.
- The acknowledgment section implied that a trigger target failure by itself could leave the EventBus item unacknowledged for redelivery. Corrected the explanation: for JetStream and Kafka, `atLeastOnce: true` executes synchronously before broker acknowledgment or transaction commit, so a Sensor exit in that window can cause redelivery; after retries are exhausted, failure handling completes and broker processing advances.
- The post did not explain that the asynchronous default prevents the outer retry loop from observing action failures. Clarified that `retryStrategy` can observe trigger failures on the blocking `atLeastOnce: true` path and that exhausted failures still require alerting or a dead-letter trigger.
- The JetStream retention statement assumed limits always delete the oldest message. Corrected it to account for the configured discard policy: the default `DiscardOld` evicts old messages, while `DiscardNew` rejects publishes that would exceed a limit.
- The cumulative-stage comparison treated every growing difference as backlog or loss. Added qualifiers for intentional filtering, sampling, and counter resets so only unexplained divergence is interpreted that way.

## Review Notes
- All three YAML snippets parse successfully. Field names, nesting, API versions, Kafka consumer-group values, filter paths, logical operators, and trigger rate-limit units match the current Argo Events API.
- The post's local-versus-global rate-limit analysis matches the current Sensor source: limiters are initialized inside each Sensor process, non-Kafka Sensors use active-passive leader election, and Kafka EventBus Sensors can process active-active across replicas.
- The listed Argo Events metric names and the Argo Workflows `parallelism`, `namespaceParallelism`, Workflow-level `spec.parallelism`, semaphore, and mutex descriptions are current.
- Every link in the post's Official Documentation section returned HTTP 200 during validation.
- No deprecated API usage was found. Implementation-specific behavior should be rechecked when upgrading Argo Events because the post intentionally discusses current Sensor internals rather than a pinned release.
